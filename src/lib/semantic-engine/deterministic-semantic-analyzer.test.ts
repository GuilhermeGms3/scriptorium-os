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

function pageWith(text: string): PrivateDocumentPage {
  return { ...page, text, characterCount: text.length };
}

async function linksOf(text: string, context?: { sectionTitle?: string }) {
  return (await analyzePrivateDocumentPage(document, pageWith(text), context))
    .flatMap((item) => item.passageLinks)
    .map(({ bookId, chapter, verseStart, confidence, referenceZone }) => ({
      bookId,
      chapter,
      verseStart,
      confidence,
      referenceZone,
    }));
}

describe("document language", () => {
  it("parses a Spanish document with the Spanish abbreviations", async () => {
    const spanish: PrivateDocument = { ...document, language: "es" };
    const bundles = await analyzePrivateDocumentPage(
      spanish,
      pageWith("Como dice Jn 3:16, y también Hch 2:1 y Sal 23:1."),
    );
    expect(bundles.flatMap((item) => item.passageLinks).map((link) => link.bookId)).toEqual([
      "john",
      "acts",
      "psalms",
    ]);
  });
});

describe("reference zones on real-looking pages", () => {
  it("drops a Westminster-style canon table split into rows", async () => {
    expect(
      await linksOf(
        "DO ANTIGO TESTAMENTO\n\nGênesis    1 Reis\n\nJuízes    1 Crônicas\n\nRute    2 Crônicas\n\n1 Samuel    Esdras",
      ),
    ).toEqual([]);
  });

  it("keeps only verse references of a dotted table of contents, flagged and weakened", async () => {
    const links = await linksOf(
      "SUMÁRIO\n\nIntrodução ........................ 7\nCapítulo 1: A criação em Gênesis 1 ........ 12\nCapítulo 2: O prólogo de João 1 ........... 45\nCapítulo 3: Jo 3:16 e o amor de Deus ...... 78",
    );
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      bookId: "john",
      chapter: 3,
      verseStart: 16,
      referenceZone: "toc",
    });
    expect(links[0]!.confidence).toBeLessThanOrEqual(0.6);
  });

  it("drops bare chapters inside bibliography entries", async () => {
    expect(
      await linksOf(
        "BIBLIOGRAFIA\n\nBRUCE, F. F. O evangelho de João 3. São Paulo: Vida Nova, 1987.\n\nCARSON, D. A. Comentário de Romanos 5. São Paulo: Vida Nova, 2010.",
      ),
    ).toEqual([]);
  });

  it("carries the section title from previous pages", async () => {
    expect(
      await linksOf("Capítulo 4: O tema de Gênesis 22 ........ 91", { sectionTitle: "Sumário" }),
    ).toEqual([]);
  });

  it("keeps every reference of an ordinary paragraph in the body", async () => {
    expect(
      await linksOf("A exegese de João 3:16 retoma Gênesis 22. Compare Rm 5:8 e Jo 1:1-3."),
    ).toEqual([
      { bookId: "john", chapter: 3, verseStart: 16, confidence: 0.98, referenceZone: undefined },
      {
        bookId: "genesis",
        chapter: 22,
        verseStart: undefined,
        confidence: 0.9,
        referenceZone: undefined,
      },
      { bookId: "romans", chapter: 5, verseStart: 8, confidence: 0.98, referenceZone: undefined },
      { bookId: "john", chapter: 1, verseStart: 1, confidence: 0.98, referenceZone: undefined },
    ]);
  });
});
