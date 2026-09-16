import type { LanguageCode, PassageRef } from "./scripture";
import type { ResourceLicense } from "./library";

export type ContentAcquisition =
  "bundled" | "imported" | "user-provided" | "editorial" | "generated";

export type ContentCreationMethod = "human" | "machine-assisted" | "ai-generated";

export interface Provenance {
  acquisition: ContentAcquisition;
  creationMethod: ContentCreationMethod;
  isDemo?: boolean;
  note?: string;
  packageId?: string;
  sourceArtifactIds?: string[];
  transformationIds?: string[];
  datasetId?: string;
  attribution?: string;
}

/** Bibliographic record used across scripture, knowledge, analysis and study. */
export interface SourceReference {
  id: string;
  author?: string;
  work: string;
  edition?: string;
  year?: number;
  resourceId?: string;
  url?: string;
  sourceType?: "edition" | "book" | "article" | "document" | "dataset";
  /** Language of the referenced document, independent from the application locale. */
  language?: LanguageCode;
  license?: ResourceLicense;
  provenance: Provenance;
}

/** A concrete location used as evidence; quoted text is deliberately optional. */
export interface SourceFragment {
  id: string;
  sourceId: string;
  resourceId?: string;
  locator: string;
  page?: string;
  section?: string;
  chapter?: string;
  passage?: PassageRef;
  sourceType: "primary-text" | "secondary-work" | "editorial-note" | "user-document";
  epistemicRole: "primary" | "secondary";
  /** Exact upstream artifact when the fragment comes from an imported corpus. */
  artifactId?: string;
  /** Optional quoted content; omission never means that the source has no text. */
  fragment?: string;
  provenance: Provenance;
}
