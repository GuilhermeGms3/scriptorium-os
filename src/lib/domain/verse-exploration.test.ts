import { describe, expect, it } from "vitest";
import { available, demo, unavailable } from "./availability";
import { buildVerseExploration, libraryExplorationCategory } from "./verse-exploration";
import type { WorkspacePassageKnowledgeItem } from "./workspace-passage-knowledge";
import type { KnowledgeClaim } from "./knowledge";
import type { PassageAnalysis } from "./analysis";
import type { Note } from "./study";

function bundle(): Parameters<typeof buildVerseExploration>[0] {
  return {
    identity: { ref: { bookId: "genesis", chapter: 3 }, key: "genesis3", label: "Gênesis 3" },
    passage: {
      editions: [],
      textUnits: [],
      verses: Array.from({ length: 24 }, (_, i) => ({
        ref: { bookId: "genesis", chapter: 3, verseStart: i + 1 },
        verse: i + 1,
        translations: { blivre: `Versículo ${i + 1}` },
      })),
    },
    analyses: unavailable("empty", "Nenhuma análise"),
    claims: unavailable("empty", "Nenhuma afirmação"),
    provenance: { acquisition: "imported", creationMethod: "human" },
  };
}
function item(id: string, start: number, end = start): WorkspacePassageKnowledgeItem {
  const date = "2026-10-27T12:00:00.000Z";
  return {
    id,
    reviewState: "auto-visible",
    document: { id: `doc:${id}`, sourceId: `source:${id}`, title: `Fonte ${id}` },
    unit: {
      id: `unit:${id}`,
      documentId: `doc:${id}`,
      kind: "paragraph",
      ordinal: 0,
      textChecksum: "a".repeat(64),
      language: "pt-BR",
      method: "test",
      spans: [],
      text: "Texto da fonte",
    },
    passageRelation: {
      id,
      documentId: `doc:${id}`,
      semanticUnitId: `unit:${id}`,
      proposalKind: "passage-relation",
      method: "test",
      confidence: 1,
      reviewStatus: "machine-proposed",
      createdAt: date,
      updatedAt: date,
      payload: {
        kind: "passage-relation",
        rawReference: `Gn 3:${start}–${end}`,
        relationType: "discusses",
        relationScope: start === end ? "verse" : "range",
        passage: {
          bookId: "genesis",
          chapter: 3,
          verseStart: start,
          verseEnd: end,
          versificationSchemeId: "scriptorium-bcv-1",
        },
        additionalPassages: [],
        contextualAnalysis: {
          title: `Comentário ${id}`,
          summary: "Exposição contextual já existente na fonte.",
          rationale: "A fonte discute a passagem identificada.",
          contentType: "exegetical-note",
          limitations: ["Ligação automática, não revisão humana."],
        },
      },
    },
    proposals: [],
    translation: null,
    pages: [12],
    context: {
      authors: [],
      attributions: [],
      citations: [],
      methods: [],
      perspectiveProfileIds: [],
    },
  };
}

describe("caminhos próprios de cada versículo", () => {
  it("does not turn a bare reference detection into a commentary path", () => {
    const mention = item("bare-reference", 1);
    delete mention.passageRelation.payload.contextualAnalysis;
    expect(buildVerseExploration(bundle(), [mention], []).get(1)).toEqual([]);
  });
  it("groups repeated source/domain excerpts without dropping any source text", () => {
    const a = item("a", 1);
    const b = item("b", 1);
    b.document = a.document;
    const blocks = buildVerseExploration(bundle(), [a, b], []).get(1)!;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      kind: "library",
      items: [{ id: "a" }, { id: "b" }],
      preview: "2 trechos vinculados",
    });
  });
  it("projects many verses with variable chains and never pads empty categories", () => {
    const data = bundle();
    const items = Array.from({ length: 24 }, (_, i) => item(`verse${i}`, i + 1));
    items.push(...Array.from({ length: 8 }, (_, i) => item(`extra${i}`, 1)));
    const before = JSON.stringify({ data, items });
    const paths = buildVerseExploration(data, items, []);
    expect(paths.size).toBe(24);
    expect(paths.get(1)).toHaveLength(9);
    expect(paths.get(2)).toHaveLength(1);
    expect(paths.get(24)).toHaveLength(1);
    expect(paths.get(1)?.map((block) => block.category)).not.toContain("Arqueologia");
    expect(JSON.stringify({ data, items })).toBe(before);
  });
  it("preserves range provenance, deduplicates a source item and excludes chapter/book/lexical mentions", () => {
    const range = item("range", 2, 5);
    const chapter = item("chapter", 1, 24);
    chapter.passageRelation.payload.relationScope = "chapter";
    const book = item("book", 1, 24);
    book.passageRelation.payload.relationScope = "book";
    const lexical = item("mention", 1);
    lexical.passageRelation.payload.referenceRole = "lexical-mention";
    const paths = buildVerseExploration(bundle(), [range, range, chapter, book, lexical], []);
    expect(paths.get(1)).toEqual([]);
    expect(paths.get(2)).toHaveLength(1);
    expect(paths.get(5)).toHaveLength(1);
    expect(paths.get(6)).toEqual([]);
    expect(paths.get(2)?.[0]).toMatchObject({
      kind: "library",
      item: {
        reviewState: "auto-visible",
        passageRelation: { payload: { passage: { verseStart: 2, verseEnd: 5 } } },
      },
    });
  });
  it("uses declared domains, not keywords in book names; rejected classification is ignored", () => {
    const entry = item("domain", 1);
    delete entry.passageRelation.payload.contextualAnalysis;
    entry.document.title = "Arqueologia e antropologia";
    expect(libraryExplorationCategory(entry).category).toBe("Trecho relacionado");
    entry.proposals.push({
      ...entry.passageRelation,
      proposalKind: "topic-assignment",
      payload: {
        kind: "topic-assignment",
        domain: "archaeology",
        evidence: ["explicit"],
      },
    });
    expect(libraryExplorationCategory(entry)).toEqual({ category: "Arqueologia", area: "context" });
    entry.proposals[0]!.reviewStatus = "rejected";
    expect(libraryExplorationCategory(entry).category).toBe("Trecho relacionado");
  });
  it("does not advertise placeholders or demonstration records as available scholarship", () => {
    const data = bundle();
    const analysis: PassageAnalysis = {
      id: "a",
      anchor: {
        type: "passage",
        ref: { bookId: "genesis", chapter: 3, verseStart: 1, verseEnd: 3 },
      },
      lensId: "historical",
      title: "Contexto",
      summary: "Exposição com referência",
      status: "draft",
      reviewStatus: "draft",
      interpretationKind: "historical-reconstruction",
      sourceFragmentIds: [],
    };
    data.analyses = available([
      analysis,
      { ...analysis, id: "placeholder", status: "placeholder" },
    ]);
    expect(buildVerseExploration(data, [], []).get(2)).toHaveLength(1);
    expect(buildVerseExploration(data, [], []).get(4)).toEqual([]);
    data.analyses = demo([analysis], "Demonstração");
    expect(buildVerseExploration(data, [], []).get(2)).toEqual([]);
  });
  it("keeps human notes local and scheme-specific; includes only actual original tokens", () => {
    const data = bundle();
    data.passage.verses[0]!.original = [
      {
        id: "token",
        editionId: "hebrew",
        textUnitId: "unit",
        language: "hbo",
        position: 1,
        ref: data.identity.ref,
        surface: "test",
      },
    ];
    const note: Note = {
      id: "n",
      title: "Pergunta pessoal",
      body: "Minha nota",
      createdAt: "2026-10-27",
      updatedAt: "2026-10-27",
      links: [
        {
          kind: "passage",
          target: "x",
          label: "Gn 3:2",
          anchor: { type: "passage", ref: { bookId: "genesis", chapter: 3, verseStart: 2 } },
        },
      ],
    };
    const wrongScheme: Note = {
      ...note,
      id: "other",
      links: [
        {
          ...note.links[0]!,
          anchor: {
            type: "passage",
            ref: {
              bookId: "genesis",
              chapter: 3,
              verseStart: 2,
              versificationSchemeId: "different",
            },
          },
        },
      ],
    };
    const paths = buildVerseExploration(data, [], [note, wrongScheme]);
    expect(paths.get(1)?.map((block) => block.kind)).toEqual(["language"]);
    expect(paths.get(2)?.map((block) => block.id)).toEqual(["note:n"]);
    expect(paths.get(3)).toEqual([]);
  });
  it("does not relocate claims through entity links or other passages", () => {
    const data = bundle();
    const claim: KnowledgeClaim = {
      id: "claim",
      proposition: "Interpretação",
      anchors: [
        { type: "entity", entityId: "adam" },
        { type: "passage", ref: { bookId: "genesis", chapter: 4, verseStart: 1 } },
      ],
      kind: "philosophical-analysis",
      evidence: [],
      sourceFragmentIds: [],
      origin: "editorial",
      reviewStatus: "draft",
      supportLevel: "unknown",
    };
    data.claims = available([claim]);
    expect(buildVerseExploration(data, [], []).get(1)).toEqual([]);
  });
});
