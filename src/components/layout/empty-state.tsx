import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One honest explanation and, when there is one, the next useful action. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-8 text-center",
        className,
      )}
    >
      {Icon && <Icon className="size-6 text-muted-foreground" aria-hidden="true" />}
      <p className="mt-2 font-serif text-base font-semibold">{title}</p>
      {children && (
        <div className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
