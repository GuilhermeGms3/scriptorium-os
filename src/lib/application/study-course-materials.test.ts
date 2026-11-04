import { describe, expect, it } from "vitest";
import type { WorkspacePassageKnowledgeItem } from "../domain/workspace-passage-knowledge";
import { selectCourseReadings } from "./study-course-materials";
import { researchTarget, normalizedResearchTerm } from "./research-dossier-service";
import { GENESIS_COURSE } from "../content/study-courses/genesis";
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

function reading(): WorkspacePassageKnowledgeItem {
  const source = item("range");
  source.reviewState = "confirmed";
  source.passageRelation.payload.passage = {
    bookId: "genesis",
    chapter: 1,
    verseStart: 1,
    verseEnd: 3,
    versificationSchemeId: "scriptorium-bcv-1",
  };
  source.passageRelation.payload.contextualAnalysis = {
    title: "Comentário da abertura",
    summary: "Explicação com evidência da fonte identificada.",
    rationale: "A fonte explica a abertura da passagem em seu contexto.",
    contentType: "exegetical-note",
    limitations: [],
  };
  return source;
}
describe("seleção pedagógica com proveniência", () => {
  const module = GENESIS_COURSE.modules[0]!;
  it("accepts only source-backed published contextual units and deduplicates", () => {
    const valid = reading();
    expect(selectCourseReadings(module, [valid, valid])).toHaveLength(1);
    valid.reviewState = "pending";
    expect(selectCourseReadings(module, [valid])).toEqual([]);
    valid.reviewState = "auto-visible";
    valid.unit.text = " ";
    expect(selectCourseReadings(module, [valid])).toEqual([]);
    valid.unit.text = "Nota real";
    delete valid.passageRelation.payload.contextualAnalysis;
    expect(selectCourseReadings(module, [valid])).toEqual([]);
  });
  it("rejects unrelated passages and incompatible versification", () => {
    const valid = reading();
    valid.passageRelation.payload.passage.chapter = 12;
    expect(selectCourseReadings(module, [valid])).toEqual([]);
    valid.passageRelation.payload.passage.chapter = 1;
    valid.passageRelation.payload.passage.versificationSchemeId = "other";
    expect(selectCourseReadings(module, [valid])).toEqual([]);
  });
  it("keeps lexical mentions in language modules and demands relevant domains for context", () => {
    const valid = reading();
    valid.passageRelation.payload.referenceRole = "lexical-mention";
    expect(selectCourseReadings(module, [valid])).toEqual([]);
    expect(selectCourseReadings(GENESIS_COURSE.modules[2]!, [valid])).toHaveLength(1);
    delete valid.passageRelation.payload.referenceRole;
    valid.passageRelation.payload.passage.verseEnd = 28;
    expect(selectCourseReadings(GENESIS_COURSE.modules[3]!, [valid])).toEqual([]);
    valid.proposals.push({
      ...valid.passageRelation,
      id: "topic",
      proposalKind: "topic-assignment",
      payload: {
        kind: "topic-assignment",
        domain: "archaeology",
        evidence: ["Contexto da passagem"],
      },
    });
    expect(selectCourseReadings(GENESIS_COURSE.modules[3]!, [valid])).toHaveLength(1);
  });
});
describe("entrada do dossiê de pesquisa", () => {
  it("normalizes Hebrew marks and common Bereshit spellings", () => {
    for (const text of ["Bereshit", "Bereishit", "bereshith", "בְּרֵאשִׁית", "בְּ/רֵאשִׁ֖ית"]) {
      expect(researchTarget(text)).toMatchObject({
        ref: { bookId: "genesis", chapter: 1, verseStart: 1 },
        word: "בראשית",
      });
    }
    expect(normalizedResearchTerm("Lógos")).toBe("logos");
  });
  it("resolves passages and a word within its explicit context", () => {
    expect(researchTarget("Gênesis 1:1–3")).toMatchObject({
      ref: { bookId: "genesis", chapter: 1, verseStart: 1, verseEnd: 3 },
    });
    expect(researchTarget("logos @ João 1:1")).toMatchObject({
      ref: { bookId: "john", chapter: 1, verseStart: 1 },
      word: "logos",
    });
    expect(researchTarget("Bereshit @ Gênesis 1:1")).toMatchObject({
      ref: { bookId: "genesis", chapter: 1 },
      word: "בראשית",
    });
    expect(researchTarget("tema não identificado")).toBeNull();
  });
});
