import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import { StudyNotebookRepository as notebook } from "./study-notebook-repository";
import { StudyRepository } from "./study-repository";
import { ResearchWorkspaceService } from "../application/research-workspace-service";
import { orderedNotePair, StudySourceSchema, studySourceHref } from "../domain/study-notebook";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/workspace-database";

const databases: DatabaseSync[] = [];
function setup(upgrade = false) {
  const native = new DatabaseSync(":memory:");
  databases.push(native);
  if (upgrade) {
    native.exec(
      "PRAGMA foreign_keys=ON; CREATE TABLE workspace_migrations(version INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,applied_at TEXT NOT NULL) STRICT",
    );
    const directory = resolve("src/lib/workspace-runtime/migrations");
    for (const file of readdirSync(directory)
      .filter((name) => /^\d{3}_.*\.sql$/.test(name) && Number(name.slice(0, 3)) <= 25)
      .sort()) {
      native.exec(readFileSync(resolve(directory, file), "utf8"));
      native
        .prepare("INSERT INTO workspace_migrations VALUES(?,?,?)")
        .run(Number(file.slice(0, 3)), file, "old");
    }
    native.exec(
      "INSERT INTO notes VALUES('old','Anterior','Preservar','markdown','old','old'); INSERT INTO studies VALUES('old-study','old-study','Estudo anterior',NULL,'active','[]','old','old')",
    );
  }
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
        for (const item of statements) native.prepare(item.sql).run(...(item.bind ?? []));
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
  return { native, db };
}
afterEach(() => {
  while (databases.length) databases.pop()?.close();
});
const source = {
  kind: "private-document" as const,
  documentId: "private-document:book",
  unitId: "unit:note",
  title: "Fonte arqueológica",
  page: 33,
};
describe("caderno de estudos persistente", () => {
  it("upgrades schema 25 without losing existing notes/studies and is idempotent", async () => {
    const { native, db } = setup(true);
    applyWorkspaceMigrations(native);
    const old = await StudyRepository.exportWorkspace(db);
    expect(old.notes[0]?.body).toBe("Preservar");
    expect(old.studies[0]?.title).toBe("Estudo anterior");
    expect(native.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("saves group/color/source, edits and keeps FTS synchronized", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Arqueologia", "#123abc", db);
    const id = await notebook.saveNote(
      { title: "Éden", body: "Antiga observação", studyId: group, color: "#abcdef", source },
      db,
    );
    const snapshot = await StudyRepository.exportWorkspace(db);
    expect(snapshot.studies[0]?.color).toBe("#123abc");
    expect(snapshot.notes[0]).toMatchObject({ color: "#abcdef", source });
    await notebook.saveNote(
      {
        id,
        expectedUpdatedAt: snapshot.notes[0]!.updatedAt,
        title: "Rios",
        body: "Mesopotâmia",
        studyId: group,
      },
      db,
    );
    expect((await StudyRepository.exportWorkspace(db)).notes[0]).toMatchObject({
      title: "Rios",
      source,
    });
    expect(
      await db.query("SELECT * FROM workspace_fts WHERE workspace_fts MATCH ?", ["Mesopotâmia"]),
    ).toHaveLength(1);
    expect(
      await db.query("SELECT * FROM workspace_fts WHERE workspace_fts MATCH ?", ["Antiga"]),
    ).toHaveLength(0);
    expect(await db.query("SELECT * FROM note_links WHERE note_id=?", [id])).toHaveLength(1);
  });
  it("rejects stale edits atomically without destroying the note/index", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Tema", "#123456", db);
    const id = await notebook.saveNote({ title: "Original", body: "Conteúdo", studyId: group }, db);
    await expect(
      notebook.saveNote(
        { id, expectedUpdatedAt: "stale", title: "Perdido", body: "Sobrescrito", studyId: group },
        db,
      ),
    ).rejects.toThrow(/outra janela/);
    expect((await StudyRepository.exportWorkspace(db)).notes[0]?.title).toBe("Original");
  });
  it("connects bidirectionally/idempotently and removes both directions", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Tema", "#123456", db);
    const a = await notebook.saveNote({ title: "A", body: "", studyId: group }, db);
    const b = await notebook.saveNote({ title: "B", body: "", studyId: group }, db);
    await notebook.connect(a, b, db);
    await notebook.connect(b, a, db);
    expect(await notebook.connections(group, db)).toHaveLength(1);
    await notebook.disconnect(b, a, db);
    expect(await notebook.connections(group, db)).toEqual([]);
  });
  it("enforces source validity, color, foreign keys, no self edges and canonical pairs", async () => {
    const { db } = setup();
    await expect(notebook.createGroup("Tema", "red", db)).rejects.toThrow();
    expect(() => orderedNotePair("a", "a")).toThrow();
    expect(StudySourceSchema.safeParse({ ...source, page: 0 }).success).toBe(false);
    await expect(notebook.connect("missing-a", "missing-b", db)).rejects.toThrow(/FOREIGN KEY/);
    expect(studySourceHref(source)).toContain("page=33&unit=unit%3Anote");
    expect(studySourceHref({ ...source, documentId: "javascript:alert(1)" })).toMatch(
      /^\/library\/document\//,
    );
  });
  it("roundtrips colors, origins and connections with the workspace backup", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Tema", "#aabbcc", db);
    const a = await notebook.saveNote(
      { title: "A", body: "Nota própria", studyId: group, source },
      db,
    );
    const b = await notebook.saveNote(
      { title: "B", body: "Outra nota", studyId: group, color: "#ccbb00" },
      db,
    );
    await notebook.connect(a, b, db);
    const backup = await ResearchWorkspaceService.exportJson(db);
    const restored = setup();
    await ResearchWorkspaceService.importJson(backup, restored.db);
    expect((await StudyRepository.exportWorkspace(restored.db)).notes).toEqual(
      (await StudyRepository.exportWorkspace(db)).notes,
    );
    expect(await notebook.connections(group, restored.db)).toEqual(
      await notebook.connections(group, db),
    );
    expect(restored.native.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("accepts existing backups that predate note connections without changing their checksum", async () => {
    const { db } = setup();
    const group = await notebook.createGroup("Legado", "#123456", db);
    await notebook.saveNote({ title: "Nota anterior", body: "Preservada", studyId: group }, db);
    const data = JSON.parse(await ResearchWorkspaceService.exportJson(db)) as {
      manifest: Record<string, string | number | boolean>;
      research: Record<string, unknown>;
    };
    delete data.research["noteConnections"];
    delete data.manifest["checksum"];
    data.manifest["checksum"] = createHash("sha256").update(JSON.stringify(data)).digest("hex");
    const restored = setup();
    await ResearchWorkspaceService.importJson(JSON.stringify(data), restored.db);
    expect((await StudyRepository.exportWorkspace(restored.db)).notes[0]?.body).toBe("Preservada");
    expect(await notebook.connections(group, restored.db)).toEqual([]);
  });
});
