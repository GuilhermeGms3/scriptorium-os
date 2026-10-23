import { ThematicReadingPackageSchema } from "../domain/thematic-reading";
import { KnowledgeProposalPayloadSchema } from "../domain/document-knowledge";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";
import { sha256Hex } from "../workspace-runtime/secure-context";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";
import { normalizeHeadword } from "../domain/private-lexical-entry";

export const THEMATIC_METHOD = "documentary-thematic:v1";

/** Additive, edition-pinned publication into the canonical units/proposals, never a reindex. */
export async function importThematicReadings(raw: string, database?: WorkspaceDatabase) {
  if (new TextEncoder().encode(raw).byteLength > 4 * 1024 * 1024) throw Error("Lote excede 4 MiB.");
  const batch = ThematicReadingPackageSchema.parse(JSON.parse(raw) as unknown);
  const db = database ?? (await getWorkspaceDatabase());
  if (!database && db.persistence === "memory")
    throw Error("A incorporação exige armazenamento persistente.");
  const document = (
    await db.query("SELECT id,language FROM private_documents WHERE checksum=?", [
      batch.sourceChecksum,
    ])
  )[0];
  if (!document) throw Error("A edição exata não está instalada.");
  const documentId = String(document["id"]);
  const statements: Parameters<WorkspaceDatabase["transaction"]>[0] = [];
  let ordinal = Number(
    (
      await db.query(
        "SELECT coalesce(max(ordinal),-1)+1 n FROM semantic_units WHERE document_id=?",
        [documentId],
      )
    )[0]?.["n"],
  );
  let reused = 0;
  const planned = new Set<string>();
  const plannedUnits = new Set<string>();
  for (const entry of batch.entries) {
    if (
      entry.context.headword &&
      (entry.context.role !== "entry" ||
        entry.fragments.length !== 1 ||
        normalizeHeadword(entry.context.headword.lemma) !== entry.context.headword.normalized)
    )
      throw Error("Verbete exige lema normalizado e um intervalo local à página.");
    const fragments = [];
    for (const fragment of entry.fragments) {
      const page = (
        await db.query(
          "SELECT id,text FROM private_document_pages WHERE document_id=? AND page_index=?",
          [documentId, fragment.physicalPage - 1],
        )
      )[0];
      if (
        !page ||
        (await sha256Hex(String(page["text"]))) !== fragment.pageTextChecksum ||
        fragment.endOffset <= fragment.startOffset ||
        fragment.endOffset > String(page["text"]).length ||
        String(page["text"]).slice(fragment.startOffset, fragment.endOffset) !== fragment.quote
      ) {
        throw Error("Página, offsets ou evidência divergentes. Lote não gravado.");
      }
      fragments.push({ ...fragment, pageId: String(page["id"]) });
    }
    const payload = KnowledgeProposalPayloadSchema.parse({
      kind: "topic-assignment",
      domain: entry.domain,
      evidence: [entry.context.rationale],
      studyContext: entry.context,
    });
    const seed = await sha256Hex(
      JSON.stringify({ checksum: batch.sourceChecksum, fragments: entry.fragments, payload }),
    );
    const proposalId = `${documentId}:thematic:${seed}`;
    if (planned.has(proposalId)) throw Error("Entrada repetida no mesmo lote.");
    planned.add(proposalId);
    if ((await db.query("SELECT id FROM knowledge_proposals WHERE id=?", [proposalId])).length) {
      reused++;
      continue;
    }
    // v24 allows shared evidence. Do not attach new metadata to another extractor's unit;
    // this stable source-span identity is reused across thematic assignments and batches.
    const unitId = `${documentId}:thematic-unit:${await sha256Hex(JSON.stringify(entry.fragments))}`;
    const textChecksum = await sha256Hex(fragments.map((f) => f.quote).join("\n"));
    const existingUnit = (
      await db.query("SELECT document_id,text_checksum FROM semantic_units WHERE id=?", [unitId])
    )[0];
    if (
      existingUnit &&
      (existingUnit["document_id"] !== documentId || existingUnit["text_checksum"] !== textChecksum)
    )
      throw Error("Unidade temática divergente; revisão anterior preservada.");
    if (!existingUnit && !plannedUnits.has(unitId)) {
      statements.push({
        sql: "INSERT INTO semantic_units(id,document_id,unit_kind,ordinal,text_checksum,language,method) VALUES(?,?,'paragraph',?,?,?,?)",
        bind: [
          unitId,
          documentId,
          ordinal++,
          textChecksum,
          String(document["language"] ?? "und"),
          THEMATIC_METHOD,
        ],
      });
      fragments.forEach((f, index) =>
        statements.push({
          sql: "INSERT INTO semantic_unit_spans(unit_id,page_id,page_index,start_offset,end_offset,ordinal) VALUES(?,?,?,?,?,?)",
          bind: [unitId, f.pageId, f.physicalPage - 1, f.startOffset, f.endOffset, index],
        }),
      );
      plannedUnits.add(unitId);
    }
    const now = new Date().toISOString();
    statements.push({
      sql: "INSERT INTO knowledge_proposals(id,document_id,semantic_unit_id,proposal_kind,payload_json,method,confidence,review_status,created_at,updated_at) VALUES(?,?,?,'topic-assignment',?,?,0,'machine-proposed',?,?)",
      bind: [proposalId, documentId, unitId, JSON.stringify(payload), THEMATIC_METHOD, now, now],
    });
  }
  // Validation of every source precedes the one atomic write. No approval or destructive begin().
  if (statements.length) await db.transaction(statements);
  if (!database) notifyKnowledgeMutation();
  return { imported: batch.entries.length - reused, reused };
}
