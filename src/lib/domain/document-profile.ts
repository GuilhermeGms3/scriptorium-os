import { z } from "zod";

export const DOCUMENT_PROFILES = [
  "study-bible",
  "commentary",
  "lexicon",
  "dictionary",
  "encyclopedia",
  "confession",
  "catechism",
  "systematic-theology",
  "biblical-theology",
  "academic-monograph",
  "exegesis-method",
  "patristic-work",
  "ancient-primary-source",
  "nag-hammadi-anthology",
  "interlinear",
  "archaeology",
  "church-history",
  "unknown",
] as const;

export const DocumentProfileSchema = z.object({
  documentId: z.string().min(1),
  profile: z.enum(DOCUMENT_PROFILES),
  method: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reviewStatus: z.enum(["machine-proposed", "accepted", "rejected"]),
  signals: z.array(z.string()),
  updatedAt: z.string().datetime(),
});

export type DocumentProfileKind = (typeof DOCUMENT_PROFILES)[number];
export type DocumentProfile = z.infer<typeof DocumentProfileSchema>;

export const DOCUMENT_PROFILE_LABELS: Record<DocumentProfileKind, string> = {
  "study-bible": "Bíblia de estudo",
  commentary: "Comentário bíblico",
  lexicon: "Léxico",
  dictionary: "Dicionário",
  encyclopedia: "Enciclopédia",
  confession: "Confissão de fé",
  catechism: "Catecismo",
  "systematic-theology": "Teologia sistemática",
  "biblical-theology": "Teologia bíblica",
  "academic-monograph": "Monografia acadêmica",
  "exegesis-method": "Método de exegese",
  "patristic-work": "Obra patrística",
  "ancient-primary-source": "Fonte primária antiga",
  "nag-hammadi-anthology": "Biblioteca de Nag Hammadi",
  interlinear: "Interlinear",
  archaeology: "Arqueologia bíblica",
  "church-history": "História da Igreja",
  unknown: "Perfil ainda não identificado",
};

export const PROCESSING_STEPS = [
  "extraction",
  "ocr",
  "classification",
  "structure",
  "analysis",
  "linking",
  "publication",
] as const;
export type DocumentProcessingStep = (typeof PROCESSING_STEPS)[number];
export type DocumentProcessingStatus =
  "pending" | "running" | "partial" | "complete" | "failed" | "skipped";

export interface DocumentProcessingState {
  documentId: string;
  step: DocumentProcessingStep;
  status: DocumentProcessingStatus;
  completedUnits: number;
  totalUnits: number;
  checkpoint: Record<string, unknown>;
  lastError?: string;
  updatedAt: string;
}

export type SemanticUnitRole =
  | "structural-heading"
  | "body"
  | "commentary"
  | "lexicon-entry"
  | "question"
  | "answer"
  | "primary-source-section"
  | "method-discussion"
  | "bibliographic"
  | "navigation-noise";
