import { z } from "zod";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";
import { TraceFilterSchema, type TraceFilter } from "../domain/knowledge-trace";

const Row = z.object({
  id: z.string(),
  title: z.string(),
  checksum: z.string(),
  pages: z.number(),
  extracted: z.number(),
  structured: z.number(),
  linked: z.number(),
  contexts: z.number(),
  available: z.number(),
  proof_texts: z.number(),
  audited: z.number(),
  thematic: z.number(),
  lexical: z.number(),
});
export type LibraryUtilization = z.infer<typeof Row>;
/** Counts are computed in SQLite. A visible link is not a reviewed interpretation. */
export async function libraryUtilization(
  input: TraceFilter = {},
  database?: WorkspaceDatabase,
): Promise<LibraryUtilization[]> {
  const filter = TraceFilterSchema.parse(input);
  const db = database ?? (await getWorkspaceDatabase());
  const targets = ["json_extract(p.payload_json,'$.passage')", "target.value"];
  const binds: (string | number)[] = [];
  const alternatives = targets.map((target) => {
    const conditions: string[] = [];
    for (const [field, value] of [
      ["bookId", filter.bookId],
      ["versificationSchemeId", filter.scheme],
    ] as const) {
      if (value) {
        conditions.push(`json_extract(${target},'$.${field}')=?`);
        binds.push(value);
      }
    }
    if (filter.chapter) {
      conditions.push(
        `(json_extract(${target},'$.chapter') IS NULL OR json_extract(${target},'$.chapter')=?)`,
      );
      binds.push(filter.chapter);
    }
    if (filter.verse) {
      conditions.push(
        `(json_extract(${target},'$.verseStart') IS NULL OR (json_extract(${target},'$.verseStart')<=? AND coalesce(json_extract(${target},'$.verseEnd'),json_extract(${target},'$.verseStart'))>=?))`,
      );
      binds.push(filter.verse, filter.verse);
    }
    return conditions.join(" AND ") || "1=1";
  });
  const rows = await db.query(
    `WITH matched AS (
    SELECT p.*,d.publication,d.audit_status FROM knowledge_proposals p
    LEFT JOIN pipeline_decisions d ON d.proposal_id=p.id
    WHERE p.proposal_kind='passage-relation' AND (
      (${alternatives[0]}) OR EXISTS(SELECT 1 FROM json_each(p.payload_json,'$.additionalPassages') target WHERE ${alternatives[1]})
    )
  ), counts AS (
    SELECT document_id,count(*) linked,
    sum(json_type(payload_json,'$.contextualAnalysis')='object') contexts,
    sum(json_type(payload_json,'$.contextualAnalysis')='object' AND
      (review_status='accepted' OR (review_status='machine-proposed' AND publication='machine-visible'))) available,
    sum(json_extract(payload_json,'$.referenceRole')='proof-text') proof_texts,
    sum(review_status='accepted' OR audit_status='confirmed') audited FROM matched GROUP BY document_id
  ), units AS (SELECT document_id,count(*) n FROM semantic_units GROUP BY document_id),
  thematic AS (SELECT document_id,
    sum(json_type(payload_json,'$.studyContext.headword') IS NULL) n,
    sum(json_type(payload_json,'$.studyContext.headword')='object') lexical FROM knowledge_proposals
    WHERE proposal_kind='topic-assignment' AND review_status<>'rejected'
    AND json_type(payload_json,'$.studyContext')='object' GROUP BY document_id)
  SELECT doc.id,doc.title,doc.checksum,doc.page_count pages,doc.text_page_count extracted,
    coalesce(units.n,0) structured,coalesce(c.linked,0) linked,coalesce(c.contexts,0) contexts,
    coalesce(c.available,0) available,coalesce(c.proof_texts,0) proof_texts,coalesce(c.audited,0) audited,
    coalesce(thematic.n,0) thematic,coalesce(thematic.lexical,0) lexical
  FROM private_documents doc LEFT JOIN units ON units.document_id=doc.id LEFT JOIN counts c ON c.document_id=doc.id
  LEFT JOIN thematic ON thematic.document_id=doc.id
  ${filter.documentId ? "WHERE doc.id=?" : ""} ORDER BY doc.title COLLATE NOCASE`,
    [...binds, ...(filter.documentId ? [filter.documentId] : [])],
  );
  return rows.map((row) => Row.parse(row));
}
