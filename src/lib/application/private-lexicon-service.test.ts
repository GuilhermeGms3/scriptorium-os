import { it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/protocol";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { privateLexicalReadings, PRIVATE_LEXICON_SOURCES } from "./private-lexicon-service";

it("uses FTS and exact headwords, never equating a mention or a numerical identifier with an entry", async () => {
  const native = new DatabaseSync(":memory:");
  applyWorkspaceMigrations(native);
  let queries = 0;
  const db: WorkspaceDatabase = {
    persistence: "memory",
    query: async (sql, bind = []) => {
      queries++;
      return native.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    execute: async (sql, bind = []) => {
      native.prepare(sql).run(...bind);
    },
    transaction: async (statements) => {
      native.exec("BEGIN");
      try {
        for (const s of statements) native.prepare(s.sql).run(...(s.bind ?? []));
        native.exec("COMMIT");
      } catch (error) {
        native.exec("ROLLBACK");
        throw error;
      }
    },
    reset: async () => {
      throw Error("No reset");
    },
  };
  try {
    const text =
      "λόγος, ου, ό palavra e discurso.\nUma citação de θεός nesta explicação não é outro verbete.\nλόγχη. ης. η lança.\nλοιδορέω  insultar";
    await PrivateDocumentRepository.importDocument(
      {
        title: "Lexicon fixture",
        originalName: "fixture.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        checksum: PRIVATE_LEXICON_SOURCES[0].checksum,
        language: "pt-BR",
        pageCount: 1,
        textPageCount: 1,
        extractionMethod: "pdf-text-layer",
        pages: [{ pageIndex: 0, pageLabel: "1", text, itemCount: 1 }],
      },
      "opfs:/fixture.pdf",
      db,
    );
    const entries = await privateLexicalReadings(["λόγος"], db);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ identified: true, lemma: "λόγος", page: 1 });
    expect(entries[0]!.text).not.toContain("lança");
    const mentions = await privateLexicalReadings(["θεός"], db);
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.identified).toBe(false);
    queries = 0;
    expect(await privateLexicalReadings(["H7225", "G3056", "logos"], db)).toEqual([]);
    expect(queries).toBe(0);
  } finally {
    native.close();
  }
});
