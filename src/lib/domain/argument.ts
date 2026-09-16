import { z } from "zod";
import { TextAnchorSchema } from "./text-identity";
import { PerspectiveProfileSchema } from "./perspective";

export const ARGUMENT_RELATION_TYPES = [
  "supports",
  "opposes",
  "objects-to",
  "responds-to",
  "qualifies",
  "depends-on",
  "undercuts",
  "rebuts",
  "alternative-to",
  "competes-with",
  "derived-from",
] as const;

export type ArgumentRelationType = (typeof ARGUMENT_RELATION_TYPES)[number];

export const EvidenceTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text-anchor"), anchor: TextAnchorSchema }),
  z.object({ kind: z.literal("manuscript-witness"), witnessId: z.string().min(1) }),
  z.object({ kind: z.literal("archaeological-evidence"), evidenceId: z.string().min(1) }),
  z.object({ kind: z.literal("historical-source"), sourceId: z.string().min(1) }),
  z.object({ kind: z.literal("academic-source"), sourceId: z.string().min(1) }),
  z.object({ kind: z.literal("linguistic-observation"), observationId: z.string().min(1) }),
  z.object({ kind: z.literal("statistical-analysis"), analysisId: z.string().min(1) }),
]);

export const EvidenceRecordSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  target: EvidenceTargetSchema,
  sourceIds: z.array(z.string().min(1)).default([]),
  reviewStatus: z.enum(["draft", "reviewed", "verified", "disputed", "deprecated"]),
  authorship: z.enum(["human-authored", "machine-assisted", "machine-generated", "human-reviewed"]),
  notes: z.string().optional(),
});

export const ArgumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  conclusionClaimId: z.string().min(1),
  premiseClaimIds: z.array(z.string().min(1)).min(1),
  argumentType: z
    .enum(["deductive", "inductive", "abductive", "analogical", "historical"])
    .optional(),
  perspectiveProfileIds: z.array(z.string().min(1)).default([]),
  inlinePerspective: PerspectiveProfileSchema.optional(),
  sourceIds: z.array(z.string().min(1)).default([]),
  notes: z.string().optional(),
});

export const ArgumentRelationSchema = z.object({
  id: z.string().min(1),
  fromKind: z.enum(["claim", "argument", "evidence", "theory"]),
  fromId: z.string().min(1),
  toKind: z.enum(["claim", "argument", "evidence", "theory"]),
  toId: z.string().min(1),
  relationType: z.enum(ARGUMENT_RELATION_TYPES),
  sourceIds: z.array(z.string().min(1)).default([]),
  notes: z.string().optional(),
});

export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;
export type Argument = z.infer<typeof ArgumentSchema>;
export type ArgumentRelation = z.infer<typeof ArgumentRelationSchema>;
