import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PORTUGUESE_KNOWLEDGE_LABELS, knowledgeSourceLinks } from "./knowledge-presentation";

interface SeedEntity {
  id: string;
}

function readKnowledgeIds(relativePath: string): string[] {
  const pack = JSON.parse(readFileSync(resolve(import.meta.dirname, relativePath), "utf8")) as {
    knowledgeEntities: SeedEntity[];
    ontology?: SeedEntity[];
  };
  return [...pack.knowledgeEntities, ...(pack.ontology ?? [])].map((item) => item.id);
}

describe("Portuguese knowledge presentation", () => {
  it("has a Portuguese label for every seeded entity and ontology entry", () => {
    const ids = [
      ...readKnowledgeIds("../../../content/scriptorium-content-seed-v0.1.json"),
      ...readKnowledgeIds("../../../content/packs/phase10-content-v0.2.json"),
      ...readKnowledgeIds("../../../content/packs/phase10.1-primary-reception.json"),
    ];
    expect(ids.filter((id) => !PORTUGUESE_KNOWLEDGE_LABELS[id])).toEqual([]);
  });

  it("links Thomism to all four installed Summa parts", () => {
    expect(knowledgeSourceLinks("school:thomism").map((source) => source.workId)).toHaveLength(4);
  });
});
