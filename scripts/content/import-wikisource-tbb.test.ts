import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWikisourceChapter } from "./import-wikisource-tbb";

describe("Wikisource Tradução Brasileira importer", () => {
  it("keeps numbered verses and rejects page navigation after the final item", () => {
    const result = parseWikisourceChapter(
      "{{cabeçalho}}\n# No princípio era o Verbo.\n# Ele estava com Deus.\n{{rodapé}}\nJoao 01",
    );
    expect(result).toEqual(["No princípio era o Verbo.", "Ele estava com Deus."]);
  });

  it("imports the complete snapshot and keeps the John footer outside verse 51", async () => {
    const source = JSON.parse(
      await readFile(
        resolve(
          import.meta.dirname,
          "../../corpora/source/traducao-brasileira-wikisource/2026-09-16/pages.json",
        ),
        "utf8",
      ),
    ) as { pages: { canonicalBookId: string; chapter: number; content: string }[] };
    expect(source.pages).toHaveLength(1189);
    const john = source.pages.find((page) => page.canonicalBookId === "john" && page.chapter === 1);
    expect(john).toBeDefined();
    const verses = parseWikisourceChapter(john!.content);
    expect(verses).toHaveLength(51);
    expect(verses[50]).not.toContain("Joao 01");
  });
});
