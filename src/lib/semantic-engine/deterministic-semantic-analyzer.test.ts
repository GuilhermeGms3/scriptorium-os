import { describe, expect, it } from "vitest";
import type { PrivateDocument, PrivateDocumentPage } from "../domain/private-document";
import { analyzePrivateDocumentPage } from "./deterministic-semantic-analyzer";

const document: PrivateDocument = {
  id: "private-document:test",
  sourceId: "source:test",
  assetId: "asset:test",
  title: "Teste",
  language: "pt-BR",
  pageCount: 1,
  textPageCount: 1,
  sizeBytes: 10,
  checksum: "a".repeat(64),
  extractionMethod: "pdf-text-layer",
  importedAt: "2026-09-30T00:00:00.000Z",
};

const page: PrivateDocumentPage = {
  id: "private-document:test:page:1",
  documentId: document.id,
  pageIndex: 0,
  pageLabel: "1",
  text: "EXEGESE\n\nA análise arqueológica de João 1:1 considera uma inscrição.",
  characterCount: 70,
  extractionMethod: "pdf-text-layer",
  quality: { hasText: true, itemCount: 8 },
};

describe("analyzePrivateDocumentPage", () => {
  it("segments deterministically and keeps classifications and links as reviewable proposals", async () => {
    const first = await analyzePrivateDocumentPage(document, page);
    const second = await analyzePrivateDocumentPage(document, page);
    expect(second).toEqual(first);
    expect(first[0]?.segment.structuralKind).toBe("heading");
    expect(first.flatMap((item) => item.classifications).map((item) => item.domain)).toEqual(
      expect.arrayContaining(["exegesis", "archaeology"]),
    );
    expect(first.flatMap((item) => item.passageLinks)).toMatchObject([
      {
        bookId: "john",
        chapter: 1,
        verseStart: 1,
        reviewStatus: "machine-proposed",
      },
    ]);
  });
});
