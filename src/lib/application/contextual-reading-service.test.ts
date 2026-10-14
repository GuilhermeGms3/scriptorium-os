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
import { WorkspacePassageKnowledgeService } from "./workspace-passage-knowledge-service";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PrivateVerseKnowledge } from "../../components/scripture/private-verse-knowledge";

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
  it("renders both contextual sources with exact source links, without showing cross-references as commentary", async () => {
    const { db, adapter } = await source();
    await PrivateDocumentRepository.importDocument(
      {
        title: "Segunda fonte sintética",
        originalName: "second.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        checksum: "e".repeat(64),
        language: "pt-BR",
        pageCount: 1,
        textPageCount: 1,
        extractionMethod: "pdf-text-layer",
        pages: [{ pageIndex: 0, pageLabel: "1", text: quote, itemCount: 1 }],
      },
      "opfs:/second.pdf",
      adapter,
    );
    const input = batch();
    input.notes.push({
      ...input.notes[0]!,
      sourceChecksum: "e".repeat(64),
      analysis: {
        ...analysis,
        summary: "Outra leitura sintética, preservada separadamente da primeira fonte.",
      },
    });
    await ContextualReadingService.importJson(JSON.stringify(input), adapter);
    // Newer automatic references must not starve contextual content at the 200-row cap.
    const relation = db
      .prepare("SELECT * FROM knowledge_proposals WHERE proposal_kind='passage-relation' LIMIT 1")
      .get()!;
    const payload = JSON.parse(String(relation["payload_json"])) as Record<string, unknown>;
    delete payload["contextualAnalysis"];
    for (let n = 0; n < 201; n++) {
      const id = `cross-reference:${n}`;
      payload["rawReference"] = `Referência sintética ${n}`;
      db.prepare(
        `INSERT INTO knowledge_proposals(id,document_id,semantic_unit_id,proposal_kind,payload_json,method,confidence,review_status,created_at,updated_at) SELECT ?,document_id,semantic_unit_id,proposal_kind,?,method,confidence,review_status,created_at,? FROM knowledge_proposals WHERE id=?`,
      ).run(id, JSON.stringify(payload), "2099-01-01T00:00:00Z", String(relation["id"]));
      db.prepare(
        `INSERT INTO pipeline_decisions(proposal_id,publication,origin,evidence_json,configuration_key,audit_status,updated_at) SELECT ?,publication,origin,evidence_json,configuration_key,audit_status,updated_at FROM pipeline_decisions WHERE proposal_id=?`,
      ).run(id, String(relation["id"]));
    }
    const layer = await WorkspacePassageKnowledgeService.load(
      { bookId: "genesis", chapter: 1 },
      null,
      adapter,
    );
    expect(
      layer.items.filter((item) => item.passageRelation.payload.contextualAnalysis),
    ).toHaveLength(2);
    const html = renderToStaticMarkup(
      createElement(PrivateVerseKnowledge, {
        bookId: "genesis",
        chapter: 1,
        verse: 1,
        items: layer.items,
        open: false,
        onOpenChange() {},
      }),
    );
    expect(html).toContain(analysis.summary);
    expect(html).toContain("Outra leitura sintética");
    expect(html.match(/aria-label="Trecho da biblioteca/g)).toHaveLength(2);
    expect(html).toContain("?page=1&amp;unit=");
    expect(html).toContain("underline-offset-4");
    const otherVerse = renderToStaticMarkup(
      createElement(PrivateVerseKnowledge, {
        bookId: "genesis",
        chapter: 1,
        verse: 2,
        items: layer.items,
        open: false,
        onOpenChange() {},
      }),
    );
    expect(otherVerse).toBe("");
    const filtered = renderToStaticMarkup(
      createElement(PrivateVerseKnowledge, {
        bookId: "genesis",
        chapter: 1,
        verse: 1,
        items: layer.items,
        sourceId: `private-document:${"e".repeat(64)}`,
        open: false,
        onOpenChange() {},
      }),
    );
    expect(filtered).not.toContain(analysis.summary);
    expect(filtered).toContain("Outra leitura sintética");
    const referenceOnly = layer.items.find(
      (item) => !item.passageRelation.payload.contextualAnalysis,
    )!;
    const confirmedReference = renderToStaticMarkup(
      createElement(PrivateVerseKnowledge, {
        bookId: "genesis",
        chapter: 1,
        verse: 1,
        items: [{ ...referenceOnly, reviewState: "confirmed" }],
        open: false,
        onOpenChange() {},
      }),
    );
    expect(confirmedReference).not.toContain('aria-label="Trecho da biblioteca');
    expect(confirmedReference).toContain("ligação na biblioteca");
  });
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
