import { Star, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { MARK_COLOR_LABELS, MARK_COLORS, type VerseAddress } from "../../lib/domain/verse-marks";
import { useVerseMarkActions, useVerseMarks } from "../../hooks/use-verse-marks";
import "./verse-marks.css";

/**
 * Mark the selected verse: a highlighter color (tap the same color again to take it away) and a
 * star for favorites. Both appear in the text and in "Marcações".
 */
export function VerseMarkControls({
  verse,
  editionId,
  className,
}: {
  verse: VerseAddress;
  /** Edition being read, so "Marcações" shows the verse as it was read. */
  editionId?: string | undefined;
  className?: string | undefined;
}) {
  const { markOf } = useVerseMarks();
  const { setColor, setFavorite } = useVerseMarkActions();
  const mark = markOf(verse);
  return (
    <div
      role="group"
      aria-label="Marcar este versículo"
      className={cn("flex flex-wrap items-center gap-x-1 gap-y-2", className)}
    >
      <span className="mr-1 text-sm text-muted-foreground">Marcar</span>
      {MARK_COLORS.map((color) => {
        const on = mark?.color === color;
        return (
          <button
            key={color}
            type="button"
            aria-pressed={on}
            aria-label={on ? `Tirar a cor ${MARK_COLOR_LABELS[color]}` : MARK_COLOR_LABELS[color]}
            title={on ? "Tocar de novo tira a cor" : MARK_COLOR_LABELS[color]}
            onClick={() => void setColor(verse, on ? null : color, editionId)}
            className="flex size-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-11"
          >
            <span
              aria-hidden="true"
              className={cn(
                "mark-swatch block size-6 rounded-full border border-foreground/15",
                `mark-swatch-${color}`,
                on && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
              )}
            />
          </button>
        );
      })}
      {mark?.color && (
        <button
          type="button"
          onClick={() => void setColor(verse, null, editionId)}
          className="flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
        >
          <X className="size-4" aria-hidden="true" /> Sem cor
        </button>
      )}
      <button
        type="button"
        aria-pressed={Boolean(mark?.favorite)}
        onClick={() => void setFavorite(verse, !mark?.favorite, editionId)}
        className={cn(
          "ml-auto flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11",
          mark?.favorite
            ? "border-amber-500/60 bg-amber-500/10 text-foreground"
            : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Star
          aria-hidden="true"
          className={cn("size-4", mark?.favorite && "fill-amber-400 text-amber-500")}
        />
        {mark?.favorite ? "Favorito" : "Favoritar"}
      </button>
    </div>
  );
}
