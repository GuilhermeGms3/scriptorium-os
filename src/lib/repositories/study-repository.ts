import type { Note, NoteLink, Study, StudyItem } from "../domain/study";
import { StudySourceSchema } from "../domain/study-notebook";
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

/** Child rows grouped by their owner, in the order they were read. */
function groupBy<T>(
  rows: readonly WorkspaceRow[],
  ownerColumn: string,
  map: (row: WorkspaceRow) => T,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const owner = text(row, ownerColumn);
    const group = groups.get(owner);
    if (group) group.push(map(row));
    else groups.set(owner, [map(row)]);
  }
  return groups;
}
function noteLink(row: WorkspaceRow): NoteLink {
  const kind = text(row, "target_kind");
  const target = optionalText(row, "target_id") ?? "structured-target";
  const structured = optionalText(row, "target_json");
  return {
    kind: (kind === "source" ? "resource" : kind) as NoteLink["kind"],
    target,
    label: target,
    ...(structured ? (JSON.parse(structured) as Pick<NoteLink, "anchor">) : {}),
  };
}
function researchLink(row: WorkspaceRow): ResearchLink {
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
}
function studyItem(item: WorkspaceRow): StudyItem {
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
}
/** All notes with their links: two queries, however many notes there are. */
async function loadNotes(db: WorkspaceDatabase): Promise<Note[]> {
  const [rows, links] = await Promise.all([
    db.query("SELECT * FROM notes ORDER BY updated_at DESC"),
    db.query("SELECT note_id,target_kind,target_id,target_json FROM note_links"),
  ]);
  const linksByNote = groupBy(links, "note_id", noteLink);
  return rows.map((row) => ({
    id: text(row, "id"),
    title: optionalText(row, "title") ?? "",
    body: text(row, "content"),
    ...(optionalText(row, "color") ? { color: optionalText(row, "color")! } : {}),
    ...(optionalText(row, "source_json")
      ? { source: StudySourceSchema.parse(JSON.parse(text(row, "source_json"))) }
      : {}),
    links: linksByNote.get(text(row, "id")) ?? [],
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  }));
}
/** All studies with their items: two queries, however many studies there are. */
async function loadStudies(db: WorkspaceDatabase): Promise<Study[]> {
  const [rows, links] = await Promise.all([
    db.query("SELECT * FROM studies ORDER BY updated_at DESC"),
    db.query("SELECT * FROM study_links ORDER BY added_at"),
  ]);
  const itemsByStudy = groupBy(links, "study_id", studyItem);
  return rows.map((row) => {
    const description = optionalText(row, "description");
    return {
      id: text(row, "id"),
      slug: text(row, "slug"),
      title: text(row, "title"),
      ...(optionalText(row, "color") ? { color: optionalText(row, "color")! } : {}),
      ...(description ? { description } : {}),
      items: itemsByStudy.get(text(row, "id")) ?? [],
      createdAt: text(row, "created_at"),
      updatedAt: text(row, "updated_at"),
    };
  });
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
    [studyCache, noteCache] = await Promise.all([loadStudies(db), loadNotes(db)]);
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
    const [rows, links] = await Promise.all([
      db.query(
        `SELECT * FROM research_questions${studyId ? " WHERE study_id=?" : ""} ORDER BY updated_at DESC`,
        studyId ? [studyId] : [],
      ),
      db.query(
        `SELECT l.research_question_id,l.target_kind,l.target_id,l.target_json
         FROM research_question_links l${
           studyId
             ? " JOIN research_questions q ON q.id=l.research_question_id WHERE q.study_id=?"
             : ""
         }`,
        studyId ? [studyId] : [],
      ),
    ]);
    const linksByQuestion = groupBy(links, "research_question_id", researchLink);
    return rows.map((row) =>
      ResearchQuestionSchema.parse({
        id: text(row, "id"),
        question: text(row, "question"),
        status: text(row, "status"),
        ...(optionalText(row, "description")
          ? { description: optionalText(row, "description") }
          : {}),
        ...(optionalText(row, "study_id") ? { studyId: optionalText(row, "study_id") } : {}),
        links: linksByQuestion.get(text(row, "id")) ?? [],
        ...(optionalText(row, "provisional_conclusion")
          ? { provisionalConclusion: optionalText(row, "provisional_conclusion") }
          : {}),
        createdAt: text(row, "created_at"),
        updatedAt: text(row, "updated_at"),
      }),
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
      loadStudies(db),
      loadNotes(db),
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
