import { z } from "zod";
import { CLAIM_KINDS } from "./knowledge";
import { SEMANTIC_DOMAINS } from "./semantic-content";

export const DOCUMENT_NODE_KINDS = [
  "book",
  "front-matter",
  "part",
  "chapter",
  "section",
  "subsection",
  "back-matter",
  "bibliography",
] as const;

export const DocumentNodeSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  kind: z.enum(DOCUMENT_NODE_KINDS),
  title: z.string().min(1).optional(),
  ordinal: z.number().int().nonnegative(),
  pageStart: z.number().int().nonnegative(),
  pageEnd: z.number().int().nonnegative(),
  method: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reviewStatus: z.enum(["machine-proposed", "accepted", "rejected"]),
});

export const SemanticUnitSpanSchema = z.object({
  unitId: z.string().min(1),
  pageId: z.string().min(1),
  pageIndex: z.number().int().nonnegative(),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  ordinal: z.number().int().nonnegative(),
});

export const SemanticUnitSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  documentNodeId: z.string().min(1).optional(),
  kind: z.enum([
    "heading",
    "paragraph",
    "quotation",
    "footnote",
    "list-item",
    "bibliography-entry",
    "unknown",
  ]),
  ordinal: z.number().int().nonnegative(),
  textChecksum: z.string().regex(/^[a-f0-9]{64}$/i),
  language: z.string().min(2),
  method: z.string().min(1),
  spans: z.array(SemanticUnitSpanSchema).min(1),
  text: z.string(),
});

const passageSchema = z.object({
  workId: z.string().min(1).optional(),
  bookId: z.string().min(1),
  chapter: z.number().int().positive(),
  verseStart: z.number().int().positive().optional(),
  verseEnd: z.number().int().positive().optional(),
  versificationSchemeId: z.string().min(1),
});

export const KnowledgeProposalPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("claim"),
    proposition: z.string().min(1),
    claimKind: z.enum(CLAIM_KINDS),
    qualifiers: z.array(z.string().min(1)).default([]),
  }),
  z.object({
    kind: z.literal("argument"),
    conclusion: z.string().min(1),
    premises: z.array(z.string().min(1)).min(1),
    marker: z.string().min(1),
  }),
  z.object({
    kind: z.literal("citation"),
    quotedText: z.string().min(1),
    citationKind: z.enum(["exact-quote", "possible-quote"]),
  }),
  z.object({
    kind: z.literal("entity"),
    label: z.string().min(1),
    entityType: z.enum(["person", "work", "concept"]),
  }),
  z.object({
    kind: z.literal("passage-relation"),
    rawReference: z.string().min(1),
    relationType: z.enum(["cites", "discusses", "alludes-to"]),
    passage: passageSchema,
  }),
  z.object({
    kind: z.literal("topic-assignment"),
    domain: z.enum(SEMANTIC_DOMAINS),
    evidence: z.array(z.string().min(1)),
  }),
]);

export const KnowledgeProposalSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  semanticUnitId: z.string().min(1),
  proposalKind: z.enum([
    "claim",
    "argument",
    "citation",
    "entity",
    "passage-relation",
    "topic-assignment",
  ]),
  payload: KnowledgeProposalPayloadSchema,
  method: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reviewStatus: z.enum(["machine-proposed", "accepted", "rejected"]),
  reviewedAt: z.string().datetime().optional(),
  reviewNote: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DocumentKnowledgeIndexSummarySchema = z.object({
  documentId: z.string().min(1),
  analyzerId: z.string().min(1),
  analyzerVersion: z.string().min(1),
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/i),
  status: z.enum(["processing", "ready", "failed"]),
  stage: z.enum(["structure", "proposals", "aggregation", "complete"]),
  checkpointPage: z.number().int().nonnegative(),
  nodeCount: z.number().int().nonnegative(),
  unitCount: z.number().int().nonnegative(),
  proposalCount: z.number().int().nonnegative(),
  indexedAt: z.string().datetime().optional(),
  error: z.string().optional(),
});

export type DocumentNode = z.infer<typeof DocumentNodeSchema>;
export type SemanticUnit = z.infer<typeof SemanticUnitSchema>;
export type SemanticUnitSpan = z.infer<typeof SemanticUnitSpanSchema>;
export type KnowledgeProposalPayload = z.infer<typeof KnowledgeProposalPayloadSchema>;
export type KnowledgeProposal = z.infer<typeof KnowledgeProposalSchema>;
export type DocumentKnowledgeIndexSummary = z.infer<typeof DocumentKnowledgeIndexSummarySchema>;

export interface DocumentKnowledgeAggregate {
  documentId: string;
  nodeCount: number;
  unitCount: number;
  proposalCount: number;
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  acceptedByKind: Partial<Record<KnowledgeProposal["proposalKind"], number>>;
  acceptedProposals: KnowledgeProposal[];
}

export interface DocumentKnowledgeExport {
  format: "scriptorium-private-knowledge-export-v1";
  exportedAt: string;
  localOnly: true;
  requiresRightsReview: true;
  document: { id: string; sourceId: string; title: string; checksum: string };
  structure: DocumentNode[];
  evidenceUnits: SemanticUnit[];
  proposals: KnowledgeProposal[];
}
