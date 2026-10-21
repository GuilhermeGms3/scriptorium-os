import { describe, expect, it } from "vitest";
import type { WorkspacePassageKnowledgeItem } from "./workspace-passage-knowledge";
import { knowledgeItemCoversVerse } from "./workspace-passage-knowledge";
import { readerContextMatches, itemTradition } from "./reader-context-filter";
import {
  belongsInChapterOverview,
  isBroadCommentary,
} from "../../components/scripture/commentary-presentation";

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
  it("preserves chapter comments in the panorama in both full and summary modes, never under each verse", () => {
    const chapter = item("chapter");
    expect(isBroadCommentary(chapter)).toBe(true);
    expect(belongsInChapterOverview(chapter, true)).toBe(true);
    expect(belongsInChapterOverview(chapter, false)).toBe(true);
    expect(knowledgeItemCoversVerse(chapter, "john", 2, 1)).toBe(false);
    expect(belongsInChapterOverview(item("verse"), true)).toBe(false);
  });
  it("filters only declared traditions, never guesses from a title", () => {
    const value = item("verse");
    value.document.title = "Comentário ortodoxo reformado";
    expect(itemTradition(value)).toBeUndefined();
    expect(readerContextMatches(value, { tradition: "Ortodoxa", kind: "all" })).toBe(false);
    expect(readerContextMatches(value, { tradition: "", kind: "all" })).toBe(true);
    value.document.id =
      "private-document:504c2c2665f24c40bf29287605cacc5f1e81e05206fcd4c6452a0fab9cd7bc6c";
    expect(itemTradition(value)).toBe("Reformada · perfil editorial da fonte");
  });
  it("keeps proof texts separate and applies source/domain without discarding records", () => {
    const value = item("verse");
    value.passageRelation.payload.referenceRole = "proof-text";
    expect(readerContextMatches(value, { tradition: "", kind: "commentary" })).toBe(false);
    expect(readerContextMatches(value, { tradition: "", kind: "confessional" })).toBe(true);
    expect(readerContextMatches(value, { tradition: "", kind: "all", source: "other" })).toBe(
      false,
    );
    expect(
      readerContextMatches(value, {
        tradition: "",
        kind: "all",
        hiddenSources: [value.document.id],
      }),
    ).toBe(false);
    expect(
      readerContextMatches(value, {
        tradition: "",
        kind: "all",
        hiddenSources: ["another-source"],
      }),
    ).toBe(true);
    expect(readerContextMatches(value, { tradition: "", kind: "all", domain: "exegesis" })).toBe(
      false,
    );
    expect(value.passageRelation.payload.referenceRole).toBe("proof-text");
  });
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
