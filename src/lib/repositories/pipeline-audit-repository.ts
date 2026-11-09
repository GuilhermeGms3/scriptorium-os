import { z } from "zod";
import { DocumentKnowledgeRepository } from "./document-knowledge-repository";
import { PipelineLinkSchema } from "../semantic-engine/local-pipeline-client";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";

export const AuditItemSchema = z.object({
  proposal_id: z.string(),
  publication: z.enum(["machine-visible", "exception", "withheld", "revoked"]),
  origin: z.enum(["explicit", "inferred"]),
  audit_status: z.enum(["pending", "confirmed", "rejected"]),
  evidence_json: z.string(),
  payload_json: z.string(),
  unit_text: z.string(),
  page_index: z.number(),
  batch_id: z.string().nullable().optional(),
});
export type PipelineAuditItem = z.infer<typeof AuditItemSchema>;

export const PipelineAuditRepository = {
  async snapshot(documentId: string) {
    const db = await getWorkspaceDatabase();
    const [counts, job, rows, receipts, receiptCounts, batches] = await Promise.all([
      db.query(
        `SELECT d.publication,count(*) count FROM pipeline_decisions d JOIN knowledge_proposals p ON p.id=d.proposal_id WHERE p.document_id=? GROUP BY d.publication`,
        [documentId],
      ),
      db.query(
        "SELECT status,next_ordinal,error,configuration_json FROM pipeline_jobs WHERE document_id=?",
        [documentId],
      ),
      // Bounded audit window. Stable checksum order; stratification per source book/document.
      db.query(
        `WITH ranked AS (SELECT d.*,p.payload_json,p.semantic_unit_id,bm.batch_id,
        '' unit_text,s.page_index,
        row_number() OVER (PARTITION BY d.origin ORDER BY u.text_checksum,p.id) sample_rank
        FROM pipeline_decisions d JOIN knowledge_proposals p ON p.id=d.proposal_id
        JOIN semantic_units u ON u.id=p.semantic_unit_id
        JOIN semantic_unit_spans s ON s.unit_id=u.id AND s.ordinal=0
        JOIN private_document_pages pg ON pg.id=s.page_id
        LEFT JOIN pipeline_review_batch_members bm ON bm.proposal_id=d.proposal_id AND bm.is_sample=1
        WHERE p.document_id=? AND d.audit_status='pending' AND (
          (d.origin='explicit' AND d.publication='exception') OR bm.proposal_id IS NOT NULL
        ))
        SELECT * FROM ranked WHERE sample_rank<=40 ORDER BY origin,sample_rank LIMIT 80`,
        [documentId],
      ),
      db.query(
        `SELECT r.receipt_json FROM pipeline_unit_receipts r JOIN semantic_units u ON u.id=r.unit_id
        WHERE u.document_id=? AND r.status='candidates' ORDER BY u.ordinal LIMIT 10`,
        [documentId],
      ),
      db.query(
        "SELECT r.status,count(*) count FROM pipeline_unit_receipts r JOIN semantic_units u ON u.id=r.unit_id WHERE u.document_id=? GROUP BY r.status",
        [documentId],
      ),
      db.query(
        `SELECT b.id,b.ordinal,b.member_count,b.sample_count,b.status,
          sum(CASE WHEN m.is_sample=1 AND d.audit_status='pending' THEN 1 ELSE 0 END) pending_sample,
          sum(CASE WHEN m.is_sample=1 AND d.audit_status='rejected' THEN 1 ELSE 0 END) rejected_sample
         FROM pipeline_review_batches b
         JOIN pipeline_review_batch_members m ON m.batch_id=b.id
         JOIN pipeline_decisions d ON d.proposal_id=m.proposal_id
         WHERE b.document_id=? GROUP BY b.id ORDER BY b.ordinal`,
        [documentId],
      ),
    ]);
    const units = await DocumentKnowledgeRepository.listUnits(
      documentId,
      rows.map((row) => String(row["semantic_unit_id"])),
      db,
    );
    const texts = new Map(units.map((unit) => [unit.id, unit.text]));
    return {
      counts: Object.fromEntries(
        counts.map((row) => [String(row["publication"]), Number(row["count"])]),
      ),
      job: job[0],
      receiptCounts: Object.fromEntries(
        receiptCounts.map((row) => [String(row["status"]), Number(row["count"])]),
      ),
      items: rows.map((row) =>
        AuditItemSchema.parse({
          ...row,
          unit_text: texts.get(String(row["semantic_unit_id"])) ?? "",
        }),
      ),
      candidates: receipts.map((row) =>
        PipelineLinkSchema.parse(JSON.parse(String(row["receipt_json"])) as unknown),
      ),
      batches,
    };
  },
  /**
   * Records the verdict on sampled links and, in the same transaction, settles their batches: a
   * rejected sample rejects the batch; once no sample is pending or rejected, the whole batch is
   * released. A failure halfway can no longer leave decisions changed with the batch unsettled.
   */
  async review(
    ids: readonly string[],
    verdict: "confirmed" | "rejected",
    database?: WorkspaceDatabase,
  ): Promise<void> {
    if (!ids.length || ids.length > 80) throw new Error("Selecione até 80 itens para auditoria.");
    const db = database ?? (await getWorkspaceDatabase());
    const now = new Date().toISOString();
    const unique = [...new Set(ids)];
    const batchIds = (
      await db.query(
        `SELECT DISTINCT batch_id FROM pipeline_review_batch_members
         WHERE proposal_id IN (${unique.map(() => "?").join(",")})`,
        unique,
      )
    ).map((row) => String(row["batch_id"]));
    const samplesIn = (statuses: string) =>
      `SELECT 1 FROM pipeline_review_batch_members m JOIN pipeline_decisions d ON d.proposal_id=m.proposal_id
       WHERE m.batch_id=? AND m.is_sample=1 AND d.audit_status IN (${statuses})`;
    await db.transaction([
      ...unique.map((id) => ({
        sql: `UPDATE pipeline_decisions SET audit_status=?,publication=?,updated_at=? WHERE proposal_id=?`,
        bind: [verdict, verdict === "confirmed" ? "machine-visible" : "revoked", now, id],
      })),
      ...batchIds.flatMap((batchId) => [
        {
          sql: `UPDATE pipeline_review_batches SET status='rejected',updated_at=?
                WHERE id=? AND EXISTS(${samplesIn("'rejected'")})`,
          bind: [now, batchId, batchId],
        },
        {
          sql: `UPDATE pipeline_review_batches SET status='released',updated_at=?
                WHERE id=? AND NOT EXISTS(${samplesIn("'pending','rejected'")})`,
          bind: [now, batchId, batchId],
        },
        {
          sql: `UPDATE pipeline_decisions SET publication='machine-visible',audit_status='confirmed',updated_at=?
                WHERE proposal_id IN (SELECT proposal_id FROM pipeline_review_batch_members WHERE batch_id=?)
                  AND EXISTS(SELECT 1 FROM pipeline_review_batches WHERE id=? AND status='released')`,
          bind: [now, batchId, batchId],
        },
      ]),
    ]);
    notifyKnowledgeMutation();
  },
  async revokeDocument(documentId: string): Promise<void> {
    const db = await getWorkspaceDatabase();
    await db.execute(
      `UPDATE pipeline_decisions SET publication='revoked',audit_status='rejected',updated_at=? WHERE proposal_id IN (SELECT id FROM knowledge_proposals WHERE document_id=?)`,
      [new Date().toISOString(), documentId],
    );
    notifyKnowledgeMutation();
  },
};
