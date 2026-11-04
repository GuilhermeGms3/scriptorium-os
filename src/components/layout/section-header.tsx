import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Title of a section inside a page. `meta` is the small uppercase label used for grouping;
 * the default is a readable serif heading.
 */
export function SectionHeader({
  title,
  description,
  icon,
  actions,
  variant = "default",
  as: Heading = "h2",
  id,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: "default" | "meta";
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-2", className)}>
      <div className="min-w-0">
        <Heading
          id={id}
          className={cn(
            "flex items-center gap-1.5",
            variant === "meta" ? "meta-label" : "font-serif text-lg font-semibold",
          )}
        >
          {icon}
          {title}
        </Heading>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
