import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import { NoteExplorerRepository as explorer } from "./note-explorer-repository";
import { StudyNotebookRepository as notebook } from "./study-notebook-repository";
import { ResearchWorkspaceService } from "../application/research-workspace-service";
import { wikiLink, wikiReferences, folderPath } from "../domain/note-document";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/workspace-database";

const connections: DatabaseSync[] = [];
function setup() {
  const native = new DatabaseSync(":memory:");
  connections.push(native);
  applyWorkspaceMigrations(native);
  const db: WorkspaceDatabase = {
    persistence: "memory",
    async query(sql, bind = []) {
      return native.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql, bind = []) {
      native.prepare(sql).run(...bind);
    },
    async transaction(statements) {
      native.exec("BEGIN IMMEDIATE");
      try {
        for (const statement of statements)
          native.prepare(statement.sql).run(...(statement.bind ?? []));
        native.exec("COMMIT");
      } catch (error) {
        native.exec("ROLLBACK");
        throw error;
      }
    },
    async reset() {
      throw new Error("Not used");
    },
  };
  return { db, native };
}
afterEach(() => {
  while (connections.length) connections.pop()?.close();
});

describe("explorador de notas e referências escritas", () => {
  it("upgrades schema26 without touching legacy notes, sources, colors or manual edges", async () => {
    const { native } = setup();
    const previous = new DatabaseSync(":memory:");
    connections.push(previous);
    previous.exec(
      "PRAGMA foreign_keys=ON; CREATE TABLE workspace_migrations(version INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,applied_at TEXT NOT NULL) STRICT",
    );
    const directory = resolve("src/lib/workspace-runtime/migrations");
    for (const file of readdirSync(directory)
      .filter((name) => /^\d{3}_/.test(name) && Number(name.slice(0, 3)) <= 26)
      .sort()) {
      previous.exec(readFileSync(resolve(directory, file), "utf8"));
      previous
        .prepare("INSERT INTO workspace_migrations VALUES(?,?,?)")
        .run(Number(file.slice(0, 3)), file, "old");
    }
    previous.exec(
      "INSERT INTO notes(id,title,content,format,created_at,updated_at,color) VALUES('a','Nota antiga','Preservar','markdown','old','old','#123456'),('b','Outra','Texto','markdown','old','old',NULL); INSERT INTO note_connections VALUES('a','b','old')",
    );
    applyWorkspaceMigrations(previous);
    applyWorkspaceMigrations(previous);
    expect(previous.prepare("SELECT content,color FROM notes WHERE id='a'").get()).toEqual({
      content: "Preservar",
      color: "#123456",
    });
    expect(previous.prepare("SELECT * FROM note_connections").all()).toHaveLength(1);
    expect(
      previous.prepare("SELECT max(version) AS v FROM workspace_migrations").get()?.["v"],
    ).toBe(native.prepare("SELECT max(version) AS v FROM workspace_migrations").get()?.["v"]);
  });
  it("persists nested folders, prevents cycles and cross-group parents", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Grupo", "#123456", db);
    const other = await notebook.createGroup("Outro", "#abcdef", db);
    const parent = await explorer.createFolder(group, null, "Gênesis", db);
    const child = await explorer.createFolder(group, parent, "Criação", db);
    expect(folderPath(child, (await explorer.structure(db)).folders)).toBe("Gênesis / Criação");
    await expect(explorer.updateFolder(parent, "Gênesis", child, db)).rejects.toThrow(/ancestor/);
    await expect(explorer.createFolder(other, parent, "Errada", db)).rejects.toThrow(/FOREIGN KEY/);
    await expect(explorer.createFolder(group, null, "gênesis", db)).rejects.toThrow(/UNIQUE/);
    await expect(explorer.createFolder(group, null, "  ", db)).rejects.toThrow();
    await explorer.updateFolder(child, "Descanso", null, db);
    expect(folderPath(child, (await explorer.structure(db)).folders)).toBe("Descanso");
  });
  it("moves a note within its group atomically without removing source/associations", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Grupo", "#123456", db);
    const folder = await explorer.createFolder(group, null, "Pasta", db);
    const id = await notebook.saveNote(
      {
        title: "Nota",
        body: "texto",
        studyId: group,
        folderId: folder,
        source: { kind: "primary-text", workId: "work", title: "Fonte" },
      },
      db,
    );
    expect((await explorer.structure(db)).placements).toEqual([
      { noteId: id, studyId: group, folderId: folder },
    ]);
    const version = (await db.query("SELECT updated_at FROM notes WHERE id=?", [id]))[0]![
      "updated_at"
    ] as string;
    await notebook.saveNote(
      {
        id,
        expectedUpdatedAt: version,
        title: "Nota",
        body: "Novo",
        studyId: group,
        folderId: null,
      },
      db,
    );
    expect((await explorer.structure(db)).placements).toEqual([]);
    expect(
      (await db.query("SELECT source_json FROM notes WHERE id=?", [id]))[0]!["source_json"],
    ).toContain('"workId":"work"');
  });
  it("rejects cross-group placement and rolls back note and FTS", async () => {
    const { db } = setup();
    const a = await notebook.createGroup("A", "#123456", db);
    const b = await notebook.createGroup("B", "#123456", db);
    const folder = await explorer.createFolder(a, null, "Pasta", db);
    await expect(
      notebook.saveNote(
        { title: "Não gravar", body: "Rollback", studyId: b, folderId: folder },
        db,
      ),
    ).rejects.toThrow(/FOREIGN KEY/);
    expect(await db.query("SELECT * FROM notes")).toEqual([]);
    expect(await db.query("SELECT * FROM workspace_fts WHERE entity_kind='note'")).toEqual([]);
  });
  it("saves directed references idempotently, keeps manual edges when text links disappear", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Grupo", "#123456", db);
    const b = await notebook.saveNote({ title: "Destino", body: "", studyId: group }, db);
    const text = wikiLink({ id: b, title: "Destino" });
    const a = await notebook.saveNote(
      { title: "Origem", body: `${text} ${text}`, studyId: group },
      db,
    );
    await notebook.connect(a, b, db);
    expect((await explorer.structure(db)).references).toEqual([{ sourceId: a, targetId: b }]);
    const version = (await db.query("SELECT updated_at FROM notes WHERE id=?", [a]))[0]![
      "updated_at"
    ] as string;
    await notebook.saveNote(
      {
        id: a,
        expectedUpdatedAt: version,
        title: "Origem",
        body: "Sem link agora",
        studyId: group,
      },
      db,
    );
    expect((await explorer.structure(db)).references).toEqual([]);
    expect(await notebook.connections(group, db)).toHaveLength(1);
  });
  it("stable IDs survive renames; ambiguous titles and code do not invent edges", () => {
    const notes = [
      { id: "note:a", title: "Igual" },
      { id: "note:b", title: "Igual" },
      { id: "note:c", title: "Única" },
    ];
    expect(
      wikiReferences(
        "[[Igual]] [[única]] [[note:a|Nome antigo]] `[[Única]]`\n```\n[[Única]]\n```",
        notes,
      ).map((ref) => ref.targetId),
    ).toEqual([undefined, "note:c", "note:a"]);
    expect(
      wikiReferences(wikiLink(notes[2]!), [{ id: "note:c", title: "Renomeada" }])[0]?.targetId,
    ).toBe("note:c");
    expect(wikiLink({ id: "note:a", title: "Escape ]] |\n" })).toBe("[[note:a|Escape]]");
  });
  it("roundtrips folders, placements and references even when children precede parents", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Grupo", "#123456", db);
    const root = await explorer.createFolder(group, null, "Raiz", db);
    const child = await explorer.createFolder(group, root, "Filha", db);
    const b = await notebook.saveNote({ title: "B", body: "", studyId: group }, db);
    await notebook.saveNote(
      { title: "A", body: wikiLink({ id: b, title: "B" }), studyId: group, folderId: child },
      db,
    );
    const backup = JSON.parse(await ResearchWorkspaceService.exportJson(db)) as {
      manifest: { checksum: string };
      research: { noteFolders?: WorkspaceRow[] };
    };
    backup.research.noteFolders?.reverse();
    const { checksum: _checksum, ...manifest } = backup.manifest;
    backup.manifest.checksum = createHash("sha256")
      .update(JSON.stringify({ ...backup, manifest }))
      .digest("hex");
    const restored = setup();
    await ResearchWorkspaceService.importJson(JSON.stringify(backup), restored.db);
    expect(await explorer.structure(restored.db)).toEqual(await explorer.structure(db));
    expect(restored.native.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("preserves edits and links on optimistic conflict", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Grupo", "#123456", db);
    const b = await notebook.saveNote({ title: "B", body: "", studyId: group }, db);
    const a = await notebook.saveNote(
      { title: "A", body: wikiLink({ id: b, title: "B" }), studyId: group },
      db,
    );
    await expect(
      notebook.saveNote(
        { id: a, expectedUpdatedAt: "stale", title: "A", body: "Apagar", studyId: group },
        db,
      ),
    ).rejects.toThrow(/outra janela/);
    expect((await explorer.structure(db)).references).toHaveLength(1);
  });
});
