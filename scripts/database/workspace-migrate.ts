import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";

export const WORKSPACE_SCHEMA_VERSION = 8;

export function applyWorkspaceMigrations(
  database: DatabaseSync,
  directory = resolve(import.meta.dirname, "../../src/lib/workspace-runtime/migrations"),
): void {
  database.exec(
    "PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS workspace_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE,applied_at TEXT NOT NULL) STRICT;",
  );
  const files = readdirSync(directory)
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort();
  for (const file of files) {
    const version = Number(file.slice(0, 3));
    if (version > WORKSPACE_SCHEMA_VERSION)
      throw new Error(`Unsupported workspace migration ${file}.`);
    if (database.prepare("SELECT 1 FROM workspace_migrations WHERE version=?").get(version))
      continue;
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(readFileSync(join(directory, file), "utf8"));
      database
        .prepare("INSERT INTO workspace_migrations(version,name,applied_at) VALUES(?,?,?)")
        .run(version, file, "1970-01-01T00:00:00.000Z");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}
