import { z } from "zod";
import type {
  CrosswalkRelation,
  PassageAddress,
  TextAnchor,
  TextUnitType,
} from "../domain/text-identity";
import type { LanguageCode } from "../domain/scripture";
import type { Provenance } from "../domain/source";

export const CorpusPackageManifestSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id: z.string().min(1),
  corpusId: z.string().min(1),
  editionId: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  abbreviation: z.string().min(1),
  works: z.array(z.string().min(1)),
  languages: z.array(z.string().min(1)),
  databasePath: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/i),
  buildFingerprint: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  sizeBytes: z.number().int().nonnegative(),
  downloadSizeBytes: z.number().int().nonnegative().optional(),
  storageSizeBytes: z.number().int().nonnegative().optional(),
  deliveryMode: z.enum(["single-file", "work-shards", "http-range", "opfs"]).default("single-file"),
  sourceLocation: z.string().min(1).optional(),
  dependencies: z.array(z.string().min(1)).default([]),
  parts: z
    .array(
      z.object({
        id: z.string().min(1),
        workId: z.string().min(1).optional(),
        role: z.enum(["content", "search", "linguistic"]),
        databasePath: z.string().min(1),
        checksum: z.string().regex(/^[a-f0-9]{64}$/i),
        sizeBytes: z.number().int().nonnegative(),
      }),
    )
    .default([]),
  versificationSchemeId: z.string().min(1),
  rights: z.object({
    license: z.string().min(1),
    redistribution: z.enum(["allowed", "restricted", "prohibited", "unknown"]),
    attribution: z.string().min(1),
  }),
  provenance: z.object({
    packageId: z.string().min(1),
    datasetId: z.string().min(1),
    sourceArtifactIds: z.array(z.string().min(1)),
    transformationIds: z.array(z.string().min(1)),
  }),
});

export type CorpusPackageManifest = z.infer<typeof CorpusPackageManifestSchema>;
export type CorpusPackageState =
  | "available"
  | "installing"
  | "installed"
  | "enabled"
  | "disabled"
  | "loading"
  | "ready"
  | "update-available"
  | "corrupted"
  | "unavailable";

export interface StoredTextUnit {
  id: string;
  corpusId: string;
  editionId: string;
  workId: string;
  versificationSchemeId?: string;
  sequence: number;
  unitType: TextUnitType;
  address?: PassageAddress;
  displayAddress?: string;
  text: string;
  language: LanguageCode;
  provenance: Provenance;
}

export interface StoredToken {
  id: string;
  textUnitId: string;
  position: number;
  surface: string;
  normalized: string;
  language: LanguageCode;
  lemmaId?: string;
  lemma?: string;
  morphology?: string;
  strongs?: string;
  transliteration?: string;
  prefix?: string;
  suffix?: string;
  paragraphId?: string;
  startsParagraph?: boolean;
}

export interface StoredTokenAnnotation {
  id: string;
  tokenId: string;
  annotationType: string;
  value: unknown;
  sourceId?: string;
  provenance: unknown;
}

export interface StoredTokenLocation {
  token: StoredToken;
  textUnit: StoredTextUnit;
}

export interface StoredLexicalEntry {
  id: string;
  language: string;
  lemma: string;
  transliteration?: string;
  partOfSpeech?: string;
  gloss: string;
  definition?: string;
  references: { system: string; value: string }[];
  sourceId: string;
  provenance: unknown;
}

export interface CorpusSearchQuery {
  text: string;
  editionIds?: string[];
  language?: string;
  lemma?: string;
  morphology?: string;
  limit?: number;
}

export interface CorpusSearchHit {
  textUnit: StoredTextUnit;
  rank: number;
  snippet: string;
  matchKind: "reference" | "title" | "prefix" | "full-text" | "lemma" | "morphology";
}

export interface CorpusStorage {
  getPackageManifest(): Promise<CorpusPackageManifest>;
  getWork(workId: string): Promise<{ id: string; title: string; sequence: number } | null>;
  getTextUnits(address: PassageAddress, editionId?: string): Promise<StoredTextUnit[]>;
  getTextUnit(id: string): Promise<StoredTextUnit | null>;
  getTokens(textUnitId: string): Promise<StoredToken[]>;
  getTokenAnnotations(textUnitId: string): Promise<StoredTokenAnnotation[]>;
  findTokensByLemma(
    lemmaId: string,
    offset?: number,
    limit?: number,
  ): Promise<{ total: number; items: StoredTokenLocation[] }>;
  getLexicalEntriesByReference(system: string, value: string): Promise<StoredLexicalEntry[]>;
  resolveAddress(address: PassageAddress, editionId?: string): Promise<TextAnchor[]>;
  getCrosswalk(anchor: TextAnchor, targetSchemeId: string): Promise<CrosswalkRelation[]>;
  search(query: CorpusSearchQuery): Promise<CorpusSearchHit[]>;
  close(): void;
}
