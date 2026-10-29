import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import type {
  WorkspaceDatabase,
  WorkspaceRow,
  WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";
import { PrivateDocumentRepository } from "./private-document-repository";
import { StudyRepository } from "./study-repository";
import { LibraryRepository } from "./library-repository";

const databases: DatabaseSync[] = [];
const NOW = "2026-10-16T00:00:00.000Z";

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

/** An in-memory workspace that counts the queries it answers. */
function workspace() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  const counter = { queries: 0 };
  const adapter: WorkspaceDatabase = {
    persistence: "memory",
    async query(sql: string, bind: WorkspaceSqlValue[] = []): Promise<WorkspaceRow[]> {
      counter.queries += 1;
      return db.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql: string, bind: WorkspaceSqlValue[] = []): Promise<void> {
      db.prepare(sql).run(...bind);
    },
    async transaction(statements): Promise<void> {
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const statement of statements)
          db.prepare(statement.sql).run(...(statement.bind ?? []));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async reset(): Promise<void> {},
  };
  return { db, adapter, counter };
}

describe("studies, notes and questions read in a fixed number of queries", () => {
  it("keeps each study's items, each note's links and each question's links with their owner", async () => {
    const { db, adapter, counter } = workspace();
    for (const study of ["a", "b", "c"]) {
      db.prepare("INSERT INTO studies(id,slug,title,created_at,updated_at) VALUES(?,?,?,?,?)").run(
        `study:${study}`,
        study,
        `Estudo ${study}`,
        NOW,
        NOW,
      );
      for (const item of [1, 2])
        db.prepare(
          "INSERT INTO study_links(id,study_id,target_kind,target_id,label,added_at) VALUES(?,?,'passage',?,?,?)",
        ).run(`${study}:${item}`, `study:${study}`, `john.3.${item}`, `João 3:${item}`, NOW);
      db.prepare(
        "INSERT INTO notes(id,title,content,format,created_at,updated_at) VALUES(?,?,?,'plain',?,?)",
      ).run(`note:${study}`, `Nota ${study}`, "Texto", NOW, NOW);
      db.prepare(
        "INSERT INTO note_links(id,note_id,target_kind,target_id) VALUES(?,?,'study',?)",
      ).run(`link:${study}`, `note:${study}`, `study:${study}`);
      db.prepare(
        "INSERT INTO research_questions(id,question,status,study_id,created_at,updated_at) VALUES(?,?,'open',?,?,?)",
      ).run(`question:${study}`, `Pergunta ${study}?`, `study:${study}`, NOW, NOW);
      db.prepare(
        "INSERT INTO research_question_links(id,research_question_id,target_kind,target_id) VALUES(?,?,'source',?)",
      ).run(`qlink:${study}`, `question:${study}`, `source:${study}`);
    }

    counter.queries = 0;
    const exported = await StudyRepository.exportWorkspace(adapter);
    expect(counter.queries).toBe(6);
    expect(exported.studies.map((study) => [study.id, study.items.map((item) => item.id)])).toEqual(
      expect.arrayContaining([
        ["study:a", ["a:1", "a:2"]],
        ["study:b", ["b:1", "b:2"]],
        ["study:c", ["c:1", "c:2"]],
      ]),
    );
    expect(exported.notes.find((note) => note.id === "note:b")?.links).toEqual([
      { kind: "study", target: "study:b", label: "study:b" },
    ]);

    const questions = await StudyRepository.listResearchQuestions("study:b", adapter);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      id: "question:b",
      links: [{ targetKind: "source", targetId: "source:b" }],
    });
  });
});

describe("the library catalog", () => {
  it("lists every source with its own authors, in order, and identifiers in three queries", async () => {
    const { db, adapter, counter } = workspace();
    const expected = db
      .prepare("SELECT id FROM bibliographic_sources ORDER BY title COLLATE NOCASE")
      .all()
      .map((row) => {
        const id = String(row["id"]);
        return {
          id,
          authorIds: db
            .prepare("SELECT author_id FROM source_authors WHERE source_id=? ORDER BY ordinal")
            .all(id)
            .map((author) => String(author["author_id"])),
          identifiers: Object.fromEntries(
            db
              .prepare("SELECT scheme,value FROM source_identifiers WHERE source_id=?")
              .all(id)
              .map((identifier) => [String(identifier["scheme"]), String(identifier["value"])]),
          ),
        };
      });
    expect(expected.length).toBeGreaterThan(1);
    expect(expected.some((source) => source.authorIds.length > 0)).toBe(true);

    counter.queries = 0;
    const sources = await LibraryRepository.listSources({}, adapter);
    expect(counter.queries).toBe(3);
    expect(
      sources.map(({ id, authorIds, identifiers }) => ({ id, authorIds, identifiers })),
    ).toEqual(expected);
  });

  it("returns the most recently changed sources when asked for the recent ones", async () => {
    const { db, adapter } = workspace();
    const [oldest, newest] = db
      .prepare("SELECT id FROM bibliographic_sources ORDER BY title LIMIT 2")
      .all()
      .map((row) => String(row["id"]));
    db.prepare("UPDATE bibliographic_sources SET updated_at='2000-01-01T00:00:00.000Z'").run();
    db.prepare("UPDATE bibliographic_sources SET updated_at=? WHERE id=?").run(NOW, newest!);
    db.prepare(
      "UPDATE bibliographic_sources SET updated_at='2010-01-01T00:00:00.000Z' WHERE id=?",
    ).run(oldest!);
    const recent = await LibraryRepository.listSources({ orderBy: "recent", limit: 2 }, adapter);
    expect(recent.map((source) => source.id)).toEqual([newest, oldest]);
  });
});

describe("reading a private book page", () => {
  it("returns the page without the pdf.js layout kept in its quality record", async () => {
    const { adapter } = workspace();
    const { document } = await PrivateDocumentRepository.importDocument(
      {
        title: "Livro",
        language: "pt-BR",
        originalName: "livro.pdf",
        mimeType: "application/pdf",
        sizeBytes: 512,
        checksum: "d".repeat(64),
        pageCount: 1,
        textPageCount: 1,
        extractionMethod: "pdf-text-layer",
        pages: [
          {
            pageIndex: 0,
            pageLabel: "1",
            text: "No princípio era o Verbo.",
            itemCount: 2,
            layout: [
              { text: "No princípio", width: 80, height: 12, transform: [1, 0, 0, 1, 72, 700] },
            ],
          },
        ],
      },
      "opfs:/livro.pdf",
      adapter,
    );
    const page = await PrivateDocumentRepository.getPage(document.id, 0, adapter);
    expect(page).toMatchObject({
      text: "No princípio era o Verbo.",
      quality: { hasText: true, itemCount: 2 },
    });
    expect(JSON.stringify(page)).not.toContain("layout");
    expect(await PrivateDocumentRepository.listPages(document.id, {}, adapter)).toEqual([page]);
  });
});
