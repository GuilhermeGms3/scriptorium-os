/**
 * Verse — one verse of scripture. In "original" mode renders clickable
 * tokens; in translation modes renders the edition text. When original
 * data hasn't been imported for a verse, an explicit state is shown
 * instead of fabricated text.
 */

import type { VerseContent } from "../../lib/domain/scripture";
import { OriginalToken } from "./original-token";
import { cn } from "../../lib/utils";
import { t, textDirectionForLanguage } from "../../lib/i18n";

export type ReaderView = "single" | "parallel" | "original" | "interlinear";

export function Verse({
  verse,
  editionId,
  bookName,
  chapter,
  verseMode,
  selected = false,
  onSelect,
}: {
  verse: VerseContent;
  editionId: string;
  bookName: string;
  chapter: number;
  verseMode: "verse" | "paragraph";
  selected?: boolean;
  onSelect?: () => void;
}) {
  const text = verse.translations[editionId];
  const label = `${bookName} ${chapter}:${verse.verse}`;

  return (
    <span
      id={`verse-${verse.verse}`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? selected : undefined}
      aria-label={onSelect ? `Selecionar ${label}` : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onSelect();
      }}
      className={cn(
        verseMode === "verse" && "mb-3 block",
        onSelect &&
          "cursor-pointer rounded-sm outline-none transition-colors hover:bg-accent/30 focus-visible:ring-1 focus-visible:ring-ring",
        selected && "bg-accent/50 ring-1 ring-primary/40",
      )}
    >
      <span
        className="mr-1.5 align-super font-mono text-[10px] font-medium text-muted-foreground select-none"
        aria-hidden
      >
        {verse.verse}
      </span>
      <span className="sr-only">{label}. </span>
      {text ?? (
        <span className="text-sm text-muted-foreground italic">
          {t("scripture.translationMissing")}
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
  const direction = textDirectionForLanguage(verse.original?.[0]?.language ?? "en");

  if (!verse.original) {
    return (
      <div className="mb-3 flex items-baseline gap-2">
        <span className="align-super font-mono text-[10px] text-muted-foreground select-none">
          {verse.verse}
        </span>
        <span className="text-sm text-muted-foreground italic">
          {t("scripture.originalMissing")}
        </span>
      </div>
    );
  }

  return (
    <div id={`verse-${verse.verse}`} className="mb-4" dir={direction}>
      <span
        className="me-1.5 align-super font-mono text-[10px] text-muted-foreground select-none"
        dir="ltr"
      >
        {verse.verse}
      </span>
      {verse.original.map((token) => (
        <OriginalToken key={token.id} token={token} verseLabel={label} />
      ))}
    </div>
  );
}
