import { BIBLIA_LIVRE_BOOKS } from "../corpus-config/biblia-livre";
import { DEFAULT_BIBLICAL_VERSIFICATION } from "../domain/text-identity";
import { bookLabel } from "../i18n";
import { passageRefScheme, type PassageRef } from "../domain/scripture";
import type { NegativeReferenceZone, ReferenceZone } from "../domain/semantic-content";

export interface ParsedBiblicalReference {
  rawReference: string;
  startOffset: number;
  endOffset: number;
  workId: string;
  bookId: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  versificationSchemeId: string;
  confidence: number;
  /** Present when the reference sits in a table of contents, index, bibliography or canon list. */
  zone?: NegativeReferenceZone;
}

/**
 * Ceiling for references found outside prose. "Jo 3:16 … 45" in an index says where the book talks
 * about the verse, not what it says about it.
 */
const NEGATIVE_ZONE_CONFIDENCE = 0.6;

const EXTRA_ALIASES: Readonly<Record<string, readonly string[]>> = {
  genesis: ["Génesis"],
  exodus: ["Éxodo"],
  leviticus: ["Levítico"],
  numbers: ["Números"],
  deuteronomy: ["Deuteronomio"],
  joshua: ["Josué"],
  judges: ["Jueces"],
  ruth: ["Rut"],
  psalms: ["Psalm", "Salmo", "Salmos"],
  proverbs: ["Proverbios"],
  ecclesiastes: ["Qohelet", "Eclesiastes"],
  isaiah: ["Isaías"],
  jeremiah: ["Jeremías"],
  lamentations: ["Lamentaciones"],
  ezekiel: ["Ezequiel"],
  hosea: ["Oseas"],
  obadiah: ["Abdías"],
  jonah: ["Jonás"],
  micah: ["Miqueas"],
  nahum: ["Nahúm"],
  habakkuk: ["Habacuc"],
  zephaniah: ["Sofonías"],
  haggai: ["Hageo"],
  zechariah: ["Zacarías"],
  malachi: ["Malaquías"],
  matthew: ["Mateo"],
  mark: ["Marcos"],
  luke: ["Lucas"],
  john: ["Evangelho de João", "Gospel of John", "Jhn", "Juan"], // Jn pode ser confundido com "Jonas"
  acts: ["Hechos", "Hechos de los Apóstoles"],
  romans: ["Romanos"],
  "song-of-songs": ["Cantares", "Cântico", "Song of Solomon"],
  revelation: ["Revelação", "Revelations"],
  "1-corinthians": ["I Coríntios", "1 Cor", "I Corinthians"],
  "2-corinthians": ["II Coríntios", "2 Cor", "II Corinthians"],
  "1-john": ["I João", "I John", "1 Juan", "I Juan"],
  "2-john": ["II João", "II John", "2 Juan", "II Juan"],
  "3-john": ["III João", "III John", "3 Juan", "III Juan"],
  "1-samuel": ["I Samuel"],
  "2-samuel": ["II Samuel"],
  "1-kings": ["I Reis", "I Kings"],
  "2-kings": ["II Reis", "II Kings"],
  "1-chronicles": ["I Crônicas", "I Chronicles"],
  "2-chronicles": ["II Crônicas", "II Chronicles"],
  "1-thessalonians": ["I Tessalonicenses", "I Thessalonians"],
  "2-thessalonians": ["II Tessalonicenses", "II Thessalonians"],
  "1-timothy": ["I Timóteo", "I Timothy"],
  "2-timothy": ["II Timóteo", "II Timothy"],
  "1-peter": ["I Pedro", "I Peter"],
  "2-peter": ["II Pedro", "II Peter"],
};

const BOOK_CHAPTER_LIMITS: Readonly<Record<string, number>> = {
  genesis: 50,
  exodus: 40,
  leviticus: 27,
  numbers: 36,
  deuteronomy: 34,
  joshua: 24,
  judges: 21,
  ruth: 4,
  "1-samuel": 31,
  "2-samuel": 24,
  "1-kings": 22,
  "2-kings": 25,
  "1-chronicles": 29,
  "2-chronicles": 36,
  ezra: 10,
  nehemiah: 13,
  esther: 10,
  job: 42,
  psalms: 150,
  proverbs: 31,
  ecclesiastes: 12,
  "song-of-songs": 8,
  isaiah: 66,
  jeremiah: 52,
  lamentations: 5,
  ezekiel: 48,
  daniel: 12,
  hosea: 14,
  joel: 3,
  amos: 9,
  obadiah: 1,
  jonah: 4,
  micah: 7,
  nahum: 3,
  habakkuk: 3,
  zephaniah: 3,
  haggai: 2,
  zechariah: 14,
  malachi: 4,
  matthew: 28,
  mark: 16,
  luke: 24,
  john: 21,
  acts: 28,
  romans: 16,
  "1-corinthians": 16,
  "2-corinthians": 13,
  galatians: 6,
  ephesians: 6,
  philippians: 4,
  colossians: 4,
  "1-thessalonians": 5,
  "2-thessalonians": 3,
  "1-timothy": 6,
  "2-timothy": 4,
  titus: 3,
  philemon: 1,
  hebrews: 13,
  james: 5,
  "1-peter": 5,
  "2-peter": 3,
  "1-john": 5,
  "2-john": 1,
  "3-john": 1,
  jude: 1,
  revelation: 22,
};

/**
 Chave de busca para alias. Os acentos são mantidos intencionalmente: "Jo" é João e "Jó" é Jó.
Um espaço após um numeral inicial é ignorado; portanto, "1 Co" e "1Co" compartilham a mesma chave.
 */
function aliasKey(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[._]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/^(\d|i{1,3})\s+(?=\p{L})/u, "$1");
}

function withoutAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFC");
}

function regexAlias(value: string): string {
  return value
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+")
    .replace(/^(\d|I{1,3})(?=\p{L})/u, "$1\\s?");
}

/** Abreviações que também são palavras comuns; precisam de capítulo:versículo para contar... */
const AMBIGUOUS_ALIASES = new Set(["os", "at", "is", "am", "ex", "ag", "na", "ne", "et", "ed"]);
/** Spanish abbreviations that are also Spanish words ("sal", "mal", "mi", "col", "os"). */
const SPANISH_AMBIGUOUS_ALIASES = new Set(["sal", "mal", "mi", "col", "os", "ex"]);

/**
 * Common Spanish book names and abbreviations. "Jn" is John here, while in Portuguese it is Jonah,
 * which is why every language has its own table.
 */
const SPANISH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  genesis: ["Génesis", "Gn", "Gén"],
  exodus: ["Éxodo", "Ex", "Éx"],
  leviticus: ["Levítico", "Lv"],
  numbers: ["Números", "Nm", "Núm"],
  deuteronomy: ["Deuteronomio", "Dt"],
  joshua: ["Josué", "Jos"],
  judges: ["Jueces", "Jue", "Jc"],
  ruth: ["Rut", "Rt"],
  "1-samuel": ["1 Samuel", "1S", "1Sam"],
  "2-samuel": ["2 Samuel", "2S", "2Sam"],
  "1-kings": ["1 Reyes", "1R", "1Re"],
  "2-kings": ["2 Reyes", "2R", "2Re"],
  "1-chronicles": ["1 Crónicas", "1Cr", "1Cro"],
  "2-chronicles": ["2 Crónicas", "2Cr", "2Cro"],
  ezra: ["Esdras", "Esd"],
  nehemiah: ["Nehemías", "Neh"],
  esther: ["Ester", "Est"],
  job: ["Job"],
  psalms: ["Salmos", "Salmo", "Sal", "Sl"],
  proverbs: ["Proverbios", "Pr", "Prov"],
  ecclesiastes: ["Eclesiastés", "Qohélet", "Ec", "Ecl"],
  "song-of-songs": ["Cantar de los Cantares", "Cantares", "Cnt", "Cant"],
  isaiah: ["Isaías", "Is"],
  jeremiah: ["Jeremías", "Jer", "Jr"],
  lamentations: ["Lamentaciones", "Lm", "Lam"],
  ezekiel: ["Ezequiel", "Ez"],
  daniel: ["Daniel", "Dn"],
  hosea: ["Oseas", "Os"],
  joel: ["Joel", "Jl"],
  amos: ["Amós", "Am"],
  obadiah: ["Abdías", "Abd"],
  jonah: ["Jonás", "Jon"],
  micah: ["Miqueas", "Mi"],
  nahum: ["Nahúm", "Nah"],
  habakkuk: ["Habacuc", "Hab"],
  zephaniah: ["Sofonías", "Sof"],
  haggai: ["Hageo", "Hag", "Ag"],
  zechariah: ["Zacarías", "Zac", "Za"],
  malachi: ["Malaquías", "Mal"],
  matthew: ["Mateo", "Mt"],
  mark: ["Marcos", "Mc", "Mr"],
  luke: ["Lucas", "Lc"],
  john: ["Juan", "Jn"],
  acts: ["Hechos de los Apóstoles", "Hechos", "Hch", "Hech"],
  romans: ["Romanos", "Ro", "Rom"],
  "1-corinthians": ["1 Corintios", "1Co", "1Cor"],
  "2-corinthians": ["2 Corintios", "2Co", "2Cor"],
  galatians: ["Gálatas", "Gl", "Gá", "Gal"],
  ephesians: ["Efesios", "Ef"],
  philippians: ["Filipenses", "Flp", "Fil"],
  colossians: ["Colosenses", "Col"],
  "1-thessalonians": ["1 Tesalonicenses", "1Ts", "1Tes"],
  "2-thessalonians": ["2 Tesalonicenses", "2Ts", "2Tes"],
  "1-timothy": ["1 Timoteo", "1Ti", "1Tim"],
  "2-timothy": ["2 Timoteo", "2Ti", "2Tim"],
  titus: ["Tito", "Tit"],
  philemon: ["Filemón", "Flm"],
  hebrews: ["Hebreos", "Heb"],
  james: ["Santiago", "Stg", "Sant"],
  "1-peter": ["1 Pedro", "1P", "1Pe"],
  "2-peter": ["2 Pedro", "2P", "2Pe"],
  "1-john": ["1 Juan", "1Jn"],
  "2-john": ["2 Juan", "2Jn"],
  "3-john": ["3 Juan", "3Jn"],
  jude: ["Judas", "Jud", "Jds"],
  revelation: ["Apocalipsis", "Ap", "Apoc"],
};

/** "1 Juan" also as "I Juan", "2 Pedro" also as "II Pedro". */
function withRomanNumerals(names: readonly string[]): string[] {
  const roman: Readonly<Record<string, string>> = { "1": "I", "2": "II", "3": "III" };
  return names.flatMap((name) => {
    const ordinal = /^([123])\s+(?=\p{L})/u.exec(name)?.[1];
    return ordinal ? [name, name.replace(/^[123]/u, roman[ordinal]!)] : [name];
  });
}

interface AliasTable {
  aliasToBookId: ReadonlyMap<string, string>;
  referencePattern: RegExp;
  bookNameToken: RegExp;
  /** Every book name in a text; compiled once because the alternation is large. */
  bookCountPattern: RegExp;
  /** A book name at the very start of a text, e.g. "2 Samuel" in "2 Samuel⏎1 Reis". */
  leadingBookName: RegExp;
  /** A book, in any case, and maybe its chapter and verse at the start of a text: "JOÃO 3". */
  leadingHeader: RegExp;
  ambiguous: ReadonlySet<string>;
}

function buildAliasTable(
  books: readonly { id: string; names: readonly string[] }[],
  ambiguous: ReadonlySet<string>,
): AliasTable {
  const aliasToBookId = new Map<string, string>();
  const aliases: string[] = [];
  const register = (alias: string, id: string, exact: boolean): void => {
    const key = aliasKey(alias);
    if (!key) return;
    const existing = aliasToBookId.get(key);
    if (existing) {
      if (exact && existing !== id)
        throw new Error(`Abreviatura bíblica ambígua "${alias}": ${existing} e ${id}.`);
      return;
    }
    aliasToBookId.set(key, id);
    aliases.push(alias);
  };
  // Primeiro as grafias exatas, para que uma alternativa sem acento (como "Jo" em vez de "Jó") nunca substitua outra.
  for (const { id, names } of books) for (const name of names) register(name, id, true);
  for (const { id, names } of books)
    for (const name of names) {
      const plain = withoutAccents(name);
      if (plain !== name) register(plain, id, false);
    }
  const bookPattern = aliases
    .sort((left, right) => right.length - left.length)
    .map(regexAlias)
    .join("|");
  return {
    aliasToBookId,
    bookCountPattern: new RegExp(`(?:${bookPattern})`, "giu"),
    leadingBookName: new RegExp(`^(?:${bookPattern})(?![\\p{L}\\p{N}])`, "u"),
    leadingHeader: new RegExp(
      `^\\s*(${bookPattern})(?:\\s+(\\d{1,3})(?:\\s*[:.,]\\s*(\\d{1,3})(?:\\s*[-–—]\\s*\\d{1,3})?)?)?(?![\\p{L}\\p{N}])`,
      "iu",
    ),
    referencePattern: new RegExp(
      `(?<![\\p{L}\\p{N}])(${bookPattern})\\s+(\\d{1,3})(?:\\s*([:.,])\\s*(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?)?(?![\\p{L}\\d])`,
      "gu",
    ),
    bookNameToken: new RegExp(`(?<![\\p{L}\\p{N}])(?:${bookPattern})(?![\\p{L}\\p{N}])`, "giu"),
    ambiguous,
  };
}

/** Portuguese and English, as before; also the table used when the language is unknown. */
const DEFAULT_TABLE = buildAliasTable(
  Object.values(BIBLIA_LIVRE_BOOKS).map(([id, englishName, abbreviation]) => ({
    id,
    names: [englishName, abbreviation, bookLabel(id, englishName), ...(EXTRA_ALIASES[id] ?? [])],
  })),
  AMBIGUOUS_ALIASES,
);
const SPANISH_TABLE = buildAliasTable(
  Object.entries(SPANISH_ALIASES).map(([id, names]) => ({ id, names: withRomanNumerals(names) })),
  SPANISH_AMBIGUOUS_ALIASES,
);

/** Language of the document ("es", "es-MX", "pt-BR"…); anything but Spanish keeps the default. */
function aliasTable(language?: string): AliasTable {
  return language?.trim().toLowerCase().split(/[-_]/u)[0] === "es" ? SPANISH_TABLE : DEFAULT_TABLE;
}

/** True for a line made only of book names ("Juízes    1 Crônicas"), with no chapter or verse. */
export function isBookNameLine(line: string, language?: string): boolean {
  const { bookNameToken } = aliasTable(language);
  const trimmed = line.trim();
  if (!trimmed || trimmed.includes(":")) return false;
  bookNameToken.lastIndex = 0;
  if (!bookNameToken.test(trimmed)) return false;
  bookNameToken.lastIndex = 0;
  return (
    trimmed
      .replace(bookNameToken, " ")
      .replace(/(?<![\p{L}])(?:e|and|y)(?![\p{L}])/giu, " ")
      .replace(/[\s,;.·•–—-]+/gu, "") === ""
  );
}

export interface PassageHeader {
  bookId: string;
  /** Absent when the text opens with a bare book name ("1Jo é a primeira carta…"). */
  chapter?: number;
  verse?: number;
  /** Characters taken by the header, leading spaces included. */
  length: number;
}

/**
 * The book (and chapter and verse) a text opens with, in any case: the running header of a Bible
 * page ("JOÃO 3", "João 3,16") or the first reference of a list. Null when the text opens otherwise.
 */
export function leadingPassageHeader(text: string, language?: string): PassageHeader | null {
  const table = aliasTable(language);
  const match = table.leadingHeader.exec(text);
  const bookId = match ? table.aliasToBookId.get(aliasKey(match[1] ?? "")) : undefined;
  if (!match || !bookId) return null;
  return {
    bookId,
    ...(match[2] ? { chapter: Number(match[2]) } : {}),
    ...(match[3] ? { verse: Number(match[3]) } : {}),
    length: match[0].length,
  };
}

const SAME_CHAPTER_CONTINUATION =
  /^\s*[,;]\s*(?:vv?\.?\s*)?(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?(?!\s*[:.]\s*\d)/u;
const NEW_CHAPTER_CONTINUATION = /^\s*;\s*(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/u;

const RELATIVE_VERSE_PATTERN =
  /(?<![\p{L}\p{N}])(?:vv?|vers(?:o|os|ículo|ículos)|verses?)\.?\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/giu;

function validAddress(
  bookId: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
): boolean {
  const chapterLimit = BOOK_CHAPTER_LIMITS[bookId];
  if (!chapterLimit || chapter < 1 || chapter > chapterLimit) return false;
  if (verseStart !== undefined && (verseStart < 1 || verseStart > 200)) return false;
  return verseEnd === undefined || (verseEnd >= (verseStart ?? 1) && verseEnd <= 200);
}

function parsedReference(
  rawReference: string,
  startOffset: number,
  bookId: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
  confidence = 0.98,
  versificationSchemeId = DEFAULT_BIBLICAL_VERSIFICATION,
): ParsedBiblicalReference {
  return {
    rawReference,
    startOffset,
    endOffset: startOffset + rawReference.length,
    workId: `work:${bookId}`,
    bookId,
    chapter,
    ...(verseStart !== undefined ? { verseStart } : {}),
    ...(verseEnd !== undefined ? { verseEnd } : {}),
    versificationSchemeId,
    confidence,
  };
}

export function parseBiblicalReferences(
  text: string,
  options: {
    context?: PassageRef;
    zone?: ReferenceZone;
    /** Language of the document; selects its abbreviation table ("Jn" is John in Spanish). */
    language?: string;
  } = {},
): ParsedBiblicalReference[] {
  const table = aliasTable(options.language);
  const references: ParsedBiblicalReference[] = [];
  const negativeZone = options.zone && options.zone !== "body" ? options.zone : undefined;
  const suppressBareChapter =
    options.zone === "toc" ||
    options.zone === "index" ||
    options.zone === "bibliography" ||
    options.zone === "canon-list" ||
    ((text.match(table.bookCountPattern) ?? []).length >= 5 && !text.includes(":"));
  table.referencePattern.lastIndex = 0;
  for (const match of text.matchAll(table.referencePattern)) {
    const rawReference = match[0];
    const key = aliasKey(match[1] ?? "");
    const bookId = table.aliasToBookId.get(key);
    let chapter = Number(match[2]);
    const separator = match[3];
    let verseStart = match[4] ? Number(match[4]) : undefined;
    let verseEnd = match[5] ? Number(match[5]) : verseStart;
    if (!bookId || !Number.isInteger(chapter)) continue;
    // "Os 12 apóstolos", "At 2 horas", "Os 2,5 milhões": ambiguous words need chapter:verse.
    if (table.ambiguous.has(key) && (verseStart === undefined || separator !== ":")) continue;
    const startOffset = match.index ?? 0;
    // A line break between the book and a bare number is a list when the number opens the next
    // item ("1 João⏎2 João", "1 Samuel⏎2 Samuel") or stands alone on its line. Otherwise it is
    // prose wrapped by the PDF ("de João⏎3, o novo nascimento"). With a verse ("Mt⏎2:15") it is
    // always a reference wrapped at the end of a line.
    const gap = rawReference.slice((match[1] ?? "").length).match(/^\s+/u)?.[0] ?? "";
    if (verseStart === undefined && /[\r\n]/u.test(gap)) {
      const numberStart = startOffset + rawReference.length - (match[2] ?? "").length;
      const restOfLine = text.slice(startOffset + rawReference.length).split(/\r?\n/u, 1)[0] ?? "";
      if (!restOfLine.trim() || table.leadingBookName.test(text.slice(numberStart))) continue;
    }
    const prefix = text.slice(Math.max(0, startOffset - 8), startOffset);
    // Em listas como "1 João, 2 João, 3 João", o trecho interno "João 2" não é João capítulo 2.
    if (verseStart === undefined && /(?:^|\s)(?:[123]|i{1,3})\s+$/iu.test(prefix)) continue;
    if (verseStart === undefined && suppressBareChapter) continue;
    // Single-chapter books are cited by verse: "Jd 5", "Fm 10".
    if (BOOK_CHAPTER_LIMITS[bookId] === 1 && verseStart === undefined) {
      verseStart = chapter;
      verseEnd = chapter;
      chapter = 1;
    }
    if (!validAddress(bookId, chapter, verseStart, verseEnd)) continue;
    references.push(
      parsedReference(
        rawReference,
        startOffset,
        bookId,
        chapter,
        verseStart,
        verseEnd,
        verseStart === undefined ? 0.9 : 0.98,
      ),
    );

    if (verseStart !== undefined) {
      const tailStart = startOffset + rawReference.length;
      const tail = text.slice(tailStart);
      let consumed = 0;
      let currentChapter = chapter;
      for (;;) {
        const rest = tail.slice(consumed);
        const sameChapter = SAME_CHAPTER_CONTINUATION.exec(rest);
        const newChapter = sameChapter ? null : NEW_CHAPTER_CONTINUATION.exec(rest);
        const continuation = sameChapter ?? newChapter;
        if (!continuation) break;
        const nextChapter = newChapter ? Number(newChapter[1]) : currentChapter;
        const nextStart = Number(newChapter ? newChapter[2] : continuation[1]);
        const nextEndRaw = newChapter ? newChapter[3] : continuation[2];
        const nextEnd = nextEndRaw ? Number(nextEndRaw) : nextStart;
        const firstNumber = newChapter ? newChapter[1]! : continuation[1]!;
        const numberOffset = continuation[0].indexOf(firstNumber);
        // "Rm 5,8; 1Jo 4,9": the "1" opens the next book, it is not verse 1 of Romans 5.
        if (table.leadingBookName.test(rest.slice(numberOffset))) break;
        if (validAddress(bookId, nextChapter, nextStart, nextEnd)) {
          const relativeOffset = consumed + numberOffset;
          references.push(
            parsedReference(
              continuation[0].trim().replace(/^[,;]\s*/u, ""),
              tailStart + relativeOffset,
              bookId,
              nextChapter,
              nextStart,
              nextEnd,
              0.94,
            ),
          );
        }
        currentChapter = nextChapter;
        consumed += continuation[0].length;
      }
    }
  }
  if (options.context) {
    RELATIVE_VERSE_PATTERN.lastIndex = 0;
    for (const match of text.matchAll(RELATIVE_VERSE_PATTERN)) {
      const startOffset = match.index ?? 0;
      if (
        references.some(
          (reference) => startOffset >= reference.startOffset && startOffset < reference.endOffset,
        )
      )
        continue;
      const verseStart = Number(match[1]);
      const verseEnd = match[2] ? Number(match[2]) : verseStart;
      if (!validAddress(options.context.bookId, options.context.chapter, verseStart, verseEnd))
        continue;
      references.push(
        parsedReference(
          match[0],
          startOffset,
          options.context.bookId,
          options.context.chapter,
          verseStart,
          verseEnd,
          0.86,
          passageRefScheme(options.context),
        ),
      );
    }
  }
  const sorted = references.sort((left, right) => left.startOffset - right.startOffset);
  // Bare chapters were already dropped above; what remains outside prose only locates a verse.
  return negativeZone
    ? sorted.map((reference) => ({
        ...reference,
        zone: negativeZone,
        confidence: Math.min(reference.confidence, NEGATIVE_ZONE_CONFIDENCE),
      }))
    : sorted;
}

export function biblicalRelationType(
  text: string,
  reference: Pick<ParsedBiblicalReference, "startOffset" | "endOffset">,
): "cites" | "discusses" | "alludes-to" {
  const context = text
    .slice(Math.max(0, reference.startOffset - 80), Math.min(text.length, reference.endOffset + 80))
    .normalize("NFC")
    .toLocaleLowerCase("pt-BR");
  if (/\b(alus[aã]o|alude|eco|echo(?:es)?|allusion)\b/u.test(context)) return "alludes-to";
  if (
    /\b(compare|comparar|discute|discuss(?:es|ed)?|interpreta|interprets?)\b|\bcf\./u.test(context)
  )
    return "discusses";
  return "cites";
}
