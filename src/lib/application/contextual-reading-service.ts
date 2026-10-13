import { ContextualReadingPackageSchema } from "../domain/contextual-reading";
import { KnowledgeProposalPayloadSchema } from "../domain/document-knowledge";
import { DEFAULT_BIBLICAL_VERSIFICATION } from "../domain/text-identity";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { ScriptureRepository } from "../repositories/scripture-repository";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";

async function digest(value: string) {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(result)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Ignore whitespace differences between PDF extractors, never punctuation, words or accents. */
export function locateReadingQuote(text: string, quote: string): [number, number] {
  const positions: number[] = [];
  let compact = "";
  for (let i = 0; i < text.length; i++) {
    if (!/\s/u.test(text[i]!)) {
      compact += text[i];
      positions.push(i);
    }
  }
  const wanted = quote.replace(/\s/gu, "");
  const start = compact.indexOf(wanted);
  if (start < 0)
    throw new Error("Evidência não encontrada na página original. Nenhuma ligação foi gravada.");
  if (compact.indexOf(wanted, start + 1) >= 0)
    throw new Error("Evidência ambígua na página: amplie o trecho.");
  return [positions[start]!, positions[start + wanted.length - 1]! + 1];
}

export const ContextualReadingService = {
  async importJson(raw: string, database?: WorkspaceDatabase) {
    if (new TextEncoder().encode(raw).byteLength > 4 * 1024 * 1024)
      throw new Error("Lote excede 4 MiB.");
    const batch = ContextualReadingPackageSchema.parse(JSON.parse(raw) as unknown);
    const db = database ?? (await getWorkspaceDatabase());
    if (!database && db.persistence !== "opfs")
      throw new Error("Importação exige workspace persistente. Verifique a origem do navegador.");
    const statements: Parameters<WorkspaceDatabase["transaction"]>[0] = [];
    const ordinals = new Map<string, number>();
    const ids = new Set<string>();
    const plannedUnits = new Map<string, string>();
    let reused = 0;
    const method = `assistant-contextual-reading:v1:${batch.analyst}`;
    for (const note of batch.notes) {
      for (const target of [note.passage, ...note.additionalPassages]) {
        const book = ScriptureRepository.getBook(target.bookId);
        if (
          !book ||
          (target.chapter !== undefined && target.chapter > book.chapters) ||
          target.versificationSchemeId !== DEFAULT_BIBLICAL_VERSIFICATION ||
          (target.workId && target.workId !== `work:${target.bookId}`)
        )
          throw new Error("Destino ou esquema não suportado neste lote contextual.");
      }
      if (
        (note.relationScope === "book") !== (note.passage.chapter === undefined) ||
        (note.relationScope === "chapter" && note.passage.verseStart !== undefined) ||
        (["verse", "range", "pericope"].includes(note.relationScope) &&
          note.passage.verseStart === undefined)
      )
        throw new Error("Alcance incompatível com o endereço da nota.");
      const document = await PrivateDocumentRepository.findByChecksum(note.sourceChecksum, db);
      if (!document)
        throw new Error(`Fonte ${note.sourceChecksum.slice(0, 12)} não instalada neste workspace.`);
      const running = await db.query(`SELECT 1 FROM document_knowledge_indexes WHERE document_id=? AND status='processing'
        UNION ALL SELECT 1 FROM pipeline_jobs WHERE document_id=? AND status='running' LIMIT 1`, [document.id,document.id]);
      if (running.length) throw new Error("Pause o processamento da fonte antes de incorporar a leitura contextual.");
      const spans: {
        pageId: string;
        pageIndex: number;
        start: number;
        end: number;
        text: string;
      }[] = [];
      for (const fragment of note.fragments) {
        const page = await PrivateDocumentRepository.getPage(
          document.id,
          fragment.physicalPage - 1,
          db,
        );
        if (!page?.text)
          throw new Error(`Página ${fragment.physicalPage} sem texto na fonte ${document.title}.`);
        const [start, end] = locateReadingQuote(page.text, fragment.quote);
        spans.push({
          pageId: page.id,
          pageIndex: page.pageIndex,
          start,
          end,
          text: page.text.slice(start, end),
        });
      }
      const seed = await digest(
        JSON.stringify({
          source: note.sourceChecksum,
          spans: spans.map(({ pageId, start, end }) => ({ pageId, start, end })),
          passage: note.passage,
          additional: note.additionalPassages,
        }),
      );
      const proposalId = `${document.id}:contextual:${seed}`;
      if (ids.has(proposalId)) throw new Error("Lote contém a mesma nota duas vezes.");
      ids.add(proposalId);
      const previous = await db.query("SELECT payload_json FROM knowledge_proposals WHERE id=?", [
        proposalId,
      ]);
      if (previous.length) {
        const payload = KnowledgeProposalPayloadSchema.parse(
          JSON.parse(String(previous[0]?.["payload_json"])) as unknown,
        );
        if (
          payload.kind !== "passage-relation" ||
          JSON.stringify(payload.contextualAnalysis) !== JSON.stringify(note.analysis)
        )
          throw new Error(
            "Nota já existe com outra análise. Use a revisão, sem sobrescrever seu histórico.",
          );
        reused++;
        continue;
      }
      const unitText = spans.map((s) => s.text).join(" ");
      // Reuse an exact existing unit span; a page range cannot belong to two units.
      const spanKey = JSON.stringify(spans.map(({pageId,start,end}) => ({pageId,start,end})));
      let unitId = plannedUnits.get(spanKey);
      if (!unitId && spans.length === 1) {
        const s = spans[0]!;
        const existing = await db.query(
          `SELECT s.unit_id FROM semantic_unit_spans s WHERE page_id=? AND start_offset=? AND end_offset=?
          AND (SELECT count(*) FROM semantic_unit_spans x WHERE x.unit_id=s.unit_id)=1`,
          [s.pageId, s.start, s.end],
        );
        unitId = existing[0] ? String(existing[0]["unit_id"]) : undefined;
      }
      if (!unitId) {
        unitId = `${document.id}:contextual-unit:${seed}`;
        if (!ordinals.has(document.id)) {
          const rows = await db.query(
            "SELECT coalesce(max(ordinal),-1)+1 n FROM semantic_units WHERE document_id=?",
            [document.id],
          );
          ordinals.set(document.id, Number(rows[0]?.["n"]));
        }
        const ordinal = ordinals.get(document.id)!;
        ordinals.set(document.id, ordinal + 1);
        statements.push({
          sql: `INSERT INTO semantic_units(id,document_id,unit_kind,ordinal,text_checksum,language,method) VALUES(?,?,'footnote',?,?,?,?)`,
          bind: [
            unitId,
            document.id,
            ordinal,
            await digest(unitText),
            document.language ?? "und",
            method,
          ],
        });
        spans.forEach((s, i) =>
          statements.push({
            sql: "INSERT INTO semantic_unit_spans(unit_id,page_id,page_index,start_offset,end_offset,ordinal) VALUES(?,?,?,?,?,?)",
            bind: [unitId!, s.pageId, s.pageIndex, s.start, s.end, i],
          }),
        );
      }
      plannedUnits.set(spanKey, unitId);
      const payload = KnowledgeProposalPayloadSchema.parse({
        kind: "passage-relation",
        rawReference: note.rawReference,
        relationType: "discusses",
        relationScope: note.relationScope,
        passage: note.passage,
        additionalPassages: note.additionalPassages,
        contextualAnalysis: note.analysis,
      });
      const now = new Date().toISOString();
      statements.push({
        sql: `INSERT INTO knowledge_proposals(id,document_id,semantic_unit_id,proposal_kind,payload_json,method,confidence,review_status,created_at,updated_at)
        VALUES(?,?,?,'passage-relation',?,?,0,'machine-proposed',?,?)`,
        bind: [proposalId, document.id, unitId, JSON.stringify(payload), method, now, now],
      });
      statements.push({
        sql: `INSERT INTO pipeline_decisions(proposal_id,publication,origin,evidence_json,configuration_key,audit_status,updated_at)
        VALUES(?,'machine-visible','inferred',?,?,'pending',?)`,
        bind: [
          proposalId,
          JSON.stringify({
            policy: "operator-requested-contextual-reading-v1",
            batchId: batch.batchId,
            analyst: batch.analyst,
            coverage: batch.coverage,
            readAt: batch.createdAt,
            decisions: [{ rationale: note.analysis.rationale, evidenceQuote: unitText }],
          }),
          batch.batchId,
          now,
        ],
      });
      for (const domain of note.domains)
        statements.push({
          sql: `INSERT OR IGNORE INTO knowledge_proposals(id,document_id,semantic_unit_id,proposal_kind,payload_json,method,confidence,review_status,created_at,updated_at)
        VALUES(?,?,?,'topic-assignment',?,?,0,'machine-proposed',?,?)`,
          bind: [
            `${proposalId}:${domain}`,
            document.id,
            unitId,
            JSON.stringify({
              kind: "topic-assignment",
              domain,
              evidence: [note.analysis.rationale],
            }),
            method,
            now,
            now,
          ],
        });
    }
    // All pages and references were checked before the first write. A failed batch rolls back.
    await db.transaction(statements);
    notifyKnowledgeMutation();
    return {
      batchId: batch.batchId,
      imported: batch.notes.length - reused,
      reused,
      coverage: batch.coverage,
    };
  },
};
