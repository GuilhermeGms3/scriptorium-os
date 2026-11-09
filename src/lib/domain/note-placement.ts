/**
 * Where a note about a passage goes in the reader: under the verses it covers, in the chapter's
 * context (it speaks of the whole chapter or book), or nowhere. The site reads these targets
 * directly; the mobile kit stores them as `targets` rows, which Android matches the same way.
 * Both are checked against note-placement.cases.json.
 */
interface PlacedAddress {
  workId?: string | undefined;
  bookId: string;
  chapter?: number | undefined;
  verseStart?: number | undefined;
  verseEnd?: number | undefined;
  versificationSchemeId: string;
}

export interface PlacedRelation {
  passage: PlacedAddress;
  additionalPassages?: readonly PlacedAddress[] | undefined;
  relationScope?: string | undefined;
  referenceRole?: string | undefined;
}

/** A place the note applies to. No chapter: every chapter of the book. No verse: the chapter. */
export interface NoteTarget {
  workId: string;
  schemeId: string;
  bookId: string;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
}

export function noteTargets(relation: PlacedRelation): NoteTarget[] {
  // A dictionary entry only mentions the verse: it is listed in the inspector, never in the text.
  if (relation.referenceRole === "lexical-mention") return [];
  const wholeBook = relation.relationScope === "book";
  return [relation.passage, ...(relation.additionalPassages ?? [])].map((address) => {
    // Book and chapter relations are context, never repeated under every verse they name.
    const start =
      wholeBook || relation.relationScope === "chapter" ? undefined : address.verseStart;
    return {
      workId: address.workId ?? `work:${address.bookId}`,
      schemeId: address.versificationSchemeId,
      bookId: address.bookId,
      chapter: wholeBook ? null : (address.chapter ?? null),
      verseStart: start ?? null,
      // A reversed range ("18–16") still covers its first verse.
      verseEnd: start === undefined ? null : Math.max(address.verseEnd ?? start, start),
    };
  });
}

export function targetCoversVerse(
  target: NoteTarget,
  bookId: string,
  chapter: number,
  verse: number,
): boolean {
  return (
    target.bookId === bookId &&
    target.chapter === chapter &&
    target.verseStart !== null &&
    target.verseStart <= verse &&
    (target.verseEnd ?? target.verseStart) >= verse
  );
}

export function targetIsChapterContext(target: NoteTarget, bookId: string, chapter: number) {
  return (
    target.bookId === bookId &&
    (target.chapter === null || target.chapter === chapter) &&
    target.verseStart === null
  );
}
