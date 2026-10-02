/// <reference lib="webworker" />
import sqlite3InitModule, { type Database, type SqlValue } from "@sqlite.org/sqlite-wasm";
import migration1 from "./migrations/001_source_library.sql?raw";
import migration2 from "./migrations/002_citations.sql?raw";
import migration3 from "./migrations/003_research_workspace.sql?raw";
import migration4 from "./migrations/004_demo_seed.sql?raw";
import migration5 from "./migrations/005_content_seed_v0_1.sql?raw";
import migration6 from "./migrations/006_legacy_demo_cleanup.sql?raw";
import migration7 from "./migrations/007_legacy_fixture_cleanup.sql?raw";
import migration8 from "./migrations/008_localized_work_titles.sql?raw";
import migration9 from "./migrations/009_private_documents.sql?raw";
import migration10 from "./migrations/010_semantic_document_engine.sql?raw";
import migration11 from "./migrations/011_document_knowledge_pipeline.sql?raw";
import migration12 from "./migrations/012_translation_model_identity.sql?raw";
import migration13 from "./migrations/013_canonical_document_knowledge.sql?raw";
import migration14 from "./migrations/014_semantic_attribution_and_bibliography.sql?raw";
import type { WorkspaceRequest, WorkspaceResponse, WorkspaceRow } from "./protocol";

const migrations = [
  migration1,
  migration2,
  migration3,
  migration4,
  migration5,
  migration6,
  migration7,
  migration8,
  migration9,
  migration10,
  migration11,
  migration12,
  migration13,
  migration14,
] as const;
let database: Database | null = null;
let persistence: "opfs" | "memory" = "memory";
let reopenOpfsDatabase: (() => Database) | null = null;
let unlinkWorkspaceDatabase: (() => Promise<unknown>) | null = null;

function rows(db: Database, sql: string, bind: SqlValue[] = []): WorkspaceRow[] {
  return db.exec({ sql, bind, rowMode: "object", returnValue: "resultRows" }) as WorkspaceRow[];
}

function execute(db: Database, sql: string, bind: SqlValue[] = []): void {
  const statement = db.prepare(sql);
  try {
    if (bind.length) statement.bind(bind);
    while (statement.step()) {
      /* consume RETURNING safely */
    }
  } finally {
    statement.finalize();
  }
}

async function openDatabase(): Promise<Database> {
  if (database) return database;
  const sqlite = await sqlite3InitModule();
  try {
    if (!reopenOpfsDatabase) {
      const pool = await sqlite.installOpfsSAHPoolVfs({
        name: "scriptorium-workspace-vfs",
        directory: "/scriptorium/workspace-v1",
        initialCapacity: 6,
      });
      reopenOpfsDatabase = () => new pool.OpfsSAHPoolDb("/workspace.sqlite3");
      unlinkWorkspaceDatabase = async () => pool.unlink("/workspace.sqlite3");
    }
    database = reopenOpfsDatabase();
    persistence = "opfs";
  } catch {
    database = new sqlite.oo1.DB(":memory:", "c");
    persistence = "memory";
  }
  database.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; PRAGMA busy_timeout=3000;");
  database.exec(
    "CREATE TABLE IF NOT EXISTS workspace_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE,applied_at TEXT NOT NULL) STRICT;",
  );
  for (const [index, migration] of migrations.entries()) {
    const version = index + 1;
    if (
      rows(database, "SELECT version FROM workspace_migrations WHERE version=?", [version]).length
    )
      continue;
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(migration);
      execute(database, "INSERT INTO workspace_migrations(version,name,applied_at) VALUES(?,?,?)", [
        version,
        `scriptorium-workspace-${version}`,
        "2026-09-13T00:00:00.000Z",
      ]);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  return database;
}

async function handle(request: WorkspaceRequest): Promise<unknown> {
  if (request.type === "init") {
    const db = await openDatabase();
    return {
      persistence,
      schemaVersion:
        rows(db, "SELECT max(version) version FROM workspace_migrations")[0]?.["version"] ?? 0,
    };
  }
  const db = await openDatabase();
  if (request.type === "query")
    return rows(db, request.sql, request.bind as SqlValue[] | undefined);
  if (request.type === "execute") {
    execute(db, request.sql, request.bind as SqlValue[] | undefined);
    return null;
  }
  if (request.type === "transaction") {
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const item of request.statements)
        execute(db, item.sql, item.bind as SqlValue[] | undefined);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return null;
  }
  database?.close();
  database = null;
  if (unlinkWorkspaceDatabase) await unlinkWorkspaceDatabase();
  return null;
}

self.onmessage = (event: MessageEvent<WorkspaceRequest>) => {
  void handle(event.data).then(
    (result) =>
      self.postMessage({ id: event.data.id, ok: true, result } satisfies WorkspaceResponse),
    (error: unknown) => {
      const normalized = error instanceof Error ? error : new Error(String(error));
      self.postMessage({
        id: event.data.id,
        ok: false,
        error: { name: normalized.name, message: normalized.message },
      } satisfies WorkspaceResponse);
    },
  );
};
