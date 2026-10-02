import {
  DocumentKnowledgeIndexSummarySchema,
  DocumentNodeSchema,
  KnowledgeProposalPayloadSchema,
  KnowledgeProposalSchema,
  type DocumentKnowledgeAggregate,
  type DocumentKnowledgeIndexSummary,
  type DocumentNode,
  type KnowledgeProposal,
  type KnowledgeProposalPayload,
  type SemanticUnit,
  SemanticUnitSchema,
} from "../domain/document-knowledge";
import type { PassageRef } from "../domain/scripture";
import { passageRefScheme } from "../domain/scripture";
import type { DocumentKnowledgeAnalyzerCheckpoint } from "../semantic-engine/document-knowledge-analyzer";
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

function mapSummary(row: WorkspaceRow): DocumentKnowledgeIndexSummary {
  return DocumentKnowledgeIndexSummarySchema.parse({
    documentId: stringValue(row, "document_id"),
    analyzerId: stringValue(row, "analyzer_id"),
    analyzerVersion: stringValue(row, "analyzer_version"),
    sourceChecksum: stringValue(row, "source_checksum"),
    status: stringValue(row, "status"),
    stage: stringValue(row, "stage"),
    checkpointPage: numberValue(row, "checkpoint_page"),
    nodeCount: numberValue(row, "node_count"),
    unitCount: numberValue(row, "unit_count"),
    proposalCount: numberValue(row, "proposal_count"),
    ...(optionalString(row, "indexed_at") ? { indexedAt: optionalString(row, "indexed_at") } : {}),
    ...(optionalString(row, "error") ? { error: optionalString(row, "error") } : {}),
  });
}

function mapNode(row: WorkspaceRow): DocumentNode {
  return DocumentNodeSchema.parse({
    id: stringValue(row, "id"),
    documentId: stringValue(row, "document_id"),
    ...(optionalString(row, "parent_id") ? { parentId: optionalString(row, "parent_id") } : {}),
    kind: stringValue(row, "node_kind"),
    ...(optionalString(row, "title") ? { title: optionalString(row, "title") } : {}),
    ordinal: numberValue(row, "ordinal"),
    pageStart: numberValue(row, "page_start"),
    pageEnd: numberValue(row, "page_end"),
    method: stringValue(row, "method"),
    confidence: numberValue(row, "confidence"),
    reviewStatus: stringValue(row, "review_status"),
  });
}

function mapProposal(row: WorkspaceRow): KnowledgeProposal {
  return KnowledgeProposalSchema.parse({
    id: stringValue(row, "id"),
    documentId: stringValue(row, "document_id"),
    semanticUnitId: stringValue(row, "semantic_unit_id"),
    proposalKind: stringValue(row, "proposal_kind"),
    payload: JSON.parse(stringValue(row, "payload_json")) as unknown,
    method: stringValue(row, "method"),
    confidence: numberValue(row, "confidence"),
    reviewStatus: stringValue(row, "review_status"),
    ...(optionalString(row, "reviewed_at")
      ? { reviewedAt: optionalString(row, "reviewed_at") }
      : {}),
    ...(optionalString(row, "review_note")
      ? { reviewNote: optionalString(row, "review_note") }
      : {}),
    createdAt: stringValue(row, "created_at"),
    updatedAt: stringValue(row, "updated_at"),
  });
}

function chunks<T>(values: readonly T[], size = 150): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size));
  return result;
}

export const DocumentKnowledgeRepository = {
  async getSummary(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<DocumentKnowledgeIndexSummary | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query("SELECT * FROM document_knowledge_indexes WHERE document_id=?", [documentId])
    )[0];
    return row ? mapSummary(row) : null;
  },

  async getProgress(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<{
    current?: number;
    total?: number;
    message?: string;
    analyzerCheckpoint?: DocumentKnowledgeAnalyzerCheckpoint;
  } | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query("SELECT progress_json FROM document_knowledge_indexes WHERE document_id=?", [
        documentId,
      ])
    )[0];
    if (!row) return null;
    const raw = JSON.parse(stringValue(row, "progress_json")) as unknown;
    if (!raw || typeof raw !== "object") return {};
    const value = raw as Record<string, unknown>;
    const checkpoint = value["analyzerCheckpoint"];
    let validCheckpoint: DocumentKnowledgeAnalyzerCheckpoint | undefined;
    if (checkpoint && typeof checkpoint === "object") {
      const candidate = checkpoint as Record<string, unknown>;
      const nextNodeOrdinal = candidate["nextNodeOrdinal"];
      const nextUnitOrdinal = candidate["nextUnitOrdinal"];
      const processedCharacters = candidate["processedCharacters"];
      if (
        typeof nextNodeOrdinal === "number" &&
        Number.isInteger(nextNodeOrdinal) &&
        nextNodeOrdinal >= 0 &&
        typeof nextUnitOrdinal === "number" &&
        Number.isInteger(nextUnitOrdinal) &&
        nextUnitOrdinal >= 0 &&
        typeof processedCharacters === "number" &&
        Number.isInteger(processedCharacters) &&
        processedCharacters >= 0
      ) {
        const currentPartId = candidate["currentPartId"];
        const currentChapterId = candidate["currentChapterId"];
        const currentSectionId = candidate["currentSectionId"];
        validCheckpoint = {
          nextNodeOrdinal,
          nextUnitOrdinal,
          processedCharacters,
          ...(typeof currentPartId === "string" ? { currentPartId } : {}),
          ...(typeof currentChapterId === "string" ? { currentChapterId } : {}),
          ...(typeof currentSectionId === "string" ? { currentSectionId } : {}),
        };
      }
    }
    return {
      ...(typeof value["current"] === "number" ? { current: value["current"] } : {}),
      ...(typeof value["total"] === "number" ? { total: value["total"] } : {}),
      ...(typeof value["message"] === "string" ? { message: value["message"] } : {}),
      ...(validCheckpoint ? { analyzerCheckpoint: validCheckpoint } : {}),
    };
  },

  async begin(
    documentId: string,
    analyzerId: string,
    analyzerVersion: string,
    sourceChecksum: string,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.transaction([
      {
        sql: "DELETE FROM semantic_units WHERE document_id=? AND method<>'legacy-semantic-engine-migration:1'",
        bind: [documentId],
      },
      { sql: "DELETE FROM document_nodes WHERE document_id=?", bind: [documentId] },
      {
        sql: `INSERT INTO document_knowledge_indexes(
          document_id,analyzer_id,analyzer_version,source_checksum,status,stage,checkpoint_page,
          node_count,unit_count,proposal_count,progress_json,indexed_at,error
        ) VALUES(?,?,?,?,'processing','structure',0,0,0,0,'{}',NULL,NULL)
        ON CONFLICT(document_id) DO UPDATE SET
          analyzer_id=excluded.analyzer_id,analyzer_version=excluded.analyzer_version,
          source_checksum=excluded.source_checksum,status='processing',stage='structure',
          checkpoint_page=0,node_count=0,unit_count=0,proposal_count=0,
          progress_json='{}',indexed_at=NULL,error=NULL`,
        bind: [documentId, analyzerId, analyzerVersion, sourceChecksum],
      },
    ]);
  },

  async resume(documentId: string, database?: WorkspaceDatabase): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      `UPDATE document_knowledge_indexes
       SET status='processing',error=NULL
       WHERE document_id=? AND status IN ('processing','failed')`,
      [documentId],
    );
  },

  async updateProgress(
    documentId: string,
    progress: {
      stage: "structure" | "proposals" | "aggregation";
      checkpointPage: number;
      current: number;
      total: number;
      message: string;
      analyzerCheckpoint?: DocumentKnowledgeAnalyzerCheckpoint;
    },
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      `UPDATE document_knowledge_indexes
       SET stage=?,checkpoint_page=?,progress_json=?,error=NULL
       WHERE document_id=? AND status='processing'`,
      [
        progress.stage,
        progress.checkpointPage,
        JSON.stringify({
          current: progress.current,
          total: progress.total,
          message: progress.message,
          ...(progress.analyzerCheckpoint
            ? { analyzerCheckpoint: progress.analyzerCheckpoint }
            : {}),
        }),
        documentId,
      ],
    );
  },

  async storeNodes(nodes: readonly DocumentNode[], database?: WorkspaceDatabase): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    for (const batch of chunks(nodes))
      await db.transaction(
        batch.map((node) => ({
          sql: `INSERT OR IGNORE INTO document_nodes(
            id,document_id,parent_id,node_kind,title,ordinal,page_start,page_end,method,confidence,review_status
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
          bind: [
            node.id,
            node.documentId,
            node.parentId ?? null,
            node.kind,
            node.title ?? null,
            node.ordinal,
            node.pageStart,
            node.pageEnd,
            node.method,
            node.confidence,
            node.reviewStatus,
          ],
        })),
      );
  },

  async storeUnits(units: readonly SemanticUnit[], database?: WorkspaceDatabase): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    for (const batch of chunks(units, 80)) {
      const statements: Parameters<WorkspaceDatabase["transaction"]>[0] = [];
      for (const unit of batch) {
        statements.push({
          sql: `INSERT OR IGNORE INTO semantic_units(
            id,document_id,document_node_id,unit_kind,ordinal,text_checksum,language,method
          ) VALUES(?,?,?,?,?,?,?,?)`,
          bind: [
            unit.id,
            unit.documentId,
            unit.documentNodeId ?? null,
            unit.kind,
            unit.ordinal,
            unit.textChecksum,
            unit.language,
            unit.method,
          ],
        });
        for (const span of unit.spans)
          statements.push({
            sql: `INSERT OR IGNORE INTO semantic_unit_spans(
              unit_id,page_id,page_index,start_offset,end_offset,ordinal
            ) VALUES(?,?,?,?,?,?)`,
            bind: [
              span.unitId,
              span.pageId,
              span.pageIndex,
              span.startOffset,
              span.endOffset,
              span.ordinal,
            ],
          });
      }
      await db.transaction(statements);
    }
  },

  async storeProposals(
    proposals: readonly KnowledgeProposal[],
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    for (const batch of chunks(proposals))
      await db.transaction(
        batch.map((proposal) => ({
          sql: `INSERT OR IGNORE INTO knowledge_proposals(
            id,document_id,semantic_unit_id,proposal_kind,payload_json,method,confidence,
            review_status,reviewed_at,review_note,created_at,updated_at
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
          bind: [
            proposal.id,
            proposal.documentId,
            proposal.semanticUnitId,
            proposal.proposalKind,
            JSON.stringify(proposal.payload),
            proposal.method,
            proposal.confidence,
            proposal.reviewStatus,
            proposal.reviewedAt ?? null,
            proposal.reviewNote ?? null,
            proposal.createdAt,
            proposal.updatedAt,
          ],
        })),
      );
  },

  async complete(
    documentId: string,
    counts: { nodeCount: number; unitCount: number; proposalCount: number; checkpointPage: number },
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      `UPDATE document_knowledge_indexes SET status='ready',stage='complete',checkpoint_page=?,
       node_count=(SELECT count(*) FROM document_nodes WHERE document_id=?),
       unit_count=(SELECT count(*) FROM semantic_units WHERE document_id=?),
       proposal_count=(SELECT count(*) FROM knowledge_proposals WHERE document_id=?),
       progress_json=?,indexed_at=?,error=NULL WHERE document_id=?`,
      [
        counts.checkpointPage,
        documentId,
        documentId,
        documentId,
        JSON.stringify({
          current: counts.checkpointPage,
          total: counts.checkpointPage,
          message: "Índice concluído.",
        }),
        new Date().toISOString(),
        documentId,
      ],
    );
  },

  async fail(documentId: string, error: string, database?: WorkspaceDatabase): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      "UPDATE document_knowledge_indexes SET status='failed',error=? WHERE document_id=?",
      [error.slice(0, 1_000), documentId],
    );
  },

  async listNodes(documentId: string, database?: WorkspaceDatabase): Promise<DocumentNode[]> {
    const db = database ?? (await getWorkspaceDatabase());
    return (
      await db.query("SELECT * FROM document_nodes WHERE document_id=? ORDER BY ordinal", [
        documentId,
      ])
    ).map(mapNode);
  },

  async listUnits(
    documentId: string,
    unitIds: readonly string[],
    database?: WorkspaceDatabase,
  ): Promise<SemanticUnit[]> {
    if (!unitIds.length) return [];
    const db = database ?? (await getWorkspaceDatabase());
    const wanted = [...new Set(unitIds)];
    const unitRows: WorkspaceRow[] = [];
    const spanRows: WorkspaceRow[] = [];
    for (const batch of chunks(wanted, 400)) {
      const placeholders = batch.map(() => "?").join(",");
      unitRows.push(
        ...(await db.query(
          `SELECT * FROM semantic_units WHERE document_id=? AND id IN (${placeholders})`,
          [documentId, ...batch],
        )),
      );
      spanRows.push(
        ...(await db.query(
          `SELECT s.*,p.text page_text FROM semantic_unit_spans s
           JOIN private_document_pages p ON p.id=s.page_id
           WHERE s.unit_id IN (${placeholders}) ORDER BY s.unit_id,s.ordinal`,
          batch,
        )),
      );
    }
    const spansByUnit = new Map<string, WorkspaceRow[]>();
    for (const row of spanRows) {
      const id = stringValue(row, "unit_id");
      const values = spansByUnit.get(id);
      if (values) values.push(row);
      else spansByUnit.set(id, [row]);
    }
    return unitRows
      .map((row) => {
        const id = stringValue(row, "id");
        const spanValues = spansByUnit.get(id) ?? [];
        const spans = spanValues.map((span) => ({
          unitId: id,
          pageId: stringValue(span, "page_id"),
          pageIndex: numberValue(span, "page_index"),
          startOffset: numberValue(span, "start_offset"),
          endOffset: numberValue(span, "end_offset"),
          ordinal: numberValue(span, "ordinal"),
        }));
        const text = spanValues
          .map((span) =>
            stringValue(span, "page_text").slice(
              numberValue(span, "start_offset"),
              numberValue(span, "end_offset"),
            ),
          )
          .join(" ");
        return SemanticUnitSchema.parse({
          id,
          documentId: stringValue(row, "document_id"),
          ...(optionalString(row, "document_node_id")
            ? { documentNodeId: optionalString(row, "document_node_id") }
            : {}),
          kind: stringValue(row, "unit_kind"),
          ordinal: numberValue(row, "ordinal"),
          textChecksum: stringValue(row, "text_checksum"),
          language: stringValue(row, "language"),
          method: stringValue(row, "method"),
          spans,
          text,
        });
      })
      .sort((left, right) => left.ordinal - right.ordinal);
  },

  async listProposals(
    documentId: string,
    options: {
      reviewStatus?: KnowledgeProposal["reviewStatus"];
      proposalKind?: KnowledgeProposal["proposalKind"];
      limit?: number;
      offset?: number;
    } = {},
    database?: WorkspaceDatabase,
  ): Promise<KnowledgeProposal[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const clauses = ["document_id=?"];
    const bind: (string | number)[] = [documentId];
    if (options.reviewStatus) {
      clauses.push("review_status=?");
      bind.push(options.reviewStatus);
    }
    if (options.proposalKind) {
      clauses.push("proposal_kind=?");
      bind.push(options.proposalKind);
    }
    bind.push(Math.min(Math.max(options.limit ?? 500, 1), 2_000));
    bind.push(Math.max(0, Math.trunc(options.offset ?? 0)));
    return (
      await db.query(
        `SELECT * FROM knowledge_proposals WHERE ${clauses.join(" AND ")}
         ORDER BY CASE review_status WHEN 'machine-proposed' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END,
                  confidence DESC,id LIMIT ? OFFSET ?`,
        bind,
      )
    ).map(mapProposal);
  },

  async listAcceptedPassageRelations(
    passage: PassageRef,
    database?: WorkspaceDatabase,
  ): Promise<KnowledgeProposal[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const start = passage.verseStart ?? 1;
    const end = passage.verseEnd ?? passage.verseStart ?? 999;
    return (
      await db.query(
        `SELECT * FROM knowledge_proposals
         WHERE proposal_kind='passage-relation' AND review_status='accepted'
           AND json_extract(payload_json,'$.passage.bookId')=?
           AND json_extract(payload_json,'$.passage.chapter')=?
           AND json_extract(payload_json,'$.passage.versificationSchemeId')=?
           AND (
             json_extract(payload_json,'$.passage.verseStart') IS NULL OR
             (
               json_extract(payload_json,'$.passage.verseStart') <= ? AND
               coalesce(
                 json_extract(payload_json,'$.passage.verseEnd'),
                 json_extract(payload_json,'$.passage.verseStart')
               ) >= ?
             )
           )
         ORDER BY updated_at DESC,id LIMIT 200`,
        [passage.bookId, passage.chapter, passageRefScheme(passage), end, start],
      )
    ).map(mapProposal);
  },

  async listAcceptedProposalsForUnits(
    unitIds: readonly string[],
    database?: WorkspaceDatabase,
  ): Promise<KnowledgeProposal[]> {
    if (!unitIds.length) return [];
    const db = database ?? (await getWorkspaceDatabase());
    const result: KnowledgeProposal[] = [];
    for (const batch of chunks([...new Set(unitIds)], 400)) {
      const placeholders = batch.map(() => "?").join(",");
      result.push(
        ...(
          await db.query(
            `SELECT * FROM knowledge_proposals
             WHERE review_status='accepted' AND semantic_unit_id IN (${placeholders})
             ORDER BY semantic_unit_id,proposal_kind,id`,
            batch,
          )
        ).map(mapProposal),
      );
    }
    return result;
  },

  async reviewProposal(
    id: string,
    status: "accepted" | "rejected",
    update: { payload?: KnowledgeProposalPayload; note?: string } = {},
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query("SELECT proposal_kind FROM knowledge_proposals WHERE id=?", [id])
    )[0];
    if (!row) throw new Error("Proposta de conhecimento não encontrada.");
    const payload = update.payload
      ? KnowledgeProposalPayloadSchema.parse(update.payload)
      : undefined;
    if (payload && payload.kind !== stringValue(row, "proposal_kind"))
      throw new Error("O tipo do conteúdo editado não corresponde ao tipo da proposta.");
    const reviewedAt = new Date().toISOString();
    await db.execute(
      `UPDATE knowledge_proposals SET review_status=?,reviewed_at=?,review_note=?,
       payload_json=COALESCE(?,payload_json),updated_at=? WHERE id=?`,
      [
        status,
        reviewedAt,
        update.note?.trim().slice(0, 2_000) || null,
        payload ? JSON.stringify(payload) : null,
        reviewedAt,
        id,
      ],
    );
  },

  async aggregate(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<DocumentKnowledgeAggregate> {
    const db = database ?? (await getWorkspaceDatabase());
    const [counts] = await db.query(
      `SELECT
         (SELECT count(*) FROM document_nodes WHERE document_id=?) node_count,
         (SELECT count(*) FROM semantic_units WHERE document_id=?) unit_count,
         count(*) proposal_count,
         coalesce(sum(CASE WHEN review_status='machine-proposed' THEN 1 ELSE 0 END),0) pending_count,
         coalesce(sum(CASE WHEN review_status='accepted' THEN 1 ELSE 0 END),0) accepted_count,
         coalesce(sum(CASE WHEN review_status='rejected' THEN 1 ELSE 0 END),0) rejected_count
       FROM knowledge_proposals WHERE document_id=?`,
      [documentId, documentId, documentId],
    );
    const kindRows = await db.query(
      `SELECT proposal_kind,count(*) count FROM knowledge_proposals
       WHERE document_id=? AND review_status='accepted' GROUP BY proposal_kind`,
      [documentId],
    );
    const acceptedByKind: DocumentKnowledgeAggregate["acceptedByKind"] = {};
    for (const row of kindRows)
      acceptedByKind[stringValue(row, "proposal_kind") as KnowledgeProposal["proposalKind"]] =
        numberValue(row, "count");
    return {
      documentId,
      nodeCount: counts ? numberValue(counts, "node_count") : 0,
      unitCount: counts ? numberValue(counts, "unit_count") : 0,
      proposalCount: counts ? numberValue(counts, "proposal_count") : 0,
      pendingCount: counts ? numberValue(counts, "pending_count") : 0,
      acceptedCount: counts ? numberValue(counts, "accepted_count") : 0,
      rejectedCount: counts ? numberValue(counts, "rejected_count") : 0,
      acceptedByKind,
      acceptedProposals: await this.listProposals(
        documentId,
        { reviewStatus: "accepted", limit: 2_000 },
        db,
      ),
    };
  },
};
