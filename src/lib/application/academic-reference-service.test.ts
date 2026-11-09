import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import { AcademicReferenceService, academicCsl } from "./academic-reference-service";
import { parseAcademicPage } from "./academic-search-service";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/workspace-database";

const databases: DatabaseSync[] = [];
function setup() {
  const native = new DatabaseSync(":memory:");
  databases.push(native);
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
  return { native, db };
}
afterEach(() => {
  while (databases.length) databases.pop()?.close();
});
const item = () =>
  parseAcademicPage(
    {
      meta: { count: 1 },
      results: [
        {
          id: "https://openalex.org/W123456789",
          display_name: "DEMO — estudo de referência",
          type: "book",
          language: "pt",
          publication_year: 2020,
          doi: "https://doi.org/10.1234/demo",
          authorships: [{ author: { display_name: "Autor DEMO" }, institutions: [] }],
          open_access: { is_oa: true, oa_url: "https://example.org/book.pdf" },
        },
      ],
    },
    1,
  ).items[0]!;
describe("guardar referência acadêmica no Source Engine", () => {
  it("reuses canonical CSL import, indexes metadata, never installs private text or changes content rights", async () => {
    const { native, db } = setup();
    const result = await AcademicReferenceService.save(item(), db);
    expect(result.existing).toBe(false);
    const rows = await db.query("SELECT * FROM bibliographic_sources WHERE id=?", [
      result.sourceId,
    ]);
    expect(rows[0]?.["title"]).toBe(item().title);
    expect(String(rows[0]?.["rights_json"])).toContain('"contentRedistributable":false');
    expect(await db.query("SELECT * FROM private_documents")).toEqual([]);
    expect(await db.query("SELECT * FROM notes")).toEqual([]);
    expect(
      await db.query("SELECT * FROM workspace_fts WHERE workspace_fts MATCH ?", ['"referência"']),
    ).toHaveLength(1);
    expect(native.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("is idempotent and resolves the existing source by DOI/OpenAlex identifier", async () => {
    const { db } = setup();
    const first = await AcademicReferenceService.save(item(), db);
    const second = await AcademicReferenceService.save(item(), db);
    expect(second).toEqual({ sourceId: first.sourceId, existing: true });
    expect(
      await db.query("SELECT * FROM bibliographic_sources WHERE id=?", [first.sourceId]),
    ).toHaveLength(1);
    expect(
      await db.query("SELECT * FROM source_identifiers WHERE scheme='url' AND normalized_value=?", [
        item().url,
      ]),
    ).toHaveLength(1);
    const csl = JSON.parse(academicCsl(item())) as { type: string; URL: string; DOI: string }[];
    expect(csl[0]).toMatchObject({ type: "book", URL: item().url, DOI: item().doi });
  });
});
