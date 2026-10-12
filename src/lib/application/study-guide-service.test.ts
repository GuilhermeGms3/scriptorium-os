import { describe, expect, it, vi } from "vitest";
import { loadStudyGuideMaterials } from "./study-guide-service";
import { studyGuideById } from "../content/study-guides";
import type { PrivateDocumentSearchHit } from "../domain/private-document";

const hit: PrivateDocumentSearchHit = {
  documentId: "private:one",
  sourceId: "source:one",
  title: "Livro privado",
  pageIndex: 4,
  pageLabel: "5",
  snippet: "Um trecho sobre patrística",
  rank: -1,
};
const guide = studyGuideById("patristica")!;
const packages = async () => [{ works: ["work:didache"], languages: ["en"] }];

describe("indexed study guide discovery", () => {
  it("confirms resources from manifests and deduplicates exact document pages", async () => {
    const searchDocuments = vi.fn(async () => [hit, { ...hit, pageIndex: 5, pageLabel: "6" }]);
    const result = await loadStudyGuideMaterials(guide, {
      packages,
      searchDocuments,
      searchKnowledge: async () => [],
    });
    expect(result.resources.map((resource) => resource.workId)).toEqual(["work:didache"]);
    expect(result.missingResources).toHaveLength(2);
    expect(result.excerpts).toHaveLength(2);
    expect(result.excerpts[0]?.pageIndex).toBe(4);
    expect(searchDocuments).toHaveBeenCalledTimes(3);
    expect(searchDocuments).toHaveBeenCalledWith("patrística", { limit: 6 });
    expect(result.warnings).toEqual([]);
  });
  it("keeps primary sources and successful queries usable after a private query failure", async () => {
    const result = await loadStudyGuideMaterials(guide, {
      packages,
      searchDocuments: async (query) => {
        if (query === "patrística") throw new Error("offline");
        return [hit];
      },
      searchKnowledge: async () => [],
    });
    expect(result.resources).toHaveLength(1);
    expect(result.excerpts).toEqual([hit]);
    expect(result.warnings).toHaveLength(1);
  });
  it("never presents unconfirmed resources as available when the registry fails", async () => {
    const result = await loadStudyGuideMaterials(guide, {
      packages: async () => {
        throw new Error("registry unavailable");
      },
      searchDocuments: async () => [],
      searchKnowledge: async () => [],
    });
    expect(result.resources).toEqual([]);
    expect(result.warnings[0]).toContain("catálogo");
  });
  it("bounds search results and excludes unsupported concept destinations", async () => {
    const result = await loadStudyGuideMaterials(
      { ...guide, keywords: ["a", "b", "c", "d"] },
      {
        packages,
        searchDocuments: async (query) =>
          Array.from({ length: 6 }, (_, index) => ({
            ...hit,
            documentId: query,
            pageIndex: index,
          })),
        searchKnowledge: async () => [
          { id: "argument:one", label: "An argument", kind: "argument", rank: 0 },
          { id: "topic:one", label: "Topic", kind: "theological-topic", rank: 1 },
        ],
      },
    );
    expect(result.excerpts).toHaveLength(12);
    expect(result.excerpts.some((item) => item.documentId === "d")).toBe(false);
    expect(result.concepts.map((item) => item.id)).toEqual(["topic:one"]);
  });
});
