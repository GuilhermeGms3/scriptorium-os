import { describe, expect, it } from "vitest";
import { DocumentPassageSchema, KnowledgeProposalPayloadSchema } from "./document-knowledge";

describe("document knowledge targets", () => {
  it("represents book, chapter, range and multiple passage targets without fabricating verses", () => {
    expect(
      DocumentPassageSchema.parse({
        workId: "work:john",
        bookId: "john",
        versificationSchemeId: "eng",
      }),
    ).toMatchObject({ bookId: "john" });
    const relation = KnowledgeProposalPayloadSchema.parse({
      kind: "passage-relation",
      rawReference: "João 1:1-3; 3:16",
      relationType: "discusses",
      relationScope: "pericope",
      passage: {
        bookId: "john",
        chapter: 1,
        verseStart: 1,
        verseEnd: 3,
        versificationSchemeId: "eng",
      },
      additionalPassages: [
        {
          bookId: "john",
          chapter: 3,
          verseStart: 16,
          verseEnd: 16,
          versificationSchemeId: "eng",
        },
      ],
    });
    expect(relation.kind).toBe("passage-relation");
    if (relation.kind === "passage-relation") expect(relation.additionalPassages).toHaveLength(1);
  });

  it("rejects verse targets without a chapter and reversed ranges", () => {
    expect(() =>
      DocumentPassageSchema.parse({
        bookId: "john",
        verseStart: 1,
        versificationSchemeId: "eng",
      }),
    ).toThrow(/capítulo/u);
    expect(() =>
      DocumentPassageSchema.parse({
        bookId: "john",
        chapter: 1,
        verseStart: 3,
        verseEnd: 1,
        versificationSchemeId: "eng",
      }),
    ).toThrow(/intervalo/u);
  });
});
