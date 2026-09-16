import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { applyMigrations, DATABASE_SCHEMA_VERSION } from "./migrate";

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("SQLite migrations", () => {
  it("applies deterministic versioned migrations with FTS5 and foreign keys", () => {
    const directory = mkdtempSync(join(tmpdir(), "scriptorium-db-"));
    temporaryDirectories.push(directory);
    const database = new DatabaseSync(join(directory, "test.sqlite3"));
    applyMigrations(database, resolve("src/lib/corpus-runtime/migrations"));
    expect(
      database.prepare("SELECT MAX(version) version FROM schema_migrations").get(),
    ).toMatchObject({ version: DATABASE_SCHEMA_VERSION });
    expect(
      database.prepare("SELECT sqlite_compileoption_used('ENABLE_FTS5') enabled").get(),
    ).toMatchObject({ enabled: 1 });
    expect(database.prepare("PRAGMA foreign_keys").get()).toMatchObject({ foreign_keys: 1 });
    expect(() =>
      database
        .prepare(
          "INSERT INTO corpus_editions(id,corpus_id,title,abbreviation,language,edition_kind,package_id,package_checksum) VALUES('bad','missing','Bad','B','en','translation','p','x')",
        )
        .run(),
    ).toThrow();
    database.close();
  });
});
