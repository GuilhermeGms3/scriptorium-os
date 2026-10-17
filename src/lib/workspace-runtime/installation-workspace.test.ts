import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { backup } from "node:sqlite";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  handleInstallationRequest,
  InstallationWorkspace,
  installationWorkspace,
} from "./installation-workspace.server";
import type { WorkspaceLockOptions } from "./workspace-lock.server";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type { WorkspaceDatabase, WorkspaceRow } from "./protocol";
import { WORKSPACE_SCHEMA_VERSION } from "../../../scripts/database/workspace-migrate";

const workspaces: InstallationWorkspace[] = [];
afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    workspace.close();
    if (!workspace.root.startsWith(join(tmpdir(), "scriptorium-installation-")))
      throw new Error("Unsafe test cleanup path");
    rmSync(workspace.root, { recursive: true, force: true });
  }
});
function create() {
  const workspace = new InstallationWorkspace(
    mkdtempSync(join(tmpdir(), "scriptorium-installation-")),
  );
  workspaces.push(workspace);
  return workspace;
}
async function cookie(workspace: InstallationWorkspace) {
  const response = await workspace.handle(
    new Request("http://localhost:3000/api/workspace/session", {
      method: "POST",
      headers: { "x-scriptorium-workspace": "1" },
    }),
  );
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie")!.split(";")[0]!;
}
async function command(workspace: InstallationWorkspace, session: string, body: unknown) {
  return workspace.handle(
    new Request("http://localhost:3000/api/workspace/command", {
      method: "POST",
      headers: { "x-scriptorium-workspace": "1", cookie: session },
      body: JSON.stringify(body),
    }),
  );
}
describe("single-user installation workspace", () => {
  it("protects page previews with session and strict installed-page bounds", async () => {
    const workspace = create();
    const checksum = "a".repeat(64);
    const base = `http://localhost:3000/api/workspace/covers/${checksum}`;
    expect(
      (
        await workspace.handle(
          new Request(`${base}?page=1`, { headers: { "x-scriptorium-workspace": "1" } }),
        )
      ).status,
    ).toBe(401);
    const session = await cookie(workspace);
    const headers = { "x-scriptorium-workspace": "1", cookie: session };
    for (const page of ["0", "-1", "1.5", "1e2", "../1", "10000", ""]) {
      expect(
        (
          await workspace.handle(
            new Request(`${base}?page=${encodeURIComponent(page)}`, { headers }),
          )
        ).status,
      ).toBe(422);
    }
    expect((await workspace.handle(new Request(`${base}?page=1`, { headers }))).status).toBe(404);
  });
  it("copies a complete validated snapshot without overwriting a nonempty destination", async () => {
    const source = create();
    const destination = create();
    const adapter: WorkspaceDatabase = {
      persistence: "installation",
      async query(sql, bind = []) {
        return source.database.prepare(sql).all(...bind) as WorkspaceRow[];
      },
      async execute(sql, bind = []) {
        source.database.prepare(sql).run(...bind);
      },
      async transaction(statements) {
        source.database.exec("BEGIN IMMEDIATE");
        try {
          for (const item of statements)
            source.database.prepare(item.sql).run(...(item.bind ?? []));
          source.database.exec("COMMIT");
        } catch (error) {
          source.database.exec("ROLLBACK");
          throw error;
        }
      },
      async reset() {
        throw new Error("Not used");
      },
    };
    const pdf = new TextEncoder().encode("%PDF-1.4\nSynthetic migration fixture\n%%EOF");
    const checksum = createHash("sha256").update(pdf).digest("hex");
    await PrivateDocumentRepository.importDocument(
      {
        title: "Livro sintético",
        originalName: "fixture.pdf",
        mimeType: "application/pdf",
        sizeBytes: pdf.length,
        checksum,
        language: "pt-BR",
        pageCount: 1,
        textPageCount: 1,
        extractionMethod: "pdf-text-layer",
        pages: [
          {
            pageIndex: 0,
            pageLabel: "1",
            text: "Texto sintético preservado integralmente pela migração.",
            itemCount: 1,
          },
        ],
      },
      "opfs:/fixture.pdf",
      adapter,
    );
    const snapshotPath = join(source.root, "snapshot.sqlite3");
    await backup(source.database, snapshotPath);
    const snapshot = readFileSync(snapshotPath);
    const session = await cookie(destination);
    const headers = { "x-scriptorium-workspace": "1", cookie: session };
    expect(
      (
        await destination.handle(
          new Request(`http://localhost:3000/api/workspace/documents/${checksum}`, {
            method: "PUT",
            headers,
            body: new Blob([pdf]),
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await destination.handle(
          new Request("http://localhost:3000/api/workspace/migration?offset=0", {
            method: "POST",
            headers,
            body: new Blob([new Uint8Array(snapshot)]),
          }),
        )
      ).status,
    ).toBe(200);
    const finish = await destination.handle(
      new Request(
        `http://localhost:3000/api/workspace/migration?offset=${snapshot.length}&finish=1`,
        { method: "POST", headers },
      ),
    );
    expect(finish.status).toBe(200);
    expect(await finish.json()).toMatchObject({
      migrated: true,
      counts: { private_documents: 1, private_document_pages: 1 },
    });
    expect(
      destination.database.prepare("SELECT text FROM private_document_pages").get()?.["text"],
    ).toBe("Texto sintético preservado integralmente pela migração.");
    expect(
      source.database.prepare("SELECT count(*) AS n FROM private_documents").get()?.["n"],
    ).toBe(1);
    const previews = join(destination.root, "page-previews");
    mkdirSync(previews);
    const png = new Uint8Array([137, 80, 78, 71]);
    writeFileSync(join(previews, `${checksum}-1.png`), png);
    const preview = await destination.handle(
      new Request(`http://localhost:3000/api/workspace/covers/${checksum}?page=1`, { headers }),
    );
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await preview.arrayBuffer())).toEqual(png);
    expect(
      (
        await destination.handle(
          new Request(`http://localhost:3000/api/workspace/covers/${checksum}?page=2`, { headers }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await destination.handle(
          new Request("http://localhost:3000/api/workspace/migration?offset=0", {
            method: "POST",
            headers,
            body: "bad",
          }),
        )
      ).status,
    ).toBe(409);
  });
  it("requires a session and rejects foreign origins and DNS rebinding", async () => {
    const workspace = create();
    expect((await command(workspace, "", { type: "query", sql: "SELECT 1" })).status).toBe(401);
    for (const [url, origin] of [
      ["http://attacker.test/api/workspace/session", "http://attacker.test"],
      ["http://localhost:3000/api/workspace/session", "http://attacker.test"],
    ]) {
      expect(
        (
          await workspace.handle(
            new Request(url!, {
              method: "POST",
              headers: { "x-scriptorium-workspace": "1", origin: origin! },
            }),
          )
        ).status,
      ).toBe(403);
    }
  });
  it("migrates to the current schema and persists the same state between client sessions", async () => {
    const workspace = create();
    const one = await cookie(workspace);
    const two = await cookie(workspace);
    const response = await command(workspace, one, {
      type: "query",
      sql: "SELECT max(version) AS n FROM workspace_migrations",
    });
    expect(await response.json()).toEqual([{ n: WORKSPACE_SCHEMA_VERSION }]);
    expect(
      (
        await command(workspace, one, {
          type: "execute",
          sql: "INSERT INTO studies(id,slug,title,description,created_at,updated_at) VALUES(?,?,?,?,?,?)",
          bind: [
            "fixture",
            "fixture",
            "Estudo compartilhado",
            "Fixture",
            "2026-10-13",
            "2026-10-13",
          ],
        })
      ).status,
    ).toBe(200);
    const found = await command(workspace, two, {
      type: "query",
      sql: "SELECT title FROM studies WHERE id=?",
      bind: ["fixture"],
    });
    expect(await found.json()).toEqual([{ title: "Estudo compartilhado" }]);
  });
  it("rejects filesystem SQL, schema mutations, multiple statements and nonempty migration targets", async () => {
    const workspace = create();
    const session = await cookie(workspace);
    for (const sql of [
      "ATTACH DATABASE '/tmp/leak' AS leak",
      "SELECT load_extension('evil')",
      "DROP TABLE studies",
      "SELECT 1; DELETE FROM studies",
      "PRAGMA writable_schema=1",
    ]) {
      expect((await command(workspace, session, { type: "execute", sql })).status).toBe(400);
    }
    const response = await workspace.handle(
      new Request("http://localhost:3000/api/workspace/migration?offset=4", {
        method: "POST",
        headers: { "x-scriptorium-workspace": "1", cookie: session },
        body: "bad",
      }),
    );
    expect(response.status).toBe(409);
    expect(workspace.database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});

describe("installation workspace lock", () => {
  const roots: string[] = [];
  const open: InstallationWorkspace[] = [];
  afterEach(() => {
    for (const workspace of open.splice(0)) workspace.close();
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });
  function root() {
    const path = mkdtempSync(join(tmpdir(), "scriptorium-lock-"));
    roots.push(path);
    return path;
  }
  /** A clock and a heartbeat scheduler driven by the test, so nothing waits for real time. */
  function environment(hostname: string, start = Date.parse("2026-10-15T12:00:00.000Z")) {
    let now = start;
    const beats = new Set<() => void>();
    const log: string[] = [];
    const options: WorkspaceLockOptions = {
      now: () => now,
      schedule: (beat) => {
        beats.add(beat);
        return () => beats.delete(beat);
      },
      log: (message) => log.push(message),
      identity: { hostname, pid: 4242, platform: "linux" },
      releaseOnExit: false,
    };
    return {
      options,
      log,
      advance(ms: number) {
        now += ms;
      },
      heartbeat() {
        for (const beat of beats) beat();
      },
    };
  }
  function openWorkspace(path: string, options: WorkspaceLockOptions) {
    const workspace = new InstallationWorkspace(path, { lock: options });
    open.push(workspace);
    return workspace;
  }
  const lockOf = (path: string) =>
    JSON.parse(readFileSync(join(path, "workspace.lock"), "utf8")) as Record<string, unknown>;

  it("refuses a second process while the first one keeps its heartbeat", () => {
    const path = root();
    const windows = environment("windows-vite");
    openWorkspace(path, windows.options);
    expect(lockOf(path)).toMatchObject({
      pid: 4242,
      hostname: "windows-vite",
      platform: "linux",
      startedAt: "2026-10-15T12:00:00.000Z",
      heartbeatAt: "2026-10-15T12:00:00.000Z",
    });
    windows.advance(90_000);
    windows.heartbeat();
    expect(lockOf(path)).toMatchObject({ heartbeatAt: "2026-10-15T12:01:30.000Z" });

    const docker = environment("docker", Date.parse("2026-10-15T12:03:00.000Z"));
    expect(() => openWorkspace(path, docker.options)).toThrow(
      /^Este acervo já está aberto por outro processo \(windows-vite, desde .+\)\. Feche-o antes de abrir aqui\.$/u,
    );
    expect(lockOf(path)).toMatchObject({ hostname: "windows-vite" });
  });

  it("never steals a stale lock from a paused or busy process", () => {
    const path = root();
    const crashed = environment("windows-vite");
    openWorkspace(path, crashed.options);

    const docker = environment("docker", Date.parse("2026-10-15T12:02:01.000Z"));
    expect(() => openWorkspace(path, docker.options)).toThrow(/já está aberto/u);
    docker.advance(24 * 60 * 60 * 1000);
    expect(() => openWorkspace(path, docker.options)).toThrow(/já está aberto/u);
    crashed.heartbeat();
    expect(lockOf(path)).toMatchObject({ hostname: "windows-vite" });
  });

  it("fails closed for a malformed lock instead of recovering it", () => {
    const path = root();
    writeFileSync(join(path, "workspace.lock"), "{incomplete");
    expect(() => openWorkspace(path, environment("docker").options)).toThrow(/já está aberto/u);
    expect(existsSync(join(path, "workspace.sqlite3"))).toBe(false);
  });

  it("checks ownership before a request without waiting for a heartbeat", async () => {
    const path = root();
    const previous = openWorkspace(path, environment("windows").options);
    writeFileSync(
      join(path, "workspace.lock"),
      JSON.stringify({ ...lockOf(path), owner: "other" }),
    );
    const response = await previous.handle(
      new Request("http://localhost:3000/api/workspace/session", {
        method: "POST",
        headers: { "x-scriptorium-workspace": "1" },
      }),
    );
    expect(response.status).toBe(423);
    expect(previous.lock.lost).toBe(true);
    previous.close();
    expect(lockOf(path)["owner"]).toBe("other");
  });

  it("refuses a mutation when ownership changes during body streaming", async () => {
    const path = root();
    const workspace = openWorkspace(path, environment("windows").options);
    const session = await cookie(workspace);
    workspace.database.exec(
      "INSERT INTO studies(id,slug,title,description,created_at,updated_at) VALUES('keep','keep','Preservar','Fixture','2026-10-15','2026-10-15')",
    );
    let stream: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        stream = controller;
      },
    });
    // Node's Request requires duplex for a streaming body.
    const init: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers: { "x-scriptorium-workspace": "1", cookie: session },
      body,
      duplex: "half",
    };
    const pending = workspace.handle(
      new Request("http://localhost:3000/api/workspace/command", init),
    );
    // The handler has checked ownership and is now waiting for the request body.
    expect(workspace.lock.lost).toBe(false);
    writeFileSync(
      join(path, "workspace.lock"),
      JSON.stringify({ ...lockOf(path), owner: "other" }),
    );
    stream!.enqueue(
      new TextEncoder().encode(JSON.stringify({ type: "execute", sql: "DELETE FROM studies" })),
    );
    stream!.close();
    const response = await pending;
    expect(response.status).toBe(423);
    expect(await response.json()).toMatchObject({ code: "workspace-locked" });
    expect(workspace.database.prepare("SELECT id FROM studies").all()).toEqual([{ id: "keep" }]);
  });

  it("fails closed if heartbeat renewal fails and does not recreate a missing lock", () => {
    const path = root();
    const env = environment("windows");
    const workspace = openWorkspace(path, env.options);
    unlinkSync(join(path, "workspace.lock"));
    env.heartbeat();
    expect(workspace.lock.lost).toBe(true);
    expect(() => workspace.lock.assertOwned()).toThrow(/já está aberto/u);
    expect(existsSync(join(path, "workspace.lock"))).toBe(false);
  });

  it("blocks the offline importer in a separate process even with --runtime-stopped", () => {
    const path = root();
    openWorkspace(path, environment("windows").options);
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/content/import-contextual-reading.ts",
        join(path, "workspace.sqlite3"),
        join(path, "workspace.lock"),
        "--runtime-stopped",
      ],
      { encoding: "utf8", timeout: 30_000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Este acervo já está aberto por outro processo");
    expect(lockOf(path)["hostname"]).toBe("windows");
  });

  it("releases the lock when the workspace is closed", () => {
    const path = root();
    const first = environment("windows-vite");
    openWorkspace(path, first.options).close();
    expect(existsSync(join(path, "workspace.lock"))).toBe(false);
    expect(() => openWorkspace(path, environment("docker").options)).not.toThrow();
  });

  it("hands the folder to a reloaded server module in the same process", () => {
    const path = root();
    const registry = (globalThis as Record<symbol, Map<string, { close(): void }> | undefined>)[
      Symbol.for("scriptorium.installation-workspaces")
    ];
    // What a dev server reload leaves behind: an open workspace from the previous module version.
    const previous = openWorkspace(path, environment("windows-vite").options);
    const registered = registry ?? new Map<string, { close(): void }>();
    (globalThis as Record<symbol, unknown>)[Symbol.for("scriptorium.installation-workspaces")] =
      registered;
    registered.set(path, { close: () => previous.close() });

    const reloaded = installationWorkspace(path, environment("windows-vite").options);
    try {
      expect(reloaded === previous).toBe(false);
      expect(lockOf(path)).toMatchObject({ hostname: "windows-vite" });
      expect(installationWorkspace(path) === reloaded).toBe(true);
    } finally {
      registered.delete(path);
      reloaded.close();
    }
  });

  it("tells the browser who holds the collection instead of a generic error", async () => {
    const path = root();
    openWorkspace(path, environment("windows-vite").options);
    const response = await handleInstallationRequest(
      path,
      new Request("http://localhost:3000/api/workspace/session", {
        method: "POST",
        headers: { "x-scriptorium-workspace": "1" },
      }),
      environment("docker", Date.parse("2026-10-15T12:01:00.000Z")).options,
    );
    expect(response.status).toBe(423);
    expect(await response.json()).toMatchObject({
      code: "workspace-locked",
      error: expect.stringMatching(
        /^Este acervo já está aberto por outro processo \(windows-vite/u,
      ),
    });
  });
});

describe("sessions and uploads that recover by themselves", () => {
  const openSession = (workspace: InstallationWorkspace, session?: string) =>
    workspace.handle(
      new Request("http://localhost:3000/api/workspace/session", {
        method: "POST",
        headers: { "x-scriptorium-workspace": "1", ...(session ? { cookie: session } : {}) },
      }),
    );

  it("keeps the browser's session on reload and, when full, forgets the oldest instead of refusing", async () => {
    const workspace = create();
    const first = await cookie(workspace);
    const reload = await openSession(workspace, first);
    expect(reload.headers.get("set-cookie")?.split(";")[0]).toBe(first);

    for (let index = 0; index < 300; index += 1)
      expect((await openSession(workspace)).status).toBe(200);
    expect(workspace.sessions.size).toBe(256);
    const query = { type: "query", sql: "SELECT 1 AS n" };
    expect((await command(workspace, first, query)).status).toBe(401);
    expect((await command(workspace, await cookie(workspace), query)).status).toBe(200);
  });

  it("stores a PDF even when an earlier upload left a temporary file behind", async () => {
    const workspace = create();
    const session = await cookie(workspace);
    const bytes = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\n%%EOF\n");
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const documents = join(workspace.root, "documents");
    writeFileSync(join(documents, `${checksum}.pdf.tmp`), "pela metade");

    const response = await workspace.handle(
      new Request(`http://localhost:3000/api/workspace/documents/${checksum}`, {
        method: "PUT",
        headers: { "x-scriptorium-workspace": "1", cookie: session },
        body: bytes,
      }),
    );
    expect(response.status).toBe(200);
    expect(readFileSync(join(documents, `${checksum}.pdf`))).toEqual(bytes);
    expect(readdirSync(documents).sort()).toEqual([`${checksum}.pdf`, `${checksum}.pdf.tmp`]);
  });
});

describe("the SQL the page may send", () => {
  it("allows the foreign key check a backup restore needs, but not other table-valued pragmas", async () => {
    const workspace = create();
    const session = await cookie(workspace);
    const check = await command(workspace, session, {
      type: "query",
      sql: "SELECT count(*) AS n FROM pragma_foreign_key_check",
    });
    expect(check.status).toBe(200);
    expect(await check.json()).toEqual([{ n: 0 }]);
    for (const sql of [
      "SELECT file FROM pragma_database_list",
      "SELECT * FROM \"PRAGMA_table_info\"('studies')",
    ]) {
      const refused = await command(workspace, session, { type: "query", sql });
      expect(refused.status).toBe(400);
      expect(await refused.json()).toEqual({ error: "SQL fora do contrato do workspace." });
    }
  });
});
