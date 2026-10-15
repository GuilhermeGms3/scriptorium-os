import { DatabaseSync } from "node:sqlite";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  appendFileSync,
  statSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import {
  WorkspaceLock,
  WorkspaceLockedError,
  type WorkspaceLockOptions,
} from "./workspace-lock.server";

const migrations = import.meta.glob<string>("./migrations/*.sql", {
  eager: true,
  query: "?raw",
  import: "default",
});
const scalar = z.union([z.string(), z.number().finite(), z.null()]);
const statement = z.object({
  sql: z.string().min(1).max(100_000),
  bind: z.array(scalar).max(1000).default([]),
});
const command = z.discriminatedUnion("type", [
  statement.extend({ type: z.literal("query") }),
  statement.extend({ type: z.literal("execute") }),
  z.object({ type: z.literal("transaction"), statements: z.array(statement).max(2000) }),
]);
const runFile = promisify(execFile);
let coverQueue: Promise<unknown> = Promise.resolve();
const coverRequests = new Map<string, Promise<void>>();

/** Installed single-user mode only. Never enabled implicitly on a hosted deployment. */
export class InstallationWorkspace {
  database: DatabaseSync;
  readonly root: string;
  readonly sessions = new Map<string, number>();
  readonly lock: WorkspaceLock;
  constructor(root: string, options: { lock?: WorkspaceLockOptions } = {}) {
    this.root = resolve(root);
    mkdirSync(join(this.root, "documents"), { recursive: true });
    // Before the database is touched: two processes must never migrate or write it together.
    this.lock = WorkspaceLock.acquire(this.root, options.lock);
    try {
      this.database = this.#open();
    } catch (error) {
      this.lock.release();
      throw error;
    }
  }
  #open(): DatabaseSync {
    const database = new DatabaseSync(join(this.root, "workspace.sqlite3"));
    try {
      this.#migrate(database);
    } catch (error) {
      database.close();
      throw error;
    }
    return database;
  }
  #migrate(database: DatabaseSync): void {
    database.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    database.exec(
      "CREATE TABLE IF NOT EXISTS workspace_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE,applied_at TEXT NOT NULL) STRICT",
    );
    const version = database
      .prepare("SELECT max(version) AS version FROM workspace_migrations")
      .get()?.["version"];
    if (typeof version === "number" && version > 22)
      throw new Error("Unsupported workspace schema");
    for (const [name, sql] of Object.entries(migrations).sort()) {
      const number = Number(name.match(/\/(\d{3})_/)?.[1]);
      if (database.prepare("SELECT 1 FROM workspace_migrations WHERE version=?").get(number))
        continue;
      database.exec("BEGIN IMMEDIATE");
      try {
        database.exec(sql);
        database
          .prepare("INSERT INTO workspace_migrations VALUES(?,?,?)")
          .run(number, name, new Date().toISOString());
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }
  }
  close() {
    if (this.database.isOpen) this.database.close();
    this.lock.release();
  }
  static isLocalRequest(request: Request): boolean {
    const url = new URL(request.url);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return false;
    if (request.headers.get("x-scriptorium-workspace") !== "1") return false;
    const origin = request.headers.get("origin");
    return (
      (!origin || origin === url.origin) &&
      !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? "")
    );
  }
  async handle(request: Request): Promise<Response> {
    const headers = { "cache-control": "no-store", "content-type": "application/json" };
    const json = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), { status, headers });
    if (!InstallationWorkspace.isLocalRequest(request))
      return json({ error: "Acesso somente pela instalação local na mesma origem." }, 403);
    if (this.lock.lost)
      return json(
        {
          error:
            "Outro processo assumiu este acervo enquanto este estava parado. Reinicie este servidor para evitar escritas simultâneas.",
          code: "workspace-locked",
        },
        423,
      );
    const url = new URL(request.url);
    if (url.pathname === "/api/workspace/session" && request.method === "POST") {
      const now = Date.now();
      for (const [key, expiry] of this.sessions) if (expiry < now) this.sessions.delete(key);
      if (this.sessions.size > 256) return json({ error: "Limite de sessões locais." }, 429);
      const token = randomBytes(32).toString("hex");
      this.sessions.set(token, now + 12 * 60 * 60 * 1000);
      return new Response(JSON.stringify({ persistence: "installation" }), {
        headers: {
          ...headers,
          "set-cookie": `scriptorium-installation=${token}; HttpOnly; SameSite=Strict; Path=/api/workspace; Max-Age=43200${url.protocol === "https:" ? "; Secure" : ""}`,
        },
      });
    }
    const token = /(?:^|;\s*)scriptorium-installation=([a-f0-9]{64})(?:;|$)/.exec(
      request.headers.get("cookie") ?? "",
    )?.[1];
    if (!token || (this.sessions.get(token) ?? 0) < Date.now())
      return json({ error: "Sessão local necessária." }, 401);
    try {
      const cover = /^\/api\/workspace\/covers\/([a-f0-9]{64})$/.exec(url.pathname)?.[1];
      if (cover && request.method === "GET") {
        const folder = join(this.root, "covers");
        mkdirSync(folder, { recursive: true });
        const path = join(folder, `${cover}.png`);
        if (!existsSync(path)) {
          const pdf = join(this.root, "documents", `${cover}.pdf`);
          if (!existsSync(pdf)) return json({ error: "Original indisponível." }, 404);
          let task = coverRequests.get(path);
          if (!task) {
            task = coverQueue
              .catch(() => undefined)
              .then(async () => {
                await runFile(
                  "pdftoppm",
                  [
                    "-f",
                    "1",
                    "-l",
                    "1",
                    "-scale-to",
                    "420",
                    "-singlefile",
                    "-png",
                    pdf,
                    join(folder, cover),
                  ],
                  { timeout: 30_000, maxBuffer: 1024 * 1024 },
                );
              });
            coverRequests.set(path, task);
            coverQueue = task;
          }
          try {
            await task;
          } finally {
            coverRequests.delete(path);
          }
        }
        return new Response(new Uint8Array(readFileSync(path)), {
          headers: { "content-type": "image/png", "cache-control": "private, max-age=86400" },
        });
      }
      if (
        url.pathname === "/api/workspace/translation/v1/info" ||
        url.pathname === "/api/workspace/translation/v1/translate"
      ) {
        const info = url.pathname.endsWith("/info");
        if (request.method !== (info ? "GET" : "POST"))
          return json({ error: "Método inválido." }, 405);
        const base = process.env["SCRIPTORIUM_SEMANTIC_URL"] ?? "http://127.0.0.1:8018";
        const upstream = await fetch(`${base}/v1/${info ? "info" : "translate"}`, {
          method: request.method,
          headers: { "content-type": "application/json" },
          ...(info ? {} : { body: Buffer.from(await boundedBody(request, 512 * 1024)) }),
          signal: AbortSignal.timeout(info ? 30_000 : 600_000),
        });
        return new Response(upstream.body, { status: upstream.status, headers: { ...headers } });
      }
      if (url.pathname === "/api/workspace/migration" && request.method === "POST") {
        const count = this.database.prepare("SELECT count(*) AS n FROM private_documents").get()?.[
          "n"
        ];
        const studies = this.database.prepare("SELECT count(*) AS n FROM studies").get()?.["n"];
        const notes = this.database.prepare("SELECT count(*) AS n FROM notes").get()?.["n"];
        if (count !== 0 || studies !== 0 || notes !== 0)
          return json(
            { error: "Destino não vazio. Migração recusada para não sobrescrever o workspace." },
            409,
          );
        const staging = join(this.root, `migration-${token}.sqlite3`);
        const offset = Number(url.searchParams.get("offset"));
        if (!Number.isSafeInteger(offset) || offset < 0)
          return json({ error: "Offset inválido." }, 422);
        if (url.searchParams.get("finish") === "1") {
          if (!existsSync(staging) || statSync(staging).size !== offset)
            return json({ error: "Snapshot incompleto." }, 409);
          const candidate = new DatabaseSync(staging, { readOnly: true });
          let counts: Record<string, number>;
          try {
            const valid = candidate.prepare("PRAGMA quick_check").all();
            if (
              valid.length !== 1 ||
              Object.values(valid[0]!)[0] !== "ok" ||
              candidate.prepare("PRAGMA foreign_key_check").all().length
            )
              throw new Error("Snapshot inválido.");
            const version = candidate
              .prepare("SELECT max(version) AS n FROM workspace_migrations")
              .get()?.["n"];
            if (version !== 22) throw new Error("Versão do snapshot incompatível.");
            counts = Object.fromEntries(
              [
                "private_documents",
                "private_document_pages",
                "knowledge_proposals",
                "semantic_units",
                "knowledge_trace_events",
              ].map((table) => [
                table,
                Number(candidate.prepare(`SELECT count(*) AS n FROM ${table}`).get()?.["n"]),
              ]),
            );
            if (!counts["private_documents"]) throw new Error("Snapshot sem livros.");
            for (const row of candidate.prepare("SELECT checksum FROM private_documents").all())
              if (!existsSync(join(this.root, "documents", `${String(row["checksum"])}.pdf`)))
                throw new Error("PDF ausente; migração não será ativada.");
          } finally {
            candidate.close();
          }
          this.database.exec("PRAGMA wal_checkpoint(TRUNCATE)");
          this.database.close();
          const live = join(this.root, "workspace.sqlite3");
          const backup = `${live}.before-migration-${Date.now()}`;
          renameSync(live, backup);
          try {
            renameSync(staging, live);
            this.database = new DatabaseSync(live);
            this.database.exec(
              "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000",
            );
          } catch (error) {
            if (!existsSync(live)) renameSync(backup, live);
            this.database = new DatabaseSync(live);
            throw error;
          }
          return json({ migrated: true, counts });
        }
        if (offset === 0 && !existsSync(staging))
          writeFileSync(staging, new Uint8Array(), { flag: "wx" });
        if (!existsSync(staging) || statSync(staging).size !== offset)
          return json({ error: "Offset divergente; nenhuma sobrescrita realizada." }, 409);
        const chunk = await boundedBody(request, 4 * 1024 * 1024);
        if (offset + chunk.byteLength > 2 * 1024 * 1024 * 1024)
          throw new Error("Snapshot excede 2 GiB.");
        appendFileSync(staging, chunk);
        return json({ offset: offset + chunk.byteLength });
      }
      const checksum = /^\/api\/workspace\/documents\/([a-f0-9]{64})$/.exec(url.pathname)?.[1];
      if (checksum) {
        const path = join(this.root, "documents", `${checksum}.pdf`);
        if (request.method === "GET") {
          if (!existsSync(path)) return json({ error: "PDF original ainda não migrado." }, 404);
          return new Response(new Uint8Array(readFileSync(path)), {
            headers: {
              "content-type": "application/pdf",
              "cache-control": "private, max-age=3600",
            },
          });
        }
        if (request.method === "PUT") {
          const bytes = await boundedBody(request, 256 * 1024 * 1024);
          if (
            createHash("sha256").update(bytes).digest("hex") !== checksum ||
            !Buffer.from(bytes.subarray(0, 1024)).includes(Buffer.from("%PDF-"))
          )
            return json({ error: "PDF ou checksum inválido." }, 422);
          if (!existsSync(path)) {
            writeFileSync(`${path}.tmp`, bytes, { flag: "wx" });
            renameSync(`${path}.tmp`, path);
          }
          return json({ stored: true });
        }
      }
      if (url.pathname !== "/api/workspace/command" || request.method !== "POST")
        return json({ error: "Operação não disponível." }, 404);
      const input = command.parse(
        JSON.parse(
          new TextDecoder().decode(await boundedBody(request, 16 * 1024 * 1024)),
        ) as unknown,
      );
      const validate = (sql: string) => {
        // No filesystem access, schema changes, attached databases or arbitrary SQLite pragmas.
        if (
          !/^\s*(?:SELECT|WITH|INSERT|UPDATE|DELETE|EXPLAIN)\b/iu.test(sql) ||
          /\b(?:attach|detach|pragma|load_extension|readfile|writefile|vacuum|create|drop|alter)\b/iu.test(
            sql,
          ) ||
          /;\s*\S/u.test(sql)
        )
          throw new Error("SQL fora do contrato do workspace.");
      };
      if (input.type === "transaction") {
        input.statements.forEach((s) => validate(s.sql));
        this.database.exec("BEGIN IMMEDIATE");
        try {
          for (const s of input.statements) this.database.prepare(s.sql).run(...s.bind);
          this.database.exec("COMMIT");
        } catch (error) {
          this.database.exec("ROLLBACK");
          throw error;
        }
        return json(null);
      }
      validate(input.sql);
      const prepared = this.database.prepare(input.sql);
      if (input.type === "query") return json(prepared.all(...input.bind));
      prepared.run(...input.bind);
      return json(null);
    } catch (error) {
      return json(
        {
          error:
            error instanceof z.ZodError
              ? "Comando inválido."
              : error instanceof Error
                ? error.message
                : "Falha no workspace.",
        },
        400,
      );
    }
  }
}
async function boundedBody(request: Request, limit: number): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > limit)
    throw new Error("Arquivo excede o limite.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new Error("Arquivo excede o limite.");
    }
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks, length));
}
const OPEN_WORKSPACES = Symbol.for("scriptorium.installation-workspaces");

/**
 * One open workspace per folder and process, kept on globalThis: a dev server that reloads this
 * module must hand the folder to the new code instead of being refused by its own lock.
 */
function openWorkspaces(): Map<string, { close(): void }> {
  const scope = globalThis as typeof globalThis & {
    [OPEN_WORKSPACES]?: Map<string, { close(): void }>;
  };
  return (scope[OPEN_WORKSPACES] ??= new Map());
}

export function installationWorkspace(
  root: string,
  lock?: WorkspaceLockOptions,
): InstallationWorkspace {
  const key = resolve(root);
  const workspaces = openWorkspaces();
  const current = workspaces.get(key);
  if (current instanceof InstallationWorkspace) return current;
  // Left by an earlier version of this module: closing it frees the database and the lock.
  current?.close();
  workspaces.delete(key);
  const created = new InstallationWorkspace(key, lock ? { lock } : {});
  workspaces.set(key, created);
  return created;
}

/**
 * Serves an installation request. While another process holds the collection, the browser gets
 * that explanation (423) instead of a generic failure; the next request tries again.
 */
export async function handleInstallationRequest(
  root: string,
  request: Request,
  lock?: WorkspaceLockOptions,
): Promise<Response> {
  let workspace: InstallationWorkspace;
  try {
    workspace = installationWorkspace(root, lock);
  } catch (error) {
    if (!(error instanceof WorkspaceLockedError)) throw error;
    return new Response(JSON.stringify({ error: error.message, code: error.code }), {
      status: 423,
      headers: { "cache-control": "no-store", "content-type": "application/json" },
    });
  }
  return workspace.handle(request);
}
