import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import type { PassageRef } from "../domain/scripture";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type {
  WorkspaceDatabase,
  WorkspaceRow,
  WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";
import { DocumentKnowledgePipelineService } from "./document-knowledge-pipeline-service";
import { WorkspacePassageKnowledgeService } from "./workspace-passage-knowledge-service";

const databases: DatabaseSync[] = [];

function database(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  return db;
}

function adapter(db: DatabaseSync): WorkspaceDatabase {
  return {
    persistence: "memory",
    async query(sql: string, bind: WorkspaceSqlValue[] = []): Promise<WorkspaceRow[]> {
      return db.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql: string, bind: WorkspaceSqlValue[] = []): Promise<void> {
      db.prepare(sql).run(...bind);
    },
    async transaction(statements): Promise<void> {
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
    async reset(): Promise<void> {},
  };
}

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

const JOHN_3_16: PassageRef = { bookId: "john", chapter: 3, verseStart: 16 };
const JOHN_1_1: PassageRef = { bookId: "john", chapter: 1, verseStart: 1 };
const FIRST_JOHN_4_8: PassageRef = { bookId: "1-john", chapter: 4, verseStart: 8 };

/** Imports a two-page private "book" citing Jo 3:16 and Jo 1:1 and disassembles it. */
async function analyzedBook(): Promise<{ db: DatabaseSync; workspace: WorkspaceDatabase }> {
  const db = database();
  const workspace = adapter(db);
  const { document } = await PrivateDocumentRepository.importDocument(
    {
      title: "Livro de teste de correções",
      language: "pt-BR",
      originalName: "scriptorium-teste-correcoes.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      checksum: "d".repeat(64),
      pageCount: 2,
      textPageCount: 2,
      extractionMethod: "pdf-text-layer",
      pages: [
        {
          pageIndex: 0,
          pageLabel: "1",
          text: "CAPÍTULO 1\n\nO amor de Deus pelo mundo, lembrado em Jo 3:16, sustenta a esperança da salvação.",
          itemCount: 14,
        },
        {
          pageIndex: 1,
          pageLabel: "2",
          text: "O prólogo do evangelho começa em Jo 1:1, onde o Verbo é apresentado.",
          itemCount: 12,
        },
      ],
    },
    "opfs:/scriptorium-teste-correcoes.pdf",
    workspace,
  );
  await DocumentKnowledgePipelineService.analyzeDocument(document.id, undefined, workspace);
  return { db, workspace };
}

async function pendingItem(workspace: WorkspaceDatabase, passage: PassageRef) {
  const layer = await WorkspacePassageKnowledgeService.load(passage, null, workspace, {
    includePending: true,
  });
  expect(layer.items).toHaveLength(1);
  return layer.items[0]!;
}

async function reviewNote(db: DatabaseSync, id: string): Promise<unknown> {
  return db.prepare("SELECT review_note FROM knowledge_proposals WHERE id=?").get(id)?.[
    "review_note"
  ];
}

describe("reviewing private links while reading the Bible", () => {
  it("shows a detected link only when asked and never as private coverage", async () => {
    const { workspace } = await analyzedBook();
    expect((await WorkspacePassageKnowledgeService.load(JOHN_3_16, null, workspace)).items).toEqual(
      [],
    );

    const layer = await WorkspacePassageKnowledgeService.load(JOHN_3_16, null, workspace, {
      includePending: true,
    });
    expect(layer.items).toHaveLength(1);
    expect(layer.items[0]).toMatchObject({
      reviewState: "pending",
      passageRelation: { reviewStatus: "machine-proposed", payload: { rawReference: "Jo 3:16" } },
    });
    expect(layer.coverage.filter((entry) => entry.status === "private")).toEqual([]);
    expect(layer.coverage.find((entry) => entry.area === "soteriology")).toMatchObject({
      status: "in-review",
      sourceCount: 1,
    });
  });

  it("marks a link the pipeline published as auto-visible and counts it as private", async () => {
    const { db, workspace } = await analyzedBook();
    const item = await pendingItem(workspace, JOHN_3_16);
    db.prepare(
      `INSERT INTO pipeline_decisions(proposal_id,publication,origin,evidence_json,configuration_key,updated_at)
       VALUES(?,'machine-visible','explicit','{}','test',?)`,
    ).run(item.id, new Date().toISOString());
    const layer = await WorkspacePassageKnowledgeService.load(JOHN_3_16, null, workspace);
    expect(layer.items.map((entry) => entry.reviewState)).toEqual(["auto-visible"]);
    expect(layer.coverage.find((entry) => entry.area === "soteriology")).toMatchObject({
      status: "private",
      sourceCount: 1,
    });
  });

  it("confirms a link so it shows even without includePending", async () => {
    const { db, workspace } = await analyzedBook();
    const item = await pendingItem(workspace, JOHN_3_16);
    await WorkspacePassageKnowledgeService.confirmLink(item.id, workspace);
    const layer = await WorkspacePassageKnowledgeService.load(JOHN_3_16, null, workspace);
    expect(layer.items.map((entry) => [entry.id, entry.reviewState])).toEqual([
      [item.id, "confirmed"],
    ]);
    expect(await reviewNote(db, item.id)).toBe("Confirmada no leitor da Bíblia");
  });

  it("rejects a link so it disappears even with includePending", async () => {
    const { db, workspace } = await analyzedBook();
    const item = await pendingItem(workspace, JOHN_1_1);
    await WorkspacePassageKnowledgeService.rejectLink(item.id, workspace);
    expect(
      (
        await WorkspacePassageKnowledgeService.load(JOHN_1_1, null, workspace, {
          includePending: true,
        })
      ).items,
    ).toEqual([]);
    expect(await reviewNote(db, item.id)).toBe("Rejeitada no leitor da Bíblia");
  });

  it("moves a link to 1 João 4:8, confirms it and keeps what the book says", async () => {
    const { db, workspace } = await analyzedBook();
    const item = await pendingItem(workspace, JOHN_3_16);
    await WorkspacePassageKnowledgeService.moveLink(
      item.passageRelation,
      { bookId: "1-john", chapter: 4, verseStart: 8 },
      workspace,
    );
    expect(
      (
        await WorkspacePassageKnowledgeService.load(JOHN_3_16, null, workspace, {
          includePending: true,
        })
      ).items,
    ).toEqual([]);
    const moved = await WorkspacePassageKnowledgeService.load(FIRST_JOHN_4_8, null, workspace);
    expect(moved.items).toHaveLength(1);
    expect(moved.items[0]).toMatchObject({
      id: item.id,
      reviewState: "confirmed",
      passageRelation: {
        payload: {
          rawReference: "Jo 3:16",
          relationScope: "verse",
          additionalPassages: [],
          passage: { workId: "work:1-john", bookId: "1-john", chapter: 4, verseStart: 8 },
        },
      },
    });
    expect(await reviewNote(db, item.id)).toBe(
      "Movida no leitor da Bíblia: de João 3:16 para 1 João 4:8",
    );
  });

  it("refuses an 'até' verse before the starting verse and leaves the link pending", async () => {
    const { workspace } = await analyzedBook();
    const item = await pendingItem(workspace, JOHN_3_16);
    await expect(
      WorkspacePassageKnowledgeService.moveLink(
        item.passageRelation,
        { bookId: "1-john", chapter: 4, verseStart: 8, verseEnd: 7 },
        workspace,
      ),
    ).rejects.toThrow("O versículo final não pode vir antes do inicial.");
    expect((await pendingItem(workspace, JOHN_3_16)).reviewState).toBe("pending");
    expect(
      await DocumentKnowledgeRepository.listVisiblePassageRelations(FIRST_JOHN_4_8, workspace),
    ).toEqual([]);
  });
});
