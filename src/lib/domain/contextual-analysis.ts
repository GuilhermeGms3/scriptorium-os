import { z } from "zod";

export const ContextualAnalysisSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().min(20).max(12000),
  /** Absent in legacy assistant syntheses; source excerpts must match their literal evidence. */
  mode: z.enum(["source-excerpt"]).optional(),
  sourceContext: z
    .object({
      kind: z.enum([
        "patristic-exposition",
        "catechism",
        "confession",
        "intertextual-commentary",
        "biblical-handbook",
      ]),
      locator: z.string().min(1).max(300),
      sectionPath: z.array(z.string().min(1).max(300)).max(8),
      authorLabel: z.string().min(1).max(200).optional(),
      traditionLabel: z.string().min(1).max(200).optional(),
    })
    .optional(),
  /** A real page of this source, not an externally supplied image URL. */
  sourceVisual: z
    .object({
      physicalPage: z.number().int().positive(),
      kind: z.enum(["map", "archaeological-illustration"]),
      caption: z.string().min(3).max(600),
    })
    .optional(),
  rationale: z.string().min(20).max(2000),
  contentType: z.enum([
    "exegetical-note",
    "source-commentary",
    "theological-interpretation",
    "methodological-guidance",
    "historical-context",
    "homiletical-application",
  ]),
  limitations: z.array(z.string().min(3).max(600)).max(10),
});
