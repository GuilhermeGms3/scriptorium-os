import { afterEach, describe, expect, it, vi } from "vitest";
import { ScriptureRepository } from "../repositories/scripture-repository";
import { scriptureNarration } from "./scripture-narration";

const edition = ScriptureRepository.listEditions()[0]!;
const units = [1, 2, 3].map((verse) => ({
  id: `immutable-unit:${verse}`,
  editionId: edition.id,
  text: `Texto original ${verse}.`,
  ref: {
    workId: "work:genesis",
    bookId: "genesis",
    chapter: 1,
    verseStart: verse,
    versificationSchemeId: "scriptorium-bcv-1",
  },
}));
afterEach(() => vi.restoreAllMocks());
describe("scripture narration uses real edition-specific repository data", () => {
  it("uses literal text with edition, unit IDs, scheme and attribution", async () => {
    const read = vi.spyOn(ScriptureRepository, "loadEditionTextUnits").mockResolvedValue(units);
    const item = await scriptureNarration("genesis", 1, edition.id);
    expect(read).toHaveBeenCalledWith("genesis", 1, edition.id);
    expect(item.originalText).toBe("Texto original 1.\n\nTexto original 2.\n\nTexto original 3.");
    expect(item.source.kind).toBe("scripture");
    if (item.source.kind !== "scripture") throw new Error();
    expect(item.source.anchors[1]).toMatchObject({
      startUnitId: "immutable-unit:2",
      editionId: edition.id,
      versificationSchemeId: "scriptorium-bcv-1",
    });
    expect(item.source.licenseId).toBe(edition.licenseId);
  });
  it("limits the selected interval, not just its first verse", async () => {
    vi.spyOn(ScriptureRepository, "loadEditionTextUnits").mockResolvedValue(units);
    expect((await scriptureNarration("genesis", 1, edition.id, 2, 3)).originalText).toBe(
      "Texto original 2.\n\nTexto original 3.",
    );
    expect((await scriptureNarration("genesis", 1, edition.id, 2)).originalText).toBe(
      "Texto original 2.",
    );
  });
  it("does not narrate another translation when a passage is missing", async () => {
    vi.spyOn(ScriptureRepository, "loadEditionTextUnits").mockResolvedValue([]);
    await expect(scriptureNarration("genesis", 1, edition.id)).rejects.toThrow(
      "Nenhuma outra tradução",
    );
  });
  it("rejects invalid addresses and reversed intervals before accessing SQLite", async () => {
    const read = vi.spyOn(ScriptureRepository, "loadEditionTextUnits");
    await expect(scriptureNarration("genesis", 0, edition.id)).rejects.toThrow();
    await expect(scriptureNarration("genesis", 1, "missing-edition")).rejects.toThrow();
    await expect(scriptureNarration("genesis", 1, edition.id, 3, 2)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  });
  it("does not claim a range whose endpoint is absent from the chosen edition", async () => {
    vi.spyOn(ScriptureRepository, "loadEditionTextUnits").mockResolvedValue(units);
    await expect(scriptureNarration("genesis", 1, edition.id, 2, 99)).rejects.toThrow("não existe");
  });
  it("blocks narration when edition rights have not been identified", async () => {
    vi.spyOn(ScriptureRepository, "listEditions").mockReturnValue([
      { ...edition, licenseId: "rights-pending" },
    ]);
    await expect(scriptureNarration("genesis", 1, edition.id)).rejects.toThrow("direitos");
  });
});
