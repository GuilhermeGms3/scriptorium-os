import { describe, expect, it } from "vitest";
import { processingSummaryLine } from "./processing-summary";

describe("processingSummaryLine", () => {
  it("reads as one plain sentence, singular or plural", () => {
    expect(processingSummaryLine({ total: 31, structured: 1, ocrPending: 6 })).toBe(
      "31 livros · 1 estruturado · 6 precisam de OCR",
    );
    expect(processingSummaryLine({ total: 1, structured: 0, ocrPending: 1 })).toBe(
      "1 livro · 0 estruturados · 1 precisa de OCR",
    );
  });
});
