/**
 * InterlinearView — word-by-word visual structure: surface / transliteration /
 * gloss / morphology code. This is a component-and-data scaffold, NOT a real
 * interlinear engine; alignment to translations is future work.
 */

import type { VerseContent } from "../../lib/domain/scripture";
import type { LinguisticAnnotation } from "../../lib/domain/linguistic";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { cn } from "../../lib/utils";
import { morphologyLabel, t, textDirectionForLanguage } from "../../lib/i18n";

export function InterlinearView({
  verse,
  bookName,
  chapter,
  annotations,
}: {
  verse: VerseContent;
  bookName: string;
  chapter: number;
  annotations: LinguisticAnnotation[];
}) {
  const { selectWord, wordSelection } = useWorkbench();
  const label = `${bookName} ${chapter}:${verse.verse}`;
  const direction = textDirectionForLanguage(verse.original?.[0]?.language ?? "en");
  const annotationsByToken = new Map(
    annotations.map((annotation) => [annotation.targetTokenId, annotation]),
  );

  if (!verse.original) {
    return (
      <div className="mb-4 flex items-baseline gap-2">
        <span className="font-mono text-[10px] text-muted-foreground select-none">
          {verse.verse}
        </span>
        <span className="text-sm text-muted-foreground italic">
          {t("scripture.interlinearMissing")}
        </span>
      </div>
    );
  }

  return (
    <div className="mb-5 overflow-x-auto pb-1">
      <div className="mb-2 border-l-2 border-border pl-3">
        <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          {t("scripture.portugueseParallel")}
        </p>
        <p className="mt-0.5 font-serif text-sm leading-relaxed">
          <span className="mr-1 font-mono text-[10px] text-muted-foreground">{verse.verse}</span>
          {Object.values(verse.translations)[0]}
        </p>
      </div>
      <div
        className="flex min-w-max gap-x-4 gap-y-2"
        dir={direction}
        role="group"
        aria-label={t("scripture.interlinearAria", { passage: label })}
      >
        {verse.original.map((token) => {
          const selected = wordSelection?.token.id === token.id;
          const annotation = annotationsByToken.get(token.id);
          const morphology = annotation?.normalized.morphology[0];
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
              <span className="original-text text-lg leading-tight">
                {token.prefix}
                {token.surface}
                {token.suffix}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {annotation?.normalized.transliteration ?? token.transliteration ?? ""}
              </span>
              <span className="text-xs text-foreground/80">
                {annotation?.normalized.lemmas[0] ?? token.lemma ?? "—"}
              </span>
              <span className="font-mono text-[9px] tracking-wide text-muted-foreground">
                {morphology?.rawMorphologyCode ??
                  token.morphology?.code ??
                  (token.morphology
                    ? morphologyLabel(token.morphology.partOfSpeech)
                    : t("scripture.notSupplied"))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
