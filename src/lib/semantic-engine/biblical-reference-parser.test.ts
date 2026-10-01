import { describe, expect, it } from "vitest";
import { parseBiblicalReferences } from "./biblical-reference-parser";

describe("parseBiblicalReferences", () => {
  it("resolves Portuguese and English references without losing their offsets", () => {
    const text = "Compare João 1:1-3 com Genesis 1.1 e John 3:16.";
    const references = parseBiblicalReferences(text);
    expect(
      references.map(({ bookId, chapter, verseStart, verseEnd }) => ({
        bookId,
        chapter,
        verseStart,
        verseEnd,
      })),
    ).toEqual([
      { bookId: "john", chapter: 1, verseStart: 1, verseEnd: 3 },
      { bookId: "genesis", chapter: 1, verseStart: 1, verseEnd: 1 },
      { bookId: "john", chapter: 3, verseStart: 16, verseEnd: 16 },
    ]);
    for (const reference of references) {
      expect(text.slice(reference.startOffset, reference.endOffset)).toBe(reference.rawReference);
    }
  });

  it("does not treat a bare year as a biblical reference", () => {
    expect(parseBiblicalReferences("A obra foi publicada em 1998.")).toEqual([]);
  });
});
