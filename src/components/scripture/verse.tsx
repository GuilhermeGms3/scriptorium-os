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
import { Star } from "lucide-react";
import { MARK_COLOR_LABELS, type VerseMark } from "../../lib/domain/verse-marks";
import "./verse-marks.css";

export type ReaderView = "single" | "parallel" | "original" | "interlinear";

export function Verse({
  verse,
  editionId,
  bookName,
  chapter,
  verseMode,
  selected = false,
  onSelect,
  mark,
}: {
  verse: VerseContent;
  editionId: string;
  bookName: string;
  chapter: number;
  verseMode: "verse" | "paragraph";
  selected?: boolean;
  onSelect?: () => void;
  /** The reader's highlighter color and star for this verse. */
  mark?: Pick<VerseMark, "color" | "favorite"> | undefined;
}) {
  const text = verse.translations[editionId];
  const label = `${bookName} ${chapter}:${verse.verse}`;
  const marked = [
    mark?.color ? `marcado de ${MARK_COLOR_LABELS[mark.color].toLocaleLowerCase("pt-BR")}` : "",
    mark?.favorite ? "favorito" : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <span
      id={`verse-${verse.verse}`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? selected : undefined}
      aria-label={onSelect ? `Selecionar ${label}${marked ? `, ${marked}` : ""}` : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onSelect();
      }}
      className={cn(
        verseMode === "verse" && "mb-3 block",
        onSelect &&
          "cursor-pointer rounded-md outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring",
        selected && "bg-primary/10 ring-2 ring-primary/60",
      )}
    >
      <span
        className={cn(
          "mr-1.5 align-super font-mono text-xs font-medium select-none",
          selected ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden
      >
        {verse.verse}
      </span>
      {mark?.favorite && (
        <Star
          aria-hidden="true"
          className="mr-1 inline size-3.5 -translate-y-0.5 fill-amber-400 text-amber-500"
        />
      )}
      <span className="sr-only">
        {label}
        {marked ? ` (${marked})` : ""}.{" "}
      </span>
      {text && mark?.color ? (
        <span className={cn("verse-mark", `verse-mark-${mark.color}`)}>{text}</span>
      ) : (
        text
      )}
      {!text && (
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
        <span className="align-super font-mono text-xs text-muted-foreground select-none">
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
        className="me-1.5 align-super font-mono text-xs text-muted-foreground select-none"
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
