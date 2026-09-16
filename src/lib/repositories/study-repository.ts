import type { Note, NoteLink, Study, StudyItem } from "../domain/study";
import type { PassageRef } from "../domain/scripture";
import { passageRefKey, passageRefsOverlap } from "../domain/scripture";
import type { ResearchQuestion, ResearchLink } from "../domain/research";
import { ResearchQuestionSchema } from "../domain/research";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceRow,
  type WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";

function text(row: WorkspaceRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Invalid ${key}.`);
  return value;
}
function optionalText(row: WorkspaceRow, key: string): string | undefined {
  return typeof row[key] === "string" ? (row[key] as string) : undefined;
}
function uid(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

async function linksFor(
  table: "note_links" | "research_question_links",
  ownerColumn: "note_id" | "research_question_id",
  ownerId: string,
  database?: WorkspaceDatabase,
): Promise<NoteLink[]> {
  const db = database ?? (await getWorkspaceDatabase());
  return (
    await db.query(
      `SELECT target_kind,target_id,target_json FROM ${table} WHERE ${ownerColumn}=?`,
      [ownerId],
    )
  ).map((row) => {
    const kind = text(row, "target_kind");
    const target = optionalText(row, "target_id") ?? "structured-target";
    const structured = optionalText(row, "target_json");
    return {
      kind: (kind === "source" ? "resource" : kind) as NoteLink["kind"],
      target,
      label: target,
      ...(structured ? (JSON.parse(structured) as Pick<NoteLink, "anchor">) : {}),
    };
  });
}
async function mapNote(row: WorkspaceRow, database?: WorkspaceDatabase): Promise<Note> {
  return {
    id: text(row, "id"),
    title: optionalText(row, "title") ?? "",
    body: text(row, "content"),
    links: await linksFor("note_links", "note_id", text(row, "id"), database),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}
async function researchLinksFor(
  questionId: string,
  database?: WorkspaceDatabase,
): Promise<ResearchLink[]> {
  const db = database ?? (await getWorkspaceDatabase());
  return (
    await db.query(
      "SELECT target_kind,target_id,target_json FROM research_question_links WHERE research_question_id=?",
      [questionId],
    )
  ).map((row) => {
    const structured = optionalText(row, "target_json");
    const parsed = structured
      ? (JSON.parse(structured) as {
          anchor?: ResearchLink["anchor"];
          locator?: ResearchLink["locator"];
        })
      : {};
    return {
      targetKind: text(row, "target_kind") as ResearchLink["targetKind"],
      ...(optionalText(row, "target_id") ? { targetId: optionalText(row, "target_id") } : {}),
      ...(parsed.anchor ? { anchor: parsed.anchor } : {}),
      ...(parsed.locator ? { locator: parsed.locator } : {}),
    };
  });
}
async function mapStudy(row: WorkspaceRow, database?: WorkspaceDatabase): Promise<Study> {
  const db = database ?? (await getWorkspaceDatabase());
  const items: StudyItem[] = (
    await db.query("SELECT * FROM study_links WHERE study_id=? ORDER BY added_at", [
      text(row, "id"),
    ])
  ).map((item) => {
    const targetJson = optionalText(item, "target_json");
    const parsed = targetJson ? (JSON.parse(targetJson) as { passageRef?: PassageRef }) : {};
    return {
      id: text(item, "id"),
      kind: text(item, "target_kind") as StudyItem["kind"],
      refId: optionalText(item, "target_id") ?? "structured-target",
      label: text(item, "label"),
      ...(parsed.passageRef ? { passageRef: parsed.passageRef } : {}),
      addedAt: text(item, "added_at"),
    };
  });
  const description = optionalText(row, "description");
  return {
    id: text(row, "id"),
    slug: text(row, "slug"),
    title: text(row, "title"),
    ...(description ? { description } : {}),
    items,
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  };
}

export interface WorkspaceExport {
  schemaVersion: 1;
  exportedAt: string;
  studies: Study[];
  notes: Note[];
  researchQuestions: ResearchQuestion[];
}

let studyCache: Study[] = [];
let noteCache: Note[] = [];

export const StudyRepository = {
  async refresh(): Promise<void> {
    const db = await getWorkspaceDatabase();
    [studyCache, noteCache] = await Promise.all([
      Promise.all(
        (await db.query("SELECT * FROM studies ORDER BY updated_at DESC")).map((row) =>
          mapStudy(row, db),
        ),
      ),
      Promise.all(
        (await db.query("SELECT * FROM notes ORDER BY updated_at DESC")).map((row) =>
          mapNote(row, db),
        ),
      ),
    ]);
  },
  listStudies(): Study[] {
    return studyCache;
  },
  getStudyBySlug(slug: string): Study | null {
    return studyCache.find((study) => study.slug === slug) ?? null;
  },
  async createStudy(title: string): Promise<Study> {
    const db = await getWorkspaceDatabase();
    const now = new Date().toISOString();
    const id = uid("study");
    const slug = `${
      title
        .toLocaleLowerCase()
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "untitled"
    }-${id.slice(-8)}`;
    await db.execute(
      "INSERT INTO studies(id,slug,title,status,research_questions_json,created_at,updated_at) VALUES(?,?,?,'active','[]',?,?)",
      [id, slug, title, now, now],
    );
    await this.refresh();
    return studyCache.find((study) => study.id === id)!;
  },
  async addStudyItem(
    studyId: string,
    item: Omit<StudyItem, "id" | "addedAt">,
  ): Promise<Study | null> {
    const db = await getWorkspaceDatabase();
    const now = new Date().toISOString();
    await db.transaction([
      {
        sql: "INSERT INTO study_links(id,study_id,target_kind,target_id,target_json,label,added_at) VALUES(?,?,?,?,?,?,?)",
        bind: [
          uid("study-link"),
          studyId,
          item.kind,
          item.refId,
          item.passageRef ? JSON.stringify({ passageRef: item.passageRef }) : null,
          item.label,
          now,
        ],
      },
      { sql: "UPDATE studies SET updated_at=? WHERE id=?", bind: [now, studyId] },
    ]);
    await this.refresh();
    return studyCache.find((study) => study.id === studyId) ?? null;
  },
  listNotes(): Note[] {
    return noteCache;
  },
  notesForPassage(ref: PassageRef): Note[] {
    return noteCache.filter((note) =>
      note.links.some((link) =>
        link.anchor?.type === "passage"
          ? passageRefsOverlap(link.anchor.ref, ref)
          : link.kind === "passage" && link.target === passageRefKey(ref),
      ),
    );
  },
  studyItemsForPassage(ref: PassageRef): StudyItem[] {
    return studyCache.flatMap((study) =>
      study.items.filter((item) => item.passageRef && passageRefsOverlap(item.passageRef, ref)),
    );
  },
  async createNote(input: Pick<Note, "title" | "body" | "links">): Promise<Note> {
    const db = await getWorkspaceDatabase();
    const now = new Date().toISOString();
    const id = uid("note");
    const statements: { sql: string; bind?: WorkspaceSqlValue[] }[] = [
      {
        sql: "INSERT INTO notes(id,title,content,format,created_at,updated_at) VALUES(?,?,?,'markdown',?,?)",
        bind: [id, input.title, input.body, now, now],
      },
      {
        sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) VALUES('note',?,?,?)",
        bind: [id, input.title, input.body],
      },
    ];
    input.links.forEach((link) =>
      statements.push({
        sql: "INSERT INTO note_links(id,note_id,target_kind,target_id,target_json) VALUES(?,?,?,?,?)",
        bind: [
          uid("note-link"),
          id,
          link.kind === "resource" ? "source" : link.kind,
          link.target || null,
          link.anchor ? JSON.stringify({ anchor: link.anchor }) : null,
        ],
      }),
    );
    await db.transaction(statements);
    await this.refresh();
    return noteCache.find((note) => note.id === id)!;
  },
  async createResearchQuestion(input: {
    question: string;
    studyId?: string;
    description?: string;
  }): Promise<ResearchQuestion> {
    const db = await getWorkspaceDatabase();
    const now = new Date().toISOString();
    const id = uid("research-question");
    await db.transaction([
      {
        sql: "INSERT INTO research_questions(id,question,status,description,study_id,created_at,updated_at) VALUES(?,?,'open',?,?,?,?)",
        bind: [id, input.question, input.description ?? null, input.studyId ?? null, now, now],
      },
      {
        sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) VALUES('research-question',?,?,?)",
        bind: [id, input.question, input.description ?? ""],
      },
    ]);
    return ResearchQuestionSchema.parse({
      id,
      question: input.question,
      status: "open",
      ...(input.description ? { description: input.description } : {}),
      ...(input.studyId ? { studyId: input.studyId } : {}),
      links: [],
      createdAt: now,
      updatedAt: now,
    });
  },
  async listResearchQuestions(
    studyId?: string,
    database?: WorkspaceDatabase,
  ): Promise<ResearchQuestion[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const rows = await db.query(
      `SELECT * FROM research_questions${studyId ? " WHERE study_id=?" : ""} ORDER BY updated_at DESC`,
      studyId ? [studyId] : [],
    );
    return Promise.all(
      rows.map(async (row) =>
        ResearchQuestionSchema.parse({
          id: text(row, "id"),
          question: text(row, "question"),
          status: text(row, "status"),
          ...(optionalText(row, "description")
            ? { description: optionalText(row, "description") }
            : {}),
          ...(optionalText(row, "study_id") ? { studyId: optionalText(row, "study_id") } : {}),
          links: await researchLinksFor(text(row, "id"), db),
          ...(optionalText(row, "provisional_conclusion")
            ? { provisionalConclusion: optionalText(row, "provisional_conclusion") }
            : {}),
          createdAt: text(row, "created_at"),
          updatedAt: text(row, "updated_at"),
        }),
      ),
    );
  },
  async updateResearchQuestion(
    id: string,
    input: { status: ResearchQuestion["status"]; provisionalConclusion?: string },
  ): Promise<void> {
    const db = await getWorkspaceDatabase();
    await db.transaction([
      {
        sql: "UPDATE research_questions SET status=?,provisional_conclusion=?,updated_at=? WHERE id=?",
        bind: [
          input.status,
          input.provisionalConclusion?.trim() || null,
          new Date().toISOString(),
          id,
        ],
      },
      {
        sql: "DELETE FROM workspace_fts WHERE entity_kind='research-question' AND entity_id=?",
        bind: [id],
      },
      {
        sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) SELECT 'research-question',id,question,coalesce(description,'') || ' ' || coalesce(provisional_conclusion,'') FROM research_questions WHERE id=?",
        bind: [id],
      },
    ]);
  },
  /** @deprecated Use ResearchWorkspaceService.exportJson for complete backup v2. */
  async exportWorkspace(database?: WorkspaceDatabase): Promise<WorkspaceExport> {
    const db = database ?? (await getWorkspaceDatabase());
    const [studies, notes, researchQuestions] = await Promise.all([
      Promise.all(
        (await db.query("SELECT * FROM studies ORDER BY updated_at DESC")).map((row) =>
          mapStudy(row, db),
        ),
      ),
      Promise.all(
        (await db.query("SELECT * FROM notes ORDER BY updated_at DESC")).map((row) =>
          mapNote(row, db),
        ),
      ),
      this.listResearchQuestions(undefined, db),
    ]);
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      studies,
      notes,
      researchQuestions,
    };
  },
  async migrateLegacyLocalStorage(): Promise<void> {
    if (typeof window === "undefined") return;
    const marker = "scriptorium.workspace.sqlite.migrated.v1";
    if (window.localStorage.getItem(marker)) return;
    const notes = JSON.parse(window.localStorage.getItem("scriptorium.notes.v1") ?? "[]") as Note[];
    const studies = JSON.parse(
      window.localStorage.getItem("scriptorium.studies.v1") ?? "[]",
    ).filter(
      (study: Study) =>
        study.id !== "study:demo-logos" &&
        !(
          study.id === "study-logos" &&
          study.slug === "logos-in-john" &&
          study.title === "The concept of Logos in John" &&
          study.description?.startsWith("DEMO study workspace.")
        ),
    ) as Study[];
    const userNotes = notes.filter((note) => note.id !== "note:demo-logos");
    await this.refresh();
    for (const study of studies) {
      const existing = studyCache.some((item) => item.id === study.id);
      if (!existing) {
        const db = await getWorkspaceDatabase();
        const statements: { sql: string; bind?: WorkspaceSqlValue[] }[] = [
          {
            sql: "INSERT INTO studies(id,slug,title,description,status,research_questions_json,created_at,updated_at) VALUES(?,?,?,?,'active','[]',?,?)",
            bind: [
              study.id,
              study.slug,
              study.title,
              study.description ?? null,
              study.createdAt,
              study.updatedAt,
            ],
          },
        ];
        study.items.forEach((item) =>
          statements.push({
            sql: "INSERT INTO study_links(id,study_id,target_kind,target_id,target_json,label,added_at) VALUES(?,?,?,?,?,?,?)",
            bind: [
              item.id,
              study.id,
              item.kind,
              item.refId,
              item.passageRef ? JSON.stringify({ passageRef: item.passageRef }) : null,
              item.label,
              item.addedAt,
            ],
          }),
        );
        await db.transaction(statements);
      }
    }
    for (const note of userNotes) {
      if (!noteCache.some((item) => item.id === note.id))
        await this.createNote({ title: note.title, body: note.body, links: note.links });
    }
    window.localStorage.removeItem("scriptorium.notes.v1");
    window.localStorage.removeItem("scriptorium.studies.v1");
    window.localStorage.setItem(marker, "1");
    await this.refresh();
  },
};
