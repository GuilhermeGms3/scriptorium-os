import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { searchWorkspace, type SearchHit } from "../lib/application/search-workspace";
import { useWorkbench } from "../lib/workbench/workbench-context";
import { t } from "../lib/i18n";

interface SearchParams {
  q?: string;
}
export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams =>
    typeof search["q"] === "string" ? { q: search["q"] } : {},
  head: () => ({ meta: [{ title: `${t("navigation.search")} — Scriptorium` }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const { setPassageContext } = useWorkbench();
  const [query, setQuery] = useState(q);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => setPassageContext(null), [setPassageContext]);
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

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 md:px-8">
      <header className="border-b border-border pb-3">
        <p className="meta-label">{t("search.global")}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">{t("search.workspace")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("search.description")}</p>
      </header>
      <label className="mt-5 flex h-11 items-center gap-2 rounded-md border border-input bg-card px-3">
        <SearchIcon className="size-4 text-muted-foreground" />
        <span className="sr-only">{t("search.query")}</span>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      <div className="mt-5">
        {!query.trim() ? (
          <p className="text-sm italic text-muted-foreground">{t("search.typeHint")}</p>
        ) : searching ? (
          <p className="text-sm italic text-muted-foreground">Pesquisando no índice SQLite…</p>
        ) : hits.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">{t("search.noResults")}</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {hits.map((hit) => (
              <li key={hit.id}>
                <Link to={hit.to as never} className="grid gap-1 py-2.5 sm:grid-cols-[90px_1fr]">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {hit.group}
                  </span>
                  <span>
                    <span className="block text-[13px] font-medium">{hit.label}</span>
                    {hit.detail && (
                      <span className="block text-xs text-muted-foreground">
                        {hit.detail.replaceAll(/<\/?mark>/g, "")}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
