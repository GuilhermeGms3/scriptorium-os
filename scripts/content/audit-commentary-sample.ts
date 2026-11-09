import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { KnowledgeProposalPayloadSchema } from "../../src/lib/domain/document-knowledge";
import { ScriptureRepository } from "../../src/lib/repositories/scripture-repository";

const [workspace, output] = process.argv.slice(2);
if (!workspace || !output)
  throw Error("Uso: audit-commentary-sample <db> <diretório privado novo>");
const db = new DatabaseSync(resolve(workspace), { readOnly: true });
const visible =
  "(review_status='accepted' OR (review_status='machine-proposed' AND EXISTS(SELECT 1 FROM pipeline_decisions d WHERE d.proposal_id=knowledge_proposals.id AND d.publication='machine-visible')))";
const checksums = [
  "504c2c2665f24c40bf29287605cacc5f1e81e05206fcd4c6452a0fab9cd7bc6c",
  "a901dfef17ef8d189814e3229776f6b9520bbffac714e84df13fcc9010cf1cca",
  "700c3f290980fa55de76fd464dfdc7fc663ab2ee39efb73524a10ae49723c11f",
  "b5341f8eeb9650129c6487e5ba1f1d10177a9e65cdaa9e1d7f0472bb2b17c91c",
];
try {
  mkdirSync(resolve(output), { recursive: true });
  const samples = [];
  for (const sha of checksums) {
    const doc = db.prepare("SELECT id,title FROM private_documents WHERE checksum=?").get(sha);
    if (!doc) throw Error("Fonte ausente");
    const books = db
      .prepare(
        `SELECT DISTINCT json_extract(payload_json,'$.passage.bookId') book FROM knowledge_proposals WHERE document_id=? AND proposal_kind='passage-relation' AND json_type(payload_json,'$.contextualAnalysis')='object' AND ${visible} ORDER BY book`,
      )
      .all(doc["id"]!);
    const order = new Map(ScriptureRepository.listBooks().map((book, index) => [book.id, index]));
    books.sort(
      (a, b) => (order.get(String(a["book"])) ?? 999) - (order.get(String(b["book"])) ?? 999),
    );
    const selected = [
      ...new Set(
        Array.from({ length: 6 }, (_, i) =>
          String(books[Math.floor((i * (books.length - 1)) / 5)]?.["book"]),
        ),
      ),
    ];
    for (const book of selected) {
      const row = db
        .prepare(
          `SELECT id,payload_json,semantic_unit_id FROM knowledge_proposals WHERE document_id=? AND proposal_kind='passage-relation' AND json_extract(payload_json,'$.passage.bookId')=? AND json_type(payload_json,'$.contextualAnalysis')='object' AND ${visible} ORDER BY json_extract(payload_json,'$.passage.chapter'),json_extract(payload_json,'$.passage.verseStart'),id LIMIT 1`,
        )
        .get(doc["id"]!, book);
      if (!row) continue;
      const payload = KnowledgeProposalPayloadSchema.parse(JSON.parse(String(row["payload_json"])));
      if (payload.kind !== "passage-relation") throw Error("Tipo inválido");
      const spans = db
        .prepare(
          "SELECT s.page_index,s.start_offset,s.end_offset,p.text FROM semantic_unit_spans s JOIN private_document_pages p ON p.id=s.page_id WHERE s.unit_id=? ORDER BY s.ordinal",
        )
        .all(row["semantic_unit_id"]!);
      const literal = spans
        .map((s) => String(s["text"]).slice(Number(s["start_offset"]), Number(s["end_offset"])))
        .join(" ");
      const validSpans =
        spans.length > 0 &&
        spans.every(
          (s) =>
            Number(s["start_offset"]) >= 0 &&
            Number(s["end_offset"]) <= String(s["text"]).length &&
            Number(s["end_offset"]) > Number(s["start_offset"]),
        );
      const exact =
        payload.contextualAnalysis?.mode === "source-excerpt"
          ? literal.replace(/\s/gu, "") === payload.contextualAnalysis.summary.replace(/\s/gu, "")
          : null;
      samples.push({
        id: row["id"],
        documentId: doc["id"],
        title: doc["title"],
        book,
        scope: payload.relationScope,
        passage: payload.passage,
        pages: spans.map((s) => Number(s["page_index"]) + 1),
        validSpans,
        exactLiteral: exact,
        scopePlacement:
          payload.relationScope === "chapter"
            ? "panorama-not-each-verse"
            : "according-to-declared-range",
        primaryReference: payload.rawReference,
        secondaryReferences: payload.secondaryReferences ?? [],
        summary: payload.contextualAnalysis?.summary,
        literal,
        contextualReview: "not-individually-confirmed",
        qualification:
          "Conferência estrutural não substitui leitura contextual da fonte e não altera review_status.",
      });
    }
  }
  const report = {
    format: "scriptorium-commentary-audit-v1",
    createdAt: new Date().toISOString(),
    sampling:
      "Seis livros estratificados por fonte; primeiro contexto em cada estrato. Amostra determinística exploratória, não estatística de precisão/recall.",
    samples,
    summary: {
      samples: samples.length,
      invalidSpans: samples.filter((s) => !s.validSpans).length,
      literalMismatch: samples.filter((s) => s.exactLiteral === false).length,
      literalNotApplicable: samples.filter((s) => s.exactLiteral === null).length,
    },
    limitations: [
      "Não certifica todas as notas nem todos os capítulos.",
      "Não aprova propostas nem substitui revisões existentes.",
    ],
  };
  writeFileSync(join(resolve(output), "audit.json"), JSON.stringify(report, null, 2), {
    flag: "wx",
    mode: 0o600,
  });
  console.log(JSON.stringify(report.summary));
} finally {
  db.close();
}
