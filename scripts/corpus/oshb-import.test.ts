import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import acquired from "../../corpora/source/wlc/6a5db284c715c18b239422e57bb89684e6a19f00/artifact-manifest.json";
import generated from "../../generated/corpora/wlc/2.2/manifest.json";
import genesis from "../../generated/corpora/wlc/2.2/books/genesis/01.json";
import type { GeneratedCorpusManifest } from "../../src/lib/domain/generated-corpus";

const manifest = generated as GeneratedCorpusManifest;

describe("OSHB / WLC 2.2 import", () => {
  it("pins an immutable upstream release and complete source inventory", () => {
    expect(acquired.commitSha).toBe("6a5db284c715c18b239422e57bb89684e6a19f00");
    expect(manifest.sourceRevision).toBe(acquired.commitSha);
    expect(manifest.statistics).toMatchObject({
      artifacts: 39,
      books: 39,
      chapters: 929,
      verses: 23213,
      tokenOccurrences: 305507,
      errors: 0,
      warnings: 0,
    });
  });

  it("preserves Hebrew marks, source segmentation, lemmas and morphology", () => {
    const token = genesis.verses[0]!.original![0]!;
    expect(token).toMatchObject({
      surface: "בְּ/רֵאשִׁ֖ית",
      language: "hbo",
      lemma: "b/7225",
      strongs: "b/7225",
      morphology: { code: "HR/Ncfsa", partOfSpeech: "noun" },
    });
    expect(genesis.verses[0]!.translations["wlc-oshb-2.2"]).toContain("אֱלֹהִ֑ים");
  });

  it("indexes Hebrew text and morphology in the SQLite runtime", () => {
    const database = new DatabaseSync(resolve("public/corpus-packages/wlc-oshb-2.2.sqlite3"), {
      readOnly: true,
    });
    try {
      const counts = database
        .prepare("SELECT count(*) units,(SELECT count(*) FROM tokens) tokens FROM text_units")
        .get() as { units: number; tokens: number };
      expect(counts).toEqual({ units: 23213, tokens: 305507 });
      const row = database
        .prepare("SELECT surface_form,lemma_text,morphology FROM tokens WHERE id=?")
        .get("wlc-oshb-2.2:genesis:1:1:001") as Record<string, string>;
      expect(row["surface_form"]).toBe("בְּ/רֵאשִׁ֖ית");
      expect(row["lemma_text"]).toBe("b/7225");
      expect(JSON.parse(row["morphology"]!)).toMatchObject({ code: "HR/Ncfsa" });
    } finally {
      database.close();
    }
  });
});
