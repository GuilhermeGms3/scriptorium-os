import { describe, it, expect } from "vitest";
import { SourceSelectionSchema, sourceSelectionMatches } from "./source-selection";
import { StudySourceSchema } from "./study-notebook";
describe("exact original selection", () => {
  it("preserves UTF-16 offsets and rejects changed originals", () => {
    const text = "a😀 λόγος é palavra";
    const selected = { start: 4, end: 9, quote: "λόγος" };
    expect(sourceSelectionMatches(text, selected)).toBe(true);
    expect(sourceSelectionMatches("outro original", selected)).toBe(false);
    expect(sourceSelectionMatches(text, { ...selected, end: 100 })).toBe(false);
  });
  it("rejects inverted, negative and oversized selections and keeps old anchors compatible", () => {
    for (const selection of [
      { start: 3, end: 2, quote: "a" },
      { start: -1, end: 2, quote: "a" },
      { start: 0, end: 3, quote: "a" },
      { start: 0, end: 20001, quote: "a".repeat(20001) },
    ])
      expect(SourceSelectionSchema.safeParse(selection).success).toBe(false);
    const source = { kind: "private-document", documentId: "doc", title: "Livro", page: 3 };
    expect(StudySourceSchema.parse(source)).toEqual(source);
    expect(
      StudySourceSchema.parse({ ...source, selection: { start: 0, end: 3, quote: "abc" } }),
    ).toHaveProperty("selection.quote", "abc");
  });
});
