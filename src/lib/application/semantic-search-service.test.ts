import { describe, expect, it } from "vitest";
import { SemanticSearchResponseSchema, semanticSearchHits } from "./semantic-search-service";

const candidate = {
  id: "unit:a",
  editionId: "edition:a",
  text: "Amai os inimigos.",
  passage: {
    workId: "work:matthew",
    bookId: "matthew",
    chapter: 5,
    verseStart: 44,
    verseEnd: 44,
    versificationSchemeId: "eng",
  },
};
describe("semantic search client contract", () => {
  it("preserves edition, address and source text", () => {
    const response = SemanticSearchResponseSchema.parse({
      hits: [{ candidate, score: 0.1, semanticRank: 1 }],
      retrieval: "rrf",
      embeddingConfigured: true,
    });
    const [hit] = semanticSearchHits(response, "edition:a");
    expect(hit?.detail).toBe(candidate.text);
    expect(hit?.label).toContain("edition:a");
    expect(hit?.to).toBe("/scripture/matthew/5?edition=edition%3Aa#verse-44");
    expect(() => semanticSearchHits(response, "other")).toThrow("edição diferente");
  });
  it("refuses invalid ranks and incomplete addresses", () => {
    expect(
      SemanticSearchResponseSchema.safeParse({
        hits: [{ candidate: { ...candidate, passage: { bookId: "matthew" } }, score: NaN }],
        retrieval: "rrf",
        embeddingConfigured: true,
      }).success,
    ).toBe(false);
  });
});
