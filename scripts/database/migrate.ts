import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { DatabaseSync } from "node:sqlite";

export const DATABASE_SCHEMA_VERSION = 11;

interface MigrationOptions {
  appliedAt?: string;
}

export function applyMigrations(
  database: DatabaseSync,
  migrationsDirectory: string,
  options: MigrationOptions = {},
): void {
  database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = DELETE;");
  const files = readdirSync(migrationsDirectory)
    .filter((file) => /^\d{3}_.+\.sql$/.test(file))
    .sort();
  database.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP) STRICT;",
  );
  const applied = new Set(
    database
      .prepare("SELECT version FROM schema_migrations")
      .all()
      .map((row) => Number(row["version"])),
  );
  const record = database.prepare(
    "INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)",
  );
  for (const file of files) {
    const version = Number(file.slice(0, 3));
    if (applied.has(version)) continue;
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(readFileSync(join(migrationsDirectory, file), "utf8"));
      record.run(version, file, options.appliedAt ?? new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  const current = database.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
  if (Number(current?.["version"] ?? 0) !== DATABASE_SCHEMA_VERSION) {
    throw new Error(
      `Expected schema ${DATABASE_SCHEMA_VERSION}, got ${String(current?.["version"])}.`,
    );
  }
  const integrity = database.prepare("PRAGMA foreign_key_check").all();
  if (integrity.length)
    throw new Error(`Foreign-key violations after migrations: ${integrity.length}.`);
}

const SIDECAR_SUFFIXES = ["-journal", "-wal", "-shm"];
const SIDECAR_PATTERN = /\.sqlite3-(?:journal|wal|shm|mj\w*)$/;

export function removeDatabaseFiles(path: string): void {
  for (const target of [path, ...SIDECAR_SUFFIXES.map((suffix) => `${path}${suffix}`)])
    rmSync(target, { force: true });
  const directory = dirname(path);
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory))
    if (entry.startsWith(`${basename(path)}-mj`)) rmSync(join(directory, entry), { force: true });
}

export function sweepInterruptedBuildFiles(directory: string): number {
  if (!existsSync(directory)) return 0;
  let removed = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) removed += sweepInterruptedBuildFiles(path);
    else if (SIDECAR_PATTERN.test(entry.name)) {
      rmSync(path, { force: true });
      removed += 1;
    }
  }
  return removed;
}

function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function progress(message: string): void {
  if (process.env["SCRIPTORIUM_QUIET"] === "1") return;
  process.stderr.write(`[${formatElapsed(performance.now())}] ${message}\n`);
}

export function timed<T>(label: string, fn: () => T): T {
  const startedAt = performance.now();
  const result = fn();
  progress(`${label} — concluído em ${((performance.now() - startedAt) / 1000).toFixed(1)}s`);
  return result;
}
