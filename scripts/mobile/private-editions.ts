import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { applyMigrations } from "../database/migrate";
import { bookLabel } from "../../src/lib/i18n";

/** Read-only projection into the existing Android corpus contract, never a second workspace. */
export function projectPrivateEditions(
  source: DatabaseSync,
  root: string,
  output: string,
  selected?: string[],
) {
  if (selected?.length === 0) return [];
  if (!source.prepare("SELECT 1 FROM sqlite_master WHERE name='private_scripture_units'").get())
    return [];
  const editions = source
    .prepare(
      "SELECT e.* FROM private_scripture_editions e WHERE EXISTS(SELECT 1 FROM private_scripture_units u WHERE u.edition_id=e.id) ORDER BY e.id",
    )
    .all();
  return editions
    .filter((edition) => !selected || selected.includes(String(edition["id"])))
    .map((edition) => {
      const id = String(edition["id"]);
      const slug = "private-" + createHash("sha256").update(id).digest("hex").slice(0, 24);
      const path = `corpus/${slug}.sqlite3`;
      mkdirSync(join(output, "corpus"), { recursive: true });
      const destination = join(output, path);
      if (existsSync(destination))
        throw new Error("Projeção privada já existe; não foi sobrescrita.");
      const db = new DatabaseSync(destination);
      try {
        applyMigrations(db, join(root, "src/lib/corpus-runtime/migrations"));
        db.exec("BEGIN");
        db.prepare("INSERT INTO corpora VALUES(?,?,?,?,?)").run(
          slug,
          String(edition["title"]),
          "scripture",
          JSON.stringify({ privateUseOnly: true }),
          JSON.stringify({
            origin: "private-workspace",
            editionId: id,
            editorialPosition: edition["editorial_position"],
          }),
        );
        db.prepare("INSERT INTO corpus_editions VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(
          id,
          slug,
          edition["title"]!,
          edition["abbreviation"]!,
          edition["language"]!,
          "Latn",
          "ltr",
          "translation",
          "private-projection-v1",
          slug,
          createHash("sha256").update(id).digest("hex"),
        );
        db.prepare("INSERT INTO versification_schemes(id,name,description) VALUES(?,?,?)").run(
          "scriptorium-bcv-1",
          "Navegação Scriptorium",
          "Correspondência estrutural automática pendente de auditoria, não equivalência semântica certificada.",
        );
        const books = new Set<string>();
        const schemes = new Set(["scriptorium-bcv-1"]);
        const insertUnit = db.prepare("INSERT INTO text_units VALUES(?,?,?,?,?,?,?,?,?,?)");
        const insertAddress = db.prepare(
          "INSERT INTO text_addresses(text_unit_id,versification_scheme_id,book_id,chapter,verse_start,verse_end,display_address) VALUES(?,?,?,?,?,?,?)",
        );
        const insertFts = db.prepare(
          "INSERT INTO text_units_fts(text_unit_id,edition_id,work_id,language,title,surface_text,normalized_search_text,lemma_text,morphology_text) VALUES(?,?,?,?,?,?,?,'','')",
        );
        for (const unit of source
          .prepare("SELECT * FROM private_scripture_units WHERE edition_id=? ORDER BY sequence,id")
          .iterate(id)) {
          const book = String(unit["book_id"]);
          if (!books.has(book)) {
            db.prepare("INSERT INTO works VALUES(?,?,?,?,?)").run(
              "work:" + book,
              slug,
              bookLabel(book),
              "book",
              books.size,
            );
            books.add(book);
          }
          const scheme = String(unit["source_scheme"]);
          if (!schemes.has(scheme)) {
            db.prepare("INSERT INTO versification_schemes(id,name) VALUES(?,?)").run(
              scheme,
              "Endereço da edição PDF",
            );
            schemes.add(scheme);
          }
          const text = String(unit["text"]);
          const provenance = JSON.stringify({
            creationMethod: "machine-assisted",
            documentId: unit["document_id"],
            sourceScheme: scheme,
            mapping: JSON.parse(String(unit["mapping_json"])) as unknown,
            fragments: JSON.parse(String(unit["fragments_json"])) as unknown,
            textChecksum: unit["text_checksum"],
            editorialPosition: edition["editorial_position"],
          });
          insertUnit.run(
            unit["id"]!,
            slug,
            id,
            "work:" + book,
            scheme,
            unit["sequence"]!,
            "verse",
            text,
            text.normalize("NFKC").toLocaleLowerCase("pt-BR"),
            provenance,
          );
          insertAddress.run(
            unit["id"]!,
            "scriptorium-bcv-1",
            book,
            unit["chapter"]!,
            unit["verse"]!,
            unit["verse"]!,
            `${bookLabel(book)} ${unit["chapter"]}:${unit["verse"]}`,
          );
          insertFts.run(
            unit["id"]!,
            id,
            "work:" + book,
            edition["language"]!,
            bookLabel(book),
            text,
            text.normalize("NFKC").toLocaleLowerCase("pt-BR"),
          );
        }
        db.exec("COMMIT");
        if (db.prepare("PRAGMA foreign_key_check").all().length)
          throw new Error("Projeção com referências órfãs.");
        return { id, title: String(edition["title"]), path };
      } finally {
        db.close();
      }
    });
}
