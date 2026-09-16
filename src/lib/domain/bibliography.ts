import { z } from "zod";
import { HistoricalDateSchema } from "./temporal";
import { TextAnchorSchema } from "./text-identity";

const IdSchema = z.string().min(1);
const LocalizedLabelSchema = z.object({ language: z.string().min(2), value: z.string().min(1) });

export const AuthorSchema = z.object({
  id: IdSchema,
  canonicalName: z.string().min(1),
  aliases: z.array(LocalizedLabelSchema).default([]),
  type: z.enum(["person", "organization", "collective", "anonymous", "traditional-attribution"]),
  birth: HistoricalDateSchema.optional(),
  death: HistoricalDateSchema.optional(),
  traditionIds: z.array(IdSchema).default([]),
  identifiers: z.record(z.string(), z.string().min(1)).default({}),
  notes: z.string().optional(),
});

export const WorkSchema = z.object({
  id: IdSchema,
  canonicalTitle: z.string().min(1),
  alternativeTitles: z.array(LocalizedLabelSchema).default([]),
  authorIds: z.array(IdSchema).default([]),
  languageOriginal: z.string().optional(),
  workType: z.string().min(1),
  compositionDate: HistoricalDateSchema.optional(),
  description: z.string().optional(),
});

export const EditionSchema = z.object({
  id: IdSchema,
  workId: IdSchema,
  title: z.string().min(1),
  language: z.string().min(2),
  publisher: z.string().optional(),
  publicationDate: HistoricalDateSchema.optional(),
  editionStatement: z.string().optional(),
  editorIds: z.array(IdSchema).default([]),
  translatorIds: z.array(IdSchema).default([]),
  identifiers: z.record(z.string(), z.string().min(1)).default({}),
  url: z.string().url().optional(),
});

export const SOURCE_TYPES = [
  "book",
  "journal",
  "journal-issue",
  "journal-article",
  "chapter",
  "thesis",
  "dissertation",
  "conference-paper",
  "encyclopedia-entry",
  "website",
  "manuscript",
  "papyrus",
  "inscription",
  "archaeological-report",
  "council-document",
  "creed",
  "confession",
  "catechism",
  "ancient-work",
  "patristic-work",
  "rabbinic-source",
  "user-document",
  "dataset",
] as const;

export const SourceRightsSchema = z.object({
  metadataRedistributable: z.boolean(),
  contentRedistributable: z.boolean(),
  quoteAllowed: z.boolean().optional(),
  localOnly: z.boolean(),
  license: z.string().optional(),
  notes: z.string().optional(),
});

export const BibliographicSourceSchema = z.object({
  id: IdSchema,
  workId: IdSchema.optional(),
  editionId: IdSchema.optional(),
  parentSourceId: IdSchema.optional(),
  title: z.string().min(1),
  sourceType: z.enum(SOURCE_TYPES),
  language: z.string().optional(),
  authorIds: z.array(IdSchema).default([]),
  identifiers: z.record(z.string(), z.string().min(1)).default({}),
  publicationYear: z.number().int().optional(),
  publisher: z.string().optional(),
  abstract: z.string().optional(),
  rights: SourceRightsSchema,
  provenance: z.object({
    origin: z.string().min(1),
    importMethod: z.string().min(1),
    importedAt: z.string().datetime(),
    checksum: z
      .string()
      .regex(/^[a-f0-9]{64}$/i)
      .optional(),
    localAssetId: IdSchema.optional(),
    externalReference: z.string().optional(),
    isDemo: z.boolean().optional(),
  }),
});

export const SourceLocatorSchema = z
  .object({
    sourceId: IdSchema,
    pageStart: z.string().optional(),
    pageEnd: z.string().optional(),
    volume: z.string().optional(),
    issue: z.string().optional(),
    chapter: z.string().optional(),
    section: z.string().optional(),
    subsection: z.string().optional(),
    paragraph: z.string().optional(),
    fragment: z.string().optional(),
    saying: z.string().optional(),
    folio: z.string().optional(),
    side: z.enum(["recto", "verso"]).optional(),
    column: z.string().optional(),
    lineStart: z.string().optional(),
    lineEnd: z.string().optional(),
    canonicalLocator: z.string().optional(),
  })
  .superRefine((locator, context) => {
    if (!Object.entries(locator).some(([key, value]) => key !== "sourceId" && value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A locator must identify a location.",
      });
    }
  });

export const CitationSchema = z
  .object({
    id: IdSchema,
    sourceId: IdSchema,
    locator: SourceLocatorSchema.optional(),
    contentKind: z.enum(["exact-quote", "paraphrase", "summary", "reference-only"]),
    originalText: z.string().optional(),
    originalLanguage: z.string().optional(),
    translatedText: z.string().optional(),
    translator: z.string().optional(),
    note: z.string().optional(),
    provenance: z.object({
      origin: z.string(),
      creationMethod: z.string(),
      isDemo: z.boolean().optional(),
    }),
    reviewStatus: z.enum(["draft", "reviewed", "verified", "disputed", "deprecated"]),
  })
  .superRefine((citation, context) => {
    if (citation.contentKind === "exact-quote" && !citation.originalText?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An exact quotation requires originalText.",
        path: ["originalText"],
      });
    }
  });

export const CitationRelationSchema = z
  .object({
    id: IdSchema,
    citationId: IdSchema,
    relationType: z.enum(["supports", "challenges", "qualifies", "evidence-for", "contextualizes"]),
    targetKind: z.enum(["claim", "argument", "theory", "passage"]),
    targetId: IdSchema.optional(),
    targetAnchor: TextAnchorSchema.optional(),
  })
  .refine((value) => value.targetId || value.targetAnchor, "Citation relation requires a target.");

export const LocalAssetSchema = z.object({
  id: IdSchema,
  sourceId: IdSchema,
  storageReference: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
  originalName: z.string().min(1),
  importedAt: z.string().datetime(),
});

export type Author = z.infer<typeof AuthorSchema>;
export type BibliographicWork = z.infer<typeof WorkSchema>;
export type BibliographicEdition = z.infer<typeof EditionSchema>;
export type BibliographicSource = z.infer<typeof BibliographicSourceSchema>;
export type SourceLocator = z.infer<typeof SourceLocatorSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type CitationRelation = z.infer<typeof CitationRelationSchema>;
export type LocalAsset = z.infer<typeof LocalAssetSchema>;
