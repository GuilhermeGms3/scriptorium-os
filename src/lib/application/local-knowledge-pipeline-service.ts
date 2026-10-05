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
  publication: "machine-visible" | "exception" | "withheld",
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

const REVIEW_BATCH_SIZE = 100;
const REVIEW_SAMPLE_SIZE = 20;

async function prepareInferenceReviewBatches(
  db: WorkspaceDatabase,
  documentId: string,
  configurationKey: string,
): Promise<void> {
  const existing = await db.query(
    "SELECT 1 FROM pipeline_review_batches WHERE document_id=? AND configuration_key=? LIMIT 1",
    [documentId, configurationKey],
  );
  if (existing.length) return;
  const members = await db.query(
    `SELECT d.proposal_id FROM pipeline_decisions d
     JOIN knowledge_proposals p ON p.id=d.proposal_id
     JOIN semantic_units u ON u.id=p.semantic_unit_id
     WHERE p.document_id=? AND d.configuration_key=? AND d.origin='inferred'
     ORDER BY u.text_checksum,p.id`,
    [documentId, configurationKey],
  );
  const now = new Date().toISOString();
  for (
    let offset = 0, ordinal = 0;
    offset < members.length;
    offset += REVIEW_BATCH_SIZE, ordinal += 1
  ) {
    const group = members.slice(offset, offset + REVIEW_BATCH_SIZE);
    const sampleCount = Math.min(REVIEW_SAMPLE_SIZE, group.length);
    const sampledIndexes = new Set(
      Array.from({ length: sampleCount }, (_, index) =>
        Math.floor((index * group.length) / sampleCount),
      ),
    );
    const batchId = `${documentId}:review:${configurationKey}:${ordinal}`;
    const statements: Parameters<WorkspaceDatabase["transaction"]>[0] = [
      {
        sql: `INSERT INTO pipeline_review_batches(
          id,document_id,configuration_key,ordinal,member_count,sample_count,status,created_at,updated_at
        ) VALUES(?,?,?,?,?,?,'pending',?,?)`,
        bind: [batchId, documentId, configurationKey, ordinal, group.length, sampleCount, now, now],
      },
    ];
    group.forEach((row, index) => {
      const proposalId = String(row["proposal_id"]);
      const isSample = sampledIndexes.has(index) ? 1 : 0;
      statements.push({
        sql: "INSERT INTO pipeline_review_batch_members(batch_id,proposal_id,is_sample) VALUES(?,?,?)",
        bind: [batchId, proposalId, isSample],
      });
      statements.push({
        sql: "UPDATE pipeline_decisions SET publication=?,updated_at=? WHERE proposal_id=? AND audit_status='pending'",
        bind: [isSample ? "exception" : "withheld", now, proposalId],
      });
    });
    await db.transaction(statements);
  }
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
      await prepareInferenceReviewBatches(db, documentId, key);
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
    const decisions = result.decisions ?? [];
    const selections = decisions.length ? decisions : result.decision ? [result.decision] : [];
    if (selections.length) {
      const validated = selections.map((selection) => {
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
        return selection;
      });
      const selection = validated[0]!;
      const payload = {
        kind: "passage-relation" as const,
        rawReference: validated
          .map(
            (value) =>
              `${value.passage.bookId} ${value.passage.chapter}:${value.passage.verseStart ?? ""}${value.passage.verseEnd !== value.passage.verseStart ? `-${value.passage.verseEnd}` : ""}`,
          )
          .join("; "),
        relationType: selection.relationType,
        relationScope:
          selection.passage.verseStart === selection.passage.verseEnd
            ? ("verse" as const)
            : ("range" as const),
        passage: selection.passage,
        additionalPassages: validated.slice(1).map((value) => value.passage),
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
        "withheld",
        {
          decisions: validated,
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
      selections.length ? "inferred" : result.status === "abstained" ? "abstained" : "candidates",
      JSON.stringify(result),
      new Date().toISOString(),
    ]);
  },
};
