/**
 * Verse — one verse of scripture. In "original" mode renders clickable
 * tokens; in translation modes renders the edition text. When original
 * data hasn't been imported for a verse, an explicit state is shown
 * instead of fabricated text.
 */

import type { VerseContent } from "../../lib/domain/scripture";
import { OriginalToken } from "./original-token";
import { cn } from "../../lib/utils";

export type ReaderView = "single" | "parallel" | "original" | "interlinear";

export function Verse({
  verse,
  editionId,
  bookName,
  chapter,
  verseMode,
}: {
  verse: VerseContent;
  editionId: string;
  bookName: string;
  chapter: number;
  verseMode: "verse" | "paragraph";
}) {
  const text = verse.translations[editionId];
  const label = `${bookName} ${chapter}:${verse.verse}`;

  return (
    <span className={cn(verseMode === "verse" && "mb-3 block")}>
      <span
        className="mr-1.5 align-super font-mono text-[10px] font-medium text-muted-foreground select-none"
        aria-hidden
      >
        {verse.verse}
      </span>
      <span className="sr-only">{label}. </span>
      {text ?? (
        <span className="text-sm text-muted-foreground italic">
          [Translation not imported for this verse — demo dataset]
        </span>
      )}
      {verseMode === "paragraph" && " "}
    </span>
  );
}

/** Original-language rendering of a verse (clickable tokens). */
export function OriginalVerse({
  verse,
  bookName,
  chapter,
}: {
  verse: VerseContent;
  bookName: string;
  chapter: number;
}) {
  const label = `${bookName} ${chapter}:${verse.verse}`;
  const isHebrew = verse.original?.[0]?.language === "hbo";

  if (!verse.original) {
    return (
      <div className="mb-3 flex items-baseline gap-2">
        <span className="align-super font-mono text-[10px] text-muted-foreground select-none">
          {verse.verse}
        </span>
        <span className="text-sm text-muted-foreground italic">
          Original text not yet imported for this verse (demo dataset).
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4" dir={isHebrew ? "rtl" : "ltr"}>
      <span className="me-1.5 align-super font-mono text-[10px] text-muted-foreground select-none" dir="ltr">
        {verse.verse}
      </span>
      {verse.original.map((token) => (
        <OriginalToken key={token.id} token={token} verseLabel={label} />
      ))}
    </div>
  );
}
