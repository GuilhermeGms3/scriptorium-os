import type { DatabaseSync } from "node:sqlite";
import { projectDocumentaryReadings } from "./documentary-readings";
import { STUDY_GUIDES, guideIdForNode } from "../../src/lib/content/study-guides";
import { STUDY_MAP_NODES, STUDY_MAP_EDGES } from "../../src/lib/content/study-learning-map";
import {
  TOPIC_PRIMERS,
  lessonForTopic,
  LESSON_REFERENCES,
} from "../../src/lib/content/study-lessons/catalog";
import { GENESIS_COURSE } from "../../src/lib/content/study-courses/genesis";
import { knowledgeLabel } from "../../src/lib/content/knowledge-presentation";
import {
  NAG_HAMMADI_CATALOG,
  NAG_HAMMADI_RIGHTS_NOTE,
} from "../../src/lib/content/nag-hammadi-catalog";

/** Additive consumption schema. v1 deliveries remain readable; desktop migrations are not altered. */
export const readingSchemaV2 = `
CREATE TABLE reading_catalog(id TEXT PRIMARY KEY,kind TEXT NOT NULL,title TEXT NOT NULL,payload_json TEXT NOT NULL CHECK(json_valid(payload_json)));
CREATE TABLE document_outline(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES documents(id),parent_id TEXT,title TEXT,page_start INTEGER NOT NULL,page_end INTEGER NOT NULL,ordinal INTEGER NOT NULL,review_status TEXT NOT NULL);
CREATE INDEX outline_document ON document_outline(document_id,ordinal);
CREATE TABLE bibliography(id TEXT PRIMARY KEY,title TEXT NOT NULL,payload_json TEXT NOT NULL CHECK(json_valid(payload_json)));
CREATE TABLE prepared_translations(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,source_checksum TEXT NOT NULL,language TEXT NOT NULL,body TEXT NOT NULL,metadata_json TEXT NOT NULL);
CREATE INDEX prepared_translation_source ON prepared_translations(source_id,language);
CREATE TABLE private_records(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES documents(id),unit_id TEXT NOT NULL,kind TEXT NOT NULL,payload_json TEXT NOT NULL,review_status TEXT NOT NULL,method TEXT NOT NULL);
CREATE INDEX private_records_kind ON private_records(kind,document_id);
CREATE TABLE trace_payloads(id TEXT PRIMARY KEY REFERENCES trace(id),payload_json TEXT NOT NULL);
CREATE TABLE personal_seed(id TEXT PRIMARY KEY,payload_json TEXT NOT NULL CHECK(json_valid(payload_json)));
PRAGMA user_version=2;
`;

export function writeReadingCatalog(output: DatabaseSync): void {
  output.exec(readingSchemaV2);
  const insert = output.prepare("INSERT INTO reading_catalog VALUES(?,?,?,?)");
  const add = (id: string, kind: string, title: string, payload: unknown) =>
    insert.run(id, kind, title, JSON.stringify(payload));
  add("study-map", "map", "Teologia", {
    nodes: STUDY_MAP_NODES.map((node) => ({ ...node, guideId: guideIdForNode(node) })),
    edges: STUDY_MAP_EDGES,
  });
  for (const guide of STUDY_GUIDES) {
    add(`guide:${guide.id}`, "guide", guide.title, guide);
    const lesson = lessonForTopic({ id: `study-guide:${guide.id}`, title: guide.title });
    if (lesson) add(`lesson:study-guide:${guide.id}`, "lesson", guide.title, lesson);
  }
  for (const id of Object.keys(TOPIC_PRIMERS)) {
    const lesson = lessonForTopic({ id, title: knowledgeLabel(id, "Estudo temático") });
    if (lesson) add(`lesson:${id}`, "lesson", lesson.title, lesson);
  }
  add(`course:${GENESIS_COURSE.id}`, "course", GENESIS_COURSE.title, GENESIS_COURSE);
  add("lesson-references", "references", "Referências editoriais", LESSON_REFERENCES);
  add("nag-hammadi", "ancient-catalog", "Nag Hammadi", {
    texts: NAG_HAMMADI_CATALOG,
    rightsNote: NAG_HAMMADI_RIGHTS_NOTE,
  });
}

const PERSONAL_TABLES = [
  "studies",
  "notes",
  "note_links",
  "note_folders",
  "note_placements",
  "note_references",
  "note_connections",
  "study_course_progress",
  "bookmarks",
  "highlights",
  "annotations",
  "study_links",
  "research_questions",
  "research_question_links",
] as const;
function hasTable(source: DatabaseSync, table: string): boolean {
  return !!source.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
}
export function projectReadingExtras(
  source: DatabaseSync,
  output: DatabaseSync,
  includePersonal = true,
): void {
  writeReadingCatalog(output);
  projectDocumentaryReadings(source, output);
  if (hasTable(source, "document_nodes")) {
    const insert = output.prepare("INSERT INTO document_outline VALUES(?,?,?,?,?,?,?,?)");
    for (const row of source
      .prepare(
        "SELECT * FROM document_nodes WHERE review_status!='rejected' ORDER BY document_id,ordinal",
      )
      .iterate()) {
      insert.run(
        row["id"]!,
        row["document_id"]!,
        row["parent_id"]!,
        row["title"]!,
        row["page_start"]!,
        row["page_end"]!,
        row["ordinal"]!,
        row["review_status"]!,
      );
    }
  }
  const bibliography = output.prepare("INSERT INTO bibliography VALUES(?,?,?)");
  for (const row of source.prepare("SELECT * FROM bibliographic_sources ORDER BY id").iterate()) {
    // Test fixtures may have only custody metadata. Real records always carry a title.
    bibliography.run(row["id"]!, row["title"] ?? "Referência sem título", JSON.stringify(row));
  }
  if (hasTable(source, "local_translations")) {
    const insert = output.prepare("INSERT INTO prepared_translations VALUES(?,?,?,?,?,?)");
    for (const row of source.prepare("SELECT * FROM local_translations ORDER BY id").iterate())
      insert.run(
        row["id"]!,
        row["source_id"]!,
        row["source_checksum"]!,
        row["target_language"]!,
        row["translated_text"]!,
        JSON.stringify(row),
      );
  }
  const record = output.prepare("INSERT INTO private_records VALUES(?,?,?,?,?,?,?)");
  for (const row of source
    .prepare(
      `SELECT p.* FROM knowledge_proposals p LEFT JOIN pipeline_decisions d ON d.proposal_id=p.id
    WHERE p.proposal_kind!='passage-relation' AND p.review_status!='rejected'
    AND (d.publication IS NULL OR d.publication NOT IN ('revoked','withheld','exception'))
    AND (p.review_status='accepted' OR d.publication='machine-visible') ORDER BY p.id`,
    )
    .iterate()) {
    record.run(
      row["id"]!,
      row["document_id"]!,
      row["semantic_unit_id"]!,
      row["proposal_kind"]!,
      row["payload_json"]!,
      row["review_status"]!,
      row["method"]!,
    );
  }
  if (
    source
      .prepare("PRAGMA table_info(knowledge_trace_events)")
      .all()
      .some((column) => column["name"] === "payload_json")
  ) {
    const insert = output.prepare("INSERT INTO trace_payloads VALUES(?,?)");
    for (const event of output.prepare("SELECT id FROM trace ORDER BY id").iterate()) {
      const row = source
        .prepare("SELECT payload_json FROM knowledge_trace_events WHERE id=?")
        .get(event["id"]!);
      if (row) insert.run(event["id"]!, row["payload_json"]!);
    }
  }
  const personal: Record<string, unknown> = {};
  for (const table of includePersonal ? PERSONAL_TABLES : [])
    if (hasTable(source, table)) {
      // Identifier comes exclusively from the constant allowlist above.
      personal[table] = source.prepare(`SELECT * FROM ${table}`).all();
    }
  output
    .prepare("INSERT INTO personal_seed VALUES(?,?)")
    .run("desktop-personal-v1", JSON.stringify(personal));
}
