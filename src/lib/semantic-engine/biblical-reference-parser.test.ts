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

  it("does not turn a canonical book list into John chapter 2", () => {
    expect(
      parseBiblicalReferences(
        "Mateus Marcos Lucas João Atos Romanos 1 Coríntios 2 Coríntios 1 João 2 João 3 João Judas",
      ),
    ).toEqual([]);
  });

  it("does not read a canon list in a column as a chapter of the next book", () => {
    expect(parseBiblicalReferences("1 João\n2 João\n3 João\nJudas")).toEqual([]);
    expect(parseBiblicalReferences("1 João\r\n2 João\r\n3 João")).toEqual([]);
  });

  it("keeps a reference wrapped at the end of a line and a bare chapter inside a sentence", () => {
    const refs = (text: string) =>
      parseBiblicalReferences(text).map(({ bookId, chapter, verseStart, verseEnd }) => ({
        bookId,
        chapter,
        verseStart,
        verseEnd,
      }));
    expect(refs("Mt\n2:15")).toEqual([
      { bookId: "matthew", chapter: 2, verseStart: 15, verseEnd: 15 },
    ]);
    expect(refs("Jo\n3:16-18")).toEqual([
      { bookId: "john", chapter: 3, verseStart: 16, verseEnd: 18 },
    ]);
    expect(refs("Leia João 2 com atenção")).toEqual([
      { bookId: "john", chapter: 2, verseStart: undefined, verseEnd: undefined },
    ]);
  });

  it("keeps a bare chapter whose book name ends a prose line of the PDF", () => {
    expect(
      parseBiblicalReferences(
        "como mostra o evangelho de João\n3, o novo nascimento é necessário",
      ).map(({ bookId, chapter, verseStart }) => [bookId, chapter, verseStart]),
    ).toEqual([["john", 3, undefined]]);
    expect(parseBiblicalReferences("1 Samuel\n2 Samuel\n1 Reis\n2 Reis")).toEqual([]);
  });

  it("suppresses references in structural negative zones", () => {
    expect(parseBiblicalReferences("João 2", { zone: "toc" })).toEqual([]);
    expect(parseBiblicalReferences("João 2:1", { zone: "body" })).toHaveLength(1);
  });

  it("reads Spanish abbreviations in a Spanish document", () => {
    const books = (text: string) =>
      parseBiblicalReferences(text, { language: "es" }).map((reference) => reference.bookId);
    expect(books("Jn 3:16")).toEqual(["john"]);
    expect(books("Hch 2:1")).toEqual(["acts"]);
    expect(books("Sal 23:1")).toEqual(["psalms"]);
    expect(books("1 Jn 4:8")).toEqual(["1-john"]);
    expect(books("Juan 1:1; Hechos 2:1; Génesis 1:1")).toEqual(["john", "acts", "genesis"]);
  });

  it("keeps the Portuguese meanings in a Portuguese document", () => {
    const books = (text: string) =>
      parseBiblicalReferences(text, { language: "pt-BR" }).map((reference) => reference.bookId);
    expect(books("Jn 1:1")).toEqual(["jonah"]);
    expect(books("Jo 3:16")).toEqual(["john"]);
  });

  it("does not change the behaviour when the language is unknown", () => {
    const books = (text: string) =>
      parseBiblicalReferences(text).map((reference) => reference.bookId);
    expect(books("Jn 1:1")).toEqual(["jonah"]);
    expect(books("Jo 3:16")).toEqual(["john"]);
    expect(books("Hch 2:1")).toEqual([]);
    expect(books("Sal 23:1")).toEqual([]);
  });

  it("does not read the numeral of the next book as a verse of the previous one", () => {
    const refs = (text: string) =>
      parseBiblicalReferences(text).map(
        (item) =>
          `${item.bookId} ${item.chapter}:${item.verseStart ?? ""}${item.verseEnd !== undefined && item.verseEnd !== item.verseStart ? `-${item.verseEnd}` : ""}`,
      );
    expect(refs("Rm 5,8; 1Jo 4,9")).toEqual(["romans 5:8", "1-john 4:9"]);
    expect(refs("cf. Jo 3:16; Rm 5:8; 1Co 13:4-7; 1 Jo 4:8.")).toEqual([
      "john 3:16",
      "romans 5:8",
      "1-corinthians 13:4-7",
      "1-john 4:8",
    ]);
    // A bare verse after a semicolon still continues the chapter.
    expect(refs("Rm 5,8; 10")).toEqual(["romans 5:8", "romans 5:10"]);
  });

  it("resolves common Spanish references", () => {
    expect(
      parseBiblicalReferences("Juan 1:1; Hechos 2:1; Génesis 1:1").map((item) => item.bookId),
    ).toEqual(["john", "acts", "genesis"]);
  });
});
