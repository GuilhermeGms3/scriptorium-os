import { z } from "zod";
import { corpusPackageRegistry } from "../corpus-runtime/corpus-package-registry";
import type { KnowledgeProposal, SemanticUnit } from "../domain/document-knowledge";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import {
  PipelineInfoSchema,
  PipelineLinkSchema,
  pipelineRequest,
} from "../semantic-engine/local-pipeline-client";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";

async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function saveDecision(
  db: WorkspaceDatabase,
  proposal: KnowledgeProposal,
  origin: "explicit" | "inferred",
  publication: "machine-visible" | "exception",
  evidence: unknown,
  key: string,
) {
  await db.execute(
    `INSERT INTO pipeline_decisions(proposal_id,publication,origin,evidence_json,configuration_key,updated_at)
    VALUES(?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET
    evidence_json=excluded.evidence_json,configuration_key=excluded.configuration_key,
    publication=CASE WHEN pipeline_decisions.audit_status='pending' THEN excluded.publication ELSE pipeline_decisions.publication END,updated_at=excluded.updated_at`,
    [proposal.id, publication, origin, JSON.stringify(evidence), key, new Date().toISOString()],
  );
}

/** Canonical workspace pipeline extension; no parallel claim/document store. */
export const LocalKnowledgePipelineService = {
  async indexEdition(
    editionId: string,
    progress: (message: string) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const manifest = (await corpusPackageRegistry.listEnabled()).find(
      (x) => x.editionId === editionId,
    );
    if (!manifest) throw new Error("Edição indisponível.");
    for (const workId of manifest.works) {
      signal.throwIfAborted();
      progress(`Indexando candidatos: ${workId}…`);
      const storage = await corpusPackageRegistry.open(editionId, workId);
      const units = await storage.getTextUnits(
        { workId, versificationSchemeId: manifest.versificationSchemeId },
        editionId,
      );
      const candidates = units.flatMap((unit) => {
        const address = unit.address;
        return address?.bookId && address.chapter && address.verseStart
          ? [
              {
                id: unit.id,
                editionId,
                text: unit.text,
                passage: {
                  workId,
                  bookId: address.bookId,
                  chapter: address.chapter,
                  verseStart: address.verseStart,
                  verseEnd: address.verseEnd ?? address.verseStart,
                  versificationSchemeId: address.versificationSchemeId,
                },
              },
            ]
          : [];
      });
      for (let offset = 0; offset < candidates.length; offset += 32)
        await pipelineRequest(
          "index",
          z.object({ changed: z.number(), indexed: z.number() }),
          { candidates: candidates.slice(offset, offset + 32) },
          signal,
        );
    }
  },

  async run(
    documentId: string,
    editionId: string,
    useLlm: boolean,
    progress: (message: string) => void,
    signal: AbortSignal,
    sourceSchemeConfirmed = false,
  ): Promise<void> {
    const db = await getWorkspaceDatabase();
    const summary = await DocumentKnowledgeRepository.getSummary(documentId, db);
    if (summary?.status !== "ready")
      throw new Error("Desmonte o livro primeiro para obter unidades citáveis.");
    const info = await pipelineRequest("info", PipelineInfoSchema, undefined, signal);
    if (useLlm && !info.models.llm.configured)
      throw new Error("Configure o modelo e sua revisão no serviço Python antes de inferir.");
    const key = await digest(
      JSON.stringify({
        editionId,
        useLlm,
        info,
        analyzer: summary.analyzerId,
        revision: summary.analyzerVersion,
        checksum: summary.sourceChecksum,
        indexedAt: summary.indexedAt,
        sourceSchemeConfirmed,
        policy: "explicit-only-v1",
      }),
    );
    const saved = (
      await db.query("SELECT * FROM pipeline_jobs WHERE document_id=?", [documentId])
    )[0];
    let ordinal = saved?.["configuration_key"] === key ? Number(saved["next_ordinal"]) : 0;
    if (saved && saved["configuration_key"] !== key)
      await db.execute(
        "UPDATE pipeline_decisions SET publication='withheld' WHERE proposal_id IN (SELECT id FROM knowledge_proposals WHERE document_id=?) AND audit_status='pending'",
        [documentId],
      );
    await db.execute(
      `INSERT INTO pipeline_jobs(document_id,configuration_key,next_ordinal,status,error,updated_at,configuration_json) VALUES(?,?,?,'running',NULL,?,?) ON CONFLICT(document_id) DO UPDATE SET configuration_key=excluded.configuration_key,next_ordinal=excluded.next_ordinal,status='running',error=NULL,updated_at=excluded.updated_at,configuration_json=excluded.configuration_json`,
      [
        documentId,
        key,
        ordinal,
        new Date().toISOString(),
        JSON.stringify({ editionId, useLlm, sourceSchemeConfirmed }),
      ],
    );
    try {
      while (true) {
        signal.throwIfAborted();
        const rows = await db.query(
          "SELECT id FROM semantic_units WHERE document_id=? AND ordinal>=? ORDER BY ordinal LIMIT 10",
          [documentId, ordinal],
        );
        if (!rows.length) break;
        const units = await DocumentKnowledgeRepository.listUnits(
          documentId,
          rows.map((row) => String(row["id"])),
          db,
        );
        for (const unit of units) {
          signal.throwIfAborted();
          progress(`Conectando unidade ${unit.ordinal + 1} de ${summary.unitCount}…`);
          const explicit = (
            await DocumentKnowledgeRepository.listProposalsForUnit(unit.id, db)
          ).filter(
            (x) => x.proposalKind === "passage-relation" && !x.method.startsWith("local-llm:"),
          );
          for (const proposal of explicit) {
            if (
              !proposal ||
              proposal.reviewStatus === "rejected" ||
              proposal.payload.kind !== "passage-relation"
            )
              continue;
            const ref = {
              ...proposal.payload.passage,
              workId: proposal.payload.passage.workId ?? `work:${proposal.payload.passage.bookId}`,
            };
            const start = unit.text.indexOf(proposal.payload.rawReference);
            if (start < 0) continue;
            const storage = await corpusPackageRegistry.open(editionId, ref.workId);
            const resolved = await storage.getTextUnits(ref, editionId);
            const valid =
              sourceSchemeConfirmed &&
              resolved.length > 0 &&
              (ref.verseStart === undefined ||
                resolved.some((x) => x.address?.verseStart === ref.verseStart)) &&
              (ref.verseEnd === undefined ||
                resolved.some(
                  (x) => (x.address?.verseEnd ?? x.address?.verseStart) === ref.verseEnd,
                ));
            await saveDecision(
              db,
              proposal,
              "explicit",
              valid ? "machine-visible" : "exception",
              {
                quote: proposal.payload.rawReference,
                start,
                end: start + proposal.payload.rawReference.length,
                editionId,
                textChecksum: unit.textChecksum,
                policy: "explicit-only-v1",
                sourceSchemeConfirmed,
              },
              key,
            );
          }
          if (!explicit.length && !["heading", "bibliography-entry"].includes(unit.kind))
            await this.inferUnit(db, documentId, unit, editionId, useLlm, key, signal);
          ordinal = unit.ordinal + 1;
          await db.execute(
            "UPDATE pipeline_jobs SET next_ordinal=?,updated_at=? WHERE document_id=?",
            [ordinal, new Date().toISOString(), documentId],
          );
        }
        notifyKnowledgeMutation();
      }
      await db.execute(
        "UPDATE pipeline_jobs SET status='complete',updated_at=? WHERE document_id=?",
        [new Date().toISOString(), documentId],
      );
      await db.execute(
        "UPDATE document_knowledge_indexes SET proposal_count=(SELECT count(*) FROM knowledge_proposals WHERE document_id=?) WHERE document_id=?",
        [documentId, documentId],
      );
    } catch (error) {
      await db.execute(
        "UPDATE pipeline_jobs SET status=?,error=?,updated_at=? WHERE document_id=?",
        [
          signal.aborted ? "paused" : "failed",
          error instanceof Error ? error.message.slice(0, 1000) : "Falha no pipeline",
          new Date().toISOString(),
          documentId,
        ],
      );
      throw error;
    } finally {
      notifyKnowledgeMutation();
    }
  },

  async inferUnit(
    db: WorkspaceDatabase,
    documentId: string,
    unit: SemanticUnit,
    editionId: string,
    useLlm: boolean,
    key: string,
    signal: AbortSignal,
  ): Promise<void> {
    if (unit.text.length > 12000 || !unit.text.trim()) {
      await db.execute(
        "INSERT OR REPLACE INTO pipeline_unit_receipts VALUES(?,?,'oversized','{}',?)",
        [unit.id, key, new Date().toISOString()],
      );
      return;
    }
    const result = await pipelineRequest(
      "link",
      PipelineLinkSchema,
      { unitId: unit.id, text: unit.text, editionId, useLlm },
      signal,
    );
    if (result.unitId !== unit.id) throw new Error("Resposta aponta para unidade fora do lote.");
    if (result.decision) {
      const selection = result.decision;
      const candidate = result.candidates.find((x) => x.id === selection.candidateId);
      if (
        !candidate ||
        candidate.editionId !== editionId ||
        JSON.stringify(candidate.passage) !== JSON.stringify(selection.passage) ||
        unit.text.slice(selection.evidenceStart, selection.evidenceEnd) !==
          selection.evidenceQuote ||
        !result.modelRevision
      )
        throw new Error("Referência, edição ou evidência da inferência não confere com a fonte.");
      const payload = {
        kind: "passage-relation" as const,
        rawReference: `${selection.passage.bookId} ${selection.passage.chapter}:${selection.passage.verseStart ?? ""}`,
        relationType: selection.relationType,
        passage: selection.passage,
      };
      const hash = await digest(
        JSON.stringify({ unit: unit.id, payload, revision: result.modelRevision, key }),
      );
      const now = new Date().toISOString();
      const proposal: KnowledgeProposal = {
        id: `${documentId}:inference:${hash}`,
        documentId,
        semanticUnitId: unit.id,
        proposalKind: "passage-relation",
        payload,
        method: `local-llm:${result.model}:${result.modelRevision}`,
        confidence: 0,
        reviewStatus: "machine-proposed",
        createdAt: now,
        updatedAt: now,
      };
      await DocumentKnowledgeRepository.storeProposals([proposal], db);
      await saveDecision(
        db,
        proposal,
        "inferred",
        "exception",
        {
          ...selection,
          textChecksum: unit.textChecksum,
          model: result.model,
          modelRevision: result.modelRevision,
          retrieval: result.retrieval,
          calibrated: false,
        },
        key,
      );
    }
    await db.execute("INSERT OR REPLACE INTO pipeline_unit_receipts VALUES(?,?,?,?,?)", [
      unit.id,
      key,
      result.decision ? "inferred" : result.status === "abstained" ? "abstained" : "candidates",
      JSON.stringify(result),
      new Date().toISOString(),
    ]);
  },
};
