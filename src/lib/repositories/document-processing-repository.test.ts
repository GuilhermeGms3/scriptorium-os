import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import type {
  WorkspaceDatabase,
  WorkspaceRow,
  WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";
import { DocumentProcessingRepository } from "./document-processing-repository";
import { PrivateDocumentRepository } from "./private-document-repository";
import { LibraryCoverageService } from "../application/library-coverage-service";

const databases: DatabaseSync[] = [];

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

async function importedBook(title: string) {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  const workspace = adapter(db);
  const { document } = await PrivateDocumentRepository.importDocument(
    {
      title,
      language: "pt-BR",
      originalName: `${title}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 512,
      checksum: "e".repeat(64),
      pageCount: 1,
      textPageCount: 1,
      extractionMethod: "pdf-text-layer",
      pages: [{ pageIndex: 0, pageLabel: "1", text: "Introdução ao estudo.", itemCount: 3 }],
    },
    `opfs:/${title}.pdf`,
    workspace,
  );
  return { db, workspace, document };
}

describe("researcher correction of a document profile", () => {
  it("saves the corrected profile as accepted and the classifier never overwrites it", async () => {
    const { workspace, document } = await importedBook("Questões contemporâneas");
    expect(await DocumentProcessingRepository.ensureProfile(document, workspace)).toMatchObject({
      profile: "academic-monograph",
      reviewStatus: "machine-proposed",
    });

    const corrected = await DocumentProcessingRepository.correctProfile(
      document.id,
      "study-bible",
      workspace,
    );
    expect(corrected).toMatchObject({
      profile: "study-bible",
      reviewStatus: "accepted",
      method: "researcher-review",
      confidence: 1,
    });

    expect(await DocumentProcessingRepository.ensureProfile(document, workspace)).toEqual(
      corrected,
    );
    expect(await DocumentProcessingRepository.getProfile(document.id, workspace)).toEqual(
      corrected,
    );
  });

  it("can correct a book that was never classified", async () => {
    const { db, workspace, document } = await importedBook("Questões contemporâneas");
    await DocumentProcessingRepository.correctProfile(document.id, "lexicon", workspace);
    expect(
      db
        .prepare("SELECT profile, review_status FROM private_document_profiles WHERE document_id=?")
        .get(document.id),
    ).toEqual({ profile: "lexicon", review_status: "accepted" });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});

describe("library summaries for the shelf", () => {
  it("lists the stored profiles, corrections included", async () => {
    const { workspace, document } = await importedBook("Bíblia de Estudo de Genebra");
    expect(await DocumentProcessingRepository.listProfiles(workspace)).toEqual([]);
    await DocumentProcessingRepository.ensureProfile(document, workspace);
    expect(await DocumentProcessingRepository.listProfiles(workspace)).toEqual([
      { documentId: document.id, profile: "study-bible", reviewStatus: "machine-proposed" },
    ]);
    await DocumentProcessingRepository.correctProfile(document.id, "commentary", workspace);
    expect(await DocumentProcessingRepository.listProfiles(workspace)).toEqual([
      { documentId: document.id, profile: "commentary", reviewStatus: "accepted" },
    ]);
  });

  it("counts books, structured books and books that still need OCR in one cheap query", async () => {
    const { workspace } = await importedBook("Questões contemporâneas");
    expect(await LibraryCoverageService.quickSummary(workspace)).toEqual({
      total: 1,
      structured: 0,
      ocrPending: 0,
    });
  });
});
