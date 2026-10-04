import { z } from "zod";
import { DocumentKnowledgeRepository } from "./document-knowledge-repository";
import { PipelineLinkSchema } from "../semantic-engine/local-pipeline-client";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";
import { getWorkspaceDatabase } from "../workspace-runtime/workspace-database";

export const AuditItemSchema = z.object({
  proposal_id: z.string(),
  publication: z.enum(["machine-visible", "exception", "withheld", "revoked"]),
  origin: z.enum(["explicit", "inferred"]),
  audit_status: z.enum(["pending", "confirmed", "rejected"]),
  evidence_json: z.string(),
  payload_json: z.string(),
  unit_text: z.string(),
  page_index: z.number(),
});
export type PipelineAuditItem = z.infer<typeof AuditItemSchema>;

export const PipelineAuditRepository = {
  async snapshot(documentId: string) {
    const db = await getWorkspaceDatabase();
    const [counts, job, rows, receipts, receiptCounts] = await Promise.all([
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
        `WITH ranked AS (SELECT d.*,p.payload_json,p.semantic_unit_id,
        '' unit_text,s.page_index,
        row_number() OVER (PARTITION BY d.publication ORDER BY u.text_checksum,p.id) sample_rank
        FROM pipeline_decisions d JOIN knowledge_proposals p ON p.id=d.proposal_id
        JOIN semantic_units u ON u.id=p.semantic_unit_id
        JOIN semantic_unit_spans s ON s.unit_id=u.id AND s.ordinal=0
        JOIN private_document_pages pg ON pg.id=s.page_id
        WHERE p.document_id=? AND d.audit_status='pending' AND d.publication IN ('exception','machine-visible'))
        SELECT * FROM ranked WHERE sample_rank<=20 ORDER BY publication,sample_rank LIMIT 40`,
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
    };
  },
  async review(ids: readonly string[], verdict: "confirmed" | "rejected"): Promise<void> {
    if (!ids.length || ids.length > 40) throw new Error("Selecione até 40 itens para auditoria.");
    const db = await getWorkspaceDatabase();
    const now = new Date().toISOString();
    await db.transaction(
      [...new Set(ids)].map((id) => ({
        sql: `UPDATE pipeline_decisions SET audit_status=?,publication=?,updated_at=? WHERE proposal_id=?`,
        bind: [verdict, verdict === "confirmed" ? "machine-visible" : "revoked", now, id],
      })),
    );
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
