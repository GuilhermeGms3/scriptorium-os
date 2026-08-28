/**
 * ResourceRow — dense catalog row (Zotero-like), not a marketing card.
 */

import type { LibraryResource } from "../../lib/domain/library";
import { cn } from "../../lib/utils";
import { languageLabel, resourceTypeLabel, statusLabel } from "../../lib/i18n";

export function ResourceRow({
  resource,
  active,
  onSelect,
}: {
  resource: LibraryResource;
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "grid w-full grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5 border-b border-border px-3 py-2 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{resource.title}</span>
        <span className="block truncate font-mono text-[11px] text-muted-foreground">
          {[resource.author, resource.year, resourceTypeLabel(resource.type)]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9px] tracking-wider uppercase">
        <span className="rounded border border-border px-1 py-px text-muted-foreground">
          {languageLabel(resource.language)}
        </span>
        <span
          className={cn(
            "rounded px-1 py-px",
            resource.availability === "local"
              ? "bg-primary/15 text-foreground"
              : "border border-border text-muted-foreground",
          )}
        >
          {statusLabel(resource.availability)}
        </span>
      </span>
    </button>
  );
}
