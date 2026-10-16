import { describe, expect, it } from "vitest";
import type { DocumentKnowledgeIndexSummary } from "../../lib/domain/document-knowledge";
import { documentProcessingStatusLine } from "./document-processing-status";

const summary = (
  status: DocumentKnowledgeIndexSummary["status"],
): DocumentKnowledgeIndexSummary => ({
  documentId: "private-document:test",
  analyzerId: "deterministic-document-knowledge",
  analyzerVersion: "3",
  sourceChecksum: "a".repeat(64),
  status,
  stage: status === "ready" ? "complete" : "proposals",
  checkpointPage: 12,
  nodeCount: 4,
  unitCount: 1234,
  proposalCount: 5678,
});

describe("documentProcessingStatusLine", () => {
  it("says in plain words where the book stands", () => {
    expect(documentProcessingStatusLine(undefined)).toBe("Verificando o estado do livro…");
    expect(documentProcessingStatusLine(null)).toBe(
      "Ainda não desmontado. Abra para usar “Desmontar livro”.",
    );
    expect(documentProcessingStatusLine(summary("processing"))).toBe(
      "Desmontagem em andamento (até a página 12).",
    );
    expect(documentProcessingStatusLine(summary("failed"))).toBe(
      "A última desmontagem não terminou. Abra para ver o motivo e retomar.",
    );
    expect(documentProcessingStatusLine(summary("ready"))).toBe(
      "Desmontado em 1.234 trechos · 5.678 propostas para revisão.",
    );
  });
});
