import type { Morphology, PassageRef } from "./scripture";
import type { SourceArtifact, CorpusTransformation } from "./corpus";

export type AlignmentStatus = "exact" | "normalized" | "positional" | "ambiguous" | "unmatched";
export interface LexicalReference {
  system: "strong" | "step-disambiguated-strong";
  value: string;
}
export interface Lexeme {
  id: string;
  language: "grc";
  lemmas: string[];
  lexicalReferences: LexicalReference[];
  sourceDatasetId: string;
}
export interface MorphologicalAnalysis {
  rawMorphologyCode: string;
  status: "parsed" | "unmapped";
  features: Partial<Morphology>;
  extras: Record<string, string>;
}
export interface TokenAlignment {
  targetTokenId: string;
  sourceDatasetId: string;
  sourceRecordId: string | null;
  method: "edition-aware-sequence-v1";
  status: AlignmentStatus;
  evidence: string;
  candidateSourceRecordIds: string[];
}
export interface LinguisticAnnotation {
  type: "token-linguistics";
  sourceDatasetId: string;
  sourceRecordId: string;
  targetTokenId: string;
  raw: {
    greek: string;
    lexicalGrammar: string;
    lemma: string;
    editions: string;
    spelling: string;
    strongInstance: string;
  };
  normalized: {
    surface: string;
    transliteration?: string;
    lemmas: string[];
    lexicalReferences: LexicalReference[];
    lexemeId: string | null;
    morphology: MorphologicalAnalysis[];
  };
  provenance: { sourceArtifactId: string; sourceLine: number; transformationIds: string[] };
  alignment: TokenAlignment;
}
export interface LinguisticPassage {
  alignments: TokenAlignment[];
  annotations: LinguisticAnnotation[];
}
/** Readable tuple schema; chapter context and shared edition strings are inherited, never lost. */
export type TagntRecord = [
  locator: string,
  line: number,
  greek: string,
  lexicalGrammar: string,
  lemma: string,
  editionIndex: number,
  spelling: string,
  strongInstance: string,
  lexemeId: string | null,
];
export type StoredAlignment = [
  verse: number,
  position: number,
  recordIndex: number | null,
  status: AlignmentStatus,
  reason: string,
  candidates: number[],
];
export interface LinguisticChapter {
  schemaVersion: 1;
  datasetId: string;
  bookId: string;
  chapter: number;
  sourceArtifactId: string;
  editions: string[];
  records: TagntRecord[];
  alignments: StoredAlignment[];
}
export interface LinguisticStatistics {
  sourceRecords: number;
  sblMemberRecords: number;
  targetTokens: number;
  successfullyAligned: number;
  exact: number;
  normalized: number;
  positional: number;
  ambiguous: number;
  unmatched: number;
  morphologicalAnnotations: number;
  unmappedMorphology: number;
  lexicalIds: number;
  uniqueLexemes: number;
  booksCovered: number;
  chapters: number;
  sourceRecordsWithoutTarget: number;
}
export interface LinguisticDataset {
  schemaVersion: 1;
  id: string;
  packageId: string;
  sourceRevision: string;
  targetEditionId: string;
  targetDatasetId: string;
  sourcePackageDigest: string;
  attribution: string;
  artifacts: SourceArtifact[];
  transformations: CorpusTransformation[];
  books: Record<string, number[]>;
  statistics: LinguisticStatistics;
  qualityGate: {
    passed: boolean;
    policy: string;
    unresolvedClassifications: Record<string, number>;
  };
}
export interface LexicalOccurrence {
  tokenId: string;
  ref: PassageRef;
  position: number;
}
export interface ConcordanceBucket {
  lexemes: Record<string, Lexeme>;
  /** Each tuple is [bookId, chapter, verse, position]; no complete token objects. */
  occurrences: Record<string, [string, number, number, number][]>;
}
export function lexemeBucket(id: string): string {
  return id.slice(-24, -22);
}
export function sourceRecordId(datasetId: string, locator: string): string {
  return `${datasetId}:record:${locator}`;
}
export function targetTokenId(
  bookId: string,
  chapter: number,
  verse: number,
  position: number,
): string {
  return `sblgnt:1.2:${bookId}:${chapter}:${verse}:${String(position).padStart(3, "0")}`;
}
export function greekCell(value: string): { surface: string; transliteration?: string } {
  const match = /^(.*?)\s+\(([^()]*)\)\s*$/.exec(value);
  return match ? { surface: match[1]!, transliteration: match[2]! } : { surface: value };
}
/** NFC is kept separate from raw. Case/punctuation/accent folding is matching-only. */
export function matchingGreek(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("el")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[᾽῾᾿ʼ’']/gu, "")
    .replace(/[^\p{Script=Greek}]/gu, "")
    .normalize("NFC");
}
export function lexicalReferences(grammar: string, strongInstance: string): LexicalReference[] {
  const disambiguated = [...grammar.matchAll(/(?:^|[ +;])([GH]\d+[A-Za-z]*)=/g)].map((m) => m[1]!);
  const simple = [...strongInstance.matchAll(/G\d+/g)].map((m) => m[0]);
  return [
    ...[...new Set(disambiguated)].map((value) => ({
      system: "step-disambiguated-strong" as const,
      value,
    })),
    ...[...new Set(simple)].map((value) => ({ system: "strong" as const, value })),
  ];
}
export function lemmaForms(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/,\s*/)
        .map((s) => s.trim().normalize("NFC"))
        .filter(Boolean),
    ),
  ];
}
