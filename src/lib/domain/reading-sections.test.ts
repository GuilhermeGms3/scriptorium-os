import { describe, expect, it } from "vitest";
import {
  activeReadingSection,
  readingIndicatorWindow,
  readingTextSections,
} from "./reading-sections";

describe("reading section navigation", () => {
  it("retains the preceding verse while its long commentary fills the viewport", () => {
    expect(
      activeReadingSection(
        [
          { top: -900, bottom: -800 },
          { top: -300, bottom: -200 },
          { top: 900, bottom: 1000 },
        ],
        0,
        600,
      ),
    ).toBe(1);
    expect(
      activeReadingSection(
        [
          { top: -900, bottom: -800 },
          { top: -300, bottom: -200 },
          { top: 598, bottom: 700 },
        ],
        0,
        600,
      ),
    ).toBe(1);
    expect(
      activeReadingSection(
        [
          { top: -900, bottom: -800 },
          { top: -300, bottom: -200 },
          { top: 400, bottom: 700 },
        ],
        0,
        600,
      ),
    ).toBe(2);
  });
  it("bounds the indicator window in very long books and at either edge", () => {
    expect(readingIndicatorWindow(3000, 0, 9)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(readingIndicatorWindow(3000, 2999, 5)).toEqual([2995, 2996, 2997, 2998, 2999]);
    expect(readingIndicatorWindow(100, 50, 3)).toEqual([49, 50, 51]);
    expect(readingIndicatorWindow(3, -10, 9)).toEqual([0, 1, 2]);
    expect(readingIndicatorWindow(0, 0, 9)).toEqual([]);
    expect(readingIndicatorWindow(10, 0, 0)).toEqual([]);
  });
  it("ignores a sliver of the preceding verse and preserves a fully visible short verse", () => {
    expect(
      activeReadingSection(
        [
          { top: -200, bottom: 5 },
          { top: 5, bottom: 200 },
          { top: 200, bottom: 900 },
        ],
        0,
        600,
      ),
    ).toBe(1);
    expect(
      activeReadingSection(
        [
          { top: -50, bottom: 350 },
          { top: 350, bottom: 800 },
        ],
        0,
        600,
      ),
    ).toBe(0);
    expect(
      activeReadingSection(
        [
          { top: -800, bottom: -500 },
          { top: -500, bottom: -1 },
        ],
        0,
        600,
      ),
    ).toBe(1);
    expect(activeReadingSection([], 0, 600)).toBe(0);
  });
  it("preserves CRLF, whitespace, Unicode and exact source offsets across paragraphs", () => {
    const text = "  Primeiro 🕊️ parágrafo.\r\n\r\nSegundo\ncom linha quebrada.\n \nÚltimo.  ";
    const sections = readingTextSections(text);
    expect(sections.length).toBe(3);
    expect(sections.map((section) => section.text).join("")).toBe(text);
    for (const section of sections)
      expect(text.slice(section.start, section.end)).toBe(section.text);
  });
  it("splits a long block only at sentence boundaries and never invents source paragraphs", () => {
    const text = "Uma frase acadêmica com conteúdo e contexto. ".repeat(90);
    const sections = readingTextSections(text);
    expect(sections.length).toBeGreaterThan(2);
    expect(sections.map((section) => section.text).join("")).toBe(text);
    expect(sections.slice(0, -1).every((section) => section.text.trimEnd().endsWith("."))).toBe(
      true,
    );
    const unstructured = "palavra sem pontuação ".repeat(200);
    expect(readingTextSections(unstructured)).toHaveLength(1);
    expect(readingTextSections("")).toEqual([]);
  });
});
