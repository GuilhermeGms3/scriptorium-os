/**
 * OriginalLanguageToken — a clickable original-language word.
 * Selecting it fills the Word Inspector.
 */

import type { Token } from "../../lib/domain/scripture";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { cn } from "../../lib/utils";

export function OriginalToken({
  token,
  verseLabel,
  size = "md",
}: {
  token: Token;
  verseLabel: string;
  size?: "md" | "lg";
}) {
  const { selectWord, wordSelection } = useWorkbench();
  const selected = wordSelection?.token.id === token.id;
  const isHebrew = token.language === "hbo";

  return (
    <button
      onClick={() => selectWord({ token, verseLabel })}
      aria-pressed={selected}
      aria-label={`Analyze ${token.surface} (${token.lemma})`}
      className={cn(
        "original-text rounded px-0.5 transition-colors hover:bg-highlight focus-visible:bg-highlight",
        selected && "bg-highlight text-highlight-foreground",
        size === "lg" ? "text-xl leading-relaxed" : "text-lg leading-relaxed",
      )}
      dir={isHebrew ? "rtl" : "ltr"}
    >
      {token.surface}
    </button>
  );
}
