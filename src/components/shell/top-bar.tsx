/**
 * TopBar — product identity, global search / command trigger, inspector toggle.
 */

import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookMarked, Moon, PanelRight, Search, Sun } from "lucide-react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { cn } from "../../lib/utils";
import { t } from "../../lib/i18n";
import { supportsPassageInspector } from "./shell-route-context";

/** "Ctrl K" by default (the shortcut also works with Ctrl on a Mac); "⌘K" on Apple devices. */
function useShortcutLabel(): string {
  const [label, setLabel] = useState("Ctrl K");
  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.userAgent)) setLabel("⌘K");
  }, []);
  return label;
}

export function TopBar() {
  const { setPaletteOpen, resolvedTheme, setTheme, inspectorOpen, setInspectorOpen } =
    useWorkbench();
  const pathname = useLocation({ select: (location) => location.pathname });
  const passageInspectorAvailable = supportsPassageInspector(pathname);
  const shortcut = useShortcutLabel();

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      <div className="flex items-center gap-2">
        {/* Where the name of the opening lands. */}
        <span className="flex items-center gap-2" data-brand-mark="">
          <BookMarked className="size-4 text-primary" strokeWidth={2} />
          <span className="font-mono text-sm font-medium tracking-[0.14em] text-foreground">
            SCRIPTORIUM
          </span>
        </span>
        <span className="hidden rounded border border-border px-1 py-px meta-label tracking-wider text-muted-foreground md:inline">
          {t("shell.productDescriptor")}
        </span>
      </div>

      <div className="flex flex-1 justify-center px-2">
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 w-full max-w-md items-center gap-2 rounded-md border border-input bg-muted/50 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("shell.openSearch")}
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">{t("shell.searchCommand")}</span>
          <kbd className="hidden rounded border border-border bg-background px-1 font-mono text-xs text-muted-foreground sm:inline">
            {shortcut}
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={t("shell.toggleTheme")}
          title={t("shell.toggleTheme")}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="size-4" strokeWidth={1.75} />
          ) : (
            <Moon className="size-4" strokeWidth={1.75} />
          )}
        </button>
        {passageInspectorAvailable && (
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            type="button"
            className={cn(
              "hidden h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex",
              inspectorOpen
                ? "border-primary/50 bg-accent text-foreground"
                : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-pressed={inspectorOpen}
            title={t("shell.toggleInspector")}
          >
            <PanelRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
            {t("shell.inspector")}
          </button>
        )}
      </div>
    </header>
  );
}
