import { Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEMANTIC_DOMAIN_LABELS, type SemanticDomain } from "../../lib/domain/semantic-content";

function chipLabel(title: string): string {
  const clean = title.replace(/\s*\([^)]*\)\s*$/u, "").trim() || title;
  return clean.length > 28 ? `${clean.slice(0, 27).trimEnd()}…` : clean;
}

/**
 * Which commentaries to read, always in view under the reader's toolbar: one chip per source that
 * comments this chapter (on = shown), plus the subject filter. Replaces the small "Filtrar
 * biblioteca conectada" box that sat at the top of the text and scrolled away.
 */
export function CommentarySourceBar({
  sources,
  hidden,
  onHiddenChange,
  domains,
  domain,
  onDomainChange,
}: {
  sources: readonly { id: string; title: string }[];
  hidden: ReadonlySet<string>;
  onHiddenChange: (next: ReadonlySet<string>) => void;
  domains: readonly string[];
  domain: string;
  onDomainChange: (domain: string) => void;
}) {
  if (!sources.length) return null;
  const shown = sources.filter((source) => !hidden.has(source.id));
  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onHiddenChange(next);
  };
  const showAll = () => {
    const next = new Set(hidden);
    for (const source of sources) next.delete(source.id);
    onHiddenChange(next);
  };
  return (
    <div className="border-b border-border bg-background/95 px-4 py-2">
      <div
        className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]"
        role="group"
        aria-label="Fontes dos comentários"
      >
        <Library className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="mr-1 shrink-0 text-sm text-muted-foreground">Fontes</span>
        {sources.length > 1 && (
          <button
            type="button"
            aria-pressed={shown.length === sources.length}
            onClick={showAll}
            className={cn(
              "min-h-8 shrink-0 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              shown.length === sources.length
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:bg-accent",
            )}
          >
            Todas
          </button>
        )}
        {sources.map((source) => {
          const on = !hidden.has(source.id);
          return (
            <button
              key={source.id}
              type="button"
              aria-pressed={on}
              title={on ? `Ocultar ${source.title}` : `Mostrar ${source.title}`}
              onClick={() => toggle(source.id)}
              className={cn(
                "min-h-8 shrink-0 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-dashed border-border text-muted-foreground line-through decoration-muted-foreground/60 hover:bg-accent",
              )}
            >
              {chipLabel(source.title)}
            </button>
          );
        })}
        {domains.length > 0 && (
          <label className="ml-1 flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
            <span className="sr-only">Área</span>
            <select
              value={domain}
              onChange={(event) => onDomainChange(event.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="">Todas as áreas</option>
              {domains.map((value) => (
                <option key={value} value={value}>
                  {SEMANTIC_DOMAIN_LABELS[value as SemanticDomain] ?? value}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {shown.length === 0 && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          As fontes que você escolheu não comentam este capítulo.{" "}
          <button
            type="button"
            onClick={showAll}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Mostrar todas
          </button>
        </p>
      )}
    </div>
  );
}
