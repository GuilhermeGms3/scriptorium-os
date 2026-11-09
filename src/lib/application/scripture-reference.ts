import type { Book } from "../domain/scripture";
import { bookLabel } from "../i18n";

/** A book as the reference reader sees it: every name it answers to and how many chapters it has. */
export interface ReferenceBook {
  id: string;
  aliases: readonly string[];
  chapters: number;
}

export interface ParsedReference {
  bookId: string;
  chapter: number;
  verse?: number;
  end?: number;
}

/** Lowercase, without accents, letters and digits only: "1 Coríntios" → "1corintios". */
export function normalizedReading(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** Portuguese name, English name, abbreviation and id, as the Android labels have them. */
export function referenceBook(
  book: Pick<Book, "id" | "name" | "abbreviation" | "chapters">,
): ReferenceBook {
  return {
    id: book.id,
    aliases: [bookLabel(book.id, book.name), book.name, book.abbreviation, book.id],
    chapters: book.chapters,
  };
}

const REFERENCE = /^(.+?)\s*(\d{1,3})(?:\s*[:.,]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/;
// Portuguese Jo=João, Jn=Jonas, Jó=Jó. Removing accents must not turn Jo into Jó.
const SPECIAL: Record<string, string> = { jo: "john", jó: "job", jn: "jonah" };

/**
 * "Jo 3:16", "joao 3,16", "1Co13:4-7", "I Coríntios 13:4", "Sl 119". The same rules as
 * ReadingNavigation.parse on Android; both are checked against scripture-reference.cases.json.
 */
export function parseScriptureReference(
  value: string,
  books: readonly ReferenceBook[],
): ParsedReference | null {
  const match = REFERENCE.exec(value.trim());
  if (!match) return null;
  const raw = (match[1] ?? "")
    .trim()
    .replace(/^III(?=\s|[A-Za-zÀ-ÿ])/i, "3")
    .replace(/^II(?=\s|[A-Za-zÀ-ÿ])/i, "2")
    .replace(/^I(?=\s)/i, "1");
  const requested = normalizedReading(raw);
  const special = SPECIAL[raw.toLowerCase().replaceAll(".", "")];
  const candidates = books.filter((book) =>
    special
      ? book.id === special
      : book.aliases.some((alias) => {
          const normalized = normalizedReading(alias);
          return (
            normalized === requested || (requested.length >= 3 && normalized.startsWith(requested))
          );
        }),
  );
  const ids = new Set(candidates.map((book) => book.id));
  if (ids.size !== 1) return null;
  const book = candidates[0]!;
  const chapter = Number(match[2]);
  const verse = match[3] === undefined ? undefined : Number(match[3]);
  const end = match[4] === undefined ? undefined : Number(match[4]);
  if (chapter < 1 || chapter > book.chapters || verse === 0) return null;
  if (end !== undefined && (verse === undefined || end < verse)) return null;
  return {
    bookId: book.id,
    chapter,
    ...(verse !== undefined ? { verse } : {}),
    ...(end !== undefined ? { end } : {}),
  };
}
