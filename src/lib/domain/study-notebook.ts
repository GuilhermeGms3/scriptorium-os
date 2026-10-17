import { z } from "zod";

export const StudyColorSchema = z.string().regex(/^#[\da-f]{6}$/iu);
const identity = z.string().min(1).max(500);
/** Locators, never a second copy of the source book or an arbitrary URL. Pages are one-based. */
export const StudySourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("bibliographic"),
    sourceId: identity,
    title: z.string().min(1).max(1000),
    locator: z.string().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("private-document"),
    documentId: identity,
    unitId: identity.optional(),
    title: z.string().min(1).max(1000),
    page: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("primary-text"),
    workId: identity,
    unitId: identity.optional(),
    title: z.string().min(1).max(1000),
  }),
]);
export type StudySource = z.infer<typeof StudySourceSchema>;
export interface NoteConnection {
  sourceId: string;
  targetId: string;
  createdAt: string;
}
export function studySourceHref(source: StudySource): string {
  const valid = StudySourceSchema.parse(source);
  if (valid.kind === "bibliographic")
    return `/library?source=${encodeURIComponent(valid.sourceId)}`;
  return valid.kind === "private-document"
    ? `/library/document/${encodeURIComponent(valid.documentId)}?page=${valid.page}${valid.unitId ? `&unit=${encodeURIComponent(valid.unitId)}` : ""}`
    : `/library/read/${encodeURIComponent(valid.workId)}${valid.unitId ? `?unit=${encodeURIComponent(valid.unitId)}` : ""}`;
}
export function orderedNotePair(a: string, b: string): [string, string] {
  if (!a || !b || a === b) throw new Error("Escolha duas notas diferentes.");
  return a < b ? [a, b] : [b, a];
}
