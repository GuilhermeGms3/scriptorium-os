import type { ChapterContent } from "./scripture";

export interface GeneratedCorpusBookIndex {
  id: string;
  name: string;
  abbreviation: string;
  order: number;
  chapters: number;
  chapterFiles: Record<string, string>;
}

export interface CorpusImportStatistics {
  artifacts: number;
  books: number;
  chapters: number;
  verses: number;
  textUnits: number;
  tokenOccurrences: number;
  paragraphBoundaries: number;
  bytesProcessed: number;
  errors: number;
  warnings: number;
}

export interface GeneratedCorpusManifest {
  schemaVersion: 1;
  importer: { name: string; version: string; adapter: string };
  corpusId: string;
  editionId: string;
  packageId: string;
  sourceRevision: string;
  sourcePackageDigest: { algorithm: "SHA-256"; value: string };
  attribution: string;
  versificationScheme: string;
  sourceArtifactIds: string[];
  transformations: {
    id: string;
    type: "parse-xml" | "build-chapter-shards";
    inputArtifactIds: string[];
    outputDatasetId: string;
  }[];
  datasetId: string;
  books: GeneratedCorpusBookIndex[];
  statistics: CorpusImportStatistics;
  structuralDecisions: string[];
}

export interface GeneratedChapterShard extends ChapterContent {
  schemaVersion: 1;
  corpusId: string;
  editionId: string;
  packageId: string;
  datasetId: string;
  sourceArtifactId: string;
  sourcePath: string;
}
