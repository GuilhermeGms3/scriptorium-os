import { z } from "zod";
import { passageRefKey } from "./scripture";

/** A database row, as the workspace returns it. */
type WorkspaceRow = Readonly<Record<string, unknown>>;

/** The highlighter colors, in the order they are offered. Stored by these names. */
export const MARK_COLORS = ["yellow", "green", "blue", "pink", "purple"] as const;
export type MarkColor = (typeof MARK_COLORS)[number];

export const MARK_COLOR_LABELS: Record<MarkColor, string> = {
  yellow: "Amarelo",
  green: "Verde",
  blue: "Azul",
  pink: "Rosa",
  purple: "Lilás",
};

export interface VerseAddress {
  bookId: string;
  chapter: number;
  verse: number;
}

/** What the reader did to one verse: a highlighter color, a star, or both. */
export interface VerseMark extends VerseAddress {
  color?: MarkColor;
  favorite: boolean;
  /** Edition being read when it was marked: the list shows the verse as it was read. */
  editionId?: string;
  /** The latest of the two dates, for "marcado em". */
  markedAt: string;
}

/** One verse, one key: the same key the rest of the workspace uses for passages. */
export function verseMarkKey({ bookId, chapter, verse }: VerseAddress): string {
  return passageRefKey({ bookId, chapter, verseStart: verse, verseEnd: verse });
}

export function isMarkColor(value: unknown): value is MarkColor {
  return typeof value === "string" && (MARK_COLORS as readonly string[]).includes(value);
}

/** Stored in target_json of `highlights` and `bookmarks`, next to the verse key in target_id. */
const MarkTargetSchema = z.object({
  ref: z.object({
    bookId: z.string().min(1).max(64),
    chapter: z.number().int().positive(),
    verseStart: z.number().int().positive(),
  }),
  editionId: z.string().min(1).max(250).optional(),
});

export function markTargetJson(address: VerseAddress, editionId?: string): string {
  return JSON.stringify({
    ref: {
      bookId: address.bookId,
      chapter: address.chapter,
      verseStart: address.verse,
      verseEnd: address.verse,
    },
    ...(editionId ? { editionId } : {}),
  });
}

function target(row: WorkspaceRow): (VerseAddress & { editionId?: string }) | null {
  if (row["target_kind"] !== "passage" || typeof row["target_json"] !== "string") return null;
  try {
    const parsed = MarkTargetSchema.parse(JSON.parse(row["target_json"]));
    return {
      bookId: parsed.ref.bookId,
      chapter: parsed.ref.chapter,
      verse: parsed.ref.verseStart,
      ...(parsed.editionId ? { editionId: parsed.editionId } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * The marks from the `highlights` and `bookmarks` rows, one per verse. A row this screen cannot
 * read (another kind of target, a damaged backup) is skipped instead of hiding every other mark.
 */
export function verseMarksFromRows(
  highlights: readonly WorkspaceRow[],
  bookmarks: readonly WorkspaceRow[],
): VerseMark[] {
  const marks = new Map<string, VerseMark>();
  const entry = (address: VerseAddress & { editionId?: string }, at: string) => {
    const key = verseMarkKey(address);
    const current = marks.get(key) ?? {
      bookId: address.bookId,
      chapter: address.chapter,
      verse: address.verse,
      favorite: false,
      markedAt: at,
    };
    if (address.editionId && !current.editionId) current.editionId = address.editionId;
    if (at > current.markedAt) current.markedAt = at;
    marks.set(key, current);
    return current;
  };
  for (const row of highlights) {
    const address = target(row);
    const color = row["style_token"];
    if (!address || !isMarkColor(color) || typeof row["created_at"] !== "string") continue;
    entry(address, row["created_at"]).color = color;
  }
  for (const row of bookmarks) {
    const address = target(row);
    if (!address || typeof row["created_at"] !== "string") continue;
    entry(address, row["created_at"]).favorite = true;
  }
  return [...marks.values()];
}

/** Bible order: book (by its position in the canon), chapter, verse. */
export function sortVerseMarks<T extends VerseAddress>(
  marks: readonly T[],
  bookOrder: (bookId: string) => number,
): T[] {
  return [...marks].sort(
    (a, b) =>
      bookOrder(a.bookId) - bookOrder(b.bookId) || a.chapter - b.chapter || a.verse - b.verse,
  );
}

/**
 * The marks after one change, as shown before the database answers: `color` null takes the color
 * away; a verse left with no color and no star is no longer marked.
 */
export function applyVerseMarkChange(
  marks: readonly VerseMark[],
  address: VerseAddress,
  change: { color?: MarkColor | null; favorite?: boolean },
  at: string,
): VerseMark[] {
  const key = verseMarkKey(address);
  const current = marks.find((mark) => verseMarkKey(mark) === key);
  const { color: _previous, ...rest } = current ?? {
    bookId: address.bookId,
    chapter: address.chapter,
    verse: address.verse,
    favorite: false,
    markedAt: at,
  };
  const color = change.color === undefined ? current?.color : (change.color ?? undefined);
  const next: VerseMark = {
    ...rest,
    ...(color ? { color } : {}),
    favorite: change.favorite ?? current?.favorite ?? false,
    markedAt: at,
  };
  const others = marks.filter((mark) => verseMarkKey(mark) !== key);
  return next.color || next.favorite ? [...others, next] : others;
}
