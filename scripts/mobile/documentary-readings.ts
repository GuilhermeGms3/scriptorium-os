import type { DatabaseSync } from "node:sqlite";
import { KnowledgeProposalPayloadSchema } from "../../src/lib/domain/document-knowledge";

/** Optional additive projection: older mobile packages remain readable, desktop stays untouched. */
export function projectDocumentaryReadings(source: DatabaseSync, output: DatabaseSync): void {
  output.exec(`
    CREATE TABLE documentary_readings(id TEXT NOT NULL,ordinal INTEGER NOT NULL,
      document_id TEXT NOT NULL REFERENCES documents(id),page_id TEXT NOT NULL REFERENCES pages(id),
      start_offset INTEGER NOT NULL CHECK(start_offset>=0),end_offset INTEGER NOT NULL CHECK(end_offset>start_offset),
      role TEXT NOT NULL,headword TEXT,payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
      PRIMARY KEY(id,ordinal));
    CREATE INDEX documentary_headword ON documentary_readings(headword);
    CREATE TABLE documentary_topics(reading_id TEXT NOT NULL,ordinal INTEGER NOT NULL,topic_id TEXT NOT NULL,
      PRIMARY KEY(topic_id,reading_id,ordinal),
      FOREIGN KEY(reading_id,ordinal) REFERENCES documentary_readings(id,ordinal));
  `);
  const insert = output.prepare("INSERT INTO documentary_readings VALUES(?,?,?,?,?,?,?,?,?)");
  const topic = output.prepare("INSERT INTO documentary_topics VALUES(?,?,?)");
  for (const row of source
    .prepare(
      `SELECT p.* FROM knowledge_proposals p
    LEFT JOIN pipeline_decisions d ON d.proposal_id=p.id
    WHERE p.proposal_kind='topic-assignment' AND p.method='documentary-thematic:v1'
    AND p.review_status<>'rejected'
    AND (d.publication IS NULL OR d.publication NOT IN ('revoked','withheld','exception'))
    ORDER BY p.id`,
    )
    .iterate()) {
    const parsed = KnowledgeProposalPayloadSchema.safeParse(
      JSON.parse(String(row["payload_json"])) as unknown,
    );
    if (!parsed.success || parsed.data.kind !== "topic-assignment" || !parsed.data.studyContext)
      continue;
    const context = parsed.data.studyContext;
    for (const span of source
      .prepare("SELECT * FROM semantic_unit_spans WHERE unit_id=? ORDER BY ordinal")
      .iterate(row["semantic_unit_id"]!)) {
      const page = output
        .prepare("SELECT text,document_id FROM pages WHERE id=?")
        .get(span["page_id"]!);
      const start = Number(span["start_offset"]),
        end = Number(span["end_offset"]);
      if (
        !page ||
        page["document_id"] !== row["document_id"] ||
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end <= start ||
        end > String(page["text"]).length
      )
        throw Error("Leitura documental com evidência inválida; exportação interrompida.");
      insert.run(
        row["id"]!,
        span["ordinal"]!,
        row["document_id"]!,
        span["page_id"]!,
        start,
        end,
        context.role,
        context.headword?.normalized ?? null,
        JSON.stringify(context),
      );
      for (const id of new Set(context.topicIds)) topic.run(row["id"]!, span["ordinal"]!, id);
    }
  }
}
