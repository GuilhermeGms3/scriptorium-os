import type { PassageRef } from "../domain/scripture";
import { passageRefScheme } from "../domain/scripture";
import {
  SemanticClassificationSchema,
  SemanticPassageLinkSchema,
  SemanticSegmentSchema,
  type SemanticClassification,
  type SemanticIndexSummary,
  type SemanticPassageLink,
  type SemanticSegment,
  type SemanticSegmentBundle,
} from "../domain/semantic-content";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceRow,
} from "../workspace-runtime/workspace-database";

function stringValue(row: WorkspaceRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Coluna textual inválida: ${key}.`);
  return value;
}

function numberValue(row: WorkspaceRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number") throw new Error(`Coluna numérica inválida: ${key}.`);
  return value;
}

function optionalString(row: WorkspaceRow, key: string): string | undefined {
  return typeof row[key] === "string" ? row[key] : undefined;
}

function optionalNumber(row: WorkspaceRow, key: string): number | undefined {
  return typeof row[key] === "number" ? row[key] : undefined;
}

function mapSummary(row: WorkspaceRow): SemanticIndexSummary {
  const indexedAt = optionalString(row, "indexed_at");
  const error = optionalString(row, "error");
  return {
    documentId: stringValue(row, "document_id"),
    engineVersion: stringValue(row, "engine_version"),
    sourceChecksum: stringValue(row, "source_checksum"),
    status: stringValue(row, "status") as SemanticIndexSummary["status"],
    segmentCount: numberValue(row, "segment_count"),
    passageLinkCount: numberValue(row, "passage_link_count"),
    ...(indexedAt ? { indexedAt } : {}),
    ...(error ? { error } : {}),
  };
}

function mapSegment(row: WorkspaceRow): SemanticSegment {
  return SemanticSegmentSchema.parse({
    id: stringValue(row, "id"),
    documentId: stringValue(row, "document_id"),
    pageId: stringValue(row, "page_id"),
    pageIndex: numberValue(row, "page_index"),
    ordinal: numberValue(row, "ordinal"),
    startOffset: numberValue(row, "start_offset"),
    endOffset: numberValue(row, "end_offset"),
    structuralKind: stringValue(row, "structural_kind"),
    textChecksum: stringValue(row, "text_checksum"),
    language: stringValue(row, "language"),
  });
}

function mapClassification(row: WorkspaceRow): SemanticClassification {
  return SemanticClassificationSchema.parse({
    segmentId: stringValue(row, "segment_id"),
    domain: stringValue(row, "domain"),
    score: numberValue(row, "score"),
    method: stringValue(row, "method"),
    evidence: JSON.parse(stringValue(row, "evidence_json")) as unknown,
    reviewStatus: stringValue(row, "review_status"),
  });
}

function mapPassageLink(row: WorkspaceRow): SemanticPassageLink {
  const verseStart = optionalNumber(row, "verse_start");
  const verseEnd = optionalNumber(row, "verse_end");
  const reviewedAt = optionalString(row, "reviewed_at");
  return SemanticPassageLinkSchema.parse({
    id: stringValue(row, "id"),
    segmentId: stringValue(row, "segment_id"),
    documentId: stringValue(row, "document_id"),
    pageIndex: numberValue(row, "page_index"),
    rawReference: stringValue(row, "raw_reference"),
    workId: stringValue(row, "work_id"),
    bookId: stringValue(row, "book_id"),
    chapter: numberValue(row, "chapter"),
    ...(verseStart !== undefined ? { verseStart } : {}),
    ...(verseEnd !== undefined ? { verseEnd } : {}),
    versificationSchemeId: stringValue(row, "versification_scheme_id"),
    relationType: stringValue(row, "relation_type"),
    confidence: numberValue(row, "confidence"),
    method: stringValue(row, "method"),
    reviewStatus: stringValue(row, "review_status"),
    ...(reviewedAt ? { reviewedAt } : {}),
  });
}

/** @deprecated Read/write compatibility for the pre-schema-13 semantic index. */
export const SemanticContentRepository = {
  async getIndexSummary(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<SemanticIndexSummary | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query("SELECT * FROM semantic_document_indexes WHERE document_id=?", [documentId])
    )[0];
    return row ? mapSummary(row) : null;
  },

  async beginIndex(
    documentId: string,
    engineVersion: string,
    sourceChecksum: string,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.transaction([
      { sql: "DELETE FROM semantic_segments WHERE document_id=?", bind: [documentId] },
      {
        sql: `INSERT INTO semantic_document_indexes(
          document_id,engine_version,source_checksum,status,segment_count,passage_link_count,indexed_at,error
        ) VALUES(?,?,?,'processing',0,0,NULL,NULL)
        ON CONFLICT(document_id) DO UPDATE SET
          engine_version=excluded.engine_version,source_checksum=excluded.source_checksum,
          status='processing',segment_count=0,passage_link_count=0,indexed_at=NULL,error=NULL`,
        bind: [documentId, engineVersion, sourceChecksum],
      },
    ]);
  },

  async storePageBundles(
    bundles: SemanticSegmentBundle[],
    database?: WorkspaceDatabase,
  ): Promise<void> {
    if (!bundles.length) return;
    const db = database ?? (await getWorkspaceDatabase());
    const statements: Parameters<WorkspaceDatabase["transaction"]>[0] = [];
    for (const bundle of bundles) {
      statements.push({
        sql: `INSERT INTO semantic_segments(
          id,document_id,page_id,page_index,ordinal,start_offset,end_offset,structural_kind,text_checksum,language
        ) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        bind: [
          bundle.segment.id,
          bundle.segment.documentId,
          bundle.segment.pageId,
          bundle.segment.pageIndex,
          bundle.segment.ordinal,
          bundle.segment.startOffset,
          bundle.segment.endOffset,
          bundle.segment.structuralKind,
          bundle.segment.textChecksum,
          bundle.segment.language,
        ],
      });
      for (const classification of bundle.classifications) {
        statements.push({
          sql: `INSERT INTO semantic_segment_domains(
            segment_id,domain,score,method,evidence_json,review_status
          ) VALUES(?,?,?,?,?,?)`,
          bind: [
            classification.segmentId,
            classification.domain,
            classification.score,
            classification.method,
            JSON.stringify(classification.evidence),
            classification.reviewStatus,
          ],
        });
      }
      for (const link of bundle.passageLinks) {
        statements.push({
          sql: `INSERT INTO semantic_passage_links(
            id,segment_id,document_id,page_index,raw_reference,work_id,book_id,chapter,
            verse_start,verse_end,versification_scheme_id,relation_type,confidence,method,review_status,reviewed_at
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          bind: [
            link.id,
            link.segmentId,
            link.documentId,
            link.pageIndex,
            link.rawReference,
            link.workId,
            link.bookId,
            link.chapter,
            link.verseStart ?? null,
            link.verseEnd ?? null,
            link.versificationSchemeId,
            link.relationType,
            link.confidence,
            link.method,
            link.reviewStatus,
            link.reviewedAt ?? null,
          ],
        });
      }
    }
    await db.transaction(statements);
  },

  async completeIndex(
    documentId: string,
    segmentCount: number,
    passageLinkCount: number,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      `UPDATE semantic_document_indexes SET status='ready',segment_count=?,passage_link_count=?,
       indexed_at=?,error=NULL WHERE document_id=?`,
      [segmentCount, passageLinkCount, new Date().toISOString(), documentId],
    );
  },

  async failIndex(documentId: string, error: string, database?: WorkspaceDatabase): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      "UPDATE semantic_document_indexes SET status='failed',error=? WHERE document_id=?",
      [error.slice(0, 1_000), documentId],
    );
  },

  async listPageBundles(
    documentId: string,
    pageIndex: number,
    database?: WorkspaceDatabase,
  ): Promise<SemanticSegmentBundle[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const [segmentRows, classificationRows, linkRows, pageRows] = await Promise.all([
      db.query(
        "SELECT * FROM semantic_segments WHERE document_id=? AND page_index=? ORDER BY ordinal",
        [documentId, pageIndex],
      ),
      db.query(
        `SELECT d.* FROM semantic_segment_domains d JOIN semantic_segments s ON s.id=d.segment_id
         WHERE s.document_id=? AND s.page_index=? ORDER BY d.score DESC`,
        [documentId, pageIndex],
      ),
      db.query(
        "SELECT * FROM semantic_passage_links WHERE document_id=? AND page_index=? ORDER BY id",
        [documentId, pageIndex],
      ),
      db.query("SELECT text FROM private_document_pages WHERE document_id=? AND page_index=?", [
        documentId,
        pageIndex,
      ]),
    ]);
    const pageText = pageRows[0] ? stringValue(pageRows[0], "text") : "";
    const classifications = classificationRows.map(mapClassification);
    const links = linkRows.map(mapPassageLink);
    return segmentRows.map((row) => {
      const segment = mapSegment(row);
      return {
        segment,
        text: pageText.slice(segment.startOffset, segment.endOffset),
        classifications: classifications.filter((item) => item.segmentId === segment.id),
        passageLinks: links.filter((item) => item.segmentId === segment.id),
      };
    });
  },

  async reviewPassageLink(
    id: string,
    status: "accepted" | "rejected",
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute("UPDATE semantic_passage_links SET review_status=?,reviewed_at=? WHERE id=?", [
      status,
      new Date().toISOString(),
      id,
    ]);
  },

  async listLinksForPassage(
    passage: PassageRef,
    options: { reviewStatus?: SemanticPassageLink["reviewStatus"]; limit?: number } = {},
    database?: WorkspaceDatabase,
  ): Promise<SemanticPassageLink[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const start = passage.verseStart ?? 1;
    const end = passage.verseEnd ?? passage.verseStart ?? 999;
    const statusClause = options.reviewStatus ? "AND review_status=?" : "";
    const bind = options.reviewStatus
      ? [
          passage.bookId,
          passage.chapter,
          passageRefScheme(passage),
          end,
          start,
          options.reviewStatus,
          limit,
        ]
      : [passage.bookId, passage.chapter, passageRefScheme(passage), end, start, limit];
    const rows = await db.query(
      `SELECT * FROM semantic_passage_links
       WHERE book_id=? AND chapter=? AND versification_scheme_id=?
         AND (verse_start IS NULL OR (verse_start <= ? AND COALESCE(verse_end,verse_start) >= ?))
         ${statusClause}
       ORDER BY confidence DESC,id LIMIT ?`,
      bind,
    );
    return rows.map(mapPassageLink);
  },
};
