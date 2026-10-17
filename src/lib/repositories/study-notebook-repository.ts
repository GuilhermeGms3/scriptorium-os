import { z } from "zod";
import type { NoteLink } from "../domain/study";
import {
  orderedNotePair,
  StudyColorSchema,
  StudySourceSchema,
  type NoteConnection,
  type StudySource,
} from "../domain/study-notebook";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";

const titleSchema = z.string().trim().min(1).max(500);
export interface NotebookNoteInput {
  id?: string;
  /** Optimistic concurrency: editing a stale note must not overwrite another tab's work. */
  expectedUpdatedAt?: string;
  title: string;
  body: string;
  studyId: string;
  color?: string;
  source?: StudySource;
  links?: NoteLink[];
}
export const StudyNotebookRepository = {
  async createGroup(title: string, color: string, database?: WorkspaceDatabase): Promise<string> {
    const db = database ?? (await getWorkspaceDatabase());
    const clean = titleSchema.parse(title);
    const id = `study:${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await db.execute(
      "INSERT INTO studies(id,slug,title,status,research_questions_json,created_at,updated_at,color) VALUES(?,?,?,'active','[]',?,?,?)",
      [id, `grupo-${id.slice(-12)}`, clean, now, now, StudyColorSchema.parse(color)],
    );
    notifyKnowledgeMutation();
    return id;
  },
  async setGroupColor(id: string, color: string, database?: WorkspaceDatabase): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute("UPDATE studies SET color=?,updated_at=? WHERE id=?", [
      StudyColorSchema.parse(color),
      new Date().toISOString(),
      id,
    ]);
    notifyKnowledgeMutation();
  },
  async saveNote(input: NotebookNoteInput, database?: WorkspaceDatabase): Promise<string> {
    const db = database ?? (await getWorkspaceDatabase());
    const title = titleSchema.parse(input.title);
    const body = z.string().max(200_000).parse(input.body);
    const color = input.color ? StudyColorSchema.parse(input.color) : null;
    const source = input.source ? JSON.stringify(StudySourceSchema.parse(input.source)) : null;
    if (!(await db.query("SELECT id FROM studies WHERE id=?", [input.studyId])).length)
      throw new Error("O grupo não existe mais. Escolha outro grupo.");
    const id = input.id ?? `note:${crypto.randomUUID()}`;
    const previousTime = input.expectedUpdatedAt ? Date.parse(input.expectedUpdatedAt) : 0;
    const now = new Date(
      Math.max(Date.now(), Number.isFinite(previousTime) ? previousTime + 1 : 0),
    ).toISOString();
    const statements: { sql: string; bind?: WorkspaceSqlValue[] }[] = [];
    if (input.id) {
      // Check and write in one statement. The guard deliberately fails its NOT NULL constraint
      // inside this transaction when another writer changed/deleted the note.
      if (!input.expectedUpdatedAt) throw new Error("Reabra a nota antes de editar.");
      statements.push({
        sql: "INSERT INTO notes(id,title,content,format,created_at,updated_at,color,source_json) SELECT ?,?,NULL,'markdown',?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM notes WHERE id=? AND updated_at=?)",
        bind: [id, title, now, now, color, source, id, input.expectedUpdatedAt],
      });
      statements.push({
        sql: "UPDATE notes SET title=?,content=?,color=?,source_json=coalesce(?,source_json),updated_at=? WHERE id=? AND updated_at=?",
        bind: [title, body, color, source, now, id, input.expectedUpdatedAt],
      });
    } else
      statements.push({
        sql: "INSERT INTO notes(id,title,content,format,created_at,updated_at,color,source_json) VALUES(?,?,?,'markdown',?,?,?,?)",
        bind: [id, title, body, now, now, color, source],
      });
    statements.push(
      { sql: "DELETE FROM workspace_fts WHERE entity_kind='note' AND entity_id=?", bind: [id] },
      {
        sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) VALUES('note',?,?,?)",
        bind: [id, title, body],
      },
    );
    const links: NoteLink[] = [
      { kind: "study", target: input.studyId, label: input.studyId },
      ...(input.links ?? []).filter(
        (link) => link.kind !== "study" || link.target !== input.studyId,
      ),
    ];
    for (const link of links)
      statements.push({
        sql: "INSERT INTO note_links(id,note_id,target_kind,target_id,target_json) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM note_links WHERE note_id=? AND target_kind=? AND target_id=?)",
        bind: [
          `note-link:${crypto.randomUUID()}`,
          id,
          link.kind === "resource" ? "source" : link.kind,
          link.target,
          JSON.stringify({ label: link.label, ...(link.anchor ? { anchor: link.anchor } : {}) }),
          id,
          link.kind === "resource" ? "source" : link.kind,
          link.target,
        ],
      });
    statements.push({
      sql: "UPDATE studies SET updated_at=? WHERE id=?",
      bind: [now, input.studyId],
    });
    try {
      await db.transaction(statements);
    } catch (error) {
      if (input.id && /constraint/i.test(String(error)))
        throw new Error(
          "Esta nota mudou em outra janela. Reabra-a antes de salvar; seu rascunho foi mantido.",
        );
      throw error;
    }
    notifyKnowledgeMutation();
    return id;
  },
  async connections(studyId: string, database?: WorkspaceDatabase): Promise<NoteConnection[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const rows = await db.query(
      "SELECT c.* FROM note_connections c WHERE EXISTS(SELECT 1 FROM note_links l WHERE l.note_id=c.source_note_id AND l.target_kind='study' AND l.target_id=?) OR EXISTS(SELECT 1 FROM note_links l WHERE l.note_id=c.target_note_id AND l.target_kind='study' AND l.target_id=?) ORDER BY c.source_note_id,c.target_note_id",
      [studyId, studyId],
    );
    return rows.map((row) => ({
      sourceId: String(row["source_note_id"]),
      targetId: String(row["target_note_id"]),
      createdAt: String(row["created_at"]),
    }));
  },
  async connect(a: string, b: string, database?: WorkspaceDatabase): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      "INSERT INTO note_connections(source_note_id,target_note_id,created_at) VALUES(?,?,?) ON CONFLICT(source_note_id,target_note_id) DO NOTHING",
      [...orderedNotePair(a, b), new Date().toISOString()],
    );
    notifyKnowledgeMutation();
  },
  async disconnect(a: string, b: string, database?: WorkspaceDatabase): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      "DELETE FROM note_connections WHERE source_note_id=? AND target_note_id=?",
      orderedNotePair(a, b),
    );
    notifyKnowledgeMutation();
  },
};
