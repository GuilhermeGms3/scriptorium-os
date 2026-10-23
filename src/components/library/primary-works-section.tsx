import { useMemo } from "react";
import type { PrimarySourceWorkSummary } from "../../lib/repositories/primary-source-repository";
import { EmptyState } from "../layout/empty-state";

/** Installed primary texts, grouped by their main academic use. */
export function PrimaryWorksSection({ works }: { works: readonly PrimarySourceWorkSummary[] }) {
  const byDiscipline = useMemo(() => {
    const groups = new Map<string, PrimarySourceWorkSummary[]>();
    for (const work of works)
      groups.set(work.disciplineLabel, [...(groups.get(work.disciplineLabel) ?? []), work]);
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "pt-BR"));
  }, [works]);

  if (!works.length)
    return (
      <EmptyState title="Nenhuma fonte primária instalada">
        Este build não traz textos primários instalados.
      </EmptyState>
    );
  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Obras agrupadas pelo uso acadêmico principal; uma mesma obra poderá receber vários assuntos
        quando a taxonomia da biblioteca for ampliada.
      </p>
      {byDiscipline.map(([discipline, group]) => (
        <section key={discipline} aria-label={discipline}>
          <h3 className="meta-label">{discipline}</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.map((work) => (
              <a
                key={`${work.editionId}:${work.id}`}
                href={`/library/read/${encodeURIComponent(work.id)}`}
                className="rounded-md border border-border px-3 py-2.5 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block text-sm font-medium">{work.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {work.editionTitle}
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
