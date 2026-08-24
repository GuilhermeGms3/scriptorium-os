/**
 * MobileNav — bottom navigation for small screens. The desktop sidebar /
 * inspector collapse into this contextual navigation on mobile.
 */

import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Home, Library, NotebookPen, Search } from "lucide-react";
import { cn } from "../../lib/utils";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/scripture", label: "Scripture", icon: BookOpen },
  { to: "/study", label: "Study", icon: NotebookPen },
  { to: "/library", label: "Library", icon: Library },
  { to: "/search", label: "Search", icon: Search },
] as const;

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <nav
      aria-label="Primary"
      className="flex h-14 shrink-0 items-stretch border-t border-border bg-background md:hidden"
    >
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <Link
          key={label}
          to={to}
          aria-current={isActive(to) ? "page" : undefined}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px]",
            isActive(to) ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Icon className="size-5" strokeWidth={isActive(to) ? 2 : 1.5} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
