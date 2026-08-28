/**
 * ============================================================================
 * DEMO / SEED DATA — Scripture fixtures
 * ============================================================================
 * These fixtures exist ONLY to demonstrate UX. They are deliberately small:
 * this phase does not ship a Bible database.
 *
 * Texts used:
 *  - World English Bible (WEB): public domain English translation.
 *  - Westcott & Hort (1881) Greek NT: public domain. Only John 1:1–3 tokens.
 *  - Hebrew of Genesis 1:1 (Masoretic, public domain). Tokens for v.1 only.
 *
 * Verses without original-language tokens intentionally render a
 * "not yet imported" state — the UI must never fake unavailable data.
 * ============================================================================
 */

import type { Book, ChapterContent, Edition, Lemma, Token } from "../domain/scripture";

export const DEMO_EDITIONS: Edition[] = [
  {
    id: "web",
    title: "World English Bible",
    abbreviation: "WEB",
    language: "en",
    direction: "ltr",
    kind: "translation",
    year: 2020,
    licenseId: "public-domain",
  },
  {
    id: "asv",
    title: "American Standard Version",
    abbreviation: "ASV",
    language: "en",
    direction: "ltr",
    kind: "translation",
    year: 1901,
    licenseId: "public-domain",
  },
  {
    id: "wh1881",
    title: "Westcott & Hort Greek New Testament",
    abbreviation: "WH",
    language: "grc",
    direction: "ltr",
    kind: "original-language",
    year: 1881,
    licenseId: "public-domain",
  },
  {
    id: "hebrew-demo",
    title: "Hebrew text (DEMO transcription)",
    abbreviation: "DEMO-HB",
    language: "hbo",
    direction: "rtl",
    kind: "original-language",
    licenseId: "unknown",
  },
];

/** Navigation scaffold: book list exists even where no demo text is imported. */
export const DEMO_BOOKS: Book[] = [
  { id: "genesis", name: "Genesis", abbreviation: "Gen", order: 1, chapters: 50, testament: "ot" },
  { id: "exodus", name: "Exodus", abbreviation: "Exod", order: 2, chapters: 40, testament: "ot" },
  { id: "psalms", name: "Psalms", abbreviation: "Ps", order: 19, chapters: 150, testament: "ot" },
  { id: "isaiah", name: "Isaiah", abbreviation: "Isa", order: 23, chapters: 66, testament: "ot" },
  {
    id: "matthew",
    name: "Matthew",
    abbreviation: "Matt",
    order: 40,
    chapters: 28,
    testament: "nt",
  },
  { id: "mark", name: "Mark", abbreviation: "Mark", order: 41, chapters: 16, testament: "nt" },
  { id: "luke", name: "Luke", abbreviation: "Luke", order: 42, chapters: 24, testament: "nt" },
  { id: "john", name: "John", abbreviation: "John", order: 43, chapters: 21, testament: "nt" },
  { id: "acts", name: "Acts", abbreviation: "Acts", order: 44, chapters: 28, testament: "nt" },
  { id: "romans", name: "Romans", abbreviation: "Rom", order: 45, chapters: 16, testament: "nt" },
  { id: "hebrews", name: "Hebrews", abbreviation: "Heb", order: 58, chapters: 13, testament: "nt" },
  {
    id: "revelation",
    name: "Revelation",
    abbreviation: "Rev",
    order: 66,
    chapters: 22,
    testament: "nt",
  },
];

/** Which books actually have DEMO text imported. */
export const DEMO_AVAILABLE: Record<string, number[]> = {
  genesis: [1],
  psalms: [23],
  john: [1],
  romans: [5],
};

const t = (
  id: string,
  language: string,
  surface: string,
  lemma: string,
  gloss: string,
  morphology: NonNullable<Token["morphology"]>,
  transliteration?: string,
  strongs?: string,
): Token => ({
  id,
  editionId: language === "grc" ? "wh1881" : "hebrew-demo",
  textUnitId: `${language === "grc" ? "wh1881" : "hebrew-demo"}:${id.startsWith("j") ? "john" : "genesis"}.${id.slice(1).split(".")[0]}.${id.split(".")[1]}`,
  ref: {
    bookId: id.startsWith("j") ? "john" : "genesis",
    chapter: Number(id.slice(1).split(".")[0]),
    verseStart: Number(id.split(".")[1]),
  },
  position: Number(id.split(".")[2]),
  lemmaId: `${language}:${lemma}`,
  language,
  surface,
  lemma,
  gloss,
  morphology,
  ...(transliteration !== undefined ? { transliteration } : {}),
  ...(strongs !== undefined ? { strongs } : {}),
});

/** John 1:1 — WH 1881 (public domain), word-for-word DEMO tokens. */
const JOHN_1_1_TOKENS: Token[] = [
  t(
    "j1.1.1",
    "grc",
    "Ἐν",
    "ἐν",
    "in",
    { partOfSpeech: "preposition", code: "Prep" },
    "en",
    "G1722",
  ),
  t(
    "j1.1.2",
    "grc",
    "ἀρχῇ",
    "ἀρχή",
    "beginning",
    { partOfSpeech: "noun", case: "dative", number: "singular", gender: "feminine", code: "N-DSF" },
    "archē",
    "G746",
  ),
  t(
    "j1.1.3",
    "grc",
    "ἦν",
    "εἰμί",
    "was",
    {
      partOfSpeech: "verb",
      tense: "imperfect",
      voice: "active",
      mood: "indicative",
      person: "3rd singular",
      code: "V-IAI-3S",
    },
    "ēn",
    "G1510",
  ),
  t(
    "j1.1.4",
    "grc",
    "ὁ",
    "ὁ",
    "the",
    {
      partOfSpeech: "article",
      case: "nominative",
      number: "singular",
      gender: "masculine",
      code: "Art-NSM",
    },
    "ho",
    "G3588",
  ),
  t(
    "j1.1.5",
    "grc",
    "λόγος",
    "λόγος",
    "word",
    {
      partOfSpeech: "noun",
      case: "nominative",
      number: "singular",
      gender: "masculine",
      code: "N-NSM",
    },
    "logos",
    "G3056",
  ),
  t(
    "j1.1.6",
    "grc",
    "καὶ",
    "καί",
    "and",
    { partOfSpeech: "conjunction", code: "Conj" },
    "kai",
    "G2532",
  ),
  t(
    "j1.1.7",
    "grc",
    "ὁ",
    "ὁ",
    "the",
    {
      partOfSpeech: "article",
      case: "nominative",
      number: "singular",
      gender: "masculine",
      code: "Art-NSM",
    },
    "ho",
    "G3588",
  ),
  t(
    "j1.1.8",
    "grc",
    "λόγος",
    "λόγος",
    "word",
    {
      partOfSpeech: "noun",
      case: "nominative",
      number: "singular",
      gender: "masculine",
      code: "N-NSM",
    },
    "logos",
    "G3056",
  ),
  t(
    "j1.1.9",
    "grc",
    "ἦν",
    "εἰμί",
    "was",
    {
      partOfSpeech: "verb",
      tense: "imperfect",
      voice: "active",
      mood: "indicative",
      person: "3rd singular",
      code: "V-IAI-3S",
    },
    "ēn",
    "G1510",
  ),
  t(
    "j1.1.10",
    "grc",
    "πρὸς",
    "πρός",
    "with",
    { partOfSpeech: "preposition", code: "Prep" },
    "pros",
    "G4314",
  ),
  t(
    "j1.1.11",
    "grc",
    "τὸν",
    "ὁ",
    "the",
    {
      partOfSpeech: "article",
      case: "accusative",
      number: "singular",
      gender: "masculine",
      code: "Art-ASM",
    },
    "ton",
    "G3588",
  ),
  t(
    "j1.1.12",
    "grc",
    "θεόν",
    "θεός",
    "God",
    {
      partOfSpeech: "noun",
      case: "accusative",
      number: "singular",
      gender: "masculine",
      code: "N-ASM",
    },
    "theon",
    "G2316",
  ),
  t(
    "j1.1.13",
    "grc",
    "καὶ",
    "καί",
    "and",
    { partOfSpeech: "conjunction", code: "Conj" },
    "kai",
    "G2532",
  ),
  t(
    "j1.1.14",
    "grc",
    "θεὸς",
    "θεός",
    "God",
    {
      partOfSpeech: "noun",
      case: "nominative",
      number: "singular",
      gender: "masculine",
      code: "N-NSM",
    },
    "theos",
    "G2316",
  ),
  t(
    "j1.1.15",
    "grc",
    "ἦν",
    "εἰμί",
    "was",
    {
      partOfSpeech: "verb",
      tense: "imperfect",
      voice: "active",
      mood: "indicative",
      person: "3rd singular",
      code: "V-IAI-3S",
    },
    "ēn",
    "G1510",
  ),
  t(
    "j1.1.16",
    "grc",
    "ὁ",
    "ὁ",
    "the",
    {
      partOfSpeech: "article",
      case: "nominative",
      number: "singular",
      gender: "masculine",
      code: "Art-NSM",
    },
    "ho",
    "G3588",
  ),
  t(
    "j1.1.17",
    "grc",
    "λόγος",
    "λόγος",
    "word",
    {
      partOfSpeech: "noun",
      case: "nominative",
      number: "singular",
      gender: "masculine",
      code: "N-NSM",
    },
    "logos",
    "G3056",
  ),
];

const JOHN_1_2_TOKENS: Token[] = [
  t(
    "j1.2.1",
    "grc",
    "οὗτος",
    "οὗτος",
    "this one",
    {
      partOfSpeech: "pronoun",
      case: "nominative",
      number: "singular",
      gender: "masculine",
      code: "Pron-NSM",
    },
    "houtos",
    "G3778",
  ),
  t(
    "j1.2.2",
    "grc",
    "ἦν",
    "εἰμί",
    "was",
    {
      partOfSpeech: "verb",
      tense: "imperfect",
      voice: "active",
      mood: "indicative",
      person: "3rd singular",
      code: "V-IAI-3S",
    },
    "ēn",
    "G1510",
  ),
  t(
    "j1.2.3",
    "grc",
    "ἐν",
    "ἐν",
    "in",
    { partOfSpeech: "preposition", code: "Prep" },
    "en",
    "G1722",
  ),
  t(
    "j1.2.4",
    "grc",
    "ἀρχῇ",
    "ἀρχή",
    "beginning",
    { partOfSpeech: "noun", case: "dative", number: "singular", gender: "feminine", code: "N-DSF" },
    "archē",
    "G746",
  ),
  t(
    "j1.2.5",
    "grc",
    "πρὸς",
    "πρός",
    "with",
    { partOfSpeech: "preposition", code: "Prep" },
    "pros",
    "G4314",
  ),
  t(
    "j1.2.6",
    "grc",
    "τὸν",
    "ὁ",
    "the",
    {
      partOfSpeech: "article",
      case: "accusative",
      number: "singular",
      gender: "masculine",
      code: "Art-ASM",
    },
    "ton",
    "G3588",
  ),
  t(
    "j1.2.7",
    "grc",
    "θεόν",
    "θεός",
    "God",
    {
      partOfSpeech: "noun",
      case: "accusative",
      number: "singular",
      gender: "masculine",
      code: "N-ASM",
    },
    "theon",
    "G2316",
  ),
];

/** Genesis 1:1 — Hebrew (Masoretic, public domain), DEMO tokens, RTL. */
const GEN_1_1_TOKENS: Token[] = [
  t(
    "g1.1.1",
    "hbo",
    "בְּרֵאשִׁית",
    "רֵאשִׁית",
    "in beginning",
    { partOfSpeech: "noun", gender: "feminine", number: "singular" },
    "bereshit",
    "H7225",
  ),
  t(
    "g1.1.2",
    "hbo",
    "בָּרָא",
    "בָּרָא",
    "created",
    { partOfSpeech: "verb", tense: "perfect", person: "3rd masculine singular" },
    "bara",
    "H1254",
  ),
  t(
    "g1.1.3",
    "hbo",
    "אֱלֹהִים",
    "אֱלֹהִים",
    "God",
    { partOfSpeech: "noun", gender: "masculine", number: "plural" },
    "elohim",
    "H430",
  ),
  t("g1.1.4", "hbo", "אֵת", "אֵת", "[obj. marker]", { partOfSpeech: "particle" }, "et", "H853"),
  t(
    "g1.1.5",
    "hbo",
    "הַשָּׁמַיִם",
    "שָׁמַיִם",
    "the heavens",
    { partOfSpeech: "noun", gender: "masculine", number: "plural" },
    "hashamayim",
    "H8064",
  ),
  t(
    "g1.1.6",
    "hbo",
    "וְאֵת",
    "אֵת",
    "and [obj. marker]",
    { partOfSpeech: "particle" },
    "ve'et",
    "H853",
  ),
  t(
    "g1.1.7",
    "hbo",
    "הָאָרֶץ",
    "אֶרֶץ",
    "the earth",
    { partOfSpeech: "noun", gender: "feminine", number: "singular" },
    "ha'aretz",
    "H776",
  ),
];

export const DEMO_CHAPTERS: Record<string, ChapterContent> = {
  "john/1": {
    bookId: "john",
    chapter: 1,
    verses: [
      {
        ref: { bookId: "john", chapter: 1, verseStart: 1 },
        verse: 1,
        translations: {
          web: "In the beginning was the Word, and the Word was with God, and the Word was God.",
          asv: "In the beginning was the Word, and the Word was with God, and the Word was God.",
        },
        original: JOHN_1_1_TOKENS,
        originalEditionId: "wh1881",
      },
      {
        ref: { bookId: "john", chapter: 1, verseStart: 2 },
        verse: 2,
        translations: {
          web: "The same was in the beginning with God.",
          asv: "The same was in the beginning with God.",
        },
        original: JOHN_1_2_TOKENS,
        originalEditionId: "wh1881",
      },
      {
        ref: { bookId: "john", chapter: 1, verseStart: 3 },
        verse: 3,
        translations: {
          web: "All things were made through him. Without him, nothing was made that has been made.",
          asv: "All things were made through him; and without him was not anything made that hath been made.",
        },
      },
      {
        ref: { bookId: "john", chapter: 1, verseStart: 4 },
        verse: 4,
        translations: {
          web: "In him was life, and the life was the light of men.",
          asv: "In him was life; and the life was the light of men.",
        },
      },
      {
        ref: { bookId: "john", chapter: 1, verseStart: 5 },
        verse: 5,
        translations: {
          web: "The light shines in the darkness, and the darkness hasn't overcome it.",
          asv: "And the light shineth in the darkness; and the darkness apprehended it not.",
        },
      },
    ],
  },
  "genesis/1": {
    bookId: "genesis",
    chapter: 1,
    verses: [
      {
        ref: { bookId: "genesis", chapter: 1, verseStart: 1 },
        verse: 1,
        translations: {
          web: "In the beginning, God created the heavens and the earth.",
          asv: "In the beginning God created the heavens and the earth.",
        },
        original: GEN_1_1_TOKENS,
        originalEditionId: "hebrew-demo",
      },
      {
        ref: { bookId: "genesis", chapter: 1, verseStart: 2 },
        verse: 2,
        translations: {
          web: "The earth was formless and empty. Darkness was on the surface of the deep and God's Spirit was hovering over the surface of the waters.",
          asv: "And the earth was waste and void; and darkness was upon the face of the deep: and the Spirit of God moved upon the face of the waters.",
        },
      },
      {
        ref: { bookId: "genesis", chapter: 1, verseStart: 3 },
        verse: 3,
        translations: {
          web: "God said, “Let there be light,” and there was light.",
          asv: "And God said, Let there be light: and there was light.",
        },
      },
    ],
  },
  "psalms/23": {
    bookId: "psalms",
    chapter: 23,
    verses: [
      {
        ref: { bookId: "psalms", chapter: 23, verseStart: 1 },
        verse: 1,
        translations: {
          web: "Yahweh is my shepherd; I shall lack nothing.",
          asv: "Jehovah is my shepherd; I shall not want.",
        },
      },
      {
        ref: { bookId: "psalms", chapter: 23, verseStart: 2 },
        verse: 2,
        translations: {
          web: "He makes me lie down in green pastures. He leads me beside still waters.",
          asv: "He maketh me to lie down in green pastures; He leadeth me beside still waters.",
        },
      },
      {
        ref: { bookId: "psalms", chapter: 23, verseStart: 3 },
        verse: 3,
        translations: {
          web: "He restores my soul. He guides me in the paths of righteousness for his name's sake.",
          asv: "He restoreth my soul: He guideth me in the paths of righteousness for his name's sake.",
        },
      },
    ],
  },
  "romans/5": {
    bookId: "romans",
    chapter: 5,
    verses: [
      {
        ref: { bookId: "romans", chapter: 5, verseStart: 1 },
        verse: 1,
        translations: {
          web: "Being therefore justified by faith, we have peace with God through our Lord Jesus Christ;",
          asv: "Being therefore justified by faith, we have peace with God through our Lord Jesus Christ;",
        },
      },
      {
        ref: { bookId: "romans", chapter: 5, verseStart: 2 },
        verse: 2,
        translations: {
          web: "through whom we also have our access by faith into this grace in which we stand. We rejoice in hope of the glory of God.",
          asv: "through whom also we have had our access by faith into this grace wherein we stand; and we rejoice in hope of the glory of God.",
        },
      },
      {
        ref: { bookId: "romans", chapter: 5, verseStart: 3 },
        verse: 3,
        translations: {
          web: "Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance;",
          asv: "And not only so, but we also rejoice in our tribulations: knowing that tribulation worketh stedfastness;",
        },
      },
    ],
  },
};

/** DEMO lexicon entries. Entries not in this map render an explicit empty state. */
export const DEMO_LEXICON: Record<string, Lemma> = {
  λόγος: {
    id: "grc:λόγος",
    lemma: "λόγος",
    language: "grc",
    transliteration: "logos",
    partOfSpeech: "noun",
    glosses: ["word", "speech", "message", "account", "reason"],
    lexicalSummary:
      "DEMO lexical summary: a masculine noun covering 'word, speech, account, reason'. A full lexicon entry will be imported from a licensed source in a later phase.",
    strongs: "G3056",
  },
  ἀρχή: {
    id: "grc:ἀρχή",
    lemma: "ἀρχή",
    language: "grc",
    transliteration: "archē",
    partOfSpeech: "noun",
    glosses: ["beginning", "origin", "first place"],
    lexicalSummary: "DEMO lexical summary placeholder.",
    strongs: "G746",
  },
  θεός: {
    id: "grc:θεός",
    lemma: "θεός",
    language: "grc",
    transliteration: "theos",
    partOfSpeech: "noun",
    glosses: ["God", "god"],
    lexicalSummary: "DEMO lexical summary placeholder.",
    strongs: "G2316",
  },
  רֵאשִׁית: {
    id: "hbo:רֵאשִׁית",
    lemma: "רֵאשִׁית",
    language: "hbo",
    transliteration: "reshit",
    partOfSpeech: "noun",
    glosses: ["beginning", "firstfruits", "chief"],
    lexicalSummary: "DEMO lexical summary placeholder.",
    strongs: "H7225",
  },
};

/** DEMO occurrence index for the Word Inspector. */
export const DEMO_OCCURRENCES: Record<string, string[]> = {
  λόγος: ["John 1:1", "John 1:14", "Romans 9:6", "Hebrews 4:12"],
  ἀρχή: ["Genesis 1:1 (LXX)", "John 1:1", "John 1:2"],
  θεός: ["John 1:1", "John 1:2", "Romans 5:1"],
  רֵאשִׁית: ["Genesis 1:1"],
};
