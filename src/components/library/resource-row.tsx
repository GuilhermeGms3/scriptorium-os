import type { BibliographicSource } from "../../lib/domain/bibliography";
import { cn } from "../../lib/utils";

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
        <span className="block truncate text-[13px] font-medium">{source.title}</span>
        <span className="block truncate font-mono text-[11px] text-muted-foreground">
          {[authorNames.join(", "), source.publicationYear].filter(Boolean).join(" · ") ||
            "Sem atribuição"}
        </span>
      </span>
      <span className="rounded border border-border px-1 py-px font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {source.sourceType.replaceAll("-", " ")}
      </span>
    </button>
  );
}
