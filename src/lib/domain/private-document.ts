import { z } from "zod";

const ChecksumSchema = z.string().regex(/^[a-f0-9]{64}$/i);

export const PrivateDocumentPageSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  pageIndex: z.number().int().nonnegative(),
  pageLabel: z.string().min(1),
  text: z.string(),
  characterCount: z.number().int().nonnegative(),
  extractionMethod: z.enum(["pdf-text-layer", "ocr", "empty"]),
  quality: z.object({
    hasText: z.boolean(),
    itemCount: z.number().int().nonnegative(),
  }),
});

export const PrivateDocumentSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  assetId: z.string().min(1),
  title: z.string().min(1),
  language: z.string().optional(),
  pageCount: z.number().int().positive(),
  textPageCount: z.number().int().nonnegative(),
  sizeBytes: z.number().int().positive(),
  checksum: ChecksumSchema,
  extractionMethod: z.enum(["pdf-text-layer", "ocr", "mixed"]),
  importedAt: z.string().datetime(),
});

export const ExtractedPrivateDocumentSchema = z.object({
  title: z.string().min(1),
  language: z.string().default("pt-BR"),
  originalName: z.string().min(1),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive(),
  checksum: ChecksumSchema,
  pageCount: z.number().int().positive(),
  textPageCount: z.number().int().nonnegative(),
  extractionMethod: z.literal("pdf-text-layer"),
  pages: z.array(
    z.object({
      pageIndex: z.number().int().nonnegative(),
      pageLabel: z.string().min(1),
      text: z.string(),
      itemCount: z.number().int().nonnegative(),
      layout: z
        .array(
          z.object({
            text: z.string(),
            transform: z.array(z.number().finite()).length(6),
            width: z.number().finite(),
            height: z.number().finite(),
          }),
        )
        .optional(),
    }),
  ),
});

export type PrivateDocument = z.infer<typeof PrivateDocumentSchema>;
export type PrivateDocumentPage = z.infer<typeof PrivateDocumentPageSchema>;
export type ExtractedPrivateDocument = z.infer<typeof ExtractedPrivateDocumentSchema>;

export interface PrivateDocumentSearchHit {
  documentId: string;
  sourceId: string;
  title: string;
  pageIndex: number;
  pageLabel: string;
  snippet: string;
  rank: number;
}
