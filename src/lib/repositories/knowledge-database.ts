import sqlite3InitModule, { type Database, type SqlValue } from "@sqlite.org/sqlite-wasm";
import { CorruptDatabaseError, UnsupportedDatabaseVersionError } from "../domain/errors";

export type KnowledgeRow = Record<string, SqlValue>;

interface KnowledgeManifest {
  path: string;
  checksum: string;
  sizeBytes: number;
  schemaVersion: number;
}

export function knowledgeText(row: KnowledgeRow, key: string): string {
  const result = row[key];
  if (typeof result !== "string")
    throw new CorruptDatabaseError(`Missing knowledge column ${key}.`);
  return result;
}

export function knowledgeOptionalText(row: KnowledgeRow, key: string): string | undefined {
  return typeof row[key] === "string" ? row[key] : undefined;
}

export function knowledgeQuery(
  database: Database,
  sql: string,
  bindings: SqlValue[] = [],
): KnowledgeRow[] {
  const statement = database.prepare(sql);
  try {
    if (bindings.length) statement.bind(bindings);
    const result: KnowledgeRow[] = [];
    while (statement.step()) result.push(statement.get({}));
    return result;
  } finally {
    statement.finalize();
  }
}

async function asset(path: string): Promise<Uint8Array> {
  if (import.meta.env.SSR || import.meta.env.MODE === "test") {
    const [{ readFile }, { resolve }] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    return new Uint8Array(
      await readFile(resolve(process.cwd(), "public", path.replace(/^\//, ""))),
    );
  }
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status} loading ${path}.`);
  return new Uint8Array(await response.arrayBuffer());
}

async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

/** Opens knowledge database bytes as a read-only in-memory SQLite WASM database. */
export async function openKnowledgeDatabase(bytes: Uint8Array): Promise<Database> {
  const sqlite3 = await sqlite3InitModule();
  const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
  const database = new sqlite3.oo1.DB();
  database.checkRc(
    sqlite3.capi.sqlite3_deserialize(
      database.pointer!,
      "main",
      pointer,
      bytes.byteLength,
      bytes.byteLength,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_READONLY,
    ),
  );
  database.exec("PRAGMA query_only=ON; PRAGMA foreign_keys=ON;");
  return database;
}

let databasePromise: Promise<Database> | null = null;

export async function getKnowledgeDatabase(): Promise<Database> {
  if (databasePromise) return databasePromise;
  const pending = (async () => {
    const manifest = JSON.parse(
      new TextDecoder().decode(await asset("/knowledge/manifest.json")),
    ) as KnowledgeManifest;
    const bytes = await asset(manifest.path);
    if ((await digest(bytes)) !== manifest.checksum)
      throw new CorruptDatabaseError("Knowledge database checksum mismatch.");
    const database = await openKnowledgeDatabase(bytes);
    const version = knowledgeQuery(
      database,
      "SELECT MAX(version) version FROM schema_migrations",
    )[0]?.["version"];
    if (version !== manifest.schemaVersion) {
      database.close();
      throw new UnsupportedDatabaseVersionError(
        `Knowledge schema ${String(version)} is unsupported.`,
      );
    }
    return database;
  })();
  databasePromise = pending;
  // A failed load must not stay cached until the page is reloaded.
  pending.catch(() => {
    if (databasePromise === pending) databasePromise = null;
  });
  return pending;
}
