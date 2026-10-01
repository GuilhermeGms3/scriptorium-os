import { describe, expect, it } from "vitest";
import type { PrivateDocument, PrivateDocumentPage } from "../domain/private-document";
import { DeterministicDocumentKnowledgeAnalyzer } from "./document-knowledge-analyzer";

const document: PrivateDocument = {
  id: `private-document:${"a".repeat(64)}`,
  sourceId: `source:private-document:${"a".repeat(64)}`,
  assetId: `asset:private-document:${"a".repeat(64)}`,
  title: "Livro de teste",
  language: "pt-BR",
  pageCount: 3,
  textPageCount: 3,
  sizeBytes: 1_024,
  checksum: "a".repeat(64),
  extractionMethod: "pdf-text-layer",
  importedAt: "2026-10-01T00:00:00.000Z",
};

function page(pageIndex: number, text: string): PrivateDocumentPage {
  return {
    id: `${document.id}:page:${pageIndex + 1}`,
    documentId: document.id,
    pageIndex,
    pageLabel: String(pageIndex + 1),
    text,
    characterCount: text.length,
    extractionMethod: "pdf-text-layer",
    quality: { hasText: true, itemCount: 10 },
  };
}

describe("deterministic document knowledge analyzer", () => {
  it("reconstructs structure, joins a page break and emits reviewable proposals", async () => {
    const result = await DeterministicDocumentKnowledgeAnalyzer.analyze(document, [
      page(0, "CAPÍTULO 1\n\nA interpretação de João 1:1 é importante porque o vocabulário"),
      page(1, "grego sustenta a leitura. Orígenes afirma: “O Logos é apresentado como divino.”"),
      page(2, "1.1 CONTEXTO\n\nA conclusão representa uma hipótese acadêmica."),
    ]);

    expect(result.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining(["book", "chapter", "section"]),
    );
    expect(result.units.some((unit) => unit.spans.length === 2)).toBe(true);
    expect(result.proposals.map((proposal) => proposal.proposalKind)).toEqual(
      expect.arrayContaining(["claim", "argument", "citation", "entity", "passage-relation"]),
    );
    expect(result.proposals.every((proposal) => proposal.reviewStatus === "machine-proposed")).toBe(
      true,
    );
  });

  it("is deterministic apart from audit timestamps", async () => {
    const pages = [page(0, "CAPÍTULO 1\n\nA tese é uma proposta sobre João 1:1.")];
    const first = await DeterministicDocumentKnowledgeAnalyzer.analyze(document, pages);
    const second = await DeterministicDocumentKnowledgeAnalyzer.analyze(document, pages);
    expect(second.nodes).toEqual(first.nodes);
    expect(second.units).toEqual(first.units);
    expect(second.proposals.map(({ createdAt: _a, updatedAt: _b, ...item }) => item)).toEqual(
      first.proposals.map(({ createdAt: _a, updatedAt: _b, ...item }) => item),
    );
  });
});
