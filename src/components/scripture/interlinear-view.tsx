/**
 * InterlinearView — word-by-word visual structure: surface / transliteration /
 * gloss / morphology code. This is a component-and-data scaffold, NOT a real
 * interlinear engine; alignment to translations is future work.
 */

import type { VerseContent } from "../../lib/domain/scripture";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { cn } from "../../lib/utils";

export function InterlinearView({
  verse,
  bookName,
  chapter,
}: {
  verse: VerseContent;
  bookName: string;
  chapter: number;
}) {
  const { selectWord, wordSelection } = useWorkbench();
  const label = `${bookName} ${chapter}:${verse.verse}`;
  const isHebrew = verse.original?.[0]?.language === "hbo";

  if (!verse.original) {
    return (
      <div className="mb-4 flex items-baseline gap-2">
        <span className="font-mono text-[10px] text-muted-foreground select-none">{verse.verse}</span>
        <span className="text-sm text-muted-foreground italic">
          Interlinear data not yet imported for this verse (demo dataset).
        </span>
      </div>
    );
  }

  return (
    <div className="mb-5 overflow-x-auto pb-1">
      <div className="mb-1 font-mono text-[10px] text-muted-foreground select-none">{verse.verse}</div>
      <div
        className="flex min-w-max gap-x-4 gap-y-2"
        dir={isHebrew ? "rtl" : "ltr"}
        role="group"
        aria-label={`Interlinear ${label}`}
      >
        {verse.original.map((token) => {
          const selected = wordSelection?.token.id === token.id;
          return (
            <button
              key={token.id}
              onClick={() => selectWord({ token, verseLabel: label })}
              aria-pressed={selected}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded px-1 py-0.5 transition-colors hover:bg-highlight",
                selected && "bg-highlight",
              )}
            >
              <span className="original-text text-lg leading-tight">{token.surface}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {token.transliteration ?? ""}
              </span>
              <span className="text-xs text-foreground/80">{token.gloss}</span>
              <span className="font-mono text-[9px] tracking-wide text-muted-foreground">
                {token.morphology.code ?? token.morphology.partOfSpeech}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
