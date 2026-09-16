import { z } from "zod";
import { HistoricalRangeSchema } from "./temporal";

const LabelsSchema = z.object({
  canonicalName: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  localizedLabels: z.record(z.string(), z.string()).default({}),
  abbreviations: z.array(z.string().min(1)).default([]),
});

const BaseSchema = z.object({
  id: z.string().min(1),
  labels: LabelsSchema,
  description: z.string().optional(),
  historicalPeriod: HistoricalRangeSchema.optional(),
  sourceIds: z.array(z.string().min(1)).default([]),
});

export const TheologicalTopicSchema = BaseSchema.extend({
  kind: z.literal("theological-topic"),
  parentTopicId: z.string().optional(),
});
export const DoctrineSchema = BaseSchema.extend({
  kind: z.literal("doctrine"),
  topicIds: z.array(z.string().min(1)).default([]),
});
export const TraditionSchema = BaseSchema.extend({ kind: z.literal("tradition") });
export const SchoolSchema = BaseSchema.extend({ kind: z.literal("school") });
export const MethodSchema = BaseSchema.extend({ kind: z.literal("method") });
export const EpistemicStanceSchema = BaseSchema.extend({ kind: z.literal("epistemic-stance") });
export const InterpretiveFrameworkSchema = BaseSchema.extend({
  kind: z.literal("interpretive-framework"),
});
export const PositionSchema = BaseSchema.extend({
  kind: z.literal("position"),
  doctrineIds: z.array(z.string().min(1)).default([]),
});
export const TheorySchema = BaseSchema.extend({
  kind: z.literal("theory"),
  componentClaimIds: z.array(z.string().min(1)).default([]),
  assumptionClaimIds: z.array(z.string().min(1)).default([]),
  proponentIds: z.array(z.string().min(1)).default([]),
});

export const OntologyEntitySchema = z.discriminatedUnion("kind", [
  TheologicalTopicSchema,
  DoctrineSchema,
  TraditionSchema,
  SchoolSchema,
  MethodSchema,
  EpistemicStanceSchema,
  InterpretiveFrameworkSchema,
  PositionSchema,
  TheorySchema,
]);

export type TheologicalTopic = z.infer<typeof TheologicalTopicSchema>;
export type Doctrine = z.infer<typeof DoctrineSchema>;
export type Tradition = z.infer<typeof TraditionSchema>;
export type School = z.infer<typeof SchoolSchema>;
export type Method = z.infer<typeof MethodSchema>;
export type EpistemicStance = z.infer<typeof EpistemicStanceSchema>;
export type InterpretiveFramework = z.infer<typeof InterpretiveFrameworkSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type Theory = z.infer<typeof TheorySchema>;
export type OntologyEntity = z.infer<typeof OntologyEntitySchema>;

export const ONTOLOGY_RELATION_TYPES = [
  "belongs-to-topic",
  "addresses-doctrine",
  "historically-affirms",
  "historically-rejects",
  "associated-with",
  "used-by-analysis",
  "competes-with",
  "influences",
] as const;

export const OntologyRelationSchema = z.object({
  id: z.string().min(1),
  fromEntityId: z.string().min(1),
  toEntityId: z.string().min(1),
  relationType: z.enum(ONTOLOGY_RELATION_TYPES),
  sourceIds: z.array(z.string().min(1)).default([]),
  historicalValidity: HistoricalRangeSchema.optional(),
  notes: z.string().optional(),
});

export type OntologyRelation = z.infer<typeof OntologyRelationSchema>;
