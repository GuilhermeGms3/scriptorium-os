/**
 * ParallelVersions — the editions the reader picks, side by side, verse-aligned.
 */

import { useState } from "react";
import type { Edition, VerseContent } from "../../lib/domain/scripture";
import { t, textDirectionForLanguage } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import {
  initialComparison,
  MAX_COMPARED,
  rememberComparison,
  rememberedComparison,
} from "./parallel-comparison";

export function ParallelVersions({
  verses,
  editions: allEditions,
  currentEditionId,
}: {
  verses: VerseContent[];
  editions: Edition[];
  /** The edition being read, compared first. */
  currentEditionId: string;
}) {
  const [chosen, setChosen] = useState<string[]>(() =>
    initialComparison(
      allEditions,
      currentEditionId,
      typeof window === "undefined" ? null : rememberedComparison(),
    ),
  );
  const editions = allEditions.filter((edition) => chosen.includes(edition.id));
  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id];
    if (!next.length || next.length > MAX_COMPARED) return;
    setChosen(next);
    rememberComparison(next);
  };
  return (
    <div className="min-w-0">
      <div
        role="group"
        aria-label="Versões comparadas"
        className="mb-4 flex flex-wrap items-center gap-1.5 font-sans"
      >
        <span className="mr-1 text-sm text-muted-foreground">Comparar</span>
        {allEditions.map((edition) => {
          const on = chosen.includes(edition.id);
          const blocked = !on && chosen.length >= MAX_COMPARED;
          return (
            <button
              key={edition.id}
              type="button"
              aria-pressed={on}
              disabled={blocked || (on && chosen.length === 1)}
              title={blocked ? `Escolha até ${MAX_COMPARED} versões` : edition.title}
              onClick={() => toggle(edition.id)}
              className={cn(
                "min-h-8 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 pointer-coarse:min-h-11",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-accent",
              )}
            >
              {edition.abbreviation}
            </button>
          );
        })}
      </div>
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full border-collapse" aria-label={t("scripture.parallelVersions")}>
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 py-1 pr-2 text-left font-mono text-xs font-medium text-muted-foreground" />
              {editions.map((ed) => (
                <th
                  key={ed.id}
                  className="min-w-52 px-3 py-1 text-left meta-label font-medium tracking-wider text-muted-foreground"
                >
                  {ed.abbreviation}
                  <span className="ml-2 font-normal normal-case opacity-70">{ed.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {verses.map((v) => (
              <tr key={v.verse} className="align-top odd:bg-muted/30">
                <td className="py-2 pr-2 text-right font-mono text-xs text-muted-foreground select-none">
                  {v.verse}
                </td>
                {editions.map((ed) => (
                  <td
                    key={ed.id}
                    dir={ed.direction ?? textDirectionForLanguage(ed.language)}
                    className="reading-text px-3 py-2 text-[0.95em]"
                  >
                    {v.translations[ed.id] ??
                      (v.originalEditionId === ed.id
                        ? v.original
                            ?.map(
                              (token) =>
                                `${token.prefix ?? ""}${token.surface}${token.suffix ?? ""}`,
                            )
                            .join("")
                        : undefined) ?? (
                        <span className="font-sans text-xs text-muted-foreground italic">
                          Sem alinhamento explícito disponível
                        </span>
                      )}
                    {v.alignmentStatusByEdition?.[ed.id] === "partial" && (
                      <span className="mt-1 block font-sans text-xs uppercase tracking-wide text-muted-foreground">
                        Correspondência parcial
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
