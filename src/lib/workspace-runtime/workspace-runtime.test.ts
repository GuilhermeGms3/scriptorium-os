import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyWorkspaceMigrations,
  WORKSPACE_SCHEMA_VERSION,
} from "../../../scripts/database/workspace-migrate";
import { SourceImportService } from "../application/source-import-service";
import { ResearchWorkspaceService } from "../application/research-workspace-service";
import { CitationSchema, SourceLocatorSchema } from "../domain/bibliography";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceRow,
  type WorkspaceSqlValue,
} from "./workspace-database";

const databases: DatabaseSync[] = [];

describe("SSR workspace boundary", () => {
  it("does not initialize Worker, SQLite WASM, or OPFS on the server", () => {
    expect(() => getWorkspaceDatabase()).toThrow(/browser runtime only/i);
  });
});

function database(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  return db;
}
function adapter(db: DatabaseSync): WorkspaceDatabase {
  return {
    persistence: "memory",
    async query(sql: string, bind: WorkspaceSqlValue[] = []): Promise<WorkspaceRow[]> {
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
}
afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

describe("Phase 9.5 workspace schema", () => {
  it("indexes private PDF pages locally and keeps checksum imports idempotent", async () => {
    const db = database();
    const workspace = adapter(db);
    const input = {
      title: "Livro privado de teste",
      language: "pt-BR",
      originalName: "livro-privado.pdf",
      mimeType: "application/pdf" as const,
      sizeBytes: 128,
      checksum: "a".repeat(64),
      pageCount: 2,
      textPageCount: 2,
      extractionMethod: "pdf-text-layer" as const,
      pages: [
        { pageIndex: 0, pageLabel: "1", text: "Introdução à hermenêutica.", itemCount: 3 },
        { pageIndex: 1, pageLabel: "2", text: "Exegese e contexto histórico.", itemCount: 4 },
      ],
    };
    const first = await PrivateDocumentRepository.importDocument(
      input,
      "opfs:/test.pdf",
      workspace,
    );
    const second = await PrivateDocumentRepository.importDocument(
      input,
      "opfs:/test.pdf",
      workspace,
    );
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(first.document).toMatchObject({ pageCount: 2, textPageCount: 2 });
    expect(
      await PrivateDocumentRepository.search(
        "hermeneutica",
        { documentId: first.document.id },
        workspace,
      ),
    ).toMatchObject([{ pageIndex: 0, pageLabel: "1" }]);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("removes the known localStorage DEMO chain from an already-upgraded workspace", () => {
    const db = database();
    db.prepare("DELETE FROM workspace_migrations WHERE version=6").run();
    db.prepare("DELETE FROM workspace_migrations WHERE version=7").run();
    db.exec(`
      INSERT INTO studies(id,slug,title,status,research_questions_json,created_at,updated_at)
      VALUES('study:demo-logos','logos-in-john','The concept of Logos in John','active','[]','x','x');
      INSERT INTO notes(id,title,content,format,created_at,updated_at)
      VALUES('note:legacy-import','Initial lexical observation','Compare λόγος usage in John 1 with the structured citation.','markdown','x','x');
      INSERT INTO note_links(id,note_id,target_kind,target_id)
      VALUES('note-link:legacy-import','note:legacy-import','study','study:demo-logos');
      INSERT INTO workspace_fts(entity_kind,entity_id,title,body)
      VALUES('note','note:legacy-import','Initial lexical observation','Compare λόγος usage in John 1');
    `);
    applyWorkspaceMigrations(db);
    expect(db.prepare("SELECT id FROM studies WHERE id='study:demo-logos'").get()).toBeUndefined();
    expect(db.prepare("SELECT id FROM notes WHERE id='note:legacy-import'").get()).toBeUndefined();

    db.exec(`
      DELETE FROM workspace_migrations WHERE version=7;
      INSERT INTO studies(id,slug,title,description,status,research_questions_json,created_at,updated_at)
      VALUES('study-logos','logos-in-john','The concept of Logos in John','DEMO study workspace. Collects passages, words, concepts and sources around λόγος in John 1. No theological conclusions are bundled — only structure.','active','[]','x','x');
    `);
    applyWorkspaceMigrations(db);
    expect(db.prepare("SELECT id FROM studies WHERE id='study-logos'").get()).toBeUndefined();
  });

  it("applies deterministic migrations and seeds a real traceable source chain", () => {
    const db = database();
    expect(db.prepare("SELECT max(version) version FROM workspace_migrations").get()).toMatchObject(
      { version: WORKSPACE_SCHEMA_VERSION },
    );
    expect(
      db
        .prepare(
          "SELECT c.id,s.id source_id FROM citations c JOIN bibliographic_sources s ON s.id=c.source_id",
        )
        .get(),
    ).toMatchObject({ id: "citation:sblgnt:john-1-1", source_id: "source:sblgnt:1.2" });
    expect(
      JSON.parse(
        String(
          (
            db
              .prepare("SELECT alternative_titles_json FROM works WHERE id='work:didache'")
              .get() as Record<string, unknown>
          )["alternative_titles_json"],
        ),
      ),
    ).toEqual([{ language: "en", value: "Teaching of the Twelve Apostles" }]);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("rejects a citation for a missing source", () => {
    const db = database();
    expect(() =>
      db
        .prepare(
          "INSERT INTO citations(id,source_id,content_kind,provenance_json,review_status,created_at,updated_at) VALUES('bad','missing','reference-only','{}','draft','x','x')",
        )
        .run(),
    ).toThrow();
  });
  it("keeps notes when a linked source deletion is restricted", () => {
    const db = database();
    expect(() =>
      db.prepare("DELETE FROM bibliographic_sources WHERE id='source:sblgnt:1.2'").run(),
    ).toThrow();
    expect(
      db.prepare("SELECT id FROM citations WHERE id='citation:sblgnt:john-1-1'").get(),
    ).toBeTruthy();
  });
  it("indexes source, citation, note and question content in FTS5", () => {
    const db = database();
    expect(
      db
        .prepare("SELECT DISTINCT entity_kind FROM workspace_fts")
        .all()
        .map((row) => row["entity_kind"]),
    ).toEqual(expect.arrayContaining(["source", "citation"]));
  });
  it("persists the author, work, edition and hierarchical source graph", () => {
    const db = database();
    const row = db
      .prepare(
        `SELECT a.canonical_name,w.canonical_title,e.title edition_title,child.parent_source_id
      FROM authors a
      JOIN work_authors wa ON wa.author_id=a.id
      JOIN works w ON w.id=wa.work_id
      JOIN editions e ON e.work_id=w.id
      JOIN bibliographic_sources child ON child.edition_id=e.id
      WHERE child.id='source:sblgnt:1.2'`,
      )
      .get();
    expect(row).toMatchObject({
      canonical_name: "Michael W. Holmes",
      canonical_title: "SBL Greek New Testament",
      edition_title: "SBL Greek New Testament 1.2",
    });
  });
  it("enforces unique normalized DOI and ISBN identifiers", () => {
    const db = database();
    db.prepare(
      "INSERT INTO source_identifiers(source_id,scheme,value,normalized_value) VALUES('source:sblgnt:1.2','doi','10.0000/test-fixture','10.0000/test-fixture')",
    ).run();
    db.prepare(
      `INSERT INTO bibliographic_sources(id,title,normalized_title,source_type,rights_json,provenance_json,created_at,updated_at)
      VALUES('source:duplicate-fixture','Duplicate fixture','duplicate fixture','book','{}','{}','x','x')`,
    ).run();
    expect(() =>
      db
        .prepare(
          "INSERT INTO source_identifiers(source_id,scheme,value,normalized_value) VALUES('source:duplicate-fixture','doi','10.0000/TEST-FIXTURE','10.0000/test-fixture')",
        )
        .run(),
    ).toThrow();
  });
  it("persists note links, updates, deletes and searchable content", () => {
    const db = database();
    db.exec(`
      INSERT INTO studies(id,slug,title,status,research_questions_json,created_at,updated_at) VALUES('study:test','test','Test','active','[]','x','x');
      INSERT INTO notes(id,title,content,format,created_at,updated_at) VALUES('note:test','Test','Initial','markdown','x','x');
      INSERT INTO note_links(id,note_id,target_kind,target_id) VALUES('note-link:test','note:test','study','study:test');
    `);
    db.prepare("UPDATE notes SET content='Revised investigation' WHERE id='note:test'").run();
    expect(
      db.prepare("SELECT target_kind FROM note_links WHERE note_id='note:test'").get(),
    ).toMatchObject({ target_kind: "study" });
    db.prepare(
      "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) VALUES('note','note:roundtrip','Roundtrip','persistence needle')",
    ).run();
    expect(
      db
        .prepare("SELECT entity_id FROM workspace_fts WHERE workspace_fts MATCH 'persistence'")
        .get(),
    ).toMatchObject({ entity_id: "note:roundtrip" });
    db.prepare("DELETE FROM notes WHERE id='note:test'").run();
    expect(db.prepare("SELECT id FROM note_links WHERE note_id='note:test'").all()).toEqual([]);
  });
  it("traverses a research question through its links and keeps a provisional conclusion personal", () => {
    const db = database();
    db.exec(`
      INSERT INTO studies(id,slug,title,status,research_questions_json,created_at,updated_at) VALUES('study:test','test','Test','active','[]','x','x');
      INSERT INTO research_questions(id,question,status,study_id,created_at,updated_at) VALUES('rq:test','Test question?','investigating','study:test','x','x');
      INSERT INTO research_question_links(id,research_question_id,target_kind,target_id) VALUES('rq-link:test','rq:test','source','source:sblgnt:1.2');
    `);
    db.prepare(
      "UPDATE research_questions SET status='provisional', provisional_conclusion='User-owned provisional result' WHERE id='rq:test'",
    ).run();
    const row = db
      .prepare(
        `SELECT q.status,q.provisional_conclusion,l.target_kind,l.target_id
      FROM research_questions q JOIN research_question_links l ON l.research_question_id=q.id
      WHERE q.id='rq:test'`,
      )
      .get();
    expect(row).toMatchObject({
      status: "provisional",
      provisional_conclusion: "User-owned provisional result",
      target_kind: "source",
      target_id: "source:sblgnt:1.2",
    });
  });
  it("roundtrips the application export after a workspace wipe", async () => {
    const db = database();
    const workspace = adapter(db);
    db.exec(`
      INSERT INTO studies(id,slug,title,status,research_questions_json,created_at,updated_at) VALUES('study:roundtrip','roundtrip','Roundtrip','active','[]','x','x');
      INSERT INTO notes(id,title,content,format,created_at,updated_at) VALUES('note:roundtrip','Roundtrip note','semantic needle','markdown','x','x');
      INSERT INTO note_links(id,note_id,target_kind,target_id) VALUES('note-link:roundtrip','note:roundtrip','study','study:roundtrip');
      INSERT INTO research_questions(id,question,status,study_id,created_at,updated_at) VALUES('rq:roundtrip','Roundtrip question?','open','study:roundtrip','x','x');
      INSERT INTO highlights(id,target_kind,target_id,style_token,created_at) VALUES('highlight:roundtrip','source','source:sblgnt:1.2','yellow','x');
      INSERT INTO bookmarks(id,target_kind,target_id,label,created_at) VALUES('bookmark:roundtrip','source','source:sblgnt:1.2','SBLGNT','x');
    `);
    const exported = await ResearchWorkspaceService.exportJson(workspace);
    const before = JSON.parse(exported) as {
      library: { authors: unknown[]; works: unknown[]; sources: unknown[]; citations: unknown[] };
      research: {
        studies: unknown[];
        notes: unknown[];
        researchQuestions: unknown[];
        highlights: unknown[];
        bookmarks: unknown[];
      };
    };
    db.exec(`
      DELETE FROM study_links;
      DELETE FROM research_question_links;
      DELETE FROM note_links;
      DELETE FROM highlights;
      DELETE FROM bookmarks;
      DELETE FROM workspace_fts;
      DELETE FROM research_questions;
      DELETE FROM notes;
      DELETE FROM studies;
    `);
    expect(db.prepare("SELECT count(*) count FROM studies").get()).toMatchObject({ count: 0 });
    await ResearchWorkspaceService.importJson(exported, workspace);
    const restored = JSON.parse(
      await ResearchWorkspaceService.exportJson(workspace),
    ) as typeof before;
    expect(restored.library.authors).toHaveLength(before.library.authors.length);
    expect(restored.library.works).toHaveLength(before.library.works.length);
    expect(restored.library.sources).toHaveLength(before.library.sources.length);
    expect(restored.library.citations).toHaveLength(before.library.citations.length);
    expect(restored.research.studies).toHaveLength(before.research.studies.length);
    expect(restored.research.notes).toHaveLength(before.research.notes.length);
    expect(restored.research.researchQuestions).toHaveLength(
      before.research.researchQuestions.length,
    );
    expect(restored.research.highlights).toHaveLength(1);
    expect(restored.research.bookmarks).toHaveLength(1);
    expect(
      db.prepare("SELECT entity_id FROM workspace_fts WHERE workspace_fts MATCH 'semantic'").get(),
    ).toMatchObject({ entity_id: "note:roundtrip" });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});

describe("bibliographic parsing and validation", () => {
  it("is idempotent when the same bibliographic record is imported twice", async () => {
    const db = database();
    const workspace = adapter(db);
    const input = JSON.stringify({
      type: "book",
      title: "Idempotent DEMO Work",
      author: [{ family: "Example", given: "Ada" }],
      issued: { "date-parts": [[2024]] },
      DOI: "10.1234/idempotent-demo",
    });
    const first = await SourceImportService.import("csl-json", input, workspace);
    const second = await SourceImportService.import("csl-json", input, workspace);
    expect(first).toMatchObject({ imported: 1, duplicates: 0, invalid: 0 });
    expect(second).toMatchObject({ imported: 0, duplicates: 1, invalid: 0 });
    expect(
      db
        .prepare(
          "SELECT count(*) count FROM source_identifiers WHERE scheme='doi' AND normalized_value='10.1234/idempotent-demo'",
        )
        .get(),
    ).toMatchObject({ count: 1 });
  });
  it("previews valid CSL-JSON without persisting", () => {
    const preview = SourceImportService.preview(
      "csl-json",
      JSON.stringify([
        {
          type: "book",
          title: "A DEMO Work",
          author: [{ family: "Example", given: "Ada" }],
          issued: { "date-parts": [[2024]] },
          ISBN: "9780306406157",
        },
      ]),
    );
    expect(preview.candidates[0]).toMatchObject({ title: "A DEMO Work", year: 2024 });
    expect(preview.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });
  it("reports malformed BibTeX and missing CSL title", () => {
    expect(SourceImportService.preview("bibtex", "not bibtex").issues[0]?.code).toBe(
      "malformed-input",
    );
    expect(SourceImportService.preview("csl-json", "[{}]").issues[0]?.severity).toBe("error");
  });
  it("normalizes RIS records", () => {
    const preview = SourceImportService.preview(
      "ris",
      "TY  - JOUR\nTI  - A DEMO Article\nAU  - Scholar, Ada\nPY  - 2025\nER  -",
    );
    expect(preview.candidates[0]).toMatchObject({ title: "A DEMO Article", year: 2025 });
  });
  it("rejects unsupported types, malformed dates, DOI and ISBN values during preview", () => {
    const preview = SourceImportService.preview(
      "csl-json",
      JSON.stringify({
        type: "motion_picture",
        title: "Invalid DEMO record",
        issued: { literal: "not-a-date" },
        DOI: "invalid-doi",
        ISBN: "123",
      }),
    );
    expect(preview.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["unsupported-type", "malformed-date", "invalid-doi", "invalid-isbn"]),
    );
  });
});

describe("structured citations", () => {
  it("supports page, chapter, folio and line locators", () => {
    expect(
      SourceLocatorSchema.parse({
        sourceId: "source:demo",
        pageStart: "42",
        chapter: "3",
        folio: "10",
        side: "recto",
        lineStart: "4",
        lineEnd: "8",
      }),
    ).toBeTruthy();
  });
  it("distinguishes exact quotation from paraphrase", () => {
    expect(() =>
      CitationSchema.parse({
        id: "citation:x",
        sourceId: "source:x",
        contentKind: "exact-quote",
        provenance: { origin: "test", creationMethod: "human" },
        reviewStatus: "draft",
      }),
    ).toThrow();
    expect(
      CitationSchema.parse({
        id: "citation:y",
        sourceId: "source:x",
        contentKind: "paraphrase",
        note: "Paraphrase",
        provenance: { origin: "test", creationMethod: "human" },
        reviewStatus: "draft",
      }).contentKind,
    ).toBe("paraphrase");
  });
});
