import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Library,
  Moon,
  Network,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { searchWorkspace, type SearchHit } from "../../lib/application/search-workspace";
import { t } from "../../lib/i18n";

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, resolvedTheme, setTheme, createStudy } = useWorkbench();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchWorkspace(query)
        .then((results) => {
          if (active) setHits(results);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const commands = useMemo(
    () => [
      {
        id: "cmd-scripture",
        label: t("command.openScripture"),
        icon: BookOpen,
        run: () => navigate({ to: "/scripture" }),
      },
      {
        id: "cmd-library",
        label: t("command.openLibrary"),
        icon: Library,
        run: () => navigate({ to: "/library", search: {} }),
      },
      {
        id: "cmd-search-library",
        label: t("command.searchLibrary"),
        icon: Search,
        run: () => navigate({ to: "/search" }),
      },
      {
        id: "cmd-knowledge",
        label: t("command.openKnowledge"),
        icon: Network,
        run: () => navigate({ to: "/knowledge" }),
      },
      {
        id: "cmd-new-study",
        label: t("command.newStudy"),
        icon: Plus,
        run: () => {
          void createStudy(t("command.untitledStudy")).then((study) =>
            navigate({ to: "/study/$slug", params: { slug: study.slug } }),
          );
        },
      },
      {
        id: "cmd-theme",
        label: resolvedTheme === "dark" ? t("command.lightMode") : t("command.darkMode"),
        icon: resolvedTheme === "dark" ? Sun : Moon,
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
      {
        id: "cmd-settings",
        label: t("command.openSettings"),
        icon: Settings,
        run: () => navigate({ to: "/settings" }),
      },
      {
        id: "cmd-study",
        label: t("command.openStudy"),
        icon: NotebookPen,
        run: () => navigate({ to: "/study" }),
      },
    ],
    [navigate, resolvedTheme, setTheme, createStudy],
  );

  return (
    <Command.Dialog
      open={paletteOpen}
      onOpenChange={(open) => {
        setPaletteOpen(open);
        if (!open) setQuery("");
      }}
      label={t("search.dialog")}
      shouldFilter={!query.trim()}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
    >
      <div
        className="fixed inset-0 -z-10 bg-black/40"
        onClick={() => setPaletteOpen(false)}
        aria-hidden
      />
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={t("search.palettePlaceholder")}
            className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          {query.trim() ? (
            <Command.Group
              heading={
                <span className="meta-label px-2">
                  {searching ? "Pesquisando índice…" : t("search.results")}
                </span>
              }
            >
              {!searching && hits.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("search.noResults")}
                </p>
              )}
              {hits.map((hit) => (
                <Command.Item
                  key={hit.id}
                  value={hit.id}
                  onSelect={() => {
                    if (hit.to) navigate({ to: hit.to as never });
                    setPaletteOpen(false);
                  }}
                  className="flex cursor-pointer items-baseline gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-foreground aria-selected:bg-accent"
                >
                  <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {hit.group}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{hit.label}</span>
                    {hit.detail && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.detail.replaceAll(/<\/?mark>/g, "")}
                      </span>
                    )}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : (
            <Command.Group
              heading={<span className="meta-label px-2">{t("search.commands")}</span>}
            >
              {commands.map((command) => (
                <Command.Item
                  key={command.id}
                  value={`command ${command.label}`}
                  onSelect={() => {
                    command.run();
                    setPaletteOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-foreground aria-selected:bg-accent"
                >
                  <command.icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  {command.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
