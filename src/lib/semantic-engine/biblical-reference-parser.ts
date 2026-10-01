import { BIBLIA_LIVRE_BOOKS } from "../corpus-config/biblia-livre";
import { DEFAULT_BIBLICAL_VERSIFICATION } from "../domain/text-identity";
import { bookLabel } from "../i18n";
import { passageRefScheme, type PassageRef } from "../domain/scripture";

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
}

const EXTRA_ALIASES: Readonly<Record<string, readonly string[]>> = {
  psalms: ["Psalm", "Salmo"],
  "song-of-songs": ["Cantares", "Cântico", "Song of Solomon"],
  ecclesiastes: ["Qohelet", "Eclesiastes"],
  john: ["Evangelho de João", "Gospel of John", "Jn"],
  revelation: ["Revelação", "Revelations"],
  "1-corinthians": ["I Coríntios", "1 Cor", "I Corinthians"],
  "2-corinthians": ["II Coríntios", "2 Cor", "II Corinthians"],
  "1-john": ["I João", "I John"],
  "2-john": ["II João", "II John"],
  "3-john": ["III João", "III John"],
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

function normalizedAlias(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[._]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function regexAlias(value: string): string {
  return value
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
}

const aliasToBookId = new Map<string, string>();
const aliases: string[] = [];
for (const [, [id, englishName, abbreviation]] of Object.entries(BIBLIA_LIVRE_BOOKS)) {
  for (const alias of [
    englishName,
    abbreviation,
    bookLabel(id, englishName),
    ...(EXTRA_ALIASES[id] ?? []),
  ]) {
    const normalized = normalizedAlias(alias);
    if (!normalized || aliasToBookId.has(normalized)) continue;
    aliasToBookId.set(normalized, id);
    aliases.push(alias);
    const accentless = alias.normalize("NFD").replace(/\p{M}+/gu, "");
    if (accentless !== alias) aliases.push(accentless);
  }
}

const BOOK_PATTERN = aliases
  .sort((left, right) => right.length - left.length)
  .map(regexAlias)
  .join("|");
const REFERENCE_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${BOOK_PATTERN})\\s+(\\d{1,3})(?:\\s*[:.,]\\s*(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?)?`,
  "giu",
);

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
  options: { context?: PassageRef } = {},
): ParsedBiblicalReference[] {
  const references: ParsedBiblicalReference[] = [];
  REFERENCE_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(REFERENCE_PATTERN)) {
    const rawReference = match[0];
    const bookId = aliasToBookId.get(normalizedAlias(match[1] ?? ""));
    const chapter = Number(match[2]);
    const verseStart = match[3] ? Number(match[3]) : undefined;
    const verseEnd = match[4] ? Number(match[4]) : verseStart;
    if (!bookId || !Number.isInteger(chapter)) continue;
    if (!validAddress(bookId, chapter, verseStart, verseEnd)) continue;
    const startOffset = match.index ?? 0;
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
      const tail = text.slice(startOffset + rawReference.length);
      const sameChapterPattern =
        /^\s*[,;]\s*(?:vv?\.?\s*)?(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?(?!\s*[:.]\s*\d)/u;
      let consumed = 0;
      let continuation = sameChapterPattern.exec(tail);
      while (continuation) {
        const nextStart = Number(continuation[1]);
        const nextEnd = continuation[2] ? Number(continuation[2]) : nextStart;
        if (validAddress(bookId, chapter, nextStart, nextEnd)) {
          const relativeOffset = consumed + continuation[0].indexOf(continuation[1]!);
          references.push(
            parsedReference(
              continuation[0].trim().replace(/^[,;]\s*/u, ""),
              startOffset + rawReference.length + relativeOffset,
              bookId,
              chapter,
              nextStart,
              nextEnd,
              0.94,
            ),
          );
        }
        consumed += continuation[0].length;
        continuation = sameChapterPattern.exec(tail.slice(consumed));
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
  return references.sort((left, right) => left.startOffset - right.startOffset);
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
