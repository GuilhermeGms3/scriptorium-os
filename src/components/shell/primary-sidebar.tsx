/**
 * PrimarySidebar — main navigation, grouped by what the reader wants to do: read, study, or open
 * the library. Technical tools sit at the bottom, quieter.
 */

import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "../../lib/utils";
import { t } from "../../lib/i18n";
import {
  isNavigationActive,
  NAVIGATION_GROUPS,
  UTILITY_NAVIGATION,
  type NavigationItem,
} from "./navigation";

function NavigationLink({
  item,
  active,
  quiet = false,
}: {
  item: NavigationItem;
  active: boolean;
  quiet?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : quiet
            ? "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
        />
      )}
      <Icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block">{item.label}</span>
        {item.description && (
          <span className="block text-xs font-normal text-muted-foreground">
            {item.description}
          </span>
        )}
      </span>
    </Link>
  );
}

export function PrimarySidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label={t("navigation.primary")}
      className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
    >
      <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {NAVIGATION_GROUPS.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <p className="meta-label px-2.5 pb-1">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavigationLink item={item} active={isNavigationActive(pathname, item.to)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="border-t border-sidebar-border px-2 py-2">
        <ul className="space-y-0.5">
          {UTILITY_NAVIGATION.map((item) => (
            <li key={item.to}>
              <NavigationLink item={item} active={isNavigationActive(pathname, item.to)} quiet />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
