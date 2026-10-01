import { z } from "zod";
import { DEFAULT_BIBLICAL_VERSIFICATION } from "./text-identity";

export const SEMANTIC_DOMAINS = [
  "exegesis",
  "hermeneutics",
  "theology",
  "historical-context",
  "archaeology",
  "geography",
  "textual-criticism",
  "linguistics",
  "patristics",
  "liturgy",
  "philosophy-of-religion",
  "science",
  "other",
] as const;

export const SemanticDomainSchema = z.enum(SEMANTIC_DOMAINS);
export type SemanticDomain = z.infer<typeof SemanticDomainSchema>;

export const SemanticSegmentSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  pageId: z.string().min(1),
  pageIndex: z.number().int().nonnegative(),
  ordinal: z.number().int().nonnegative(),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  structuralKind: z.enum(["heading", "paragraph", "list-item", "footnote", "unknown"]),
  textChecksum: z.string().regex(/^[a-f0-9]{64}$/i),
  language: z.string().min(2),
});

export const SemanticClassificationSchema = z.object({
  segmentId: z.string().min(1),
  domain: SemanticDomainSchema,
  score: z.number().min(0).max(1),
  method: z.string().min(1),
  evidence: z.array(z.string().min(1)),
  reviewStatus: z.enum(["machine-proposed", "accepted", "rejected"]),
});

export const SemanticPassageLinkSchema = z.object({
  id: z.string().min(1),
  segmentId: z.string().min(1),
  documentId: z.string().min(1),
  pageIndex: z.number().int().nonnegative(),
  rawReference: z.string().min(1),
  workId: z.string().min(1),
  bookId: z.string().min(1),
  chapter: z.number().int().positive(),
  verseStart: z.number().int().positive().optional(),
  verseEnd: z.number().int().positive().optional(),
  versificationSchemeId: z.string().min(1).default(DEFAULT_BIBLICAL_VERSIFICATION),
  relationType: z.enum(["cites", "discusses", "alludes-to"]),
  confidence: z.number().min(0).max(1),
  method: z.string().min(1),
  reviewStatus: z.enum(["machine-proposed", "accepted", "rejected"]),
  reviewedAt: z.string().datetime().optional(),
});

export const LocalTranslationSchema = z.object({
  id: z.string().min(1),
  sourceKind: z.enum(["primary-text-unit", "private-segment", "lexical-entry"]),
  sourceId: z.string().min(1),
  sourceLanguage: z.string().min(2),
  targetLanguage: z.string().min(2),
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/i),
  translatedText: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  modelRevision: z.string().optional(),
  reviewStatus: z.enum(["machine-generated", "human-reviewed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SemanticSegment = z.infer<typeof SemanticSegmentSchema>;
export type SemanticClassification = z.infer<typeof SemanticClassificationSchema>;
export type SemanticPassageLink = z.infer<typeof SemanticPassageLinkSchema>;
export type LocalTranslation = z.infer<typeof LocalTranslationSchema>;

export interface SemanticSegmentBundle {
  segment: SemanticSegment;
  text: string;
  classifications: SemanticClassification[];
  passageLinks: SemanticPassageLink[];
}

export interface SemanticIndexSummary {
  documentId: string;
  engineVersion: string;
  sourceChecksum: string;
  status: "processing" | "ready" | "failed";
  segmentCount: number;
  passageLinkCount: number;
  indexedAt?: string;
  error?: string;
}
