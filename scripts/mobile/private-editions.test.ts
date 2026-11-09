import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { projectPrivateEditions } from "./private-editions";

it("projects private editions into the actual Android reader and FTS schema without writing the source", () => {
  const root = mkdtempSync(join(tmpdir(), "scriptorium-private-mobile-"));
  const source = new DatabaseSync(":memory:");
  try {
    expect(projectPrivateEditions(source, resolve("."), root)).toEqual([]);
    source.exec(`CREATE TABLE private_scripture_editions(id,title,abbreviation,language,editorial_position);
      CREATE TABLE private_scripture_units(id,edition_id,document_id,sequence,book_id,chapter,verse,source_scheme,mapping_json,text,text_checksum,fragments_json);
      INSERT INTO private_scripture_editions VALUES('private:test','Edição de teste','TESTE','pt-BR','Posição editorial preservada');
      INSERT INTO private_scripture_units VALUES('unit:test','private:test','document:test',1,'genesis',1,1,'source:test','{"review":"machine-proposed"}','No princípio criou Deus','abc','[]');`);
    const editions = projectPrivateEditions(source, resolve("."), root);
    expect(editions).toHaveLength(1);
    const db = new DatabaseSync(join(root, editions[0]!.path), { readOnly: true });
    try {
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(
        db
          .prepare(
            "SELECT a.verse_start,t.surface_text FROM text_units t JOIN text_addresses a ON a.text_unit_id=t.id WHERE t.edition_id=? AND a.versification_scheme_id='scriptorium-bcv-1'",
          )
          .get("private:test")?.["surface_text"],
      ).toBe("No princípio criou Deus");
      expect(
        db.prepare("SELECT * FROM text_units_fts WHERE text_units_fts MATCH 'Deus'").all(),
      ).toHaveLength(1);
      expect(
        db.prepare("SELECT provenance_json FROM text_units").get()?.["provenance_json"],
      ).toContain("Posição editorial preservada");
      expect(source.prepare("SELECT count(*) n FROM private_scripture_units").get()?.["n"]).toBe(1);
    } finally {
      db.close();
    }
  } finally {
    source.close();
    rmSync(root, { recursive: true, force: true });
  }
});
