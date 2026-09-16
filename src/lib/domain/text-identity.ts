import { z } from "zod";

export const DEFAULT_BIBLICAL_VERSIFICATION = "scriptorium-bcv-1";

export const PassageAddressSchema = z
  .object({
    workId: z.string().min(1),
    versificationSchemeId: z.string().min(1),
    bookId: z.string().min(1).optional(),
    chapter: z.number().int().positive().optional(),
    verseStart: z.number().int().nonnegative().optional(),
    verseEnd: z.number().int().nonnegative().optional(),
    subverseStart: z.string().min(1).optional(),
    subverseEnd: z.string().min(1).optional(),
    section: z.string().min(1).optional(),
    paragraph: z.string().min(1).optional(),
    saying: z.string().min(1).optional(),
    fragment: z.string().min(1).optional(),
    page: z.string().min(1).optional(),
    column: z.string().min(1).optional(),
    lineStart: z.number().int().nonnegative().optional(),
    lineEnd: z.number().int().nonnegative().optional(),
  })
  .superRefine((address, context) => {
    if (address.verseEnd !== undefined && address.verseStart === undefined) {
      context.addIssue({ code: "custom", message: "verseEnd requires verseStart" });
    }
    if (
      address.verseStart !== undefined &&
      address.verseEnd !== undefined &&
      address.verseEnd < address.verseStart
    ) {
      context.addIssue({ code: "custom", message: "verseEnd precedes verseStart" });
    }
    if (address.subverseEnd !== undefined && address.subverseStart === undefined) {
      context.addIssue({ code: "custom", message: "subverseEnd requires subverseStart" });
    }
    if (address.lineEnd !== undefined && address.lineStart === undefined) {
      context.addIssue({ code: "custom", message: "lineEnd requires lineStart" });
    }
  });

export type PassageAddress = z.infer<typeof PassageAddressSchema>;

export const VersificationSchemeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  abbreviation: z.string().min(1).optional(),
  description: z.string().optional(),
  tradition: z.string().optional(),
  sourceId: z.string().optional(),
  version: z.string().optional(),
});

export type VersificationScheme = z.infer<typeof VersificationSchemeSchema>;

export type TextUnitId = string;
export type TextUnitType =
  | "verse"
  | "verse-part"
  | "paragraph"
  | "superscription"
  | "title"
  | "fragment"
  | "line"
  | "sentence"
  | "section";

export const TextAnchorSchema = z
  .object({
    kind: z.enum(["text-unit", "text-range", "passage"]),
    workId: z.string().min(1),
    corpusId: z.string().min(1).optional(),
    editionId: z.string().min(1).optional(),
    versificationSchemeId: z.string().min(1).optional(),
    startUnitId: z.string().min(1).optional(),
    endUnitId: z.string().min(1).optional(),
    passage: PassageAddressSchema.optional(),
    startOffset: z.number().int().nonnegative().optional(),
    endOffset: z.number().int().nonnegative().optional(),
  })
  .superRefine((anchor, context) => {
    if (anchor.kind === "passage" && !anchor.passage) {
      context.addIssue({ code: "custom", message: "passage anchor requires passage" });
    }
    if (anchor.kind === "text-unit" && !anchor.startUnitId) {
      context.addIssue({ code: "custom", message: "text-unit anchor requires startUnitId" });
    }
    if (anchor.kind === "text-range" && (!anchor.startUnitId || !anchor.endUnitId)) {
      context.addIssue({ code: "custom", message: "text-range anchor requires both unit IDs" });
    }
    if (anchor.endOffset !== undefined && anchor.startOffset === undefined) {
      context.addIssue({ code: "custom", message: "endOffset requires startOffset" });
    }
  });

export type TextAnchor = z.infer<typeof TextAnchorSchema>;

export const CROSSWALK_RELATION_TYPES = [
  "equivalent",
  "partial",
  "contains",
  "contained-by",
  "split",
  "merged",
  "reordered",
  "approximate",
  "no-equivalent",
] as const;

export type CrosswalkRelationType = (typeof CROSSWALK_RELATION_TYPES)[number];

export const CrosswalkRelationSchema = z
  .object({
    id: z.string().min(1),
    sourceSchemeId: z.string().min(1),
    targetSchemeId: z.string().min(1),
    sourceAnchors: z.array(TextAnchorSchema).min(1),
    targetAnchors: z.array(TextAnchorSchema),
    relationType: z.enum(CROSSWALK_RELATION_TYPES),
    confidence: z.number().min(0).max(1).optional(),
    sourceId: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((relation, context) => {
    if (relation.sourceSchemeId === relation.targetSchemeId) {
      context.addIssue({ code: "custom", message: "crosswalk schemes must differ" });
    }
    if (relation.relationType === "no-equivalent" && relation.targetAnchors.length > 0) {
      context.addIssue({ code: "custom", message: "no-equivalent cannot have target anchors" });
    }
    if (relation.relationType !== "no-equivalent" && relation.targetAnchors.length === 0) {
      context.addIssue({ code: "custom", message: "mapping requires a target anchor" });
    }
  });

export type CrosswalkRelation = z.infer<typeof CrosswalkRelationSchema>;

export function addressKey(address: PassageAddress): string {
  const fields = [
    address.versificationSchemeId,
    address.workId,
    address.bookId ?? "",
    address.chapter ?? "",
    address.verseStart ?? "",
    address.verseEnd ?? address.verseStart ?? "",
    address.subverseStart ?? "",
    address.subverseEnd ?? address.subverseStart ?? "",
    address.section ?? "",
    address.paragraph ?? "",
    address.saying ?? "",
    address.fragment ?? "",
    address.page ?? "",
    address.column ?? "",
    address.lineStart ?? "",
    address.lineEnd ?? address.lineStart ?? "",
  ];
  return fields.map((value) => encodeURIComponent(String(value))).join("|");
}

export function textAnchorKey(anchor: TextAnchor): string {
  return [
    anchor.kind,
    anchor.corpusId ?? "*",
    anchor.editionId ?? "*",
    anchor.workId,
    anchor.versificationSchemeId ?? anchor.passage?.versificationSchemeId ?? "*",
    anchor.startUnitId ?? "*",
    anchor.endUnitId ?? anchor.startUnitId ?? "*",
    anchor.passage ? addressKey(anchor.passage) : "*",
    anchor.startOffset ?? "*",
    anchor.endOffset ?? anchor.startOffset ?? "*",
  ].join(":");
}

function rangeOverlaps(
  leftStart: number | undefined,
  leftEnd: number | undefined,
  rightStart: number | undefined,
  rightEnd: number | undefined,
): boolean {
  const lStart = leftStart ?? 0;
  const lEnd = leftEnd ?? leftStart ?? Number.MAX_SAFE_INTEGER;
  const rStart = rightStart ?? 0;
  const rEnd = rightEnd ?? rightStart ?? Number.MAX_SAFE_INTEGER;
  return lStart <= rEnd && rStart <= lEnd;
}

export function addressesOverlapDirectly(left: PassageAddress, right: PassageAddress): boolean {
  if (
    left.versificationSchemeId !== right.versificationSchemeId ||
    left.workId !== right.workId ||
    left.bookId !== right.bookId ||
    left.chapter !== right.chapter
  ) {
    return false;
  }
  if (!rangeOverlaps(left.verseStart, left.verseEnd, right.verseStart, right.verseEnd)) {
    return false;
  }
  if (left.lineStart !== undefined || right.lineStart !== undefined) {
    return rangeOverlaps(left.lineStart, left.lineEnd, right.lineStart, right.lineEnd);
  }
  if (left.subverseStart !== undefined || right.subverseStart !== undefined) {
    const leftSubverse = left.subverseStart ?? "";
    const rightSubverse = right.subverseStart ?? "";
    return leftSubverse === "" || rightSubverse === "" || leftSubverse === rightSubverse;
  }
  return true;
}

export function anchorsOverlapDirectly(left: TextAnchor, right: TextAnchor): boolean {
  if (left.workId !== right.workId) return false;
  if (left.editionId && right.editionId && left.editionId !== right.editionId) return false;
  if (left.corpusId && right.corpusId && left.corpusId !== right.corpusId) return false;
  if (left.startUnitId && right.startUnitId) {
    const leftIds = new Set([left.startUnitId, left.endUnitId ?? left.startUnitId]);
    return leftIds.has(right.startUnitId) || leftIds.has(right.endUnitId ?? right.startUnitId);
  }
  return Boolean(
    left.passage && right.passage && addressesOverlapDirectly(left.passage, right.passage),
  );
}

export function anchorsOverlapViaCrosswalk(
  left: TextAnchor,
  right: TextAnchor,
  relations: readonly CrosswalkRelation[],
): boolean {
  if (anchorsOverlapDirectly(left, right)) return true;
  return relations.some((relation) => {
    if (relation.relationType === "no-equivalent") return false;
    const forward =
      relation.sourceAnchors.some((anchor) => anchorsOverlapDirectly(anchor, left)) &&
      relation.targetAnchors.some((anchor) => anchorsOverlapDirectly(anchor, right));
    const reverse =
      relation.sourceAnchors.some((anchor) => anchorsOverlapDirectly(anchor, right)) &&
      relation.targetAnchors.some((anchor) => anchorsOverlapDirectly(anchor, left));
    return forward || reverse;
  });
}

export function deterministicTextUnitId(input: {
  corpusId: string;
  editionId: string;
  workId: string;
  sequence: number;
}): TextUnitId {
  return `textunit:${encodeURIComponent(input.corpusId)}:${encodeURIComponent(input.editionId)}:${encodeURIComponent(input.workId)}:${String(input.sequence).padStart(8, "0")}`;
}
