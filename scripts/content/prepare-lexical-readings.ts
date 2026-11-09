import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  greekDictionaryEntries,
  normalizeHeadword,
} from "../../src/lib/domain/private-lexical-entry";
import { ThematicReadingPackageSchema } from "../../src/lib/domain/thematic-reading";

const [workspace, output] = process.argv.slice(2);
if (!workspace || !output)
  throw Error("Uso: prepare-lexical-readings <workspace.sqlite3> <diretório privado novo>");
const checksum = "d061bc0742a1cfa93e6f8023b9e1e7857f430b32d8691f8f3974c9ee85433979";
const db = new DatabaseSync(resolve(workspace), { readOnly: true });
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
try {
  const doc = db.prepare("SELECT id FROM private_documents WHERE checksum=?").get(checksum);
  if (!doc) throw Error("Edição exata não instalada.");
  const entries = db
    .prepare(
      "SELECT page_index,text FROM private_document_pages WHERE document_id=? ORDER BY page_index",
    )
    .all(doc["id"]!)
    .flatMap((page) => {
      const text = String(page["text"]);
      const physicalPage = Number(page["page_index"]) + 1;
      if (physicalPage < 10) return [];
      return greekDictionaryEntries(text).map((entry) => ({
        domain: "linguistics",
        context: {
          topicIds: ["study-guide:exegese-recepcao", "study-guide:hermeneutica-metodos"],
          locator: `Gingrich–Danker · ${entry.lemma} · p. ${physicalPage}`,
          sectionPath: ["Léxico Grego–Português", entry.lemma],
          role: "entry",
          author:
            "F. Wilbur Gingrich; revisão de Frederick W. Danker; tradução de Júlio P. T. Zabatiero",
          tradition: "Fonte lexicográfica; significados dependem do contexto",
          rationale:
            "Lema identificado no cabeçalho grego desta edição; o verbete termina no próximo cabeçalho reconhecido, não em uma simples menção no corpo.",
          limitations: [
            "Delimitação automática local à página, sem revisão individual. Entradas finais e continuações incertas não foram indexadas.",
            "Números e referências da fonte não são identidade lexical universal nem alinham traduções palavra a palavra.",
          ],
          headword: {
            lemma: entry.lemma,
            normalized: normalizeHeadword(entry.lemma),
            language: "grc",
            extent: "page-local",
          },
        },
        fragments: [
          {
            physicalPage,
            pageTextChecksum: hash(text),
            startOffset: entry.start,
            endOffset: entry.end,
            quote: text.slice(entry.start, entry.end),
          },
        ],
      }));
    })
    .filter(
      (entry) =>
        entry.fragments[0]!.quote.length >= 20 && entry.fragments[0]!.quote.length <= 12000,
    );
  const batches = [];
  for (let i = 0; i < entries.length; i += 80)
    batches.push(
      ThematicReadingPackageSchema.parse({
        format: "scriptorium-thematic-readings-v1",
        sourceChecksum: checksum,
        entries: entries.slice(i, i + 80),
      }),
    );
  mkdirSync(resolve(output));
  const files = batches.map((batch, index) => {
    const raw = JSON.stringify(batch);
    const file = `${checksum.slice(0, 12)}-${String(index).padStart(4, "0")}.json`;
    writeFileSync(join(resolve(output), file), raw, { mode: 0o600, flag: "wx" });
    return { file, sha256: hash(raw) };
  });
  writeFileSync(
    join(resolve(output), "report.json"),
    JSON.stringify({
      format: "scriptorium-thematic-report-v1",
      sourceChecksum: checksum,
      entries: entries.length,
      files,
      limitations: ["Page-local entries only; no Hebrew entries inferred from OCR"],
    }),
    { flag: "wx", mode: 0o600 },
  );
  console.info(JSON.stringify({ entries: entries.length, batches: batches.length, output }));
} finally {
  db.close();
}
