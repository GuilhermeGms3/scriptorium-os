import { describe, expect, it } from "vitest";
import type { WorkspacePassageKnowledgeItem } from "./workspace-passage-knowledge";
import { knowledgeItemCoversVerse } from "./workspace-passage-knowledge";

function item(scope: "verse" | "range" | "chapter"): WorkspacePassageKnowledgeItem {
  const now = "2026-10-09T00:00:00.000Z";
  const relation = {
    id: `proposal:${scope}`,
    documentId: "document:test",
    semanticUnitId: "unit:test",
    proposalKind: "passage-relation" as const,
    payload: {
      kind: "passage-relation" as const,
      rawReference: scope === "chapter" ? "João 2" : "João 2:1-3",
      relationType: "discusses" as const,
      relationScope: scope,
      passage: {
        workId: "work:john",
        bookId: "john",
        chapter: 2,
        ...(scope !== "chapter" ? { verseStart: 1, verseEnd: scope === "range" ? 3 : 1 } : {}),
        versificationSchemeId: "eng",
      },
      additionalPassages: [],
    },
    method: "test",
    confidence: 1,
    reviewStatus: "machine-proposed" as const,
    createdAt: now,
    updatedAt: now,
  };
  return {
    id: relation.id,
    reviewState: "pending",
    document: { id: "document:test", sourceId: "source:test", title: "Teste" },
    unit: {
      id: "unit:test",
      documentId: "document:test",
      kind: "paragraph",
      ordinal: 0,
      textChecksum: "a".repeat(64),
      language: "pt-BR",
      method: "test",
      spans: [
        {
          unitId: "unit:test",
          pageId: "page:test",
          pageIndex: 0,
          startOffset: 0,
          endOffset: 8,
          ordinal: 0,
        },
      ],
      text: relation.payload.rawReference,
    },
    passageRelation: relation,
    proposals: [relation],
    translation: null,
    pages: [0],
    context: {
      authors: [],
      attributions: [],
      citations: [],
      methods: ["test"],
      perspectiveProfileIds: [],
    },
  };
}

describe("knowledgeItemCoversVerse", () => {
  it("renders verse and range links only below the verses they cover", () => {
    expect(knowledgeItemCoversVerse(item("verse"), "john", 2, 1)).toBe(true);
    expect(knowledgeItemCoversVerse(item("verse"), "john", 2, 2)).toBe(false);
    expect(knowledgeItemCoversVerse(item("range"), "john", 2, 3)).toBe(true);
  });

  it("keeps chapter-level relations out of every individual verse", () => {
    expect(knowledgeItemCoversVerse(item("chapter"), "john", 2, 1)).toBe(false);
    expect(knowledgeItemCoversVerse(item("chapter"), "john", 2, 25)).toBe(false);
  });
});
