import { z } from "zod";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";
import type { NoteFolder, NotePlacement, NoteReference } from "../domain/note-document";
import type { NoteConnection } from "../domain/study-notebook";

export const NoteExplorerRepository = {
  async structure(database?: WorkspaceDatabase): Promise<{
    folders: NoteFolder[];
    placements: NotePlacement[];
    references: NoteReference[];
    connections: NoteConnection[];
  }> {
    const db = database ?? (await getWorkspaceDatabase());
    const [folders, placements, references, connections] = await Promise.all([
      db.query(
        "SELECT id,study_id,parent_id,name FROM note_folders ORDER BY name COLLATE NOCASE,id",
      ),
      db.query("SELECT * FROM note_placements"),
      db.query("SELECT * FROM note_references"),
      db.query("SELECT * FROM note_connections"),
    ]);
    return {
      connections: connections.map((row) => ({
        sourceId: String(row["source_note_id"]),
        targetId: String(row["target_note_id"]),
        createdAt: String(row["created_at"]),
      })),
      folders: folders.map((row) => ({
        id: String(row["id"]),
        studyId: String(row["study_id"]),
        parentId: row["parent_id"] === null ? null : String(row["parent_id"]),
        name: String(row["name"]),
      })),
      placements: placements.map((row) => ({
        noteId: String(row["note_id"]),
        studyId: String(row["study_id"]),
        folderId: String(row["folder_id"]),
      })),
      references: references.map((row) => ({
        sourceId: String(row["source_note_id"]),
        targetId: String(row["target_note_id"]),
      })),
    };
  },
  async createFolder(
    studyId: string,
    parentId: string | null,
    name: string,
    database?: WorkspaceDatabase,
  ): Promise<string> {
    const db = database ?? (await getWorkspaceDatabase());
    const id = `folder:${crypto.randomUUID()}`;
    await db.execute(
      "INSERT INTO note_folders(id,study_id,parent_id,name,created_at) VALUES(?,?,?,?,?)",
      [
        id,
        studyId,
        parentId,
        z.string().trim().min(1).max(120).parse(name),
        new Date().toISOString(),
      ],
    );
    notifyKnowledgeMutation();
    return id;
  },
  async updateFolder(
    id: string,
    name: string,
    parentId: string | null,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute("UPDATE note_folders SET name=?,parent_id=? WHERE id=?", [
      z.string().trim().min(1).max(120).parse(name),
      parentId,
      id,
    ]);
    notifyKnowledgeMutation();
  },
};
