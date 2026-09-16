import { z } from "zod";
import { HistoricalRangeSchema } from "./temporal";

export const PerspectiveProfileSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  traditionIds: z.array(z.string().min(1)).default([]),
  schoolIds: z.array(z.string().min(1)).default([]),
  methodIds: z.array(z.string().min(1)).default([]),
  epistemicStanceIds: z.array(z.string().min(1)).default([]),
  interpretiveFrameworkIds: z.array(z.string().min(1)).default([]),
  historicalContext: HistoricalRangeSchema.optional(),
  authorId: z.string().optional(),
  description: z.string().optional(),
});

export type PerspectiveProfile = z.infer<typeof PerspectiveProfileSchema>;

export interface PerspectiveFilter {
  traditionIds?: string[];
  schoolIds?: string[];
  methodIds?: string[];
  epistemicStanceIds?: string[];
  interpretiveFrameworkIds?: string[];
}

export function perspectiveMatches(
  profile: PerspectiveProfile,
  filter: PerspectiveFilter,
): boolean {
  const matches = (actual: readonly string[], requested?: readonly string[]) =>
    !requested?.length || requested.some((id) => actual.includes(id));
  return (
    matches(profile.traditionIds, filter.traditionIds) &&
    matches(profile.schoolIds, filter.schoolIds) &&
    matches(profile.methodIds, filter.methodIds) &&
    matches(profile.epistemicStanceIds, filter.epistemicStanceIds) &&
    matches(profile.interpretiveFrameworkIds, filter.interpretiveFrameworkIds)
  );
}
