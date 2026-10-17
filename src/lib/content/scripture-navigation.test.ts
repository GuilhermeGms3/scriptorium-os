import { describe, expect, it } from "vitest";
import type { Book } from "../domain/scripture";
import { groupScriptureBooks } from "./scripture-navigation";

function book(id: string, order: number, testament: NonNullable<Book["testament"]>): Book {
  return { id, name: id, abbreviation: id, order, chapters: 1, testament };
}

describe("groupScriptureBooks", () => {
  it("preserva os blocos literários e separa textos adicionais", () => {
    const groups = groupScriptureBooks([
      book("genesis", 1, "ot"),
      book("psalms", 19, "ot"),
      book("john", 43, "nt"),
      book("tobit", 100, "other"),
    ]);

    expect(groups.map((group) => group.id)).toEqual([
      "pentateuco",
      "poeticos",
      "evangelhos-atos",
      "deuterocanonicos-outros",
    ]);
    expect(groups.at(-1)?.books.map((item) => item.id)).toEqual(["tobit"]);
  });

  it("não duplica livros entre grupos", () => {
    const books = [book("genesis", 1, "ot"), book("john", 43, "nt")];
    const groupedIds = groupScriptureBooks(books).flatMap((group) =>
      group.books.map((item) => item.id),
    );

    expect(groupedIds).toEqual(["genesis", "john"]);
    expect(new Set(groupedIds).size).toBe(groupedIds.length);
  });
});
