import {
  TraceFilterSchema,
  TraceRowSchema,
  TraceEventSchema,
  type TraceFilter,
} from "../domain/knowledge-trace";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";

const joins = `FROM knowledge_proposals p
  JOIN private_documents doc ON doc.id=p.document_id
  LEFT JOIN pipeline_decisions d ON d.proposal_id=p.id`;
const stateExpression = `CASE WHEN p.review_status='accepted' THEN 'visible'
  WHEN p.review_status='rejected' OR d.publication='revoked' THEN 'blocked'
  WHEN d.publication='machine-visible' THEN 'visible' ELSE 'pending' END`;

export const KnowledgeTraceRepository = {
  async list(input: TraceFilter = {}, database?: WorkspaceDatabase) {
    const filter = TraceFilterSchema.parse(input);
    const db = database ?? (await getWorkspaceDatabase());
    const clauses = ["p.proposal_kind='passage-relation'"];
    const bind: WorkspaceSqlValue[] = [];
    if (filter.documentId) {
      clauses.push("p.document_id=?");
      bind.push(filter.documentId);
    }
    if (filter.state !== "all") {
      clauses.push(`(${stateExpression})=?`);
      bind.push(filter.state);
    }
    if (filter.bookId || filter.scheme || filter.chapter || filter.verse) {
      const targetClauses: string[] = [];
      for (const [field, value] of [
        ["bookId", filter.bookId],
        ["versificationSchemeId", filter.scheme],
      ] as const) {
        if (value) {
          targetClauses.push(`json_extract(target.value,'$.${field}')=?`);
          bind.push(value);
        }
      }
      if (filter.chapter) {
        targetClauses.push(
          "(json_extract(target.value,'$.chapter') IS NULL OR json_extract(target.value,'$.chapter')=?)",
        );
        bind.push(filter.chapter);
      }
      if (filter.verse) {
        targetClauses.push(`(json_extract(target.value,'$.verseStart') IS NULL OR
          (json_extract(target.value,'$.verseStart')<=? AND
           coalesce(json_extract(target.value,'$.verseEnd'),json_extract(target.value,'$.verseStart'))>=?))`);
        bind.push(filter.verse, filter.verse);
      }
      clauses.push(`EXISTS(SELECT 1 FROM json_each(json_insert(
        coalesce(json_extract(p.payload_json,'$.additionalPassages'),'[]'),
        '$[#]',json_extract(p.payload_json,'$.passage'))) target WHERE ${targetClauses.join(" AND ")})`);
    }
    const where = clauses.join(" AND ");
    // The older address index otherwise wins without ANALYZE and sorts every passage relation.
    const listJoins = joins.replace(
      "knowledge_proposals p",
      filter.documentId
        ? "knowledge_proposals p INDEXED BY idx_knowledge_trace_document_page"
        : "knowledge_proposals p INDEXED BY idx_knowledge_trace_active_page",
    );
    const rows = await db.query(
      `SELECT p.id,p.document_id,p.semantic_unit_id,doc.title,doc.checksum,
      p.payload_json,p.method,p.review_status,p.review_note,p.updated_at,
      d.publication,d.origin,d.audit_status,d.evidence_json,d.configuration_key,
      (SELECT min(page_index) FROM semantic_unit_spans s WHERE s.unit_id=p.semantic_unit_id) page_index
      ${listJoins} WHERE ${where} ORDER BY p.updated_at DESC,p.id LIMIT 41 OFFSET ?`,
      [...bind, filter.offset],
    );
    return {
      rows: rows.slice(0, 40).map((row) => TraceRowSchema.parse(row)),
      hasMore: rows.length > 40,
      persistence: db.persistence,
    };
  },
  async detail(id: string, database?: WorkspaceDatabase) {
    const db = database ?? (await getWorkspaceDatabase());
    const [rows, events] = await Promise.all([
      db.query(
        `SELECT p.id,p.document_id,p.semantic_unit_id,doc.title,doc.checksum,
        p.payload_json,p.method,p.review_status,p.review_note,p.updated_at,
        d.publication,d.origin,d.audit_status,d.evidence_json,d.configuration_key,
        (SELECT min(page_index) FROM semantic_unit_spans s WHERE s.unit_id=p.semantic_unit_id) page_index
        ${joins} WHERE p.id=? AND p.proposal_kind='passage-relation'`,
        [id],
      ),
      db.query(
        "SELECT * FROM knowledge_trace_events WHERE proposal_id=? ORDER BY occurred_at DESC,rowid DESC LIMIT 101",
        [id],
      ),
    ]);
    return {
      row: rows[0] ? TraceRowSchema.parse(rows[0]) : null,
      events: events.slice(0, 100).map((row) => TraceEventSchema.parse(row)),
      olderEvents: events.length > 100,
    };
  },
  async documents(database?: WorkspaceDatabase) {
    const db = database ?? (await getWorkspaceDatabase());
    const rows =
      await db.query(`SELECT doc.id,doc.title,count(p.id) links FROM private_documents doc
      LEFT JOIN knowledge_proposals p ON p.document_id=doc.id AND p.proposal_kind='passage-relation'
      GROUP BY doc.id ORDER BY doc.title LIMIT 1000`);
    return rows.map((row) => ({
      id: String(row["id"]),
      title: String(row["title"]),
      links: Number(row["links"]),
    }));
  },
};
