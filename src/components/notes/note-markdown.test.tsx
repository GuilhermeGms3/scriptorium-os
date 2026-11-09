import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NoteMarkdown } from "./note-markdown";

describe("leitura segura de notas", () => {
  it("renders document formatting and escapes HTML, scripts and untrusted URLs", () => {
    const html = renderToStaticMarkup(
      <NoteMarkdown
        body={
          "# Meu estudo\n\n**Texto** e *ênfase*\n\n<script>alert(1)</script> [link](javascript:alert(1))\n\n- Item\n\n> Citação\n\n```\n[[não é um link]]\n```"
        }
        notes={[]}
        onOpen={() => {}}
      />,
    );
    expect(html).toContain("<h2");
    expect(html).toContain("<strong>Texto</strong>");
    expect(html).toContain("<em>ênfase</em>");
    expect(html).toContain("<ul");
    expect(html).toContain("<blockquote");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("href=");
    expect(html).toContain("<pre");
  });
  it("renders only resolved internal references as buttons, without duplicate React keys", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const html = renderToStaticMarkup(
        <NoteMarkdown
          body="Antes [[note:a|Primeira]] depois [[note:b|Segunda]] e [[não existe]]."
          notes={[
            { id: "note:a", title: "Primeira" },
            { id: "note:b", title: "Segunda" },
          ]}
          onOpen={() => {}}
        />,
      );
      expect(html.match(/<button/g)).toHaveLength(2);
      expect(html).toContain("Nota não encontrada");
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});
