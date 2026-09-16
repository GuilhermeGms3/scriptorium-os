import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";

const sizes = [50_000, 100_000, 500_000];
for (const size of sizes) {
  const database = new DatabaseSync(":memory:");
  database.exec(
    "PRAGMA journal_mode=OFF; CREATE TABLE units(id INTEGER PRIMARY KEY,address TEXT NOT NULL,text TEXT NOT NULL); CREATE VIRTUAL TABLE units_fts USING fts5(text,tokenize='unicode61 remove_diacritics 0'); BEGIN",
  );
  const insert = database.prepare("INSERT INTO units(id,address,text) VALUES(?,?,?)");
  const insertFts = database.prepare("INSERT INTO units_fts(rowid,text) VALUES(?,?)");
  for (let index = 1; index <= size; index += 1) {
    const text =
      index % 997 === 0 ? `No princípio palavra índice ${index}` : `Unidade sintética ${index}`;
    insert.run(index, `work.${Math.ceil(index / 1000)}.${index % 1000}`, text);
    insertFts.run(index, text);
  }
  database.exec("COMMIT; INSERT INTO units_fts(units_fts) VALUES('optimize')");
  const lookupStart = performance.now();
  database.prepare("SELECT text FROM units WHERE id=?").get(Math.floor(size / 2));
  const lookupMs = performance.now() - lookupStart;
  const searchStart = performance.now();
  const hits = database
    .prepare("SELECT rowid FROM units_fts WHERE units_fts MATCH ? LIMIT 30")
    .all('"princípio"*');
  const searchMs = performance.now() - searchStart;
  console.log(
    JSON.stringify({
      units: size,
      lookupMs: Number(lookupMs.toFixed(3)),
      searchMs: Number(searchMs.toFixed(3)),
      hits: hits.length,
    }),
  );
  database.close();
}
