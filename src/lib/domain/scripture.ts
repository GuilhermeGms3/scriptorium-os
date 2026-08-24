/**
 * Scriptorium — Scripture domain model.
 *
 * IMPORTANT: the Bible is NOT modeled as just book/chapter/verse/text.
 * Book/chapter/verse is one *versification view* used for navigation.
 * The core model is corpus → work → edition → text units → tokens,
 * so that original languages, manuscripts, variants and multiple
 * versification schemes can be layered on later.
 */

export type LanguageCode = "grc" | "hbo" | "arc" | "lat" | "en" | "pt" | string;

/** A bounded collection of texts (e.g. "Protestant canon", "LXX", "Nag Hammadi"). */
export interface Corpus {
  id: string;
  name: string;
  description?: string;
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
  title: string;
  abbreviation: string;
  language: LanguageCode;
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
  bookId: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  versification?: string; // future: "english", "lxx", "vulgate"...
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
  /** Compact code as used by morphological traditions, e.g. "N-NSM". */
  code?: string;
};

/** A single original-language token aligned (conceptually) to translations. */
export interface Token {
  id: string;
  language: LanguageCode;
  surface: string; // Ἐν / בְּרֵאשִׁית
  lemma: string; // ἐν / רֵאשִׁית
  transliteration?: string;
  gloss: string; // short English gloss
  morphology: Morphology;
  strongs?: string;
}

export interface Lemma {
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
  /** Original-language tokens, when imported. Absence means "not yet imported". */
  original?: Token[];
  originalEditionId?: string;
}

export interface ChapterContent {
  bookId: string;
  chapter: number;
  verses: VerseContent[];
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
