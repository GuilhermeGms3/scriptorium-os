import { describe, expect, it, vi } from "vitest";
import { loadCuratedTopicReadings } from "./curated-topic-readings";
import {
  PRIVATE_STUDY_READINGS,
  type PrivateStudyReading,
} from "../content/private-study-readings";
import { sha256Hex } from "../workspace-runtime/secure-context";

const checksum = "a".repeat(64);
const text = "Synthetic question, objection, solution and reply. Not a real book quotation.";
async function fixture() {
  const reading: PrivateStudyReading = {
    id: "synthetic:q1",
    checksum,
    page: 12,
    pageTextChecksum: await sha256Hex(text),
    locator: "Synthetic question 1",
    topics: ["topic:one"],
    purpose: "Read the whole argument.",
  };
  const dependencies = {
    document: vi.fn(async () => ({
      id: "doc:one",
      title: "Synthetic book",
      checksum,
      language: "pt",
    })),
    page: vi.fn(async () => ({ text })),
  };
  return { reading, dependencies };
}

describe("edition-pinned thematic readings", () => {
  it("resolves the exact original page without publishing a search snippet as commentary", async () => {
    const { reading, dependencies } = await fixture();
    const result = await loadCuratedTopicReadings("topic:one", dependencies, [reading]);
    expect(dependencies.page).toHaveBeenCalledWith("doc:one", 11);
    expect(result.items[0]).toMatchObject({
      origin: "private-curated",
      excerpt: "",
      source: { page: 12, documentId: "doc:one" },
    });
    expect(result.items[0]?.guidance).toContain("Read the whole argument");
    expect(result.items[0]?.guidance).not.toContain("Tomás");
    expect(result.warnings).toEqual([]);
  });
  it("does not query pages or editions for unrelated topics", async () => {
    const { reading, dependencies } = await fixture();
    expect((await loadCuratedTopicReadings("topic:other", dependencies, [reading])).items).toEqual(
      [],
    );
    expect(dependencies.document).not.toHaveBeenCalled();
    expect(dependencies.page).not.toHaveBeenCalled();
  });
  it("never substitutes another edition or an unavailable book", async () => {
    const { reading, dependencies } = await fixture();
    for (const document of [
      null,
      { id: "other", title: "Wrong edition", checksum: "b".repeat(64) },
    ]) {
      const result = await loadCuratedTopicReadings(
        "topic:one",
        { ...dependencies, document: async () => document },
        [reading],
      );
      expect(result.items).toEqual([]);
    }
    expect(dependencies.page).not.toHaveBeenCalled();
  });
  it("quarantines missing or changed extracted pages", async () => {
    const { reading, dependencies } = await fixture();
    for (const page of [null, { text: "Different extraction" }]) {
      const result = await loadCuratedTopicReadings(
        "topic:one",
        { ...dependencies, page: async () => page },
        [reading],
      );
      expect(result.items).toEqual([]);
      expect(result.warnings).toHaveLength(1);
    }
  });
  it("looks up each edition once, even for multiple questions", async () => {
    const { reading, dependencies } = await fixture();
    await loadCuratedTopicReadings("topic:one", dependencies, [reading, { ...reading, id: "q2" }]);
    expect(dependencies.document).toHaveBeenCalledTimes(1);
    expect(dependencies.page).toHaveBeenCalledTimes(2);
  });
  it("keeps stable unique locators without copying private book content into the catalog", () => {
    expect(new Set(PRIVATE_STUDY_READINGS.map((item) => item.id)).size).toBe(19);
    for (const item of PRIVATE_STUDY_READINGS) {
      expect(item.page).toBeGreaterThan(0);
      if (item.id.startsWith("summa-")) expect(item.page).toBeGreaterThan(115);
      expect(item.pageTextChecksum).toMatch(/^[a-f0-9]{64}$/);
      expect(item.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(item.topics.length).toBeGreaterThan(0);
    }
  });
});
