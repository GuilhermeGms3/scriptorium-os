import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/lib/utils";
import { useDebouncedValue, useWorkspaceQuery } from "../hooks/use-workspace-query";
import { BookOpen, Library, Search as SearchIcon, Sparkles } from "lucide-react";
import { searchWorkspace } from "../lib/application/search-workspace";
import { useWorkbench } from "../lib/workbench/workbench-context";
import { t } from "../lib/i18n";
import { PageContainer } from "../components/layout/page-container";
import { PageHeader } from "../components/layout/page-header";
import { EmptyState } from "../components/layout/empty-state";

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
  const [group, setGroup] = useState<string>("all");
  useEffect(() => setPassageContext(null), [setPassageContext]);
  useEffect(() => setGroup("all"), [query]);
  const settledQuery = useDebouncedValue(query.trim(), 180);
  const searchQuery = useWorkspaceQuery(
    ["search", settledQuery],
    () => searchWorkspace(settledQuery),
    { enabled: settledQuery !== "" },
  );
  // Only the answer to what is typed now: a failed or slower search never shows older results.
  const hits = useMemo(
    () => (settledQuery === query.trim() ? (searchQuery.data ?? []) : []),
    [query, searchQuery.data, settledQuery],
  );
  const searching = query.trim() !== "" && (settledQuery !== query.trim() || searchQuery.isPending);
  const searchError = searchQuery.error ? errorMessage(searchQuery.error) : undefined;
  const groups = [...new Set(hits.map((hit) => hit.group))];
  const visibleHits = group === "all" ? hits : hits.filter((hit) => hit.group === group);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t("search.global")}
        title={t("search.workspace")}
        description={t("search.description")}
      />
      <label className="mt-5 flex h-12 items-center gap-2 rounded-md border border-input bg-card px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
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
      {!query.trim() && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <section className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <h2 className="text-sm font-medium">Referência ou texto bíblico</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Digite “João 1:1”, uma frase em português, grego ou hebraico.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["João 1:1", "no princípio", "λόγος", "בראשית"].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="rounded border border-input px-2 py-1 text-xs hover:bg-accent"
                >
                  {example}
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Library className="size-4 text-primary" />
              <h2 className="text-sm font-medium">Acervo e conhecimento</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pesquisa fontes primárias, PDFs locais, autores, conceitos, notas e estudos.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Trindade", "Agostinho", "Didaquê", "ressurreição"].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="rounded border border-input px-2 py-1 text-xs hover:bg-accent"
                >
                  {example}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {hits.length > 0 && (
        <div
          className="mt-3 flex items-center gap-1 overflow-x-auto"
          aria-label="Filtrar resultados"
        >
          <button
            type="button"
            onClick={() => setGroup("all")}
            className={`shrink-0 rounded px-2.5 py-1 text-xs ${group === "all" ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60"}`}
          >
            Todos <span className="font-mono text-xs">{hits.length}</span>
          </button>
          {groups.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setGroup(name)}
              className={`shrink-0 rounded px-2.5 py-1 text-xs ${group === name ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60"}`}
            >
              {name}{" "}
              <span className="font-mono text-xs">
                {hits.filter((hit) => hit.group === name).length}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-5">
        {!query.trim() ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4" aria-hidden="true" /> A busca consulta índices locais;
            nenhum texto é enviado para a internet.
          </div>
        ) : searching ? (
          <p className="text-sm italic text-muted-foreground">Pesquisando no índice SQLite…</p>
        ) : searchError ? (
          <p role="alert" className="text-sm text-destructive">
            A busca falhou: {searchError}
          </p>
        ) : hits.length === 0 ? (
          <EmptyState icon={SearchIcon} title={t("search.noResults")}>
            Tente outra palavra, um nome de livro (por exemplo, “Romanos 8”) ou menos termos.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {visibleHits.map((hit) => (
              <li key={hit.id}>
                <Link to={hit.to as never} className="grid gap-1 py-2.5 sm:grid-cols-[90px_1fr]">
                  <span className="meta-label tracking-wider text-muted-foreground">
                    {hit.group}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{hit.label}</span>
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
    </PageContainer>
  );
}
