import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TBESG Greek lexical package", () => {
  it("indexes the complete pinned source with normalized references", () => {
    const database = new DatabaseSync(resolve("public/corpus-packages/sblgnt-1.2.sqlite3"), {
      readOnly: true,
    });
    try {
      const count = database
        .prepare("SELECT count(*) count FROM lexemes WHERE id LIKE 'lexeme:tbesg:%'")
        .get() as { count: number };
      expect(count.count).toBe(11035);
      const entries = database
        .prepare(
          `
        SELECT l.lemma,s.gloss,s.definition
        FROM lexical_references r
        JOIN lexemes l ON l.id=r.lexeme_id
        JOIN lexical_senses s ON s.lexeme_id=l.id
        WHERE r.reference_system='strong' AND r.reference_value='G3056'
        ORDER BY l.id
      `,
        )
        .all() as Array<{ lemma: string; gloss: string; definition: string }>;
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((entry) => entry.lemma.includes("λόγος"))).toBe(true);
      expect(entries.some((entry) => entry.gloss === "word")).toBe(true);
      expect(entries.every((entry) => !entry.definition.includes("<b>"))).toBe(true);
    } finally {
      database.close();
    }
  });
});
