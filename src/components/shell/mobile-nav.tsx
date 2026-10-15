/**
 * MobileNav — bottom navigation for small screens: the five places used most, and "Mais" for the
 * rest of the sidebar, so every destination stays reachable on a phone.
 */

import { Link, useRouterState } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "../../lib/utils";
import { t } from "../../lib/i18n";
import { isNavigationActive, NAVIGATION_GROUPS, UTILITY_NAVIGATION } from "./navigation";

const ALL_ITEMS = NAVIGATION_GROUPS.flatMap((group) => group.items);
const PRIMARY_PATHS = new Set(["/", "/scripture", "/study", "/library", "/search"]);
const PRIMARY = ALL_ITEMS.filter((item) => PRIMARY_PATHS.has(item.to));
const MORE = [...ALL_ITEMS.filter((item) => !PRIMARY_PATHS.has(item.to)), ...UTILITY_NAVIGATION];

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const moreActive = MORE.some((item) => isNavigationActive(pathname, item.to));

  return (
    <nav
      aria-label={t("navigation.primary")}
      className="flex h-14 shrink-0 items-stretch border-t border-border bg-background md:hidden"
    >
      {PRIMARY.map(({ to, label, icon: Icon }) => {
        const active = isNavigationActive(pathname, to);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              active ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            moreActive ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          <MoreHorizontal
            className="size-5"
            strokeWidth={moreActive ? 2 : 1.5}
            aria-hidden="true"
          />
          Mais
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="min-w-56">
          {MORE.map(({ to, label, icon: Icon, description }) => (
            <DropdownMenuItem key={to} asChild>
              <Link to={to} className="flex items-start gap-2.5 py-2">
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block text-sm">{label}</span>
                  {description && (
                    <span className="block text-xs text-muted-foreground">{description}</span>
                  )}
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
