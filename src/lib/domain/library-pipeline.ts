import type { SemanticDomain } from "./semantic-content";

export type LibraryPipelineStage =
  "queued" | "ocr" | "structure" | "linking" | "complete" | "failed";

export interface LibraryPipelineOptions {
  editionId: string;
  useLlm: boolean;
  recoverEmptyPages: boolean;
  analyzer: "deterministic" | "contextual";
  ocrLanguage: string;
  sourceSchemeConfirmed: boolean;
}

export interface LibraryPipelineProgress {
  documentId?: string;
  documentTitle?: string;
  documentIndex: number;
  totalDocuments: number;
  stage: LibraryPipelineStage;
  message: string;
}

export interface LibraryPipelineResult {
  runId: string;
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  failures: Array<{ documentId: string; title: string; message: string }>;
}

export interface LibraryCoverageReport {
  generatedAt: string;
  documents: {
    total: number;
    textReady: number;
    ocrPending: number;
    structured: number;
    linked: number;
    failed: number;
  };
  connections: {
    explicitVisible: number;
    inferredVisible: number;
    awaitingSample: number;
    withheld: number;
    revoked: number;
    distinctBooks: number;
    distinctChapters: number;
    distinctVerses: number;
  };
  proposals: {
    total: number;
    accepted: number;
    machineProposed: number;
    rejected: number;
  };
  domains: Array<{ domain: SemanticDomain; proposalCount: number; visibleSourceCount: number }>;
  gaps: string[];
}
