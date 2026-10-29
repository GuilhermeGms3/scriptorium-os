import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReadingTextSections } from "./reading-text-sections";

describe("section anchors preserve source text", () => {
  it("does not inject numbers or labels into the selectable original", () => {
    const text = "Primeiro parágrafo.\n\nSegundo parágrafo.";
    const html = renderToStaticMarkup(
      <ReadingTextSections text={text} marks={[{ start: 12, end: 30 }]} />,
    );
    expect(html.replace(/<[^>]*>/gu, "")).toBe(text);
    expect(html).toContain('data-reading-label="Trecho 2"');
    // Evidence crossing a visual section boundary remains marked on both sides.
    expect(html.match(/<mark /gu)).toHaveLength(2);
  });
  it("ignores invalid ranges and escapes untrusted source text", () => {
    const html = renderToStaticMarkup(
      <ReadingTextSections
        text="<script>alert(1)</script>"
        marks={[
          { start: -1, end: 3 },
          { start: 1, end: 1000 },
        ]}
      />,
    );
    expect(html).not.toContain("<mark");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
