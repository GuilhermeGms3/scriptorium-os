import type { BibliographicSource } from "../../lib/domain/bibliography";
import { cn } from "../../lib/utils";
import { sourceTypeLabel } from "../../lib/i18n";

export function ResourceRow({
  source,
  authorNames,
  active,
  onSelect,
}: {
  source: BibliographicSource;
  authorNames: string[];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "grid w-full grid-cols-[1fr_auto] items-baseline gap-3 border-b border-border px-3 py-2.5 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{source.title}</span>
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {[authorNames.join(", "), source.publicationYear].filter(Boolean).join(" · ") ||
            "Sem atribuição"}
        </span>
      </span>
      <span className="rounded border border-border px-1 py-px meta-label tracking-wider text-muted-foreground">
        {sourceTypeLabel(source.sourceType)}
      </span>
    </button>
  );
}
