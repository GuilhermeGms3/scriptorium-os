/**
 * TopBar — product identity, global search / command trigger, inspector toggle.
 */

import { BookMarked, Moon, PanelRight, Search, Sun } from "lucide-react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { cn } from "../../lib/utils";

export function TopBar() {
  const { setPaletteOpen, resolvedTheme, setTheme, inspectorOpen, setInspectorOpen } =
    useWorkbench();

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      <div className="flex items-center gap-2">
        <BookMarked className="size-4 text-primary" strokeWidth={2} />
        <span className="font-mono text-[13px] font-medium tracking-[0.14em] text-foreground">
          SCRIPTORIUM
        </span>
        <span className="hidden rounded border border-border px-1 py-px font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:inline">
          open biblical knowledge system
        </span>
      </div>

      <div className="flex flex-1 justify-center px-2">
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-7 w-full max-w-md items-center gap-2 rounded-md border border-input bg-muted/50 px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Open search and commands"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search or command…</span>
          <kbd className="hidden rounded border border-border bg-background px-1 font-mono text-[10px] text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="size-4" strokeWidth={1.75} />
          ) : (
            <Moon className="size-4" strokeWidth={1.75} />
          )}
        </button>
        <button
          onClick={() => setInspectorOpen(!inspectorOpen)}
          className={cn(
            "hidden size-7 items-center justify-center rounded-md transition-colors lg:flex",
            inspectorOpen
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          aria-label="Toggle inspector"
          aria-pressed={inspectorOpen}
          title="Toggle inspector"
        >
          <PanelRight className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
