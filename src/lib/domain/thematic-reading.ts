import { z } from "zod";
import { SemanticDomainSchema } from "./semantic-content";

/** Documentary structure, not a doctrinal conclusion or a biblical commentary. */
export const ThematicContextSchema = z.object({
  topicIds: z
    .array(z.string().regex(/^(?:study-guide|topic|doctrine):[a-z0-9-]+$/))
    .min(1)
    .max(20),
  locator: z.string().min(3).max(500),
  sectionPath: z.array(z.string().min(1).max(300)).min(1).max(8),
  role: z.enum(["question", "objection", "counterpoint", "response", "reply", "section", "entry"]),
  author: z.string().min(1).max(200),
  tradition: z.string().min(1).max(200),
  rationale: z.string().min(20).max(1500),
  limitations: z.array(z.string().min(3).max(500)).min(1).max(8),
  headword: z
    .object({
      lemma: z.string().min(1).max(100),
      normalized: z.string().min(1).max(100),
      language: z.enum(["grc", "hbo"]),
      extent: z.literal("page-local"),
    })
    .optional(),
});
export type ThematicContext = z.infer<typeof ThematicContextSchema>;

export const ThematicReadingPackageSchema = z.object({
  format: z.literal("scriptorium-thematic-readings-v1"),
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  entries: z
    .array(
      z.object({
        domain: SemanticDomainSchema,
        context: ThematicContextSchema,
        fragments: z
          .array(
            z.object({
              physicalPage: z.number().int().positive(),
              pageTextChecksum: z.string().regex(/^[a-f0-9]{64}$/),
              startOffset: z.number().int().nonnegative(),
              endOffset: z.number().int().positive(),
              quote: z.string().min(20).max(12000),
            }),
          )
          .min(1)
          .max(5),
      }),
    )
    .min(1)
    .max(100),
});
