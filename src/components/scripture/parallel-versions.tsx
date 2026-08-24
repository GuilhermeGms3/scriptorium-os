/**
 * ParallelVersions — two or more editions side by side, verse-aligned.
 */

import type { Edition, VerseContent } from "../../lib/domain/scripture";

export function ParallelVersions({
  verses,
  editions,
}: {
  verses: VerseContent[];
  editions: Edition[];
}) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Parallel versions">
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
                <td key={ed.id} className="reading-text px-3 py-2 text-[0.95em]">
                  {v.translations[ed.id] ?? (
                    <span className="font-sans text-xs text-muted-foreground italic">—</span>
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
