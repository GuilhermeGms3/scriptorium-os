import {
  ExtractedPrivateDocumentSchema,
  PrivateDocumentPageSchema,
  PrivateDocumentSchema,
  type ExtractedPrivateDocument,
  type PrivateDocument,
  type PrivateDocumentPage,
  type PrivateDocumentSearchHit,
} from "../domain/private-document";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceRow,
} from "../workspace-runtime/workspace-database";

function text(row: WorkspaceRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Invalid workspace text column ${key}.`);
  return value;
}

function number(row: WorkspaceRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number") throw new Error(`Invalid workspace number column ${key}.`);
  return value;
}

function optionalText(row: WorkspaceRow, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" ? value : undefined;
}

function mapDocument(row: WorkspaceRow): PrivateDocument {
  return PrivateDocumentSchema.parse({
    id: text(row, "id"),
    sourceId: text(row, "source_id"),
    assetId: text(row, "asset_id"),
    title: text(row, "title"),
    ...(optionalText(row, "language") ? { language: optionalText(row, "language") } : {}),
    pageCount: number(row, "page_count"),
    textPageCount: number(row, "text_page_count"),
    sizeBytes: number(row, "size_bytes"),
    checksum: text(row, "checksum"),
    extractionMethod: text(row, "extraction_method"),
    importedAt: text(row, "imported_at"),
  });
}

function mapPage(row: WorkspaceRow): PrivateDocumentPage {
  return PrivateDocumentPageSchema.parse({
    id: text(row, "id"),
    documentId: text(row, "document_id"),
    pageIndex: number(row, "page_index"),
    pageLabel: text(row, "page_label"),
    text: text(row, "text"),
    characterCount: number(row, "character_count"),
    extractionMethod: text(row, "extraction_method"),
    quality: JSON.parse(text(row, "quality_json")) as unknown,
  });
}

function normalizedTitle(value: string): string {
  return value.normalize("NFC").trim().toLocaleLowerCase("pt-BR");
}

function ftsQuery(value: string): string | null {
  const tokens = value
    .normalize("NFKC")
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => token.length > 1)
    .slice(0, 12);
  return tokens?.length
    ? tokens.map((token) => `"${token.replaceAll('"', '""')}"`).join(" AND ")
    : null;
}

export const PrivateDocumentRepository = {
  async listDocuments(
    options: { query?: string; limit?: number; offset?: number } = {},
    database?: WorkspaceDatabase,
  ): Promise<PrivateDocument[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const normalizedQuery = options.query?.normalize("NFC").trim();
    const limit = Math.min(Math.max(Math.trunc(options.limit ?? 200), 1), 1_000);
    const offset = Math.max(Math.trunc(options.offset ?? 0), 0);
    const rows = normalizedQuery
      ? await db.query(
          `SELECT * FROM private_documents
           WHERE title LIKE ? ESCAPE '\\' COLLATE NOCASE
           ORDER BY imported_at DESC,id LIMIT ? OFFSET ?`,
          [
            `%${normalizedQuery.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
            limit,
            offset,
          ],
        )
      : await db.query(
          "SELECT * FROM private_documents ORDER BY imported_at DESC,id LIMIT ? OFFSET ?",
          [limit, offset],
        );
    return rows.map(mapDocument);
  },

  async findByChecksum(
    checksum: string,
    database?: WorkspaceDatabase,
  ): Promise<PrivateDocument | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (await db.query("SELECT * FROM private_documents WHERE checksum=?", [checksum]))[0];
    return row ? mapDocument(row) : null;
  },

  async getDocument(id: string, database?: WorkspaceDatabase): Promise<PrivateDocument | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (await db.query("SELECT * FROM private_documents WHERE id=?", [id]))[0];
    return row ? mapDocument(row) : null;
  },

  async getDocumentForSource(
    sourceId: string,
    database?: WorkspaceDatabase,
  ): Promise<PrivateDocument | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query("SELECT * FROM private_documents WHERE source_id=?", [sourceId])
    )[0];
    return row ? mapDocument(row) : null;
  },

  async getPage(
    documentId: string,
    pageIndex: number,
    database?: WorkspaceDatabase,
  ): Promise<PrivateDocumentPage | null> {
    if (!Number.isInteger(pageIndex) || pageIndex < 0) return null;
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query("SELECT * FROM private_document_pages WHERE document_id=? AND page_index=?", [
        documentId,
        pageIndex,
      ])
    )[0];
    return row ? mapPage(row) : null;
  },

  async listPages(
    documentId: string,
    options: { offset?: number; limit?: number } = {},
    database?: WorkspaceDatabase,
  ): Promise<PrivateDocumentPage[]> {
    const offset = Math.max(0, Math.trunc(options.offset ?? 0));
    const limit = Math.min(Math.max(1, Math.trunc(options.limit ?? 50)), 200);
    const db = database ?? (await getWorkspaceDatabase());
    return (
      await db.query(
        `SELECT * FROM private_document_pages
         WHERE document_id=? ORDER BY page_index LIMIT ? OFFSET ?`,
        [documentId, limit, offset],
      )
    ).map(mapPage);
  },

  async search(
    query: string,
    options: { documentId?: string; limit?: number } = {},
    database?: WorkspaceDatabase,
  ): Promise<PrivateDocumentSearchHit[]> {
    const match = ftsQuery(query);
    if (!match) return [];
    const db = database ?? (await getWorkspaceDatabase());
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
    const documentClause = options.documentId ? "AND p.document_id=?" : "";
    const bind = options.documentId ? [match, options.documentId, limit] : [match, limit];
    return (
      await db.query(
        `SELECT d.id document_id,d.source_id,d.title,p.page_index,p.page_label,
                snippet(private_document_pages_fts,0,'','', ' … ',32) snippet,
                bm25(private_document_pages_fts) rank
         FROM private_document_pages_fts
         JOIN private_document_pages p ON p.rowid=private_document_pages_fts.rowid
         JOIN private_documents d ON d.id=p.document_id
         WHERE private_document_pages_fts MATCH ? ${documentClause}
         ORDER BY rank,p.page_index LIMIT ?`,
        bind,
      )
    ).map((row) => ({
      documentId: text(row, "document_id"),
      sourceId: text(row, "source_id"),
      title: text(row, "title"),
      pageIndex: number(row, "page_index"),
      pageLabel: text(row, "page_label"),
      snippet: text(row, "snippet"),
      rank: number(row, "rank"),
    }));
  },

  async importDocument(
    input: ExtractedPrivateDocument,
    storageReference: string,
    database?: WorkspaceDatabase,
  ): Promise<{ document: PrivateDocument; duplicate: boolean }> {
    const parsed = ExtractedPrivateDocumentSchema.parse(input);
    const db = database ?? (await getWorkspaceDatabase());
    const existing = await this.findByChecksum(parsed.checksum, db);
    if (existing) {
      const existingPages = await db.query(
        "SELECT count(*) count,coalesce(sum(character_count),0) characters FROM private_document_pages WHERE document_id=?",
        [existing.id],
      );
      const pageCount = Number(existingPages[0]?.["count"] ?? 0);
      const characterCount = Number(existingPages[0]?.["characters"] ?? 0);
      if (pageCount < parsed.pageCount || characterCount === 0) {
        const statements: Parameters<WorkspaceDatabase["transaction"]>[0] = [
          {
            sql: "UPDATE source_assets SET storage_reference=?,size_bytes=?,original_name=?,imported_at=? WHERE id=?",
            bind: [
              storageReference,
              parsed.sizeBytes,
              parsed.originalName,
              new Date().toISOString(),
              existing.assetId,
            ],
          },
          {
            sql: `UPDATE private_documents SET title=?,language=?,page_count=?,text_page_count=?,
                  size_bytes=?,extraction_method=? WHERE id=?`,
            bind: [
              parsed.title,
              parsed.language,
              parsed.pageCount,
              parsed.textPageCount,
              parsed.sizeBytes,
              parsed.extractionMethod,
              existing.id,
            ],
          },
        ];
        for (const page of parsed.pages)
          statements.push({
            sql: `INSERT INTO private_document_pages(
                    id,document_id,page_index,page_label,text,character_count,extraction_method,quality_json
                  ) VALUES(?,?,?,?,?,?,?,?)
                  ON CONFLICT(id) DO UPDATE SET
                    page_label=excluded.page_label,text=excluded.text,
                    character_count=excluded.character_count,
                    extraction_method=excluded.extraction_method,quality_json=excluded.quality_json`,
            bind: [
              `${existing.id}:page:${page.pageIndex + 1}`,
              existing.id,
              page.pageIndex,
              page.pageLabel,
              page.text,
              page.text.length,
              page.text ? "pdf-text-layer" : "empty",
              JSON.stringify({ hasText: Boolean(page.text), itemCount: page.itemCount }),
            ],
          });
        await db.transaction(statements);
        const restored = await this.getDocument(existing.id, db);
        if (!restored) throw new Error("O documento restaurado não pôde ser confirmado.");
        return { document: restored, duplicate: false };
      }
      return { document: existing, duplicate: true };
    }

    const documentId = `private-document:${parsed.checksum}`;
    const sourceId = `source:private-document:${parsed.checksum}`;
    const assetId = `asset:private-document:${parsed.checksum}`;
    const importedAt = new Date().toISOString();
    const statements: Parameters<WorkspaceDatabase["transaction"]>[0] = [
      {
        sql: `INSERT INTO bibliographic_sources(
          id,title,normalized_title,source_type,language,rights_json,provenance_json,created_at,updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?)`,
        bind: [
          sourceId,
          parsed.title,
          normalizedTitle(parsed.title),
          "user-document",
          parsed.language,
          JSON.stringify({
            metadataRedistributable: false,
            contentRedistributable: false,
            quoteAllowed: true,
            localOnly: true,
            license: "Uso privado — arquivo fornecido pelo usuário",
            notes: "O texto extraído e o arquivo original não integram pacotes públicos.",
          }),
          JSON.stringify({
            origin: "user-provided-private-file",
            importMethod: parsed.extractionMethod,
            importedAt,
            checksum: parsed.checksum,
            localAssetId: assetId,
          }),
          importedAt,
          importedAt,
        ],
      },
      {
        sql: `INSERT INTO source_assets(
          id,source_id,storage_reference,mime_type,size_bytes,checksum,original_name,imported_at
        ) VALUES(?,?,?,?,?,?,?,?)`,
        bind: [
          assetId,
          sourceId,
          storageReference,
          parsed.mimeType,
          parsed.sizeBytes,
          parsed.checksum,
          parsed.originalName,
          importedAt,
        ],
      },
      {
        sql: `INSERT INTO private_documents(
          id,source_id,asset_id,title,language,page_count,text_page_count,size_bytes,checksum,extraction_method,imported_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        bind: [
          documentId,
          sourceId,
          assetId,
          parsed.title,
          parsed.language,
          parsed.pageCount,
          parsed.textPageCount,
          parsed.sizeBytes,
          parsed.checksum,
          parsed.extractionMethod,
          importedAt,
        ],
      },
      {
        sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) VALUES('source',?,?,?)",
        bind: [sourceId, parsed.title, "Documento PDF privado indexado localmente"],
      },
    ];

    for (const page of parsed.pages) {
      statements.push({
        sql: `INSERT INTO private_document_pages(
          id,document_id,page_index,page_label,text,character_count,extraction_method,quality_json
        ) VALUES(?,?,?,?,?,?,?,?)`,
        bind: [
          `${documentId}:page:${page.pageIndex + 1}`,
          documentId,
          page.pageIndex,
          page.pageLabel,
          page.text,
          page.text.length,
          page.text ? "pdf-text-layer" : "empty",
          JSON.stringify({ hasText: Boolean(page.text), itemCount: page.itemCount }),
        ],
      });
    }
    await db.transaction(statements);
    const document = await this.getDocument(documentId, db);
    if (!document)
      throw new Error("O documento privado não pôde ser confirmado após a importação.");
    return { document, duplicate: false };
  },
};
