import { BIBLIA_LIVRE_BOOKS } from "../corpus-config/biblia-livre";
import { DEFAULT_BIBLICAL_VERSIFICATION } from "../domain/text-identity";
import { bookLabel } from "../i18n";

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

export function parseBiblicalReferences(text: string): ParsedBiblicalReference[] {
  const references: ParsedBiblicalReference[] = [];
  REFERENCE_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(REFERENCE_PATTERN)) {
    const rawReference = match[0];
    const bookId = aliasToBookId.get(normalizedAlias(match[1] ?? ""));
    const chapter = Number(match[2]);
    const verseStart = match[3] ? Number(match[3]) : undefined;
    const verseEnd = match[4] ? Number(match[4]) : verseStart;
    if (!bookId || !Number.isInteger(chapter) || chapter < 1) continue;
    if (verseStart !== undefined && (!Number.isInteger(verseStart) || verseStart < 1)) continue;
    if (verseEnd !== undefined && (!Number.isInteger(verseEnd) || verseEnd < verseStart!)) continue;
    const startOffset = match.index ?? 0;
    references.push({
      rawReference,
      startOffset,
      endOffset: startOffset + rawReference.length,
      workId: `work:${bookId}`,
      bookId,
      chapter,
      ...(verseStart !== undefined ? { verseStart } : {}),
      ...(verseEnd !== undefined ? { verseEnd } : {}),
      versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
      confidence: verseStart === undefined ? 0.9 : 0.98,
    });
  }
  return references;
}
