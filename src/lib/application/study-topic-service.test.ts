import { describe, expect, it } from "vitest";
import {
  describeStudyEntity,
  describeStudyGuide,
  loadTopicReadings,
  notesForTopic,
  studiesForTopic,
  type StudyTopic,
} from "./study-topic-service";
import type { Note, Study } from "../domain/study";
import type { PrimarySourceWorkSummary } from "../repositories/primary-source-repository";
import type { CorpusSearchHit } from "../corpus-runtime/contracts";
import { studyGuideById } from "../content/study-guides";

const topic: StudyTopic = {
  id: "doctrine:trinity",
  kind: "entity",
  title: "Trindade",
  description: "",
  terms: ["Trindade", "Trinity"],
};
const group: Study = {
  id: "group:one",
  title: "Minhas leituras",
  slug: "leituras",
  items: [],
  createdAt: "",
  updatedAt: "",
};
const note: Note = {
  id: "note:one",
  title: "Uma observação",
  body: "",
  links: [
    { kind: "study", target: group.id, label: group.title },
    { kind: "concept", target: topic.id, label: topic.title },
  ],
  createdAt: "",
  updatedAt: "",
};
const work: PrimarySourceWorkSummary = {
  id: "work:nicene-creed-325",
  title: "Credo de Niceia",
  canonicalTitle: "Nicene Creed",
  editionTitle: "Edição instalada",
  editionId: "creeds",
  corpusId: "creeds",
  language: "en",
  rights: "Public domain",
  attribution: "Fonte",
  disciplineId: "history",
  disciplineLabel: "História",
};
const hit: CorpusSearchHit = {
  textUnit: {
    id: "unit:creed:1",
    workId: work.id,
    corpusId: "creeds",
    editionId: "creeds",
    sequence: 1,
    unitType: "section",
    text: "We believe in one God",
    language: "en",
    displayAddress: "Seção 1",
    provenance: { acquisition: "imported", creationMethod: "human" },
  },
  rank: 1,
  snippet: "We believe",
  matchKind: "full-text",
};

describe("real study topic discovery", () => {
  it("preserves curated provenance and keeps search available when curated lookup fails", async () => {
    const sources = {
      works: async () => [],
      primary: async () => [hit],
      private: async () => [],
      evidence: async () => ({ references: [], fragments: [] }),
      curated: async () => {
        throw new Error("unavailable edition");
      },
    };
    const failed = await loadTopicReadings(topic, undefined, sources);
    expect(failed.items).toEqual([]); // Hit's work is not installed.
    expect(failed.warnings).toHaveLength(1);
    const selected = {
      id: "selected:q1",
      title: "Synthetic",
      locator: "q1",
      excerpt: "",
      origin: "private-curated" as const,
      source: {
        kind: "private-document" as const,
        documentId: "doc:one",
        page: 1,
        title: "Synthetic",
      },
    };
    const result = await loadTopicReadings(topic, undefined, {
      ...sources,
      works: async () => [work],
      curated: async () => ({ items: [selected], warnings: [] }),
    });
    expect(result.items[0]).toEqual(selected);
    expect(result.items.some((item) => item.origin === "primary-search")).toBe(true);
  });
  it("does not pull unrelated notes from a group merely because one note mentions the topic", () => {
    const unrelated = {
      ...note,
      id: "note:other",
      links: note.links.filter((link) => link.kind === "study"),
    };
    expect(studiesForTopic(topic, [group], [note, unrelated])).toEqual([group]);
    expect(notesForTopic(topic, [group], [note, unrelated])).toEqual([note]);
    const explicitlyLinked = {
      ...group,
      items: [
        {
          id: "marker",
          kind: "concept" as const,
          refId: topic.id,
          label: topic.title,
          addedAt: "",
        },
      ],
    };
    expect(notesForTopic(topic, [explicitlyLinked], [note, unrelated])).toHaveLength(2);
    expect(notesForTopic({ ...topic, id: "another-topic" }, [group], [note, unrelated])).toEqual(
      [],
    );
  });
  it("keeps real unit/page anchors, excludes demo units and deduplicates repeated searches", async () => {
    const data = await loadTopicReadings(topic, undefined, {
      works: async () => [work],
      primary: async () => [
        hit,
        {
          ...hit,
          textUnit: {
            ...hit.textUnit,
            id: "demo:1",
            provenance: { ...hit.textUnit.provenance, isDemo: true },
          },
        },
      ],
      private: async () => [
        {
          documentId: "private:one",
          sourceId: "source:one",
          title: "Livro privado",
          pageIndex: 35,
          pageLabel: "20",
          snippet: "Comentário existente",
          rank: -1,
        },
      ],
      evidence: async () => ({ references: [], fragments: [] }),
    });
    expect(data.items).toHaveLength(3);
    expect(data.items.find((item) => item.id === hit.textUnit.id)?.source).toMatchObject({
      workId: work.id,
      unitId: hit.textUnit.id,
    });
    const privateItem = data.items.find((item) => item.origin === "private-search")!;
    expect(privateItem.locator).toBe("p. 20");
    expect(privateItem.source).toMatchObject({ kind: "private-document", page: 36 });
    expect(data.warnings).toEqual([]);
  });
  it("keeps installed texts available when private storage fails, without inventing excerpts", async () => {
    const data = await loadTopicReadings(topic, undefined, {
      works: async () => [work],
      primary: async () => [],
      private: async () => {
        throw new Error("locked");
      },
      evidence: async () => ({ references: [], fragments: [] }),
    });
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.origin).toBe("catalog");
    expect(data.items[0]?.excerpt).toBe("");
    expect(data.warnings).toHaveLength(1);
  });
  it("uses a bounded bilingual query and preserves exact topic identity", () => {
    const guide = describeStudyGuide(studyGuideById("trindade-cristologia")!);
    expect(guide.terms).toContain("trinity");
    expect(guide.terms.length).toBeLessThanOrEqual(3);
    const entity = describeStudyEntity({
      kind: "ontology",
      entity: {
        id: topic.id,
        kind: "doctrine",
        labels: { canonicalName: "Trinity", aliases: [], localizedLabels: {}, abbreviations: [] },
        sourceIds: [],
        topicIds: [],
      },
    });
    expect(entity.id).toBe(topic.id);
    expect(entity.terms).toEqual(["Trindade", "Trinity"]);
    expect(entity.guide?.id).toBe("trindade-cristologia");
  });
});
