import { z } from "zod";
import { KnowledgeProposalPayloadSchema } from "./document-knowledge";

export const TraceFilterSchema = z.object({
  documentId: z.string().max(300).optional(),
  bookId: z.string().max(100).optional(),
  chapter: z.number().int().positive().optional(),
  verse: z.number().int().positive().optional(),
  scheme: z.string().max(100).optional(),
  state: z.enum(["all", "visible", "pending", "blocked"]).default("all"),
  offset: z.number().int().min(0).max(10_000_000).default(0),
});
export type TraceFilter = z.input<typeof TraceFilterSchema>;

export const TraceRowSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  semantic_unit_id: z.string(),
  title: z.string(),
  checksum: z.string(),
  payload_json: z.string(),
  method: z.string(),
  review_status: z.enum(["machine-proposed", "accepted", "rejected"]),
  review_note: z.string().nullable(),
  publication: z.enum(["machine-visible", "exception", "withheld", "revoked"]).nullable(),
  origin: z.enum(["explicit", "inferred"]).nullable(),
  audit_status: z.enum(["pending", "confirmed", "rejected"]).nullable(),
  evidence_json: z.string().nullable(),
  configuration_key: z.string().nullable(),
  page_index: z.number().int().nonnegative().nullable(),
  updated_at: z.string(),
});
export type TraceRow = z.infer<typeof TraceRowSchema>;
export type PassageTracePayload = Extract<
  z.infer<typeof KnowledgeProposalPayloadSchema>,
  { kind: "passage-relation" }
>;
export interface KnowledgeTraceItem {
  row: TraceRow;
  payload: PassageTracePayload;
  state: "visible" | "pending" | "blocked";
  stateLabel: string;
  originLabel: string;
  explanation: string[];
  evidenceQuotes: string[];
}
export const TraceEventSchema = z.object({
  id: z.string(),
  event_kind: z.enum(["snapshot", "registered", "proposal-changed", "decision", "removed"]),
  occurred_at: z.string(),
  payload_json: z.string(),
  state_json: z.string(),
});
export type KnowledgeTraceEvent = z.infer<typeof TraceEventSchema>;
