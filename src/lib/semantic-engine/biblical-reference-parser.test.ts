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

  it("resolves relative verses only when an explicit passage context exists", () => {
    expect(parseBiblicalReferences("Nos vv. 3–5 o argumento continua.")).toEqual([]);
    expect(
      parseBiblicalReferences("Nos vv. 3–5 o argumento continua.", {
        context: { bookId: "john", chapter: 1 },
      }).map(({ bookId, chapter, verseStart, verseEnd }) => ({
        bookId,
        chapter,
        verseStart,
        verseEnd,
      })),
    ).toEqual([{ bookId: "john", chapter: 1, verseStart: 3, verseEnd: 5 }]);
  });

  it("rejects impossible chapter and verse bounds", () => {
    expect(parseBiblicalReferences("João 99:1 e João 1:999")).toEqual([]);
  });

  it("expands a compact same-chapter continuation", () => {
    expect(
      parseBiblicalReferences("João 1:1, 3-5").map(({ verseStart, verseEnd }) => ({
        verseStart,
        verseEnd,
      })),
    ).toEqual([
      { verseStart: 1, verseEnd: 1 },
      { verseStart: 3, verseEnd: 5 },
    ]);
  });

  it("expands several verse continuations without swallowing a new chapter", () => {
    expect(
      parseBiblicalReferences("João 1:1, 3-5, v. 7; João 2:1").map(
        ({ chapter, verseStart, verseEnd }) => ({ chapter, verseStart, verseEnd }),
      ),
    ).toEqual([
      { chapter: 1, verseStart: 1, verseEnd: 1 },
      { chapter: 1, verseStart: 3, verseEnd: 5 },
      { chapter: 1, verseStart: 7, verseEnd: 7 },
      { chapter: 2, verseStart: 1, verseEnd: 1 },
    ]);
  });
});
