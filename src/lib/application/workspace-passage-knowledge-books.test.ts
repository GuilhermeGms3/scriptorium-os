import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type {
  WorkspaceDatabase,
  WorkspaceRow,
  WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";
import { DocumentKnowledgePipelineService } from "./document-knowledge-pipeline-service";
import { WorkspacePassageKnowledgeService } from "./workspace-passage-knowledge-service";

const databases: DatabaseSync[] = [];

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

function adapter(db: DatabaseSync, counter: { queries: number }): WorkspaceDatabase {
  return {
    persistence: "memory",
    async query(sql: string, bind: WorkspaceSqlValue[] = []): Promise<WorkspaceRow[]> {
      counter.queries += 1;
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

async function addBook(workspace: WorkspaceDatabase, title: string, checksum: string) {
  const { document } = await PrivateDocumentRepository.importDocument(
    {
      title,
      language: "pt-BR",
      originalName: `${title}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024,
      checksum: checksum.repeat(64),
      pageCount: 1,
      textPageCount: 1,
      extractionMethod: "pdf-text-layer",
      pages: [
        {
          pageIndex: 0,
          pageLabel: "1",
          text: `CAPÍTULO 1\n\nEm ${title}, o amor de Deus lembrado em Jo 3:16 sustenta a esperança.`,
          itemCount: 10,
        },
      ],
    },
    `opfs:/${title}.pdf`,
    workspace,
  );
  await DocumentKnowledgePipelineService.analyzeDocument(document.id, undefined, workspace);
  return document.id;
}

describe("a passage cited by several books", () => {
  it("keeps every item with its own book, and the number of queries does not grow per book", async () => {
    const db = new DatabaseSync(":memory:");
    databases.push(db);
    applyWorkspaceMigrations(db);
    const counter = { queries: 0 };
    const workspace = adapter(db, counter);
    const passage = { bookId: "john", chapter: 3, verseStart: 16 };
    const load = async () => {
      counter.queries = 0;
      const layer = await WorkspacePassageKnowledgeService.load(passage, null, workspace, {
        includePending: true,
      });
      return { layer, queries: counter.queries };
    };

    const first = await addBook(workspace, "Comentário de Abel", "a");
    const one = await load();
    await addBook(workspace, "Comentário de Bento", "b");
    const second = await addBook(workspace, "Comentário de Caio", "c");
    const three = await load();

    expect(one.layer.items).toHaveLength(1);
    expect(three.layer.items).toHaveLength(3);
    for (const item of three.layer.items) {
      expect(item.unit.text).toContain(item.document.title);
      expect(item.passageRelation.documentId).toBe(item.document.id);
    }
    expect(three.layer.items.map((item) => item.document.id)).toEqual(
      expect.arrayContaining([first, second]),
    );
    // Books, authors and translations are one query each; only per-book unit lookups remain.
    expect(three.queries - one.queries).toBeLessThanOrEqual(2 * 4);
  });
});
