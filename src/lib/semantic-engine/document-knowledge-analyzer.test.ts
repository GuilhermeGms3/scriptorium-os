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
describe("Portuguese sentence handling", () => {
  async function payloads(text: string) {
    const analysis = await DeterministicDocumentKnowledgeAnalyzer.analyze(document, [
      page(0, `CAPÍTULO 1\n\n${text}`),
    ]);
    return analysis.proposals.map((proposal) => proposal.payload);
  }

  it('detects assertions with accented copulas such as "é"', async () => {
    const claims = (
      await payloads("O Logos é Deus desde a eternidade, conforme o prólogo do evangelho.")
    ).filter((payload) => payload.kind === "claim");
    expect(claims).toHaveLength(1);
  });

  it('does not treat the Portuguese contraction "no" as a negation', async () => {
    const claim = (
      await payloads("Agostinho afirma que no prólogo o Verbo existe desde a eternidade.")
    ).find((payload) => payload.kind === "claim");
    expect(claim?.kind === "claim" && claim.qualifiers).not.toContain("contains-negation");
  });

  it('keeps "cf." inside its sentence', async () => {
    const claim = (
      await payloads("Segundo Agostinho (cf. Jo 1.1) o Verbo é eterno e não foi criado.")
    ).find((payload) => payload.kind === "claim");
    expect(claim?.kind === "claim" && claim.proposition).toBe(
      "Segundo Agostinho (cf. Jo 1.1) o Verbo é eterno e não foi criado.",
    );
  });

  it('uses the previous sentence as premise of a leading "Portanto,"', async () => {
    const argument = (
      await payloads(
        "A criação depende inteiramente do Verbo divino. Portanto, toda a criação depende do Verbo eterno.",
      )
    ).find((payload) => payload.kind === "argument");
    expect(argument).toMatchObject({
      premises: ["A criação depende inteiramente do Verbo divino."],
      conclusion: "toda a criação depende do Verbo eterno.",
    });
  });

  it("keeps attribution context across incremental batches", async () => {
    const first = await DeterministicDocumentKnowledgeAnalyzer.analyzeBatch!(document, [
      page(0, "CAPÍTULO 1\n\nAgostinho afirma que o Verbo existe desde a eternidade."),
    ]);
    const second = await DeterministicDocumentKnowledgeAnalyzer.analyzeBatch!(
      document,
      [page(1, "Ele sustenta que todas as coisas foram criadas pelo Verbo eterno.")],
      first.checkpoint,
    );

    expect(second.proposals.map((proposal) => proposal.payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "coreference",
          mention: "Ele",
          resolvedLabel: "Agostinho",
        }),
        expect.objectContaining({
          kind: "attribution",
          agentLabel: "Agostinho",
          resolution: "coreference",
        }),
      ]),
    );
  });

  it("classifies entries under a bibliography heading as bibliographic references", async () => {
    const result = await DeterministicDocumentKnowledgeAnalyzer.analyze(document, [
      page(
        0,
        "BIBLIOGRAFIA\n\nWEGNER, Uwe. Exegese do Novo Testamento. São Leopoldo: Sinodal, 1998.",
      ),
    ]);

    expect(result.units).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "bibliography-entry" })]),
    );
    expect(result.proposals.map((proposal) => proposal.payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "bibliographic-reference",
          authors: ["WEGNER, Uwe"],
          title: "Exegese do Novo Testamento",
          year: 1998,
        }),
      ]),
    );
  });

  it("does not invent an author from a lowercase phrase after Segundo", async () => {
    const proposals = await payloads(
      "Segundo o seu sábio e santo conselho, foi Deus servido permitir este acontecimento.",
    );
    expect(proposals.filter((payload) => payload.kind === "attribution")).toEqual([]);
  });
});
