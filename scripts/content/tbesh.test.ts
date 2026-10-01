import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TBESH Hebrew lexical package", () => {
  it("resolves unpadded OSHB Strong references without importing restricted definitions", () => {
    const database = new DatabaseSync(resolve("public/corpus-packages/wlc-oshb-2.2.sqlite3"), {
      readOnly: true,
    });
    try {
      const entries = database
        .prepare(
          `SELECT l.lemma,s.gloss,s.definition
           FROM lexical_references r
           JOIN lexemes l ON l.id=r.lexeme_id
           JOIN lexical_senses s ON s.lexeme_id=l.id
           WHERE r.reference_system='strong' AND r.reference_value='430'
           ORDER BY l.id`,
        )
        .all() as Array<{ lemma: string; gloss: string; definition: string | null }>;
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((entry) => entry.lemma.includes("אֱלֹהִים"))).toBe(true);
      expect(entries.some((entry) => entry.gloss === "God")).toBe(true);
      expect(entries.every((entry) => entry.definition === null)).toBe(true);
    } finally {
      database.close();
    }
  });
});
