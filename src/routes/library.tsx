import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileUp, Search } from "lucide-react";
import { LibraryRepository } from "../lib/repositories/library-repository";
import { ResourceRow } from "../components/library/resource-row";
import { ResourceDetails } from "../components/library/resource-details";
import { useWorkbench } from "../lib/workbench/workbench-context";
import { collectionLabel, discoverCategoryLabel, formatNumber, t } from "../lib/i18n";

interface LibrarySearch {
  tab?: "collections" | "discover";
}
export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => ({
    tab: search["tab"] === "discover" ? "discover" : "collections",
  }),
  head: () => ({ meta: [{ title: t("library.metaTitle") }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const { tab = "collections" } = Route.useSearch();
  const { setPassageContext } = useWorkbench();
  const [collection, setCollection] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("res-web");
  useEffect(() => setPassageContext(null), [setPassageContext]);
  const resources = useMemo(
    () =>
      LibraryRepository.resourcesInCollection(collection).filter((r) =>
        `${r.title} ${r.author ?? ""} ${r.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [collection, query],
  );
  const selected = LibraryRepository.getResource(selectedId) ?? resources[0] ?? null;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
        <div>
          <p className="meta-label">{t("library.section")}</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold">{t("library.resourcesTitle")}</h1>
        </div>
        <button
          type="button"
          title={t("library.importPlanned")}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-xs text-muted-foreground"
        >
          <FileUp className="size-3.5" /> {t("library.import")}{" "}
          <span className="font-mono text-[9px]">{t("common.planned")}</span>
        </button>
      </header>
      <div className="flex border-b border-border px-5">
        <a
          href="/library?tab=collections"
          className={`px-3 py-2 text-xs ${tab === "collections" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
        >
          {t("library.collections")}
        </a>
        <a
          href="/library?tab=discover"
          className={`px-3 py-2 text-xs ${tab === "discover" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
        >
          {t("library.discover")}
        </a>
      </div>
      {tab === "discover" ? (
        <Discover />
      ) : (
        <div className="grid min-h-0 flex-1 md:grid-cols-[180px_1fr] xl:grid-cols-[180px_1fr_320px]">
          <aside className="hidden overflow-y-auto border-r border-border p-2 md:block">
            <p className="meta-label px-2 py-1">{t("library.collections")}</p>
            {LibraryRepository.listCollections().map((c) => (
              <button
                key={c.id}
                onClick={() => setCollection(c.id)}
                className={`block w-full rounded px-2 py-1.5 text-left text-xs ${collection === c.id ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
              >
                {collectionLabel(c.id, c.name)}{" "}
                <span className="float-right font-mono text-[9px]">
                  {formatNumber(c.resourceIds.length)}
                </span>
              </button>
            ))}
          </aside>
          <main className="min-w-0 overflow-y-auto border-r border-border">
            <label className="flex h-10 items-center gap-2 border-b border-border px-3">
              <Search className="size-3.5 text-muted-foreground" />
              <span className="sr-only">{t("library.search")}</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("library.filter")}
                className="w-full bg-transparent text-xs outline-none"
              />
            </label>
            {resources.map((r) => (
              <ResourceRow
                key={r.id}
                resource={r}
                active={r.id === selected?.id}
                onSelect={() => setSelectedId(r.id)}
              />
            ))}
            {resources.length === 0 && (
              <p className="p-6 text-sm italic text-muted-foreground">{t("library.noResources")}</p>
            )}
            {selected && (
              <div className="border-t border-border xl:hidden">
                <ResourceDetails resource={selected} />
              </div>
            )}
          </main>
          <aside className="hidden overflow-y-auto xl:block">
            {selected && <ResourceDetails resource={selected} />}
          </aside>
        </div>
      )}
    </div>
  );
}

function Discover() {
  return (
    <div className="mx-auto w-full max-w-4xl p-5 md:p-8">
      <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        {t("library.licenseNotice")}
      </p>
      <div className="mt-5 grid border-y border-border sm:grid-cols-2">
        {LibraryRepository.discoverCategories().map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between border-b border-border p-3 sm:border-r"
          >
            <span className="text-sm">{discoverCategoryLabel(c.id, c.name)}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatNumber(c.count)} {t("common.demo").toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
