import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("source-context paragraph classification migration", () => {
  it("repairs only unreviewed calibrated units and is repeatable without changing evidence", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`CREATE TABLE semantic_units(id TEXT PRIMARY KEY,unit_kind TEXT,method TEXT,text_checksum TEXT);
        CREATE TABLE knowledge_proposals(semantic_unit_id TEXT,proposal_kind TEXT,payload_json TEXT,review_status TEXT,reviewed_at TEXT);`);
      const method = "deterministic-source-commentary:v1:deterministic-source-context-v1";
      const payload = JSON.stringify({
        contextualAnalysis: { sourceContext: { kind: "catechism" } },
      });
      for (const [id, origin, review] of [
        ["new", method, "machine-proposed"],
        ["reviewed", method, "accepted"],
        ["legacy", "fixture", "machine-proposed"],
      ]) {
        db.prepare("INSERT INTO semantic_units VALUES(?,'footnote',?,'immutable-hash')").run(
          id!,
          origin!,
        );
        db.prepare("INSERT INTO knowledge_proposals VALUES(?,'passage-relation',?,?,NULL)").run(
          id!,
          payload,
          review!,
        );
      }
      const migration = readFileSync(
        new URL(
          "../../src/lib/workspace-runtime/migrations/025_source_context_paragraphs.sql",
          import.meta.url,
        ),
        "utf8",
      );
      db.exec(migration);
      db.exec(migration);
      expect(db.prepare("SELECT id,unit_kind FROM semantic_units ORDER BY id").all()).toEqual([
        { id: "legacy", unit_kind: "footnote" },
        { id: "new", unit_kind: "paragraph" },
        { id: "reviewed", unit_kind: "footnote" },
      ]);
      expect(
        db
          .prepare("SELECT count(*) n FROM semantic_units WHERE text_checksum='immutable-hash'")
          .get()?.["n"],
      ).toBe(3);
      expect(
        db
          .prepare("SELECT count(*) n FROM knowledge_proposals WHERE payload_json=?")
          .get(payload)?.["n"],
      ).toBe(3);
    } finally {
      db.close();
    }
  });
});
