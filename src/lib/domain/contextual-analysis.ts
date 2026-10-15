import { z } from "zod";

export const ContextualAnalysisSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().min(20).max(3000),
  rationale: z.string().min(20).max(2000),
  contentType: z.enum([
    "exegetical-note",
    "theological-interpretation",
    "methodological-guidance",
    "historical-context",
    "homiletical-application",
  ]),
  limitations: z.array(z.string().min(3).max(600)).max(10),
});
