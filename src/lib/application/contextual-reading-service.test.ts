import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import type { ContextualReadingPackage } from "../domain/contextual-reading";
import { DEFAULT_BIBLICAL_VERSIFICATION } from "../domain/text-identity";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/workspace-database";
import { ContextualReadingService, locateReadingQuote } from "./contextual-reading-service";
import { KnowledgeTraceService } from "./knowledge-trace-service";
import { ResearchWorkspaceService } from "./research-workspace-service";
import { applyDocumentProfilePolicy } from "./document-profile-policy";
import { DocumentKnowledgePipelineService } from "./document-knowledge-pipeline-service";

const databases: DatabaseSync[] = [];
function workspace() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  const adapter: WorkspaceDatabase = {
    persistence: "memory",
    async query(sql, bind = []) {
      return db.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql, bind = []) {
      db.prepare(sql).run(...bind);
    },
    async transaction(statements) {
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const statement of statements)
          db.prepare(statement.sql).run(...(statement.bind ?? []));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async reset() {
      throw new Error("Not used");
    },
  };
  return { db, adapter };
}
afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

const quote = "Texto de evidência inteiramente sintético para validar a ligação contextual.";
const analysis = {
  title: "Análise sintética de integração",
  summary: "Síntese de teste, sem conteúdo real de livros ou citações protegidas.",
  rationale:
    "O contexto sintético foi associado ao endereço informado para testar a rastreabilidade.",
  contentType: "exegetical-note" as const,
  limitations: ["Fixture técnica, não é comentário acadêmico."],
};
function batch(): ContextualReadingPackage {
  return {
    format: "scriptorium-contextual-reading-v1",
    batchId: "integration-fixture",
    analyst: "fixture-assistant",
    createdAt: "2026-10-12T12:00:00.000Z",
    coverage: "Uma página sintética para testes de integração.",
    notes: [
      {
        sourceChecksum: "d".repeat(64),
        fragments: [{ physicalPage: 1, quote }],
        rawReference: "Gn 1:1",
        passage: {
          bookId: "genesis",
          chapter: 1,
          verseStart: 1,
          versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
        },
        additionalPassages: [],
        relationScope: "verse",
        domains: ["exegesis"],
        analysis,
      },
    ],
  };
}
async function source() {
  const state = workspace();
  const { document } = await PrivateDocumentRepository.importDocument(
    {
      title: "Bíblia de estudo sintética",
      originalName: "fixture.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      checksum: "d".repeat(64),
      language: "pt-BR",
      pageCount: 1,
      textPageCount: 1,
      extractionMethod: "pdf-text-layer",
      pages: [{ pageIndex: 0, pageLabel: "1", text: quote, itemCount: 1 }],
    },
    "opfs:/fixture.pdf",
    state.adapter,
  );
  return { ...state, document };
}
describe("contextual reading and profile branch integration", () => {
  it("refuses a destructive rebuild rather than deleting contextual notes", async () => {
    const { adapter, document } = await source();
    await ContextualReadingService.importJson(JSON.stringify(batch()), adapter);
    await expect(
      DocumentKnowledgePipelineService.analyzeDocument(document.id, undefined, adapter, {
        force: true,
      }),
    ).rejects.toThrow("preservar suas notas");
    const proposals = await DocumentKnowledgeRepository.listProposals(
      document.id,
      { limit: 100 },
      adapter,
    );
    expect(
      proposals.some((p) => p.payload.kind === "passage-relation" && p.payload.contextualAnalysis),
    ).toBe(true);
  });
  it("keeps source offsets and rejects ambiguous, absent or empty evidence", () => {
    expect(locateReadingQuote("A\n palavra aqui", "A palavra")).toEqual([0, 10]);
    expect(() => locateReadingQuote("abc abc", "abc")).toThrow("ambígua");
    expect(() => locateReadingQuote("abc", "xyz")).toThrow("não encontrada");
    expect(() => locateReadingQuote("abc", " ")).toThrow("vazia");
  });
  it("imports idempotently without accepting or replacing human reviews", async () => {
    const { db, adapter, document } = await source();
    expect(
      await ContextualReadingService.importJson(JSON.stringify(batch()), adapter),
    ).toMatchObject({ imported: 1, reused: 0 });
    const proposals = await DocumentKnowledgeRepository.listProposals(
      document.id,
      { limit: 100 },
      adapter,
    );
    const relation = proposals.find((p) => p.payload.kind === "passage-relation")!;
    expect(relation.reviewStatus).toBe("machine-proposed");
    await DocumentKnowledgeRepository.reviewProposal(relation.id, "rejected", {}, adapter);
    expect(
      await ContextualReadingService.importJson(JSON.stringify(batch()), adapter),
    ).toMatchObject({ imported: 0, reused: 1 });
    expect((await KnowledgeTraceService.detail(relation.id, adapter)).item?.state).toBe("blocked");
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("keeps contextual analysis and reference roles together through backup restore", async () => {
    const { adapter, document } = await source();
    await ContextualReadingService.importJson(JSON.stringify(batch()), adapter);
    const proposals = await DocumentKnowledgeRepository.listProposals(
      document.id,
      { limit: 100 },
      adapter,
    );
    const relation = proposals.find((p) => p.payload.kind === "passage-relation")!;
    const units = await DocumentKnowledgeRepository.listUnits(
      document.id,
      [relation.semanticUnitId],
      adapter,
    );
    const profiled = applyDocumentProfilePolicy("dictionary", units, [relation]);
    expect(profiled[0]?.payload).toMatchObject({
      referenceRole: "lexical-mention",
      contextualAnalysis: analysis,
    });
    const exported = await ResearchWorkspaceService.exportJson(adapter);
    expect(exported).not.toContain(quote);
    const restored = workspace();
    await ResearchWorkspaceService.importJson(exported, restored.adapter);
    const detail = await KnowledgeTraceService.detail(relation.id, restored.adapter);
    expect(detail.item?.payload.contextualAnalysis).toEqual(analysis);
    expect(detail.item?.explanation).toContain(analysis.rationale);
    expect(detail.item?.evidenceQuotes).toEqual([]);
    expect(detail.item?.state).toBe("visible");
  });
  it("validates the whole batch before writing any proposal", async () => {
    const { db, adapter } = await source();
    const input = batch();
    input.notes.push({ ...input.notes[0]!, sourceChecksum: "f".repeat(64) });
    await expect(
      ContextualReadingService.importJson(JSON.stringify(input), adapter),
    ).rejects.toThrow("não instalada");
    expect(db.prepare("SELECT count(*) AS n FROM knowledge_proposals").get()).toMatchObject({
      n: 0,
    });
  });
});
