/**
 * CommandPalette — ⌘K. Keyboard-first search across scripture, words,
 * library, people, places, concepts and notes, plus app commands.
 */

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
import { useMemo } from "react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { ScriptureRepository } from "../../lib/repositories/scripture-repository";
import { LibraryRepository } from "../../lib/repositories/library-repository";
import { KnowledgeRepository } from "../../lib/repositories/knowledge-repository";
import { bookLabel, entityTypeLabel, t } from "../../lib/i18n";

interface SearchHit {
  id: string;
  group: string;
  label: string;
  detail?: string | undefined;
  to?: string | undefined;
}

export function searchWorkspace(query: string, noteTitles: string[]): SearchHit[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const hits: SearchHit[] = [];

  // Scripture (demo chapters)
  for (const book of ScriptureRepository.listBooks()) {
    for (const ch of ScriptureRepository.availableChapters(book.id)) {
      const chapter = ScriptureRepository.getChapter(book.id, ch);
      if (!chapter) continue;
      for (const v of chapter.verses) {
        const text = v.translations["web"] ?? "";
        if (
          text.toLowerCase().includes(q) ||
          `${book.name} ${ch}:${v.verse}`.toLowerCase().includes(q) ||
          `${bookLabel(book.id, book.name)} ${ch}:${v.verse}`.toLowerCase().includes(q)
        ) {
          hits.push({
            id: `scr-${book.id}-${ch}-${v.verse}`,
            group: t("search.group.scripture"),
            label: `${bookLabel(book.id, book.name)} ${ch}:${v.verse}`,
            detail: text.length > 90 ? `${text.slice(0, 90)}…` : text,
            to: `/scripture/${book.id}/${ch}`,
          });
        }
      }
    }
  }

  // Words (demo lexicon)
  for (const lemma of ["λόγος", "ἀρχή", "θεός", "רֵאשִׁית"]) {
    const entry = ScriptureRepository.getLexiconEntry(lemma);
    if (
      entry &&
      (entry.lemma.includes(query) ||
        entry.transliteration?.toLowerCase().includes(q) ||
        entry.glosses.some((g) => g.includes(q)))
    ) {
      hits.push({
        id: `word-${lemma}`,
        group: t("search.group.words"),
        label: `${entry.lemma} · ${entry.transliteration ?? ""}`,
        detail: entry.glosses.join(", "),
        to: "/knowledge",
      });
    }
  }

  // Library
  for (const r of LibraryRepository.listResources()) {
    if (
      r.title.toLowerCase().includes(q) ||
      r.author?.toLowerCase().includes(q) ||
      r.tags.some((t) => t.includes(q))
    ) {
      hits.push({
        id: `lib-${r.id}`,
        group: t("search.group.library"),
        label: r.title,
        detail: r.author,
        to: "/library",
      });
    }
  }

  // Knowledge entities
  for (const e of KnowledgeRepository.search(query)) {
    const group =
      e.type === "person"
        ? t("search.group.people")
        : e.type === "place"
          ? t("search.group.places")
          : e.type === "concept"
            ? t("search.group.concepts")
            : t("search.group.knowledge");
    hits.push({
      id: `ent-${e.id}`,
      group,
      label: e.name,
      detail: entityTypeLabel(e.type),
      to: `/knowledge?entity=${e.id}`,
    });
  }

  // Notes
  noteTitles.forEach((title, i) => {
    if (title.toLowerCase().includes(q)) {
      hits.push({ id: `note-${i}`, group: t("search.group.notes"), label: title, to: "/study" });
    }
  });

  return hits.slice(0, 24);
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, resolvedTheme, setTheme, createStudy, notes } =
    useWorkbench();
  const navigate = useNavigate();

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
        run: () => navigate({ to: "/library" }),
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
          const s = createStudy(t("command.untitledStudy"));
          navigate({ to: "/study/$slug", params: { slug: s.slug } });
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
      onOpenChange={setPaletteOpen}
      label={t("search.dialog")}
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
            placeholder={t("search.palettePlaceholder")}
            className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            {t("search.noResults")}
          </Command.Empty>

          <Command.Group
            heading={<span className="meta-label px-2">{t("search.commands")}</span>}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            {commands.map((c) => (
              <Command.Item
                key={c.id}
                value={`command ${c.label}`}
                onSelect={() => {
                  c.run();
                  setPaletteOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-foreground aria-selected:bg-accent"
              >
                <c.icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                {c.label}
              </Command.Item>
            ))}
          </Command.Group>

          <SearchResults
            noteTitles={notes.map((n) => n.title)}
            close={() => setPaletteOpen(false)}
          />
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

function SearchResults({ noteTitles, close }: { noteTitles: string[]; close: () => void }) {
  const navigate = useNavigate();
  return (
    <Command.Group heading={<span className="meta-label px-2">{t("search.results")}</span>}>
      <QueryHits
        noteTitles={noteTitles}
        onPick={(to) => {
          if (to) navigate({ to: to as never });
          close();
        }}
      />
    </Command.Group>
  );
}

function QueryHits({
  noteTitles,
  onPick,
}: {
  noteTitles: string[];
  onPick: (to?: string) => void;
}) {
  // cmdk filtering is value-based; we render dynamic hits with keywords so
  // cmdk's own filter shows them only when relevant.
  const hits = useMemo(() => {
    const all: SearchHit[] = [];
    for (const q of [
      "logos",
      "λόγος",
      "word",
      "john",
      "genesis",
      "paul",
      "jerusalem",
      "kingdom",
      "god",
      "light",
      "greek",
      "love",
      "covenant",
      "rome",
      "galilee",
      "beginning",
    ]) {
      all.push(...searchWorkspace(q, noteTitles));
    }
    const seen = new Set<string>();
    return all.filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)));
  }, [noteTitles]);

  return (
    <>
      {hits.map((h) => (
        <Command.Item
          key={h.id}
          value={`${h.group} ${h.label} ${h.detail ?? ""}`}
          onSelect={() => onPick(h.to)}
          className="flex cursor-pointer items-baseline gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-foreground aria-selected:bg-accent"
        >
          <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {h.group}
          </span>
          <span className="min-w-0">
            <span className="block truncate">{h.label}</span>
            {h.detail && (
              <span className="block truncate text-xs text-muted-foreground">{h.detail}</span>
            )}
          </span>
        </Command.Item>
      ))}
    </>
  );
}
