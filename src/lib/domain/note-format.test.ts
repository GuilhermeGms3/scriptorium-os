import { describe, it, expect } from "vitest";
import { formatNoteSelection } from "./note-format";
describe("format without destroying note text", () => {
  it("wraps selected text and keeps it selected", () => {
    expect(formatNoteSelection("a palavra b", 2, 9, "bold")).toEqual({
      body: "a **palavra** b",
      start: 4,
      end: 11,
    });
    expect(formatNoteSelection("", 0, 0, "italic")).toEqual({ body: "**", start: 1, end: 1 });
  });
  it("formats multiline lists and quotations without placeholder prose", () => {
    expect(formatNoteSelection("a\nb", 0, 3, "list").body).toBe("- a\n- b");
    expect(formatNoteSelection("texto", 0, 5, "quote").body).toBe("> texto");
    expect(() => formatNoteSelection("texto", 5, 2, "bold")).toThrow("Seleção inválida");
  });
});
