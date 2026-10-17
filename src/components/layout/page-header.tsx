import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The one page title style: small label, serif title, optional description and actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  /** Extra content under the description, e.g. a profile selector. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="meta-label">{eyebrow}</p>}
        <h1 className="mt-1 flex items-center gap-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          {icon}
          {title}
        </h1>
        {description && (
          <div className="mt-3 max-w-[68ch] text-base leading-relaxed text-muted-foreground">
            {description}
          </div>
        )}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
