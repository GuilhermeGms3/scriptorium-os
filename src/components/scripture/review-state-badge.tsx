import { Check, CircleHelp, Cog } from "lucide-react";
import type { PassageLinkReviewState } from "../../lib/domain/workspace-passage-knowledge";
import { cn } from "../../lib/utils";

/**
 * Review state of a library link in words and an icon, never by color alone: "Por confirmar"
 * stands out with a dashed amber border; a confirmed link carries a check mark.
 */
export function ReviewStateBadge({
  state,
  className,
}: {
  state: PassageLinkReviewState;
  className?: string;
}) {
  if (state === "pending")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500/70 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400",
          className,
        )}
      >
        <CircleHelp className="size-3.5" aria-hidden="true" /> Por confirmar
      </span>
    );
  if (state === "confirmed")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground",
          className,
        )}
      >
        <Check className="size-3.5 text-primary" aria-hidden="true" /> Confirmada
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <Cog className="size-3.5" aria-hidden="true" /> Ligação automática
    </span>
  );
}
