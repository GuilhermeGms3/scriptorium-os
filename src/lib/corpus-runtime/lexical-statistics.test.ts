import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { corpusPackageRegistry } from "./corpus-package-registry";
import { SQLiteCorpusStorage } from "./sqlite-corpus-storage";

function removeFixture(directory: string) {
  if (!directory.startsWith(join(tmpdir(), "scriptorium-lexical-stats-")))
    throw new Error("Unsafe temporary path");
  rmSync(directory, { recursive: true, force: true });
}

it("counts a lemma once per token despite alternative addresses and never crosses units/editions", async () => {
  const directory = mkdtempSync(join(tmpdir(), "scriptorium-lexical-stats-"));
  const path = join(directory, "fixture.sqlite");
  const db = new DatabaseSync(path);
  const manifest = (await corpusPackageRegistry.listAvailable())[0]!;
  let storage: SQLiteCorpusStorage | undefined;
  try {
    db.exec(`CREATE TABLE schema_migrations(version INTEGER); INSERT INTO schema_migrations VALUES(${manifest.schemaVersion});
      CREATE TABLE text_units(id TEXT PRIMARY KEY,edition_id TEXT,versification_scheme_id TEXT);
      CREATE TABLE text_addresses(id INTEGER PRIMARY KEY,text_unit_id TEXT,versification_scheme_id TEXT,book_id TEXT);
      CREATE TABLE tokens(id TEXT PRIMARY KEY,text_unit_id TEXT,position INTEGER,lemma_id TEXT,lemma_text TEXT,surface_form TEXT,language TEXT DEFAULT 'grc');
      INSERT INTO text_addresses VALUES(1,'u1','eng','john'),(2,'u1','lxx','other'),(3,'u1','eng','john'),(4,'u2','eng','matthew'),(5,'other','eng','other');
      INSERT INTO tokens(id,text_unit_id,position,lemma_id,lemma_text,surface_form) VALUES('a','u1',1,'neighbor','πρός','πρός'),('b','u1',2,'target','λόγος','λόγος'),('c','u1',3,'after','l','יהוה'),('d','u2',1,'target','λόγος','λόγος'),('e','other',1,'target','λόγος','λόγος');
      UPDATE tokens SET language='hbo' WHERE id='c';`);
    const insert = db.prepare("INSERT INTO text_units VALUES(?,?,'eng')");
    insert.run("u1", manifest.editionId);
    insert.run("u2", manifest.editionId);
    insert.run("other", "other-edition");
    db.close();
    storage = await SQLiteCorpusStorage.open(manifest, new Uint8Array(readFileSync(path)));
    const statistics = await storage.getLexicalStatistics("target", 1);
    expect(statistics.total).toBe(2);
    expect(statistics.books).toEqual([
      { bookId: "john", count: 1 },
      { bookId: "matthew", count: 1 },
    ]);
    expect(statistics.neighbors).toEqual(
      expect.arrayContaining([
        { lemma: "πρός", direction: "before", distance: 1, count: 1 },
        { lemma: "יהוה", direction: "after", distance: 1, count: 1 },
      ]),
    );
    expect(statistics.neighbors).toHaveLength(2);
  } finally {
    storage?.close();
    if (db.isOpen) db.close();
    removeFixture(directory);
  }
});
