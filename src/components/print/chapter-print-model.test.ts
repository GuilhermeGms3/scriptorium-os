import { describe, expect, it } from "vitest";
import type { KnowledgeClaim } from "../../lib/domain/knowledge";
import type { VerseContent } from "../../lib/domain/scripture";
import type { WorkspacePassageKnowledgeItem } from "../../lib/domain/workspace-passage-knowledge";
import { chapterPrintModel } from "./chapter-print-model";

const NOW = "2026-10-27T00:00:00.000Z";

function verse(number: number, text?: string, extra: Partial<VerseContent> = {}): VerseContent {
  return {
    ref: { bookId: "john", chapter: 1, verseStart: number, verseEnd: number },
    verse: number,
    translations: text === undefined ? {} : { blivre: text },
    ...extra,
  };
}

function libraryItem({
  id,
  verses,
  document = "document:origenes",
  title = "Comentário de Orígenes",
  domain,
}: {
  id: string;
  /** [start, end] of the stretch it comments; omitted for the whole chapter. */
  verses?: [number, number];
  document?: string;
  title?: string;
  domain?: string;
}): WorkspacePassageKnowledgeItem {
  const relation = {
    id,
    documentId: document,
    semanticUnitId: `unit:${id}`,
    proposalKind: "passage-relation" as const,
    payload: {
      kind: "passage-relation" as const,
      rawReference: "João 1",
      relationType: "discusses" as const,
      relationScope: verses ? ("range" as const) : ("chapter" as const),
      passage: {
        workId: "work:john",
        bookId: "john",
        chapter: 1,
        ...(verses ? { verseStart: verses[0], verseEnd: verses[1] } : {}),
        versificationSchemeId: "eng",
      },
      additionalPassages: [],
      contextualAnalysis: {
        title: "Leitura do prólogo",
        summary: `Comentário ${id}: o Verbo estava junto de Deus desde o princípio.`,
        mode: "source-excerpt" as const,
        rationale: "Trecho literal da fonte sobre o prólogo de João.",
        contentType: "source-commentary" as const,
        limitations: [],
      },
    },
    method: "test",
    confidence: 1,
    reviewStatus: "machine-proposed" as const,
    createdAt: NOW,
    updatedAt: NOW,
  };
  const topic = domain
    ? [
        {
          ...relation,
          id: `${id}:topic`,
          proposalKind: "topic-assignment",
          payload: { kind: "topic-assignment", domain },
        },
      ]
    : [];
  return {
    id,
    reviewState: "confirmed",
    document: { id: document, sourceId: `source:${document}`, title },
    unit: {
      id: `unit:${id}`,
      documentId: document,
      kind: "paragraph",
      ordinal: 0,
      textChecksum: "a".repeat(64),
      language: "pt-BR",
      method: "test",
      spans: [],
      text: "texto literal",
    },
    passageRelation: relation,
    proposals: [relation, ...topic] as WorkspacePassageKnowledgeItem["proposals"],
    translation: null,
    pages: [11],
    context: {
      authors: [],
      attributions: [],
      citations: [],
      methods: ["test"],
      perspectiveProfileIds: [],
    },
  };
}

function claim(id: string, verseStart: number, kind: string): KnowledgeClaim {
  return {
    id,
    proposition: `Afirmação ${id}`,
    anchors: [
      { type: "passage", ref: { bookId: "john", chapter: 1, verseStart, verseEnd: verseStart } },
    ],
    kind,
    evidence: [],
    sourceFragmentIds: [`fragment:${id}`],
    origin: "editorial",
    reviewStatus: "reviewed",
    supportLevel: "direct",
  } as unknown as KnowledgeClaim;
}

const VERSES = [
  verse(1, "No princípio era o Verbo"),
  verse(2, "Ele estava no princípio com Deus"),
  verse(3, "Todas as coisas foram feitas por ele"),
  verse(4, "Nele estava a vida"),
];

function model(overrides: Partial<Parameters<typeof chapterPrintModel>[0]> = {}) {
  return chapterPrintModel({
    bookId: "john",
    chapter: 1,
    verses: VERSES,
    editionId: "blivre",
    original: false,
    includeComments: true,
    claims: [],
    libraryItems: [],
    hiddenSources: new Set(),
    domain: "",
    ...overrides,
  });
}

describe("impressão do capítulo", () => {
  it("prints a library note once, under the first verse it covers, with its stretch", () => {
    const printed = model({ libraryItems: [libraryItem({ id: "a", verses: [2, 4] })] });
    expect(printed.verses.map((item) => item.comments.length)).toEqual([0, 1, 0, 0]);
    expect(printed.verses[1]!.comments[0]).toMatchObject({
      source: "Comentário de Orígenes · p. 12",
      passage: "vv. 2–4",
      text: "Comentário a: o Verbo estava junto de Deus desde o princípio.",
      provenance: "Comentário original da fonte · ligação confirmada",
    });
  });

  it("puts notes on the whole chapter and on long stretches in the panorama, not under verses", () => {
    const printed = model({
      libraryItems: [
        libraryItem({ id: "chapter" }),
        libraryItem({ id: "long", verses: [1, 18] }),
        libraryItem({ id: "short", verses: [1, 1] }),
      ],
    });
    // Same order as the panorama on screen: the whole chapter first, then the long stretch.
    expect(printed.overview.map((item) => item.id)).toEqual(["chapter", "long"]);
    expect(printed.overview[0]!.passage).toBe("João 1");
    expect(printed.overview[1]!.passage).toBe("João 1:1–18");
    expect(printed.verses[0]!.comments.map((item) => item.id)).toEqual(["short"]);
    expect(printed.verses[0]!.comments[0]!.passage).toBeUndefined();
  });

  it("leaves out sources the reader turned off and notes outside the chosen subject", () => {
    const items = [
      libraryItem({ id: "off", verses: [1, 1], document: "document:off", title: "Desligada" }),
      libraryItem({ id: "history", verses: [2, 2], domain: "history" }),
      libraryItem({ id: "theology", verses: [3, 3], domain: "theology" }),
    ];
    const printed = model({
      libraryItems: items,
      hiddenSources: new Set(["document:off"]),
      domain: "theology",
    });
    expect(printed.verses.flatMap((item) => item.comments.map((comment) => comment.id))).toEqual([
      "theology",
    ]);
  });

  it("prints no comments at all when the reader hid them", () => {
    const printed = model({
      includeComments: false,
      claims: [claim("c1", 1, "exegetical-interpretation")],
      libraryItems: [libraryItem({ id: "chapter" }), libraryItem({ id: "a", verses: [1, 1] })],
    });
    expect(printed.overview).toEqual([]);
    expect(printed.verses.every((item) => item.comments.length === 0)).toBe(true);
  });

  it("prints editorial claims with the cited source, but not notes on the wording of the text", () => {
    const printed = model({
      claims: [claim("c1", 1, "exegetical-interpretation"), claim("c2", 1, "linguistic-analysis")],
      sources: {
        references: [{ id: "source:ante-nicene", work: "Ante-Nicene Fathers" } as never],
        fragments: [
          {
            id: "fragment:c1",
            sourceId: "source:ante-nicene",
            locator: "vol. IX, p. 307",
          } as never,
        ],
      },
    });
    expect(printed.verses[0]!.comments).toHaveLength(1);
    expect(printed.verses[0]!.comments[0]).toMatchObject({
      text: "Afirmação c1",
      source: "Ante-Nicene Fathers · vol. IX, p. 307",
    });
    expect(printed.verses[0]!.comments[0]!.provenance).toContain(" · ");
  });

  it("joins the original words and marks a verse the edition does not have", () => {
    const greek = verse(1, undefined, {
      original: [
        { surface: "Ἐν", suffix: "" },
        { surface: "ἀρχῇ", suffix: "" },
        { surface: "λόγος", suffix: "," },
      ] as NonNullable<VerseContent["original"]>,
      startsParagraph: true,
    });
    const hebrew = verse(2, undefined, {
      original: [
        { surface: "בְּ/רֵאשִׁית", suffix: "" },
        { surface: "כִּי", suffix: "־" },
        { surface: "טוֹב", suffix: "׃" },
      ] as NonNullable<VerseContent["original"]>,
    });
    const printed = model({ verses: [greek, hebrew, verse(3)], original: true });
    expect(printed.verses[0]).toMatchObject({ text: "Ἐν ἀρχῇ λόγος,", startsParagraph: true });
    expect(printed.verses[1]!.text).toBe("בְּרֵאשִׁית כִּי־טוֹב׃");
    expect(printed.verses[2]!.text).toBeNull();
    expect(model({ verses: [verse(2)] }).verses[0]!.text).toBeNull();
  });
});
