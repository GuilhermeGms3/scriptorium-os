import { z } from "zod";

export const HistoricalDateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("exact-year"), year: z.number().int() }),
  z.object({ kind: z.literal("approximate-year"), year: z.number().int() }),
  z.object({
    kind: z.literal("century"),
    century: z
      .number()
      .int()
      .refine((value) => value !== 0),
    era: z.enum(["BCE", "CE"]),
  }),
  z.object({ kind: z.literal("before"), year: z.number().int() }),
  z.object({ kind: z.literal("after"), year: z.number().int() }),
  z.object({ kind: z.literal("unknown") }),
]);

export type HistoricalDate = z.infer<typeof HistoricalDateSchema>;

export const HistoricalRangeSchema = z.object({
  from: HistoricalDateSchema.optional(),
  until: HistoricalDateSchema.optional(),
  note: z.string().optional(),
});

export type HistoricalRange = z.infer<typeof HistoricalRangeSchema>;
