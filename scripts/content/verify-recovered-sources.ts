import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { DocumentKnowledgeRepository } from "../../src/lib/repositories/document-knowledge-repository";
import { thematicReadings } from "../../src/lib/repositories/thematic-reading-repository";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";

const [workspace, output] = process.argv.slice(2);
if (!workspace || !output)
  throw Error("Use verify-recovered-sources <workspace> <relatório privado.json>.");
const native = new DatabaseSync(resolve(workspace), { readOnly: true });
const db: WorkspaceDatabase = {
  persistence: "installation",
  async query(sql, bind = []) {
    return native.prepare(sql).all(...bind) as WorkspaceRow[];
  },
  async execute() {
    throw Error("Auditoria somente leitura.");
  },
  async transaction() {
    throw Error("Auditoria somente leitura.");
  },
  async reset() {
    throw Error("Auditoria não apaga o acervo.");
  },
};
try {
  const documents = await db.query(`SELECT d.checksum,d.title,d.page_count,d.text_page_count,
    (SELECT count(*) FROM knowledge_proposals p WHERE p.document_id=d.id
      AND json_type(p.payload_json,'$.studyContext')='object' AND p.review_status<>'rejected') thematic,
    (SELECT count(*) FROM knowledge_proposals p JOIN pipeline_decisions x ON x.proposal_id=p.id
      WHERE p.document_id=d.id AND json_type(p.payload_json,'$.contextualAnalysis')='object'
      AND x.publication='machine-visible') contextual
    FROM private_documents d WHERE d.checksum IN
    (SELECT source_checksum FROM document_page_layouts WHERE revision LIKE '%tsv-literal-v1%') ORDER BY d.title`);
  const readings = await thematicReadings("study-guide:hermeneutica-metodos", db);
  const visible = await DocumentKnowledgeRepository.listVisiblePassageRelations(
    {
      bookId: "matthew",
      workId: "work:matthew",
      chapter: 1,
      verseStart: 1,
      versificationSchemeId: "scriptorium-bcv-1",
    },
    db,
  );
  const cultural = visible.filter(
    (p) =>
      p.payload.kind === "passage-relation" &&
      p.payload.contextualAnalysis?.sourceContext?.kind === "cultural-commentary",
  );
  if (!cultural.length) throw Error("O Reader não encontrou o contexto cultural em Mateus1:1.");
  if (!readings.some((r) => r.title.toLowerCase().includes("wegner")))
    throw Error("Guia de hermenêutica não encontrou Wegner.");
  const foreignKeys = await db.query("PRAGMA foreign_key_check");
  if (foreignKeys.length) throw Error("Auditoria detectou referências órfãs.");
  const culturalBooks =
    await db.query(`SELECT DISTINCT json_extract(p.payload_json,'$.passage.bookId') book
    FROM knowledge_proposals p JOIN pipeline_decisions d ON d.proposal_id=p.id
    WHERE json_extract(p.payload_json,'$.contextualAnalysis.sourceContext.kind')='cultural-commentary'
    AND d.publication='machine-visible' AND p.review_status<>'rejected' ORDER BY book`);
  if (culturalBooks.length !== 27)
    throw Error("O contexto cultural não alcançou todos os 27 livros do NT.");
  const report = {
    checkedAt: new Date().toISOString(),
    documents,
    readerMatthew1: cultural.length,
    culturalBooks: culturalBooks.map((row) => row["book"]),
    methodologicalReadingsVisible: readings.length,
    foreignKeys: foreignKeys.length,
    limitations: ["Verificação de consultas reais; não é revisão histórica/teológica integral."],
  };
  writeFileSync(resolve(output), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
} finally {
  native.close();
}
