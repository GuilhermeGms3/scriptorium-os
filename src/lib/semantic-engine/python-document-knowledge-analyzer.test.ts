import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrivateDocument, PrivateDocumentPage } from "../domain/private-document";
import { PythonDocumentKnowledgeAnalyzer } from "./python-document-knowledge-analyzer";

const document: PrivateDocument = {
  id: `private-document:${"d".repeat(64)}`,
  sourceId: `source:private-document:${"d".repeat(64)}`,
  assetId: `asset:private-document:${"d".repeat(64)}`,
  title: "Livro contextual",
  language: "pt-BR",
  pageCount: 1,
  textPageCount: 1,
  sizeBytes: 128,
  checksum: "d".repeat(64),
  extractionMethod: "pdf-text-layer",
  importedAt: "2026-10-02T00:00:00.000Z",
};

const page: PrivateDocumentPage = {
  id: `${document.id}:page:1`,
  documentId: document.id,
  pageIndex: 0,
  pageLabel: "1",
  text: "CAPÍTULO 1\n\nAgostinho afirma que o Verbo existe desde a eternidade.",
  characterCount: 72,
  extractionMethod: "pdf-text-layer",
  quality: { hasText: true, itemCount: 10 },
};

afterEach(() => vi.restoreAllMocks());

describe("PythonDocumentKnowledgeAnalyzer", () => {
  it("uses analyzeBatch and persists provider checkpoint state", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { units: Array<{ id: string }> };
      return new Response(
        JSON.stringify({
          analyzerId: "contextual-rule-analyzer",
          analyzerRevision: "2",
          proposals: [
            {
              unitId: body.units[0]!.id,
              payload: {
                kind: "attribution",
                statement: "o Verbo existe desde a eternidade.",
                agentLabel: "Agostinho",
                agentType: "person",
                relation: "asserts",
                resolution: "explicit",
              },
              confidence: 0.82,
            },
          ],
          checkpoint: { lastPersonLabel: "Agostinho", processedUnits: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const result = await PythonDocumentKnowledgeAnalyzer.analyzeBatch!(document, [page]);

    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0]?.[0]).toBe("http://127.0.0.1:8018/v1/analyze/batch");
    expect(result.checkpoint.providerState).toEqual({
      lastPersonLabel: "Agostinho",
      processedUnits: 1,
    });
    expect(result.proposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "contextual-rule-analyzer:2",
          proposalKind: "attribution",
          reviewStatus: "machine-proposed",
        }),
      ]),
    );
  });
});
