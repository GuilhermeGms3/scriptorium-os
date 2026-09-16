import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
  type SqlValue,
} from "@sqlite.org/sqlite-wasm";
import type {
  CorpusPackageManifest,
  CorpusSearchHit,
  CorpusSearchQuery,
  CorpusStorage,
  StoredToken,
  StoredTokenAnnotation,
  StoredTokenLocation,
  StoredLexicalEntry,
  StoredTextUnit,
} from "./contracts";
import type { CrosswalkRelation, PassageAddress, TextAnchor } from "../domain/text-identity";
import { CorruptDatabaseError, UnsupportedDatabaseVersionError } from "../domain/errors";
import { CrosswalkRelationSchema } from "../domain/text-identity";
import { toSafeFtsQuery } from "./search-normalization";

type SqlRow = Record<string, SqlValue>;

function stringValue(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new CorruptDatabaseError(`Expected text column ${key}.`);
  return value;
}

function optionalString(row: SqlRow, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" ? value : undefined;
}

function numberValue(row: SqlRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number") throw new CorruptDatabaseError(`Expected number column ${key}.`);
  return value;
}

function rows(database: Database, sql: string, bindings: SqlValue[] = []): SqlRow[] {
  const statement = database.prepare(sql);
  try {
    if (bindings.length) statement.bind(bindings);
    const result: SqlRow[] = [];
    while (statement.step()) result.push(statement.get({}));
    return result;
  } finally {
    statement.finalize();
  }
}

function rowToTextUnit(row: SqlRow): StoredTextUnit {
  const scheme =
    optionalString(row, "address_scheme_id") ?? optionalString(row, "versification_scheme_id");
  const bookId = optionalString(row, "book_id");
  const chapter = typeof row["chapter"] === "number" ? row["chapter"] : undefined;
  const verseStart = typeof row["verse_start"] === "number" ? row["verse_start"] : undefined;
  const verseEnd = typeof row["verse_end"] === "number" ? row["verse_end"] : undefined;
  const address =
    scheme && (bookId || optionalString(row, "section_label"))
      ? {
          workId: stringValue(row, "work_id"),
          versificationSchemeId: scheme,
          ...(bookId ? { bookId } : {}),
          ...(chapter !== undefined ? { chapter } : {}),
          ...(verseStart !== undefined ? { verseStart } : {}),
          ...(verseEnd !== undefined ? { verseEnd } : {}),
          ...(optionalString(row, "subverse_start")
            ? { subverseStart: optionalString(row, "subverse_start") }
            : {}),
          ...(optionalString(row, "subverse_end")
            ? { subverseEnd: optionalString(row, "subverse_end") }
            : {}),
          ...(optionalString(row, "section_label")
            ? { section: optionalString(row, "section_label") }
            : {}),
          ...(optionalString(row, "paragraph_label")
            ? { paragraph: optionalString(row, "paragraph_label") }
            : {}),
          ...(optionalString(row, "saying_label")
            ? { saying: optionalString(row, "saying_label") }
            : {}),
          ...(optionalString(row, "fragment_label")
            ? { fragment: optionalString(row, "fragment_label") }
            : {}),
          ...(optionalString(row, "page_label") ? { page: optionalString(row, "page_label") } : {}),
          ...(optionalString(row, "column_label")
            ? { column: optionalString(row, "column_label") }
            : {}),
          ...(typeof row["line_start"] === "number" ? { lineStart: row["line_start"] } : {}),
          ...(typeof row["line_end"] === "number" ? { lineEnd: row["line_end"] } : {}),
        }
      : undefined;
  const sourceScheme = optionalString(row, "versification_scheme_id");
  const displayAddress = optionalString(row, "display_address");
  return {
    id: stringValue(row, "id"),
    corpusId: stringValue(row, "corpus_id"),
    editionId: stringValue(row, "edition_id"),
    workId: stringValue(row, "work_id"),
    ...(sourceScheme ? { versificationSchemeId: sourceScheme } : {}),
    sequence: numberValue(row, "sequence"),
    unitType: stringValue(row, "unit_type") as StoredTextUnit["unitType"],
    ...(address ? { address } : {}),
    ...(displayAddress ? { displayAddress } : {}),
    text: stringValue(row, "surface_text"),
    language: stringValue(row, "language"),
    provenance: JSON.parse(stringValue(row, "provenance_json")) as StoredTextUnit["provenance"],
  };
}

function rowToToken(row: SqlRow): StoredToken {
  const lemmaId = optionalString(row, "lemma_id");
  const lemma = optionalString(row, "lemma_text");
  const morphology = optionalString(row, "morphology");
  const strongs = optionalString(row, "strongs");
  const transliteration = optionalString(row, "transliteration");
  const prefix = optionalString(row, "prefix_text");
  const suffix = optionalString(row, "suffix_text");
  const paragraphId = optionalString(row, "paragraph_id");
  return {
    id: stringValue(row, "id"),
    textUnitId: stringValue(row, "text_unit_id"),
    position: numberValue(row, "position"),
    surface: stringValue(row, "surface_form"),
    normalized: stringValue(row, "normalized_form"),
    language: stringValue(row, "language"),
    ...(lemmaId ? { lemmaId } : {}),
    ...(lemma ? { lemma } : {}),
    ...(morphology ? { morphology } : {}),
    ...(strongs ? { strongs } : {}),
    ...(transliteration ? { transliteration } : {}),
    ...(prefix ? { prefix } : {}),
    ...(suffix ? { suffix } : {}),
    ...(paragraphId ? { paragraphId } : {}),
    ...(typeof row["starts_paragraph"] === "number"
      ? { startsParagraph: row["starts_paragraph"] === 1 }
      : {}),
  };
}

const TEXT_UNIT_SELECT = `
  SELECT u.id,u.corpus_id,u.edition_id,u.work_id,u.versification_scheme_id,u.sequence,
         u.unit_type,u.surface_text,u.provenance_json,e.language,a.versification_scheme_id AS address_scheme_id,
         a.book_id,a.chapter,a.verse_start,a.verse_end,a.subverse_start,a.subverse_end,
         a.section_label,a.paragraph_label,a.saying_label,a.fragment_label,a.page_label,
         a.column_label,a.line_start,a.line_end,a.display_address
  FROM text_units u
  JOIN corpus_editions e ON e.id=u.edition_id
  LEFT JOIN text_addresses a ON a.text_unit_id=u.id`;

export class SQLiteCorpusStorage implements CorpusStorage {
  readonly #database: Database;
  readonly #manifest: CorpusPackageManifest;

  private constructor(database: Database, manifest: CorpusPackageManifest) {
    this.#database = database;
    this.#manifest = manifest;
    const version = rows(database, "SELECT MAX(version) AS version FROM schema_migrations")[0];
    if (!version || numberValue(version, "version") !== manifest.schemaVersion) {
      database.close();
      throw new UnsupportedDatabaseVersionError(
        `Package ${manifest.id} requires schema ${manifest.schemaVersion}.`,
      );
    }
    const quickCheck = rows(database, "PRAGMA quick_check")[0];
    if (!quickCheck || Object.values(quickCheck)[0] !== "ok") {
      database.close();
      throw new CorruptDatabaseError(`Package ${manifest.id} failed SQLite quick_check.`);
    }
  }

  static async open(
    manifest: CorpusPackageManifest,
    bytes: Uint8Array,
  ): Promise<SQLiteCorpusStorage> {
    const sqlite3: Sqlite3Static = await sqlite3InitModule();
    const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
    const database = new sqlite3.oo1.DB();
    const result = sqlite3.capi.sqlite3_deserialize(
      database.pointer!,
      "main",
      pointer,
      bytes.byteLength,
      bytes.byteLength,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_READONLY,
    );
    database.checkRc(result);
    database.exec("PRAGMA foreign_keys = ON; PRAGMA query_only = ON;");
    return new SQLiteCorpusStorage(database, manifest);
  }

  async getPackageManifest(): Promise<CorpusPackageManifest> {
    return this.#manifest;
  }

  async getWork(workId: string): Promise<{ id: string; title: string; sequence: number } | null> {
    const row = rows(this.#database, "SELECT id,title,sequence FROM works WHERE id=?", [workId])[0];
    return row
      ? {
          id: stringValue(row, "id"),
          title: stringValue(row, "title"),
          sequence: numberValue(row, "sequence"),
        }
      : null;
  }

  async getTextUnits(address: PassageAddress, editionId?: string): Promise<StoredTextUnit[]> {
    const bindings: SqlValue[] = [
      address.versificationSchemeId,
      address.workId,
      address.bookId ?? null,
      address.chapter ?? null,
      address.verseStart ?? null,
      address.verseEnd ?? address.verseStart ?? null,
    ];
    const editionClause = editionId ? " AND u.edition_id=?" : "";
    if (editionId) bindings.push(editionId);
    return rows(
      this.#database,
      `${TEXT_UNIT_SELECT}
       WHERE a.versification_scheme_id=? AND u.work_id=?
         AND (? IS NULL OR a.book_id=?)
         AND (? IS NULL OR a.chapter=?)
         AND (? IS NULL OR COALESCE(a.verse_end,a.verse_start) >= ?)
         AND (? IS NULL OR a.verse_start <= ?)
         ${editionClause}
       ORDER BY u.sequence`,
      [
        address.versificationSchemeId,
        address.workId,
        address.bookId ?? null,
        address.bookId ?? null,
        address.chapter ?? null,
        address.chapter ?? null,
        address.verseStart ?? null,
        address.verseStart ?? null,
        address.verseEnd ?? address.verseStart ?? null,
        address.verseEnd ?? address.verseStart ?? null,
        ...(editionId ? [editionId] : []),
      ],
    ).map(rowToTextUnit);
  }

  async getTextUnit(id: string): Promise<StoredTextUnit | null> {
    const result = rows(
      this.#database,
      `${TEXT_UNIT_SELECT} WHERE u.id=? ORDER BY (a.versification_scheme_id=u.versification_scheme_id) DESC LIMIT 1`,
      [id],
    )[0];
    return result ? rowToTextUnit(result) : null;
  }

  async getTokens(textUnitId: string): Promise<StoredToken[]> {
    return rows(
      this.#database,
      "SELECT id,text_unit_id,position,surface_form,normalized_form,language,lemma_id,lemma_text,morphology,strongs,transliteration,prefix_text,suffix_text,paragraph_id,starts_paragraph FROM tokens WHERE text_unit_id=? ORDER BY position",
      [textUnitId],
    ).map(rowToToken);
  }

  async getTokenAnnotations(textUnitId: string): Promise<StoredTokenAnnotation[]> {
    return rows(
      this.#database,
      `SELECT a.id,a.token_id,a.annotation_type,a.value,a.source_id,a.provenance_json
       FROM token_annotations a JOIN tokens t ON t.id=a.token_id
       WHERE t.text_unit_id=? ORDER BY t.position,a.annotation_type`,
      [textUnitId],
    ).map((row) => {
      const sourceId = optionalString(row, "source_id");
      return {
        id: stringValue(row, "id"),
        tokenId: stringValue(row, "token_id"),
        annotationType: stringValue(row, "annotation_type"),
        value: JSON.parse(stringValue(row, "value")) as unknown,
        ...(sourceId ? { sourceId } : {}),
        provenance: JSON.parse(stringValue(row, "provenance_json")) as unknown,
      };
    });
  }

  async findTokensByLemma(
    lemmaId: string,
    offset = 0,
    limit = 30,
  ): Promise<{ total: number; items: StoredTokenLocation[] }> {
    const totalRow = rows(this.#database, "SELECT count(*) total FROM tokens WHERE lemma_id=?", [
      lemmaId,
    ])[0];
    const tokenRows = rows(
      this.#database,
      "SELECT id,text_unit_id,position,surface_form,normalized_form,language,lemma_id,lemma_text,morphology,strongs,transliteration,prefix_text,suffix_text,paragraph_id,starts_paragraph FROM tokens WHERE lemma_id=? ORDER BY text_unit_id,position LIMIT ? OFFSET ?",
      [lemmaId, limit, offset],
    );
    const items: StoredTokenLocation[] = [];
    for (const tokenRow of tokenRows) {
      const token = rowToToken(tokenRow);
      const textUnit = await this.getTextUnit(token.textUnitId);
      if (!textUnit) throw new CorruptDatabaseError(`Token ${token.id} has no text unit.`);
      items.push({ token, textUnit });
    }
    return { total: totalRow ? numberValue(totalRow, "total") : 0, items };
  }

  async getLexicalEntriesByReference(system: string, value: string): Promise<StoredLexicalEntry[]> {
    const found = rows(
      this.#database,
      `SELECT l.id,l.language,l.lemma,l.transliteration,l.source_id,l.provenance_json,
              s.gloss,s.definition
       FROM lexical_references r
       JOIN lexemes l ON l.id=r.lexeme_id
       JOIN lexical_senses s ON s.lexeme_id=l.id
       WHERE r.reference_system=? AND r.reference_value=?
       ORDER BY l.id,s.ordinal`,
      [system, value],
    );
    return found.map((row) => {
      const transliteration = optionalString(row, "transliteration");
      const definition = optionalString(row, "definition");
      return {
        id: stringValue(row, "id"),
        language: stringValue(row, "language"),
        lemma: stringValue(row, "lemma"),
        ...(transliteration ? { transliteration } : {}),
        gloss: stringValue(row, "gloss"),
        ...(definition ? { definition } : {}),
        references: rows(
          this.#database,
          "SELECT reference_system,reference_value FROM lexical_references WHERE lexeme_id=? ORDER BY reference_system,reference_value",
          [stringValue(row, "id")],
        ).map((reference) => ({
          system: stringValue(reference, "reference_system"),
          value: stringValue(reference, "reference_value"),
        })),
        sourceId: stringValue(row, "source_id"),
        provenance: JSON.parse(stringValue(row, "provenance_json")) as unknown,
      };
    });
  }

  async resolveAddress(address: PassageAddress, editionId?: string): Promise<TextAnchor[]> {
    const units = await this.getTextUnits(address, editionId);
    return units.map((unit) => ({
      kind: "text-unit",
      corpusId: unit.corpusId,
      editionId: unit.editionId,
      workId: unit.workId,
      versificationSchemeId: address.versificationSchemeId,
      startUnitId: unit.id,
    }));
  }

  async getCrosswalk(anchor: TextAnchor, targetSchemeId: string): Promise<CrosswalkRelation[]> {
    const sourceKey = JSON.stringify(anchor);
    const found = rows(
      this.#database,
      `SELECT DISTINCT c.id,c.source_scheme_id,c.target_scheme_id,c.relation_type,c.confidence,c.source_id,c.notes
       FROM crosswalks c JOIN crosswalk_members m ON m.crosswalk_id=c.id
       WHERE m.anchor_json=? AND (c.source_scheme_id=? OR c.target_scheme_id=?)`,
      [sourceKey, targetSchemeId, targetSchemeId],
    );
    return found.map((row) => {
      const members = rows(
        this.#database,
        "SELECT side,anchor_json FROM crosswalk_members WHERE crosswalk_id=? ORDER BY side,ordinal",
        [stringValue(row, "id")],
      );
      return CrosswalkRelationSchema.parse({
        id: stringValue(row, "id"),
        sourceSchemeId: stringValue(row, "source_scheme_id"),
        targetSchemeId: stringValue(row, "target_scheme_id"),
        sourceAnchors: members
          .filter((member) => member["side"] === "source")
          .map((member) => JSON.parse(stringValue(member, "anchor_json"))),
        targetAnchors: members
          .filter((member) => member["side"] === "target")
          .map((member) => JSON.parse(stringValue(member, "anchor_json"))),
        relationType: stringValue(row, "relation_type"),
        ...(typeof row["confidence"] === "number" ? { confidence: row["confidence"] } : {}),
        ...(optionalString(row, "source_id") ? { sourceId: optionalString(row, "source_id") } : {}),
        ...(optionalString(row, "notes") ? { notes: optionalString(row, "notes") } : {}),
      });
    });
  }

  async search(query: CorpusSearchQuery): Promise<CorpusSearchHit[]> {
    const normalizedQuery = toSafeFtsQuery(query.lemma ?? query.morphology ?? query.text);
    const ftsQuery = query.lemma
      ? `lemma_text : (${normalizedQuery})`
      : query.morphology
        ? `morphology_text : (${normalizedQuery})`
        : normalizedQuery;
    if (!ftsQuery) return [];
    const filters: string[] = [];
    const bindings: SqlValue[] = [ftsQuery];
    if (query.editionIds?.length) {
      filters.push(`u.edition_id IN (${query.editionIds.map(() => "?").join(",")})`);
      bindings.push(...query.editionIds);
    }
    if (query.language) {
      filters.push("e.language=?");
      bindings.push(query.language);
    }
    bindings.push(Math.max(1, Math.min(query.limit ?? 30, 100)));
    const result = rows(
      this.#database,
      `SELECT u.id,u.corpus_id,u.edition_id,u.work_id,u.versification_scheme_id,u.sequence,
              u.unit_type,u.surface_text,u.provenance_json,e.language,a.versification_scheme_id AS address_scheme_id,
              a.book_id,a.chapter,a.verse_start,a.verse_end,a.subverse_start,a.subverse_end,
              a.section_label,a.paragraph_label,a.saying_label,a.fragment_label,a.page_label,
              a.column_label,a.line_start,a.line_end,a.display_address,
              bm25(text_units_fts,10.0,1.0,2.0,0.5,0.5) AS fts_rank,
              u.surface_text AS snippet
       FROM text_units_fts f
       JOIN search_documents d ON d.rowid=f.rowid
       JOIN text_units u ON u.id=d.text_unit_id
       JOIN corpus_editions e ON e.id=u.edition_id
       LEFT JOIN text_addresses a ON a.text_unit_id=u.id AND a.versification_scheme_id='scriptorium-bcv-1'
       WHERE text_units_fts MATCH ? ${filters.length ? `AND ${filters.join(" AND ")}` : ""}
       ORDER BY fts_rank LIMIT ?`,
      bindings,
    );
    return result.map((row) => ({
      textUnit: rowToTextUnit(row),
      rank: -numberValue(row, "fts_rank"),
      snippet: optionalString(row, "snippet") ?? stringValue(row, "surface_text"),
      matchKind: query.lemma ? "lemma" : query.morphology ? "morphology" : "full-text",
    }));
  }

  close(): void {
    this.#database.close();
  }
}
