/**
 * ParallelVersions — two or more editions side by side, verse-aligned.
 */

import type { Edition, VerseContent } from "../../lib/domain/scripture";
import { t, textDirectionForLanguage } from "../../lib/i18n";

export function ParallelVersions({
  verses,
  editions,
}: {
  verses: VerseContent[];
  editions: Edition[];
}) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse" aria-label={t("scripture.parallelVersions")}>
        <thead>
          <tr className="border-b border-border">
            <th className="w-8 py-1 pr-2 text-left font-mono text-[10px] font-medium text-muted-foreground" />
            {editions.map((ed) => (
              <th
                key={ed.id}
                className="min-w-52 px-3 py-1 text-left font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase"
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
              <td className="py-2 pr-2 text-right font-mono text-[10px] text-muted-foreground select-none">
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
                            (token) => `${token.prefix ?? ""}${token.surface}${token.suffix ?? ""}`,
                          )
                          .join("")
                      : undefined) ?? (
                      <span className="font-sans text-xs text-muted-foreground italic">
                        Sem alinhamento explícito disponível
                      </span>
                    )}
                  {v.alignmentStatusByEdition?.[ed.id] === "partial" && (
                    <span className="mt-1 block font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
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
  );
}
