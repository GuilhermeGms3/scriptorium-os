import {
  AuthorSchema,
  BibliographicSourceSchema,
  CitationSchema,
  EditionSchema,
  WorkSchema,
  type Author,
  type BibliographicEdition,
  type BibliographicSource,
  type Citation,
  type BibliographicWork,
} from "../domain/bibliography";
import { SourceNotFoundError } from "../domain/errors";
import { getWorkspaceDatabase, type WorkspaceRow } from "../workspace-runtime/workspace-database";

function text(row: WorkspaceRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Invalid workspace text column ${key}.`);
  return value;
}
function optionalText(row: WorkspaceRow, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" ? value : undefined;
}
function json<T>(row: WorkspaceRow, key: string, fallback: T): T {
  const value = row[key];
  return typeof value === "string" ? (JSON.parse(value) as T) : fallback;
}

async function authorIds(sourceId: string): Promise<string[]> {
  const db = await getWorkspaceDatabase();
  return (
    await db.query("SELECT author_id FROM source_authors WHERE source_id=? ORDER BY ordinal", [
      sourceId,
    ])
  ).map((row) => text(row, "author_id"));
}
async function identifiers(
  table: "source_identifiers" | "edition_identifiers",
  ownerColumn: "source_id" | "edition_id",
  id: string,
): Promise<Record<string, string>> {
  const db = await getWorkspaceDatabase();
  return Object.fromEntries(
    (await db.query(`SELECT scheme,value FROM ${table} WHERE ${ownerColumn}=?`, [id])).map(
      (row) => [text(row, "scheme"), text(row, "value")],
    ),
  );
}
async function mapSource(row: WorkspaceRow): Promise<BibliographicSource> {
  return BibliographicSourceSchema.parse({
    id: text(row, "id"),
    ...(optionalText(row, "work_id") ? { workId: optionalText(row, "work_id") } : {}),
    ...(optionalText(row, "edition_id") ? { editionId: optionalText(row, "edition_id") } : {}),
    ...(optionalText(row, "parent_source_id")
      ? { parentSourceId: optionalText(row, "parent_source_id") }
      : {}),
    title: text(row, "title"),
    sourceType: text(row, "source_type"),
    ...(optionalText(row, "language") ? { language: optionalText(row, "language") } : {}),
    authorIds: await authorIds(text(row, "id")),
    identifiers: await identifiers("source_identifiers", "source_id", text(row, "id")),
    ...(typeof row["publication_year"] === "number"
      ? { publicationYear: row["publication_year"] }
      : {}),
    ...(optionalText(row, "publisher") ? { publisher: optionalText(row, "publisher") } : {}),
    ...(optionalText(row, "abstract") ? { abstract: optionalText(row, "abstract") } : {}),
    rights: json(row, "rights_json", {}),
    provenance: json(row, "provenance_json", {}),
  });
}
async function mapAuthor(row: WorkspaceRow): Promise<Author> {
  const db = await getWorkspaceDatabase();
  const id = text(row, "id");
  const aliases = (
    await db.query("SELECT language,value FROM author_aliases WHERE author_id=?", [id])
  ).map((item) => ({ language: text(item, "language"), value: text(item, "value") }));
  const authorIdentifiers = Object.fromEntries(
    (await db.query("SELECT scheme,value FROM author_identifiers WHERE author_id=?", [id])).map(
      (item) => [text(item, "scheme"), text(item, "value")],
    ),
  );
  return AuthorSchema.parse({
    id,
    canonicalName: text(row, "canonical_name"),
    type: text(row, "author_type"),
    aliases,
    identifiers: authorIdentifiers,
    traditionIds: json(row, "tradition_ids_json", []),
    ...(optionalText(row, "birth_json") ? { birth: json(row, "birth_json", undefined) } : {}),
    ...(optionalText(row, "death_json") ? { death: json(row, "death_json", undefined) } : {}),
    ...(optionalText(row, "notes") ? { notes: optionalText(row, "notes") } : {}),
  });
}

function mapCitation(row: WorkspaceRow): Citation {
  return CitationSchema.parse({
    id: text(row, "id"),
    sourceId: text(row, "source_id"),
    contentKind: text(row, "content_kind"),
    ...(optionalText(row, "locator_json") ? { locator: json(row, "locator_json", undefined) } : {}),
    ...(optionalText(row, "original_text")
      ? { originalText: optionalText(row, "original_text") }
      : {}),
    ...(optionalText(row, "original_language")
      ? { originalLanguage: optionalText(row, "original_language") }
      : {}),
    ...(optionalText(row, "translated_text")
      ? { translatedText: optionalText(row, "translated_text") }
      : {}),
    ...(optionalText(row, "translator") ? { translator: optionalText(row, "translator") } : {}),
    ...(optionalText(row, "note") ? { note: optionalText(row, "note") } : {}),
    provenance: json(row, "provenance_json", {}),
    reviewStatus: text(row, "review_status"),
  });
}
export interface LibraryFilters {
  query?: string;
  authorId?: string;
  language?: string;
  sourceType?: string;
  collectionId?: string;
  hasCitations?: boolean;
  hasLocalFile?: boolean;
}
export interface SourceDetails {
  source: BibliographicSource;
  authors: Author[];
  work: BibliographicWork | null;
  edition: BibliographicEdition | null;
  citations: Citation[];
  relatedClaimIds: string[];
}
export type CatalogSearchHit =
  | { kind: "author"; id: string; label: string; detail?: string }
  | { kind: "work"; id: string; label: string; detail?: string };

export const LibraryRepository = {
  async listSources(filters: LibraryFilters = {}): Promise<BibliographicSource[]> {
    const db = await getWorkspaceDatabase();
    const clauses: string[] = [];
    const bind: (string | number | null)[] = [];
    if (filters.query?.trim()) {
      const normalized = filters.query.trim().toLocaleLowerCase();
      clauses.push("s.normalized_title LIKE ?");
      bind.push(`%${normalized}%`);
    }
    if (filters.authorId) {
      clauses.push(
        "EXISTS(SELECT 1 FROM source_authors sa WHERE sa.source_id=s.id AND sa.author_id=?)",
      );
      bind.push(filters.authorId);
    }
    if (filters.language) {
      clauses.push("s.language=?");
      bind.push(filters.language);
    }
    if (filters.sourceType) {
      clauses.push("s.source_type=?");
      bind.push(filters.sourceType);
    }
    if (filters.collectionId) {
      clauses.push(
        "EXISTS(SELECT 1 FROM library_collection_items li WHERE li.source_id=s.id AND li.collection_id=?)",
      );
      bind.push(filters.collectionId);
    }
    if (filters.hasCitations)
      clauses.push("EXISTS(SELECT 1 FROM citations c WHERE c.source_id=s.id)");
    if (filters.hasLocalFile)
      clauses.push("EXISTS(SELECT 1 FROM source_assets a WHERE a.source_id=s.id)");
    const result = await db.query(
      `SELECT s.* FROM bibliographic_sources s ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY s.title COLLATE NOCASE`,
      bind,
    );
    return Promise.all(result.map(mapSource));
  },
  async getSource(id: string): Promise<BibliographicSource | null> {
    const db = await getWorkspaceDatabase();
    const row = (await db.query("SELECT * FROM bibliographic_sources WHERE id=?", [id]))[0];
    return row ? mapSource(row) : null;
  },
  async searchCatalog(query: string, limit = 10): Promise<CatalogSearchHit[]> {
    const db = await getWorkspaceDatabase();
    const pattern = `%${query.trim().toLocaleLowerCase()}%`;
    const [authors, works] = await Promise.all([
      db.query(
        "SELECT id,canonical_name,author_type FROM authors WHERE lower(canonical_name) LIKE ? ORDER BY canonical_name LIMIT ?",
        [pattern, limit],
      ),
      db.query(
        "SELECT id,canonical_title,work_type FROM works WHERE lower(canonical_title) LIKE ? ORDER BY canonical_title LIMIT ?",
        [pattern, limit],
      ),
    ]);
    return [
      ...authors.map((row): CatalogSearchHit => ({
        kind: "author",
        id: text(row, "id"),
        label: text(row, "canonical_name"),
        detail: text(row, "author_type"),
      })),
      ...works.map((row): CatalogSearchHit => ({
        kind: "work",
        id: text(row, "id"),
        label: text(row, "canonical_title"),
        detail: text(row, "work_type"),
      })),
    ];
  },
  async getSourceDetails(id: string): Promise<SourceDetails> {
    const db = await getWorkspaceDatabase();
    const source = await this.getSource(id);
    if (!source) throw new SourceNotFoundError(`Source ${id} was not found.`);
    const authors = await Promise.all(
      (
        await db.query(
          "SELECT a.* FROM authors a JOIN source_authors sa ON sa.author_id=a.id WHERE sa.source_id=? ORDER BY sa.ordinal",
          [id],
        )
      ).map(mapAuthor),
    );
    const workRow = source.workId
      ? (await db.query("SELECT * FROM works WHERE id=?", [source.workId]))[0]
      : undefined;
    const editionRow = source.editionId
      ? (await db.query("SELECT * FROM editions WHERE id=?", [source.editionId]))[0]
      : undefined;
    const citations = (
      await db.query("SELECT * FROM citations WHERE source_id=? ORDER BY created_at DESC", [id])
    ).map(mapCitation);
    const relatedClaimIds = (
      await db.query(
        "SELECT DISTINCT target_id FROM citation_relations cr JOIN citations c ON c.id=cr.citation_id WHERE c.source_id=? AND cr.target_kind='claim' AND target_id IS NOT NULL",
        [id],
      )
    ).map((row) => text(row, "target_id"));
    const work = workRow
      ? WorkSchema.parse({
          id: text(workRow, "id"),
          canonicalTitle: text(workRow, "canonical_title"),
          alternativeTitles: json(workRow, "alternative_titles_json", []),
          authorIds: source.authorIds,
          ...(optionalText(workRow, "language_original")
            ? { languageOriginal: optionalText(workRow, "language_original") }
            : {}),
          workType: text(workRow, "work_type"),
          ...(optionalText(workRow, "composition_date_json")
            ? { compositionDate: json(workRow, "composition_date_json", undefined) }
            : {}),
          ...(optionalText(workRow, "description")
            ? { description: optionalText(workRow, "description") }
            : {}),
        })
      : null;
    const edition = editionRow
      ? EditionSchema.parse({
          id: text(editionRow, "id"),
          workId: text(editionRow, "work_id"),
          title: text(editionRow, "title"),
          language: text(editionRow, "language"),
          ...(optionalText(editionRow, "publisher")
            ? { publisher: optionalText(editionRow, "publisher") }
            : {}),
          ...(optionalText(editionRow, "publication_date_json")
            ? { publicationDate: json(editionRow, "publication_date_json", undefined) }
            : {}),
          ...(optionalText(editionRow, "edition_statement")
            ? { editionStatement: optionalText(editionRow, "edition_statement") }
            : {}),
          editorIds: [],
          translatorIds: [],
          identifiers: await identifiers(
            "edition_identifiers",
            "edition_id",
            text(editionRow, "id"),
          ),
          ...(optionalText(editionRow, "url") ? { url: optionalText(editionRow, "url") } : {}),
        })
      : null;
    return { source, authors, work, edition, citations, relatedClaimIds };
  },
  async listCollections(): Promise<
    { id: string; name: string; description?: string; itemCount: number }[]
  > {
    const db = await getWorkspaceDatabase();
    return (
      await db.query(
        "SELECT c.id,c.name,c.description,count(i.source_id) item_count FROM library_collections c LEFT JOIN library_collection_items i ON i.collection_id=c.id GROUP BY c.id ORDER BY c.name",
      )
    ).map((row) => {
      const description = optionalText(row, "description");
      return {
        id: text(row, "id"),
        name: text(row, "name"),
        ...(description ? { description } : {}),
        itemCount: Number(row["item_count"] ?? 0),
      };
    });
  },
  async createCollection(name: string, description?: string): Promise<string> {
    const normalized = name.trim();
    if (!normalized) throw new Error("Collection name is required.");
    const db = await getWorkspaceDatabase();
    const id = `collection:${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await db.execute(
      "INSERT INTO library_collections(id,name,description,created_at,updated_at) VALUES(?,?,?,?,?)",
      [id, normalized, description?.trim() || null, now, now],
    );
    return id;
  },
  async addSourceToCollection(sourceId: string, collectionId: string): Promise<void> {
    const db = await getWorkspaceDatabase();
    await db.execute(
      "INSERT OR IGNORE INTO library_collection_items(collection_id,source_id,added_at) VALUES(?,?,?)",
      [collectionId, sourceId, new Date().toISOString()],
    );
  },
  async listCitationsForClaims(claimIds: string[]): Promise<Citation[]> {
    if (!claimIds.length) return [];
    const db = await getWorkspaceDatabase();
    const placeholders = claimIds.map(() => "?").join(",");
    const rows = await db.query(
      `SELECT DISTINCT c.* FROM citations c JOIN citation_relations r ON r.citation_id=c.id WHERE r.target_kind='claim' AND r.target_id IN (${placeholders}) ORDER BY c.created_at DESC`,
      claimIds,
    );
    return rows.map(mapCitation);
  },
};
