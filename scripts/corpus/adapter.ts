import type { CorpusPackageManifest, SourceArtifact } from "../../src/lib/domain/corpus";
import type {
  CorpusImportStatistics,
  GeneratedChapterShard,
  GeneratedCorpusBookIndex,
} from "../../src/lib/domain/generated-corpus";

export interface DiscoveredCorpusArtifact {
  absolutePath: string;
  sourcePath: string;
  fileName: string;
  classification: "book" | "metadata";
  canonicalBookId?: string;
}

export interface NormalizedCorpusBook {
  book: Omit<GeneratedCorpusBookIndex, "chapterFiles">;
  sourceArtifactId: string;
  sourcePath: string;
  chapters: GeneratedChapterShard[];
  warnings: string[];
}

export interface CorpusAdapter {
  readonly id: string;
  readonly importerVersion: string;
  supports(manifest: CorpusPackageManifest): boolean;
  discover(
    sourceRoot: string,
    manifest: CorpusPackageManifest,
  ): Promise<DiscoveredCorpusArtifact[]>;
  parseAndNormalize(
    artifact: DiscoveredCorpusArtifact,
    sourceArtifact: SourceArtifact,
    manifest: CorpusPackageManifest,
    datasetId: string,
  ): Promise<NormalizedCorpusBook | null>;
  validate(book: NormalizedCorpusBook, manifest: CorpusPackageManifest): string[];
}

export function emptyImportStatistics(): CorpusImportStatistics {
  return {
    artifacts: 0,
    books: 0,
    chapters: 0,
    verses: 0,
    textUnits: 0,
    tokenOccurrences: 0,
    paragraphBoundaries: 0,
    bytesProcessed: 0,
    errors: 0,
    warnings: 0,
  };
}
