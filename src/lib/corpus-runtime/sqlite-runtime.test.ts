import { afterAll, describe, expect, it } from "vitest";
import { corpusPackageRegistry } from "./corpus-package-registry";
import { DEFAULT_BIBLICAL_VERSIFICATION } from "../domain/text-identity";
import { ScriptureRepository } from "../repositories/scripture-repository";

describe("SQLite corpus runtime", () => {
  afterAll(() => corpusPackageRegistry.close());
  it("loads packages lazily and resolves stable text units", async () => {
    expect(await corpusPackageRegistry.state("sblgnt-1.2")).not.toBe("ready");
    const storage = await corpusPackageRegistry.open("sblgnt-1.2", "work:john");
    expect(await corpusPackageRegistry.state("sblgnt-1.2")).toBe("ready");
    const units = await storage.getTextUnits({
      workId: "work:john",
      versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
      bookId: "john",
      chapter: 1,
      verseStart: 1,
    });
    expect(units).toHaveLength(1);
    expect(units[0]?.id).toMatch(/^textunit:sblgnt:/);
    expect(
      (await storage.getTokens(units[0]!.id)).filter((token) => token.surface === "λόγος"),
    ).toHaveLength(3);
  });
  it("opens compact search packages, then queries warmed FTS5 without scanning JS", async () => {
    const portuguese = await ScriptureRepository.search({
      text: "Palavra",
      editionIds: ["biblia-livre-n4-2025.1.0"],
      limit: 5,
    });
    const greek = await ScriptureRepository.search({
      text: "λογος",
      editionIds: ["sblgnt-1.2"],
      limit: 5,
    });
    expect(portuguese[0]?.textUnit.displayAddress).toBe("John 1:1");
    expect(greek.some((hit) => hit.textUnit.text.includes("λόγος"))).toBe(true);
    const startedAt = performance.now();
    await ScriptureRepository.search({
      text: "Palavra",
      editionIds: ["biblia-livre-n4-2025.1.0"],
      limit: 5,
    });
    expect(performance.now() - startedAt).toBeLessThan(1_000);
  }, 40_000);
  it("returns no results for absent terms", async () => {
    expect(await ScriptureRepository.search({ text: "zzzxxyy-not-present", limit: 5 })).toEqual([]);
  });
  it("queries indexed TAGNT lemmata without loading generated JSON shards", async () => {
    const hits = await ScriptureRepository.search({ text: "G3056", lemma: "G3056", limit: 5 });
    expect(hits.some((hit) => hit.textUnit.text.includes("λόγος"))).toBe(true);
  });
});
