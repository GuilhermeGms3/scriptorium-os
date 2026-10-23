import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";
import { thematicReadings } from "../../src/lib/repositories/thematic-reading-repository";
import { DocumentKnowledgeRepository } from "../../src/lib/repositories/document-knowledge-repository";
import { privateLexicalReadings } from "../../src/lib/application/private-lexicon-service";

const [workspace] = process.argv.slice(2);
if (!workspace) throw Error("Uso: verify-thematic-readings <workspace.sqlite3>");
const db = new DatabaseSync(workspace, { readOnly: true });
const adapter: WorkspaceDatabase = {
  persistence: "installation",
  query: async (sql, bind = []) => db.prepare(sql).all(...bind) as WorkspaceRow[],
  execute: async () => {
    throw Error("Somente leitura.");
  },
  transaction: async () => {
    throw Error("Somente leitura.");
  },
  reset: async () => {
    throw Error("Somente leitura.");
  },
};
try {
  const sources = db
    .prepare(
      `SELECT d.id,d.title,count(*) entries,
    sum(json_type(p.payload_json,'$.studyContext.headword')='object') lexical
    FROM knowledge_proposals p JOIN private_documents d ON d.id=p.document_id
    WHERE p.method='documentary-thematic:v1' GROUP BY d.id ORDER BY d.title`,
    )
    .all();
  let samples = 0;
  for (const source of sources) {
    const rows = db
      .prepare(
        "SELECT semantic_unit_id FROM knowledge_proposals WHERE document_id=? AND method='documentary-thematic:v1' ORDER BY id",
      )
      .all(source["id"]!);
    const ids = [
      ...new Set(
        Array.from({ length: Math.min(6, rows.length) }, (_, i) =>
          String(
            rows[Math.floor((i * (rows.length - 1)) / Math.max(1, Math.min(6, rows.length) - 1))]![
              "semantic_unit_id"
            ],
          ),
        ),
      ),
    ];
    for (const unit of await DocumentKnowledgeRepository.listUnits(
      String(source["id"]),
      ids,
      adapter,
    )) {
      if (createHash("sha256").update(unit.text).digest("hex") !== unit.textChecksum)
        throw Error("Evidência reconstruída divergente.");
      samples++;
    }
  }
  const topics = [];
  for (const id of [
    "study-guide:teologia",
    "study-guide:pneumatologia",
    "study-guide:escatologia",
    "study-guide:hermeneutica-metodos",
  ]) {
    const start = performance.now();
    const readings = await thematicReadings(id, adapter);
    topics.push({
      id,
      readings: readings.length,
      sources: new Set(readings.map((r) => r.title)).size,
      milliseconds: Math.round(performance.now() - start),
    });
  }
  const lexical = await privateLexicalReadings(["λόγος"], adapter);
  if (!lexical.some((entry) => entry.identified && entry.lemma === "λόγος"))
    throw Error("Verbete grego indisponível.");
  const violations = db.prepare("PRAGMA foreign_key_check").all().length;
  if (violations) throw Error("Relacionamentos inválidos.");
  console.info(
    JSON.stringify(
      {
        mode: "read-only",
        sources,
        samplesWithMatchingChecksum: samples,
        topics,
        logos: lexical.map((entry) => ({ page: entry.page, identified: entry.identified })),
        violations,
      },
      null,
      2,
    ),
  );
} finally {
  db.close();
}
