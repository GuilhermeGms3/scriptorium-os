/**
 * Scriptorium — Library domain model.
 *
 * Licensing is a first-class architectural concern: every importable
 * resource must be able to carry license metadata, and redistribution
 * is never assumed.
 */

export interface ResourceLicense {
  name: string;
  copyrightHolder?: string;
  redistributionAllowed: boolean;
  commercialUseAllowed?: boolean;
  attributionRequired?: boolean;
  attributionText?: string;
  sourceUrl?: string;
}

export type ResourceType =
  | "bible"
  | "commentary"
  | "dictionary"
  | "lexicon"
  | "theology"
  | "history"
  | "language"
  | "ancient-literature"
  | "article"
  | "personal-document";

export type ResourceAvailability = "local" | "remote" | "not-downloaded";

export type IndexingStatus = "indexed" | "pending" | "not-indexed";

export interface LibraryResource {
  id: string;
  title: string;
  author?: string;
  type: ResourceType;
  language: string;
  year?: number;
  publisher?: string;
  license?: ResourceLicense;
  sourceUrl?: string;
  tags: string[];
  description?: string;
  availability: ResourceAvailability;
  indexingStatus: IndexingStatus;
  /** True for bundled DEMO/SEED resources. */
  isDemo?: boolean;
}

export interface LibraryCollection {
  id: string;
  name: string;
  resourceIds: string[];
}

/** Future import formats — declared now so the import UI is honest about scope. */
export type ImportFormat = "pdf" | "epub" | "sword" | "scriptorium-package";

export const IMPORT_FORMAT_LABELS: Record<ImportFormat, string> = {
  pdf: "PDF document",
  epub: "EPUB book",
  sword: "SWORD module",
  "scriptorium-package": "Scriptorium Resource Package",
};
