/**
 * PrimarySidebar — main navigation rail. Dense, textual, keyboard-friendly.
 */

import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Download,
  HelpCircle,
  Home,
  Library,
  Network,
  NotebookPen,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { t } from "../../lib/i18n";

const MAIN_NAV = [
  { to: "/", label: t("navigation.home"), icon: Home },
  { to: "/scripture", label: t("navigation.scripture"), icon: BookOpen },
  { to: "/study", label: t("navigation.study"), icon: NotebookPen },
  { to: "/library", label: t("navigation.library"), icon: Library },
  { to: "/knowledge", label: t("navigation.knowledge"), icon: Network },
  { to: "/search", label: t("navigation.search"), icon: Search },
] as const;

const UTILITY_NAV = [
  {
    to: "/library",
    label: t("navigation.downloads"),
    icon: Download,
    search: { tab: "collections" },
  },
  { to: "/settings", label: t("navigation.settings"), icon: Settings },
  { to: "/about", label: t("navigation.helpAbout"), icon: HelpCircle },
] as const;

export function PrimarySidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <nav
      aria-label={t("navigation.primary")}
      className="flex h-full w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
    >
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="meta-label px-2 pb-1.5 pt-1">{t("navigation.workspace")}</p>
        <ul className="space-y-0.5">
          {MAIN_NAV.map(({ to, label, icon: Icon }) => (
            <li key={label}>
              <Link
                to={to}
                aria-current={isActive(to) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                  isActive(to)
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-sidebar-border px-2 py-2">
        <ul className="space-y-0.5">
          {UTILITY_NAV.map(({ to, label, icon: Icon }) => (
            <li key={label}>
              <Link
                to={to}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <Icon className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
