import { z } from "zod";
import { DocumentPassageSchema } from "./document-knowledge";
import { SemanticDomainSchema } from "./semantic-content";
import { ContextualAnalysisSchema } from "./contextual-analysis";

/** A private reading batch, not a workspace restore or a claim of whole-book coverage. */
export const ContextualReadingPackageSchema = z.object({
  format: z.literal("scriptorium-contextual-reading-v1"),
  batchId: z.string().regex(/^[a-z0-9-]{3,100}$/),
  analyst: z.string().min(3).max(120),
  createdAt: z.string().datetime(),
  coverage: z.string().min(20).max(2000),
  notes: z
    .array(
      z.object({
        sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
        fragments: z
          .array(
            z.object({
              physicalPage: z.number().int().positive(),
              quote: z.string().min(20).max(12000),
            }),
          )
          .min(1)
          .max(5),
        rawReference: z.string().min(1).max(200),
        passage: DocumentPassageSchema,
        additionalPassages: z.array(DocumentPassageSchema).max(100).default([]),
        relationScope: z.enum(["verse", "range", "pericope", "chapter", "book"]),
        domains: z.array(SemanticDomainSchema).min(1).max(6),
        analysis: ContextualAnalysisSchema,
      }),
    )
    .min(1)
    .max(200),
});
export type ContextualReadingPackage = z.infer<typeof ContextualReadingPackageSchema>;
