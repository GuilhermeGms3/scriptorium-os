/**
 * Scriptorium — Scripture domain model.
 *
 * IMPORTANT: the Bible is NOT modeled as just book/chapter/verse/text.
 * Book/chapter/verse is one *versification view* used for navigation.
 * The core model is corpus → work → edition → text units → tokens,
 * so that original languages, manuscripts, variants and multiple
 * versification schemes can be layered on later.
 */

export type KnownLanguageCode = "pt-BR" | "pt" | "en" | "grc" | "he" | "hbo" | "arc" | "la" | "lat";
export type LanguageCode = KnownLanguageCode | (string & {});
export type TextDirection = "ltr" | "rtl";

/** A bounded collection of texts (e.g. "Protestant canon", "LXX", "Nag Hammadi"). */
export interface Corpus {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  kind?: "scripture" | "linguistic-dataset" | "apparatus" | "reference";
  /** A corpus may belong to a tradition without being identical to it. */
  traditionIds: string[];
}

/** Distinguishes canons/collections instead of assuming one universal canon. */
export interface CanonProfile {
  id: string;
  name: string; // e.g. "Protestant", "Catholic", "Orthodox", "Tanakh", "Septuagint"
  corpusIds: string[];
  bookOrder: string[]; // book ids in canonical order
}

/** An abstract work (e.g. "Gospel of John") independent of any edition. */
export interface Work {
  id: string;
  title: string;
  author?: string; // traditional attribution, when any
  corpusId: string;
}

/** A concrete edition/translation of a work or corpus (WEB, WH 1881, SBLGNT...). */
export interface Edition {
  id: string;
  /** Stable parent identity when this edition is registered as a corpus package. */
  corpusId?: string;
  title: string;
  abbreviation: string;
  language: LanguageCode;
  /** ISO 15924 script code (Grek, Hebr, Latn...). */
  script?: string;
  /** Document direction is independent from the product UI locale. */
  direction?: TextDirection;
  kind: "translation" | "original-language" | "interlinear" | "apparatus";
  year?: number;
  licenseId?: string;
}

/** A navigable book inside a work/corpus (navigation-level concept). */
export interface Book {
  id: string; // "john"
  name: string; // "John"
  abbreviation: string;
  order: number;
  chapters: number;
  testament?: "ot" | "nt" | "other";
}

/** Reference to a passage in a given versification scheme. */
export interface PassageRef {
  /** Stable work identity. Legacy callers may omit it while migrating. */
  workId?: string;
  bookId: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  subverseStart?: string;
  subverseEnd?: string;
  versificationSchemeId?: string;
  /** @deprecated Use versificationSchemeId. */
  versification?: string;
}

export const LEGACY_DEFAULT_VERSIFICATION = "scriptorium-bcv-1";

export function passageRefScheme(ref: PassageRef): string {
  return ref.versificationSchemeId ?? ref.versification ?? LEGACY_DEFAULT_VERSIFICATION;
}

export function passageRefKey(ref: PassageRef): string {
  const verse = ref.verseStart
    ? `.${ref.verseStart}${ref.verseEnd && ref.verseEnd !== ref.verseStart ? `-${ref.verseEnd}` : ""}`
    : "";
  const subverse = ref.subverseStart
    ? `:${ref.subverseStart}${ref.subverseEnd && ref.subverseEnd !== ref.subverseStart ? `-${ref.subverseEnd}` : ""}`
    : "";
  return `${passageRefScheme(ref)}:${ref.workId ?? `work:${ref.bookId}`}:${ref.bookId}.${ref.chapter}${verse}${subverse}`;
}

export function passageRefsOverlap(left: PassageRef, right: PassageRef): boolean {
  if (
    passageRefScheme(left) !== passageRefScheme(right) ||
    (left.workId ?? `work:${left.bookId}`) !== (right.workId ?? `work:${right.bookId}`) ||
    left.bookId !== right.bookId ||
    left.chapter !== right.chapter
  )
    return false;
  const leftStart = left.verseStart ?? 1;
  const leftEnd = left.verseEnd ?? left.verseStart ?? Number.MAX_SAFE_INTEGER;
  const rightStart = right.verseStart ?? 1;
  const rightEnd = right.verseEnd ?? right.verseStart ?? Number.MAX_SAFE_INTEGER;
  if (!(leftStart <= rightEnd && rightStart <= leftEnd)) return false;
  if (left.subverseStart || right.subverseStart) {
    return (
      !left.subverseStart || !right.subverseStart || left.subverseStart === right.subverseStart
    );
  }
  return true;
}

/** A unit of text as it appears in one edition (a verse in one translation). */
export interface TextUnit {
  id: string;
  ref: PassageRef;
  editionId: string;
  text: string;
}

export type Morphology = {
  partOfSpeech: string; // "noun" | "verb" | "preposition" ...
  case?: string; // nominative, genitive...
  number?: string; // singular, plural
  gender?: string; // masculine, feminine...
  tense?: string;
  voice?: string;
  mood?: string;
  person?: string;
  state?: string;
  stem?: string;
  aspect?: string;
  subtype?: string;
  language?: string;
  prefixes?: string;
  suffixDescription?: string;
  status?: "parsed" | "unmapped";
  /** Compact code as used by morphological traditions, e.g. "N-NSM". */
  code?: string;
};

/** A single original-language token aligned (conceptually) to translations. */
export interface TokenOccurrence {
  id: string;
  /** Concrete edition/text location. A token occurrence is not a lemma. */
  editionId: string;
  textUnitId: string;
  ref: PassageRef;
  position: number;
  lemmaId?: string;
  language: LanguageCode;
  surface: string; // Ἐν / בְּרֵאשִׁית
  lemma?: string; // ἐν / רֵאשִׁית, only when supplied by a lexical source
  prefix?: string;
  suffix?: string;
  paragraphId?: string;
  startsParagraph?: boolean;
  transliteration?: string;
  gloss?: string; // short gloss, only when supplied by a lexical source
  morphology?: Morphology;
  strongs?: string;
}

/** @deprecated Prefer TokenOccurrence. Kept temporarily for UI compatibility. */
export type Token = TokenOccurrence;

export interface Lemma {
  id: string;
  lemma: string;
  language: LanguageCode;
  transliteration?: string;
  partOfSpeech: string;
  glosses: string[];
  /** Placeholder for a future full lexicon entry; always traceable to sources. */
  lexicalSummary?: string;
  strongs?: string;
}

/** A verse aggregating translation units + (optionally) aligned original tokens. */
export interface VerseContent {
  ref: PassageRef;
  verse: number;
  /** editionId -> text */
  translations: Record<string, string>;
  /** Explicit application-level alignment result for parallel rendering. */
  alignmentStatusByEdition?: Record<string, "equivalent" | "partial" | "unavailable">;
  /** Original-language tokens, when imported. Absence means "not yet imported". */
  original?: TokenOccurrence[];
  originalEditionId?: string;
  paragraphId?: string;
  paragraphIds?: string[];
  startsParagraph?: boolean;
}

export interface ChapterContent {
  bookId: string;
  chapter: number;
  verses: VerseContent[];
  paragraphBoundaries?: {
    id: string;
    verseStart: number;
    verseEnd: number;
    tokenStartPosition?: number;
    tokenEndPosition?: number;
  }[];
  /** Runtime metadata survives route-loader serialization without becoming textual identity. */
  provenanceByEdition?: Record<string, import("./source").Provenance>;
}

/** Critical-text apparatus scaffolding (not populated in this phase). */
export interface ManuscriptWitness {
  id: string;
  siglum: string; // ℵ, A, B, P66...
  name: string;
  date?: string;
  location?: string;
}

export interface TextualVariant {
  id: string;
  unitRef: PassageRef;
  readings: {
    text: string;
    witnessIds: string[];
  }[];
  note?: string;
}
