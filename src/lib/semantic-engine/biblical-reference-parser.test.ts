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
  it("distinguishes Jo (João) from Jó and Jn (Jonas) from John", () => {
    const books = (text: string) =>
      parseBiblicalReferences(text).map((reference) => reference.bookId);
    expect(books("Jo 3:16")).toEqual(["john"]);
    expect(books("Jó 1:1")).toEqual(["job"]);
    expect(books("Jn 1:1")).toEqual(["jonah"]);
  });

  it("accepts a space after the book numeral and single-chapter books cited by verse", () => {
    const refs = (text: string) =>
      parseBiblicalReferences(text).map(
        ({ bookId, chapter, verseStart }) => `${bookId} ${chapter}:${verseStart}`,
      );
    expect(refs("1 Co 13:4")).toEqual(["1-corinthians 13:4"]);
    expect(refs("Jd 5 e Fm 10")).toEqual(["jude 1:5", "philemon 1:10"]);
  });

  it("continues a reference into a new chapter after a semicolon", () => {
    expect(
      parseBiblicalReferences("Rm 3:21-26; 5:8").map(({ chapter, verseStart, verseEnd }) => ({
        chapter,
        verseStart,
        verseEnd,
      })),
    ).toEqual([
      { chapter: 3, verseStart: 21, verseEnd: 26 },
      { chapter: 5, verseStart: 8, verseEnd: 8 },
    ]);
  });

  it("does not read ordinary words as ambiguous book abbreviations", () => {
    for (const text of ["Os 12 apóstolos", "todos os 12 apóstolos", "Os 2,5 milhões", "At 2 horas"])
      expect(parseBiblicalReferences(text)).toEqual([]);
    expect(
      parseBiblicalReferences("Os 11:1 e At 2:1").map((reference) => reference.bookId),
    ).toEqual(["hosea", "acts"]);
  });
});
