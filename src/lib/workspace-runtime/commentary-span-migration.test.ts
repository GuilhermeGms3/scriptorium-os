import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import migration from "./migrations/024_shared_commentary_evidence.sql?raw";
import original from "./migrations/011_document_knowledge_pipeline.sql?raw";

describe("shared physical commentary evidence", () => {
  it("preserves spans and allows another unit to cite the same physical interval", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`PRAGMA foreign_keys=ON;
        CREATE TABLE semantic_units(id TEXT PRIMARY KEY);
        CREATE TABLE private_document_pages(id TEXT PRIMARY KEY);
        CREATE TABLE knowledge_proposals(proposal_kind TEXT,method TEXT,review_status TEXT,reviewed_at TEXT,payload_json TEXT);
        INSERT INTO semantic_units VALUES('old'),('new');
        INSERT INTO private_document_pages VALUES('page');`);
      const oldTable = original.slice(
        original.indexOf("CREATE TABLE semantic_unit_spans"),
        original.indexOf("CREATE TABLE knowledge_proposals"),
      );
      db.exec(oldTable);
      db.exec("INSERT INTO semantic_unit_spans VALUES('old','page',0,0,30,0)");
      const before = db.prepare("SELECT * FROM semantic_unit_spans").all();
      const payload = JSON.stringify({
        rawReference: "2:0",
        relationScope: "chapter",
        passage: { chapter: 2 },
        contextualAnalysis: {
          mode: "source-excerpt",
          title: "Fonte 2:0",
          rationale: "Marcador 2:0",
        },
      });
      const insert = db.prepare(
        "INSERT INTO knowledge_proposals VALUES('passage-relation',?,?,NULL,?)",
      );
      insert.run("deterministic-source-commentary:v1", "machine-proposed", payload);
      insert.run("deterministic-source-commentary:v1", "accepted", payload);
      insert.run("assistant-contextual-reading:v1", "machine-proposed", payload);
      expect(() =>
        db.exec("INSERT INTO semantic_unit_spans VALUES('new','page',0,0,30,0)"),
      ).toThrow(/UNIQUE/);
      db.exec("BEGIN IMMEDIATE");
      db.exec(migration);
      db.exec("COMMIT");
      expect(db.prepare("SELECT * FROM semantic_unit_spans").all()).toEqual(before);
      expect(() =>
        db.exec("INSERT INTO semantic_unit_spans VALUES('new','page',0,0,30,0)"),
      ).not.toThrow();
      expect(() =>
        db.exec("INSERT INTO semantic_unit_spans VALUES('new','page',0,0,30,1)"),
      ).toThrow(/UNIQUE/);
      expect(() =>
        db.exec("INSERT INTO semantic_unit_spans VALUES('missing','page',0,40,50,0)"),
      ).toThrow(/FOREIGN KEY/);
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(
        db
          .prepare(
            "SELECT json_extract(payload_json,'$.rawReference') AS ref FROM knowledge_proposals ORDER BY rowid",
          )
          .all(),
      ).toEqual([{ ref: "Cap. 2" }, { ref: "2:0" }, { ref: "2:0" }]);
    } finally {
      db.close();
    }
  });
});
