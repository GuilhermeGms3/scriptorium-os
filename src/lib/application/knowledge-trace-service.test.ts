import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { KnowledgeTraceRepository } from "../repositories/knowledge-trace-repository";
import { DocumentKnowledgePipelineService } from "./document-knowledge-pipeline-service";
import { KnowledgeTraceService, explainKnowledgeTrace } from "./knowledge-trace-service";
import { ResearchWorkspaceService } from "./research-workspace-service";
import { WorkspacePassageKnowledgeService } from "./workspace-passage-knowledge-service";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/workspace-database";

const databases: DatabaseSync[] = [];
function database() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  const workspace: WorkspaceDatabase = {
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
        for (const item of statements) db.prepare(item.sql).run(...(item.bind ?? []));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async reset() {
      throw new Error("Not used in this integration test");
    },
  };
  return { db, workspace };
}
afterEach(() => {
  while (databases.length) databases.pop()?.close();
});
async function analyzed() {
  const { db, workspace } = database();
  const imported = await PrivateDocumentRepository.importDocument(
    {
      title: "Comentário de teste",
      originalName: "fixture.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      checksum: "a".repeat(64),
      language: "pt-BR",
      pageCount: 1,
      textPageCount: 1,
      extractionMethod: "pdf-text-layer",
      pages: [
        {
          pageIndex: 0,
          pageLabel: "1",
          text: "O amor mencionado em Jo 3:16 fundamenta esta interpretação.",
          itemCount: 10,
        },
      ],
    },
    "opfs:/fixture.pdf",
    workspace,
  );
  await DocumentKnowledgePipelineService.analyzeDocument(
    imported.document.id,
    undefined,
    workspace,
  );
  const result = await KnowledgeTraceRepository.list({}, workspace);
  expect(result.rows).toHaveLength(1);
  return { db, workspace, documentId: imported.document.id, row: result.rows[0]! };
}
describe("real knowledge trace", () => {
  it("labels pre-existing links as a baseline and never backdates the historical events", async () => {
    const { db, workspace, row } = await analyzed();
    db.exec(`DROP TRIGGER trace_proposal_insert; DROP TRIGGER trace_proposal_update;
      DROP TRIGGER trace_proposal_delete; DROP TRIGGER trace_decision_insert;
      DROP TRIGGER trace_decision_update; DROP TABLE knowledge_trace_events;
      DROP TABLE knowledge_trace_control;`);
    db.prepare(
      "UPDATE knowledge_proposals SET created_at='2000-01-01T00:00:00.000Z' WHERE id=?",
    ).run(row.id);
    db.exec(
      readFileSync(resolve("src/lib/workspace-runtime/migrations/020_knowledge_trace.sql"), "utf8"),
    );
    const detail = await KnowledgeTraceService.detail(row.id, workspace);
    expect(detail.events).toHaveLength(1);
    expect(detail.events[0]?.event_kind).toBe("snapshot");
    expect(detail.events[0]?.occurred_at).not.toContain("2000-");
  });
  it("uses the bounded list index rather than sorting all proposals", async () => {
    const { db, workspace } = await analyzed();
    let plan: unknown[] = [];
    await KnowledgeTraceRepository.list(
      {},
      {
        ...workspace,
        async query(sql, bind = []) {
          plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...bind);
          return workspace.query(sql, bind);
        },
      },
    );
    expect(JSON.stringify(plan)).toContain("idx_knowledge_trace_active_page");
    expect(JSON.stringify(plan)).not.toContain("TEMP B-TREE");
  });
  it("reads the actual page, explicit reference and pending state without inventing a rationale", async () => {
    const { workspace, row } = await analyzed();
    const detail = await KnowledgeTraceService.detail(row.id, workspace);
    expect(detail.item?.state).toBe("pending");
    expect(detail.item?.explanation[0]).toContain("não prova");
    expect(detail.unit?.text).toContain("Jo 3:16");
    expect(detail.row?.page_index).toBe(0);
    expect(detail.events.map((event) => event.event_kind)).toEqual(["registered"]);
  });
  it("filters actual targets including ranges, additional passages and numbering schemes", async () => {
    const { db, workspace, row } = await analyzed();
    const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    payload["additionalPassages"] = [
      {
        bookId: "romans",
        chapter: 8,
        verseStart: 28,
        verseEnd: 30,
        versificationSchemeId: "fixture-scheme",
      },
    ];
    db.prepare("UPDATE knowledge_proposals SET payload_json=? WHERE id=?").run(
      JSON.stringify(payload),
      row.id,
    );
    expect(
      (
        await KnowledgeTraceRepository.list(
          { bookId: "romans", chapter: 8, verse: 29, scheme: "fixture-scheme" },
          workspace,
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (await KnowledgeTraceRepository.list({ bookId: "romans", chapter: 8, verse: 31 }, workspace))
        .rows,
    ).toHaveLength(0);
    expect(
      (await KnowledgeTraceRepository.list({ bookId: "romans", scheme: "another" }, workspace))
        .rows,
    ).toHaveLength(0);
    expect(
      (await KnowledgeTraceRepository.list({ documentId: "' OR 1=1 --" }, workspace)).rows,
    ).toHaveLength(0);
  });
  it("captures correction and individual rejection from the existing reader, not a parallel engine", async () => {
    const { workspace, row } = await analyzed();
    const relations = await DocumentKnowledgeRepository.listProposals(
      row.document_id,
      { proposalKind: "passage-relation" },
      workspace,
    );
    const relation = relations[0]!;
    if (relation.payload.kind !== "passage-relation") throw new Error("Expected relation");
    await WorkspacePassageKnowledgeService.moveLink(
      { ...relation, payload: relation.payload },
      { bookId: "romans", chapter: 8, verseStart: 28 },
      workspace,
    );
    expect(
      (await KnowledgeTraceRepository.list({ state: "visible" }, workspace)).rows,
    ).toHaveLength(1);
    await WorkspacePassageKnowledgeService.rejectLink(row.id, workspace);
    const detail = await KnowledgeTraceService.detail(row.id, workspace);
    expect(detail.item?.state).toBe("blocked");
    expect(detail.events.filter((event) => event.event_kind === "proposal-changed")).toHaveLength(
      2,
    );
    expect(detail.events.some((event) => event.state_json.includes("previousPayload"))).toBe(true);
  });
  it("captures publication and revocation, but ignores idempotent timestamp-only updates", async () => {
    const { db, workspace, row } = await analyzed();
    db.prepare(
      "INSERT INTO pipeline_decisions VALUES(?,'machine-visible','explicit','{}','key','pending',?)",
    ).run(row.id, new Date().toISOString());
    expect(
      explainKnowledgeTrace((await KnowledgeTraceRepository.list({}, workspace)).rows[0]!).state,
    ).toBe("visible");
    db.prepare("UPDATE pipeline_decisions SET updated_at=? WHERE proposal_id=?").run(
      new Date().toISOString(),
      row.id,
    );
    db.prepare(
      "UPDATE pipeline_decisions SET publication='revoked',audit_status='rejected' WHERE proposal_id=?",
    ).run(row.id);
    const detail = await KnowledgeTraceService.detail(row.id, workspace);
    expect(detail.item?.state).toBe("blocked");
    expect(detail.events.filter((event) => event.event_kind === "decision")).toHaveLength(2);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("preserves the historical trace when canonical units are rebuilt", async () => {
    const { workspace, row, documentId } = await analyzed();
    await DocumentKnowledgeRepository.begin(documentId, "fixture", "2", "a".repeat(64), workspace);
    const detail = await KnowledgeTraceService.detail(row.id, workspace);
    expect(detail.row).toBeNull();
    expect(detail.events.some((event) => event.event_kind === "removed")).toBe(true);
    expect(detail.events.some((event) => event.event_kind === "registered")).toBe(true);
  });
  it("preserves event IDs in backup restore and repeated imports without fabricating events", async () => {
    const { workspace, row } = await analyzed();
    const before = (await KnowledgeTraceService.detail(row.id, workspace)).events.map(
      (event) => event.id,
    );
    const backup = await ResearchWorkspaceService.exportJson(workspace);
    const restored = database();
    await ResearchWorkspaceService.importJson(backup, restored.workspace);
    await ResearchWorkspaceService.importJson(backup, restored.workspace);
    expect(
      (await KnowledgeTraceService.detail(row.id, restored.workspace)).events.map(
        (event) => event.id,
      ),
    ).toEqual(before);
    expect(
      restored.db.prepare("SELECT enabled FROM knowledge_trace_control").get()?.["enabled"],
    ).toBe(1);
  });
  it("uses saved model rationale and distinguishes inferred evidence from reference matching", async () => {
    const { row } = await analyzed();
    const item = explainKnowledgeTrace({
      ...row,
      origin: "inferred",
      evidence_json: JSON.stringify({
        decisions: [
          { rationale: "Analisa o argumento da perícope.", evidenceQuote: "Trecho literal" },
        ],
      }),
    });
    expect(item.explanation).toEqual(["Analisa o argumento da perícope."]);
    expect(item.evidenceQuotes).toEqual(["Trecho literal"]);
  });
});
