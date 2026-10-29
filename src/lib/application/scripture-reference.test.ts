import { describe, expect, it } from "vitest";
import cases from "./scripture-reference.cases.json";
import { parseScriptureReference, referenceBook } from "./scripture-reference";
import { ScriptureRepository } from "../repositories/scripture-repository";

// The same cases run on Android (ReadingNavigationTest.kt): both readers must agree.
const books = cases.books.map(({ id, chapters }) => {
  const book = ScriptureRepository.getBook(id);
  if (!book) throw new Error(`Livro ausente: ${id}`);
  return referenceBook({ ...book, chapters });
});

describe("typed references, shared with Android", () => {
  it.each(cases.valid)("reads $input", ({ input, book, chapter, verse, end }) => {
    expect(parseScriptureReference(input, books)).toEqual({
      bookId: book,
      chapter,
      ...(verse !== undefined ? { verse } : {}),
      ...(end !== undefined ? { end } : {}),
    });
  });

  it.each(cases.invalid)("rejects %s", (input) => {
    expect(parseScriptureReference(input, books)).toBeNull();
  });

  it("finds a book among all the site's books, not only the ones in the cases", () => {
    const all = ScriptureRepository.listBooks().map(referenceBook);
    expect(parseScriptureReference("1Jo 4:8", all)).toEqual({
      bookId: "1-john",
      chapter: 4,
      verse: 8,
    });
    expect(parseScriptureReference("Apocalipse 21:4", all)?.bookId).toBe("revelation");
  });
});
