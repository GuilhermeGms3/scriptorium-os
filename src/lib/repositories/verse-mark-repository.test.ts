import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/workspace-database";
import { VerseMarkRepository } from "./verse-mark-repository";

const databases: DatabaseSync[] = [];
function workspace(): { db: DatabaseSync; workspace: WorkspaceDatabase } {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  return {
    db,
    workspace: {
      persistence: "memory",
      async query(sql, bind = []) {
        return db.prepare(sql).all(...bind) as WorkspaceRow[];
      },
      async execute(sql, bind = []) {
        db.prepare(sql).run(...bind);
      },
      async transaction(statements) {
        db.exec("BEGIN IMMEDIATE");
        try {
          for (const item of statements) db.prepare(item.sql).run(...(item.bind ?? []));
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
      async reset() {
        throw new Error("Not used here");
      },
    },
  };
}
afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

const JOHN_3_16 = { bookId: "john", chapter: 3, verse: 16 };
const PSALM_23_1 = { bookId: "psalms", chapter: 23, verse: 1 };

describe("marcações de versículos no banco do usuário", () => {
  it("keeps one color per verse: a new color replaces the old one, null takes it away", async () => {
    const { db, workspace: database } = workspace();
    await VerseMarkRepository.setColor(JOHN_3_16, "yellow", "blivre", database);
    await VerseMarkRepository.setColor(JOHN_3_16, "green", "blivre", database);
    expect(await VerseMarkRepository.list(database)).toEqual([
      expect.objectContaining({
        ...JOHN_3_16,
        color: "green",
        favorite: false,
        editionId: "blivre",
      }),
    ]);
    expect(db.prepare("SELECT COUNT(*) AS n FROM highlights").get()).toEqual({ n: 1 });
    await VerseMarkRepository.setColor(JOHN_3_16, null, undefined, database);
    expect(await VerseMarkRepository.list(database)).toEqual([]);
  });

  it("stars a verse on its own or together with its color, and unstars it", async () => {
    const { workspace: database } = workspace();
    await VerseMarkRepository.setFavorite(PSALM_23_1, true, undefined, database);
    await VerseMarkRepository.setColor(JOHN_3_16, "blue", undefined, database);
    await VerseMarkRepository.setFavorite(JOHN_3_16, true, undefined, database);
    const marks = await VerseMarkRepository.list(database);
    expect(marks).toHaveLength(2);
    expect(marks.find((mark) => mark.bookId === "john")).toMatchObject({
      color: "blue",
      favorite: true,
    });
    expect(marks.find((mark) => mark.bookId === "psalms")).toMatchObject({ favorite: true });
    expect(marks.find((mark) => mark.bookId === "psalms")?.color).toBeUndefined();
    await VerseMarkRepository.setFavorite(PSALM_23_1, false, undefined, database);
    expect((await VerseMarkRepository.list(database)).map((mark) => mark.bookId)).toEqual(["john"]);
  });

  it("names the favorite for the backup and leaves highlights of other kinds alone", async () => {
    const { db, workspace: database } = workspace();
    db.prepare(
      "INSERT INTO highlights(id,target_kind,target_id,style_token,created_at) VALUES('other','source','source:x','yellow','2026-10-01T00:00:00.000Z')",
    ).run();
    await VerseMarkRepository.setFavorite(JOHN_3_16, true, undefined, database);
    expect(db.prepare("SELECT label FROM bookmarks").get()).toEqual({ label: "João 3:16" });
    await VerseMarkRepository.setColor(JOHN_3_16, null, undefined, database);
    expect(db.prepare("SELECT id FROM highlights").all()).toEqual([{ id: "other" }]);
  });
});
