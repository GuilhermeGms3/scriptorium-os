import { DatabaseSync } from "node:sqlite";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ScriptureRepository } from "../../src/lib/repositories/scripture-repository";
import { bookLabel } from "../../src/lib/i18n";

// Read-only snapshot for the Python worker. No second writer or publication path.
const [workspace, checksum, destination] = process.argv.slice(2);
if (!workspace || !checksum || !destination || !/^[a-f0-9]{64}$/u.test(checksum))
  throw new Error(
    "Uso: tsx scripts/content/export-commentary-source.ts <workspace> <sha256> <snapshot privado.json>",
  );
if (!existsSync(resolve(workspace))) throw new Error("Workspace ausente.");
const db = new DatabaseSync(resolve(workspace), { readOnly: true });
const canon = new DatabaseSync(resolve("public/corpus-packages/biblia-livre-n4-2025.1.0.sqlite3"), {
  readOnly: true,
});
try {
  const document = db
    .prepare("SELECT id,title,checksum FROM private_documents WHERE checksum=?")
    .get(checksum);
  if (!document) throw new Error("Fonte não instalada.");
  const pages = db
    .prepare(
      "SELECT page_index+1 AS physicalPage,text FROM private_document_pages WHERE document_id=? ORDER BY page_index",
    )
    .all(document["id"]!);
  const protectedSpans = db
    .prepare(
      `SELECT s.page_index+1 AS physicalPage,s.start_offset AS startOffset,s.end_offset AS endOffset FROM semantic_unit_spans s JOIN semantic_units u ON u.id=s.unit_id WHERE u.document_id=? AND u.method LIKE 'assistant-contextual-reading:%'`,
    )
    .all(document["id"]!);
  const books = ScriptureRepository.listBooks()
    .filter((book) => book.testament !== "other")
    .map((book) => ({
      id: book.id,
      aliases: [bookLabel(book.id), book.name],
      verseLimits: canon
        .prepare(
          "SELECT chapter,max(verse_end) AS lastVerse FROM text_addresses WHERE book_id=? GROUP BY chapter ORDER BY chapter",
        )
        .all(book.id),
    }));
  writeFileSync(
    resolve(destination),
    JSON.stringify({
      format: "scriptorium-commentary-source-v1",
      checksum,
      title: document["title"],
      pages,
      protectedSpans,
      books,
    }),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    JSON.stringify({ pages: pages.length, protectedSpans: protectedSpans.length, destination }),
  );
} finally {
  db.close();
  canon.close();
}
