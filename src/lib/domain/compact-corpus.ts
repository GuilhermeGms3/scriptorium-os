import type { GeneratedChapterShard } from "./generated-corpus";
import type { TokenOccurrence, VerseContent } from "./scripture";

/** Only context inherited from the verse/chapter is omitted. IDs and Unicode stay verbatim. */
type CompactToken = Omit<TokenOccurrence, "editionId" | "textUnitId" | "ref" | "language">;
export interface CompactChapterShard extends Omit<
  GeneratedChapterShard,
  "schemaVersion" | "verses"
> {
  schemaVersion: 2;
  verses: (Omit<VerseContent, "original"> & { original?: CompactToken[] })[];
}

export function compactChapter(chapter: GeneratedChapterShard): CompactChapterShard {
  return {
    ...chapter,
    schemaVersion: 2,
    verses: chapter.verses.map(({ original, ...verse }) => ({
      ...verse,
      ...(original
        ? {
            original: original.map((token) => {
              if (
                token.editionId !== chapter.editionId ||
                token.language !== "grc" ||
                JSON.stringify(token.ref) !== JSON.stringify(verse.ref) ||
                token.textUnitId !==
                  `${chapter.editionId}:${chapter.bookId}.${chapter.chapter}.${verse.verse}`
              ) {
                throw new Error(`Cannot compact non-inherited context: ${token.id}`);
              }
              const {
                editionId: _edition,
                textUnitId: _unit,
                ref: _ref,
                language: _language,
                ...record
              } = token;
              return record;
            }),
          }
        : {}),
    })),
  };
}

export function expandChapter(
  chapter: GeneratedChapterShard | CompactChapterShard,
): GeneratedChapterShard {
  if (chapter.schemaVersion === 1) return chapter;
  if (chapter.schemaVersion !== 2) throw new Error("Unsupported chapter schema");
  return {
    ...chapter,
    schemaVersion: 1,
    verses: chapter.verses.map(({ original, ...verse }) => ({
      ...verse,
      ...(original
        ? {
            original: original.map((token) => ({
              ...token,
              editionId: chapter.editionId,
              textUnitId: `${chapter.editionId}:${chapter.bookId}.${chapter.chapter}.${verse.verse}`,
              ref: verse.ref,
              language: "grc" as const,
            })),
          }
        : {}),
    })),
  };
}
