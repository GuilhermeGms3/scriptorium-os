import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { backup } from "node:sqlite";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { InstallationWorkspace } from "./installation-workspace.server";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type { WorkspaceDatabase, WorkspaceRow } from "./protocol";

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
  it("migrates schema 22 and persists the same state between client sessions", async () => {
    const workspace = create();
    const one = await cookie(workspace);
    const two = await cookie(workspace);
    const response = await command(workspace, one, {
      type: "query",
      sql: "SELECT max(version) AS n FROM workspace_migrations",
    });
    expect(await response.json()).toEqual([{ n: 22 }]);
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
