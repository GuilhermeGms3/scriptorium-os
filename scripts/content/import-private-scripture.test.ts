import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../database/workspace-migrate";
import { PrivateDocumentRepository } from "../../src/lib/repositories/private-document-repository";
import { PrivateScriptureRepository } from "../../src/lib/repositories/private-scripture-repository";
import { DocumentKnowledgeRepository } from "../../src/lib/repositories/document-knowledge-repository";
import { ResearchWorkspaceService } from "../../src/lib/application/research-workspace-service";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";
const directories: string[] = [];
afterEach(() => {
  for (const d of directories.splice(0)) rmSync(d, { recursive: true, force: true });
});
function adapter(native: DatabaseSync): WorkspaceDatabase {
  return {
    persistence: "installation",
    query: async (s, b = []) => native.prepare(s).all(...b) as WorkspaceRow[],
    execute: async (s, b = []) => {
      native.prepare(s).run(...b);
    },
    transaction: async (ss) => {
      native.exec("BEGIN");
      try {
        ss.forEach((s) => native.prepare(s.sql).run(...(s.bind ?? [])));
        native.exec("COMMIT");
      } catch (e) {
        native.exec("ROLLBACK");
        throw e;
      }
    },
    reset: async () => {
      throw Error("No reset");
    },
  };
}
async function fixture() {
  const root = mkdtempSync(join(tmpdir(), "private-bible-"));
  directories.push(root);
  const path = join(root, "workspace.sqlite3");
  const db = new DatabaseSync(path);
  applyWorkspaceMigrations(db);
  const text = "😀 No princípio, texto sintético para conferir evidência e pesquisa.";
  const checksum = "a".repeat(64);
  await PrivateDocumentRepository.importDocument(
    {
      title: "Fonte sintética",
      language: "pt",
      originalName: "fixture.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      checksum,
      pageCount: 1,
      textPageCount: 1,
      extractionMethod: "pdf-text-layer",
      pages: [{ pageIndex: 0, pageLabel: "1", text, itemCount: 1 }],
    },
    "installation:/fixture",
    adapter(db),
  );
  db.close();
  const backup = path + ".before-fixture";
  copyFileSync(path, backup);
  const stage = join(root, "stage");
  mkdirSync(stage);
  const batch = {
    edition: {
      id: "private:fixture",
      title: "Tradução sintética",
      abbreviation: "Fixture",
      language: "pt",
      editorialPosition: "Edição sintética de teste, sem conteúdo real.",
    },
    units: [
      {
        id: "private-unit:fixture-source-1",
        editionId: "private:fixture",
        documentChecksum: checksum,
        sequence: 0,
        bookId: "genesis",
        chapter: 1,
        verse: 1,
        sourceScheme: "pdf:fixture",
        mapping: {
          targetScheme: "scriptorium-bcv-1",
          method: "explicit-heading-and-complete-chapter",
          review: "machine-proposed",
        },
        text,
        fragments: [{ physicalPage: 1, startOffset: 0, endOffset: text.length, quote: text }],
      },
    ],
  };
  const file = join(stage, "fixture-0000.json");
  writeFileSync(file, JSON.stringify(batch));
  return { path, stage, backup, batch, file, text };
}
function run(f: { path: string; stage: string; backup: string }, verify = false) {
  return spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      resolve("scripts/content/import-private-scripture.ts"),
      f.path,
      f.stage,
      verify ? "--verify" : "--runtime-stopped",
      "--reuse-backup",
      f.backup,
    ],
    { encoding: "utf8", timeout: 30000 },
  );
}
it("imports once, preserves stable identity and exposes chapter plus FTS through the real repository", async () => {
  const f = await fixture();
  const result = run(f);
  expect(result.status, result.stderr).toBe(0);
  expect(run(f, true).status).toBe(0);
  const db = new DatabaseSync(f.path);
  const a = adapter(db);
  try {
    const units = await PrivateScriptureRepository.chapter("genesis", 1, a);
    expect(units).toHaveLength(1);
    expect(units[0]?.text).toBe(f.text);
    expect(units[0]?.id).toBe("private-unit:fixture-source-1");
    expect(await PrivateScriptureRepository.search({ text: "princípio" }, a)).toHaveLength(1);
    expect(
      await PrivateScriptureRepository.search(
        { text: "princípio", editionIds: ["public:other"] },
        a,
      ),
    ).toEqual([]);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    db.close();
  }
});
it("refuses wrong source offsets before publishing an edition", async () => {
  const f = await fixture();
  f.batch.units[0]!.fragments[0]!.startOffset = 1;
  writeFileSync(f.file, JSON.stringify(f.batch));
  const r = run(f);
  expect(r.status).not.toBe(0);
  const db = new DatabaseSync(f.path);
  try {
    expect(db.prepare("SELECT count(*) n FROM private_scripture_editions").get()?.["n"]).toBe(0);
  } finally {
    db.close();
  }
});
it("does not overwrite a previously installed unit with changed text", async () => {
  const f = await fixture();
  expect(run(f).status).toBe(0);
  f.batch.units[0]!.text = "Texto divergente";
  writeFileSync(f.file, JSON.stringify(f.batch));
  expect(run(f).status).not.toBe(0);
  const db = new DatabaseSync(f.path);
  try {
    expect(db.prepare("SELECT text FROM private_scripture_units").get()?.["text"]).toBe(f.text);
  } finally {
    db.close();
  }
});
it("never initializes the workspace while rendering SSR", async () => {
  expect(await PrivateScriptureRepository.chapter("genesis", 1)).toEqual([]);
  expect(await PrivateScriptureRepository.listEditions()).toEqual([]);
});
it("detects specialized evidence even without a generic analyzer summary", async () => {
  const f = await fixture();
  const db = new DatabaseSync(f.path);
  const a = adapter(db);
  const documentId = "private-document:" + f.batch.units[0]!.documentChecksum;
  try {
    expect(await DocumentKnowledgeRepository.getSummary(documentId, a)).toBeNull();
    expect(await DocumentKnowledgeRepository.hasEvidenceUnits(documentId, a)).toBe(false);
    db.prepare(
      "INSERT INTO semantic_units(id,document_id,unit_kind,ordinal,text_checksum,language,method) VALUES(?,?,'paragraph',0,?,'pt-BR','documentary-thematic:v1')",
    ).run("unit:documentary-only", documentId, "a".repeat(64));
    expect(await DocumentKnowledgeRepository.hasEvidenceUnits(documentId, a)).toBe(true);
    expect(await DocumentKnowledgeRepository.getSummary(documentId, a)).toBeNull();
  } finally {
    db.close();
  }
});
it("does not silently reuse a unit under a different biblical address", async () => {
  const f = await fixture();
  expect(run(f).status).toBe(0);
  f.batch.units[0]!.chapter = 2;
  writeFileSync(f.file, JSON.stringify(f.batch));
  expect(run(f, true).status).not.toBe(0);
});
it("keeps private edition metadata in structural backup without leaking protected verse text", async () => {
  const f = await fixture();
  expect(run(f).status).toBe(0);
  const db = new DatabaseSync(f.path);
  try {
    const backup = await ResearchWorkspaceService.exportJson(adapter(db));
    expect(backup).not.toContain(f.text);
    expect(JSON.parse(backup).privateKnowledge.privateScriptureEditions).toHaveLength(1);
  } finally {
    db.close();
  }
});
