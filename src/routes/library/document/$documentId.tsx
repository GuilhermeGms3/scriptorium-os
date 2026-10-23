import { SourceSelectionAction } from "../../../components/study/source-selection-action";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LockKeyhole,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/utils";
import type { PrivateDocumentSearchHit } from "../../../lib/domain/private-document";
import { useWorkspaceQuery } from "../../../hooks/use-workspace-query";
import { EmptyState } from "../../../components/layout/empty-state";
import { DocumentKnowledgeRepository } from "../../../lib/repositories/document-knowledge-repository";
import { PrivateDocumentRepository } from "../../../lib/repositories/private-document-repository";
import { useWorkbench } from "../../../lib/workbench/workbench-context";
import { BookReadingService } from "../../../lib/application/book-reading-service";
import {
  DocumentSidePanel,
  type DocumentPanelTab,
} from "../../../components/library/document-side-panel";
import { usePageLinks } from "../../../components/library/use-page-links";

export const Route = createFileRoute("/library/document/$documentId")({
  validateSearch: (search: Record<string, unknown>): { page?: number; unit?: string } => {
    const value = Number(search["page"]);
    return {
      ...(Number.isInteger(value) && value > 0 ? { page: value } : {}),
      ...(typeof search["unit"] === "string" ? { unit: search["unit"] } : {}),
    };
  },
  component: PrivateDocumentReaderPage,
  head: () => ({ meta: [{ title: "Documento privado — Scriptorium" }] }),
});

/** The page text with the cited evidence spans marked. */
function highlighted(text: string, spans: readonly { start: number; end: number }[]): ReactNode[] {
  let offset = 0;
  const chunks: ReactNode[] = [];
  for (const span of spans) {
    if (span.start < offset || span.end > text.length) continue;
    chunks.push(text.slice(offset, span.start));
    chunks.push(
      <mark
        key={`${span.start}:${span.end}`}
        className="bg-amber-500/20 text-inherit underline decoration-amber-500 underline-offset-4"
      >
        {text.slice(span.start, span.end)}
      </mark>,
    );
    offset = span.end;
  }
  chunks.push(text.slice(offset));
  return chunks;
}

/**
 * A private book: the page on the left, with navigation and search; everything about the page and
 * the book on the right, in tabs; the technical tools folded under "Processamento".
 */
function PrivateDocumentReaderPage() {
  const { documentId } = Route.useParams();
  const { page: requestedPage, unit: requestedUnit } = Route.useSearch();
  const { setPassageContext } = useWorkbench();
  const [word, setWord] = useState("");
  const [evidenceSpans, setEvidenceSpans] = useState<{ start: number; end: number }[]>([]);
  const [evidenceError, setEvidenceError] = useState<string>();
  const [pageIndex, setPageIndex] = useState(() => Math.max(0, (requestedPage ?? 1) - 1));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PrivateDocumentSearchHit[]>();
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [panelTab, setPanelTab] = useState<DocumentPanelTab>("links");
  const panelRef = useRef<HTMLElement>(null);
  const pageLinks = usePageLinks(documentId, pageIndex);
  const pendingLinks = (pageLinks.items ?? []).filter(
    (item) => item.reviewState === "pending",
  ).length;

  useEffect(() => setPassageContext(null), [setPassageContext]);
  const documentQuery = useWorkspaceQuery(["private-document", documentId], () =>
    PrivateDocumentRepository.getDocument(documentId),
  );
  const document = documentQuery.data;
  // Reprocessing in "Processamento" changes the structure and the state line; OCR, the page.
  const contextQuery = useWorkspaceQuery(
    ["book-context", documentId],
    () => BookReadingService.context(documentId),
    { refreshOnKnowledgeChange: true },
  );
  const bookContext = contextQuery.data;
  const contextError = contextQuery.error ? errorMessage(contextQuery.error) : undefined;
  const pageQuery = useWorkspaceQuery(
    ["private-document-page", documentId, pageIndex],
    () => PrivateDocumentRepository.getPage(documentId, pageIndex),
    { enabled: Boolean(document), refreshOnKnowledgeChange: true },
  );
  const page = pageQuery.data;
  const pageError = pageQuery.error ? errorMessage(pageQuery.error) : undefined;
  useEffect(() => {
    setWord("");
    setResults(undefined);
    setSearchError(undefined);
  }, [documentId]);
  useEffect(() => {
    let active = true;
    setEvidenceSpans([]);
    setEvidenceError(undefined);
    if (requestedUnit)
      void DocumentKnowledgeRepository.listUnits(documentId, [requestedUnit])
        .then((units) => {
          const spans = (units[0]?.spans ?? [])
            .filter((span) => span.pageIndex === Math.max(0, (requestedPage ?? 1) - 1))
            .map((span) => ({ start: span.startOffset, end: span.endOffset }))
            .sort((a, b) => a.start - b.start);
          if (active) {
            setEvidenceSpans(spans);
            if (!spans.length)
              setEvidenceError("A unidade citada não possui offsets nesta página.");
          }
        })
        .catch((cause: unknown) => {
          if (active) setEvidenceError(cause instanceof Error ? cause.message : String(cause));
        });
    return () => {
      active = false;
    };
  }, [documentId, requestedUnit, requestedPage]);
  useEffect(() => {
    if (requestedPage !== undefined) setPageIndex(Math.max(0, requestedPage - 1));
  }, [requestedPage]);

  const runSearch = async () => {
    if (!document || !query.trim()) {
      setResults(undefined);
      return;
    }
    setSearching(true);
    setSearchError(undefined);
    try {
      setResults(await PrivateDocumentRepository.search(query, { documentId: document.id }));
    } catch (cause) {
      setSearchError(errorMessage(cause));
    } finally {
      setSearching(false);
    }
  };
  const showPanelTab = (tab: DocumentPanelTab) => {
    setPanelTab(tab);
    // Below the wide layout the panel sits under the page.
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (documentQuery.error)
    return (
      <div className="px-5 py-10">
        <EmptyState
          title="Não foi possível abrir este livro"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => void documentQuery.refetch()}>Tentar novamente</Button>
              <Button variant="outline" asChild>
                <Link to="/library">Voltar à Biblioteca</Link>
              </Button>
            </div>
          }
        >
          {errorMessage(documentQuery.error)}
        </EmptyState>
      </div>
    );
  if (document === undefined)
    return <p className="p-8 text-sm italic text-muted-foreground">Abrindo o livro…</p>;
  if (!document)
    return (
      <div className="px-5 py-10">
        <EmptyState
          title="Livro não encontrado"
          action={
            <Button variant="outline" asChild>
              <Link to="/library">Voltar à Biblioteca</Link>
            </Button>
          }
        >
          Ele pode ter sido removido deste computador.
        </EmptyState>
      </div>
    );

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <header className="border-b border-border px-4 py-3 md:px-6">
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Biblioteca
        </Link>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">{document.title}</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <LockKeyhole className="size-3.5" aria-hidden="true" /> Livro privado ·{" "}
          {document.pageCount} páginas · guardado neste computador
        </p>
      </header>

      <div className="grid min-h-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:overflow-hidden">
        <section aria-label="Página do documento" className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:px-6">
            <button
              type="button"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-input px-2.5 text-sm hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden="true" /> Anterior
            </button>
            <label className="flex items-center gap-2 text-sm">
              Página
              <input
                type="number"
                min={1}
                max={document.pageCount}
                value={pageIndex + 1}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isInteger(next) && next >= 1 && next <= document.pageCount)
                    setPageIndex(next - 1);
                }}
                className="h-9 w-20 rounded-md border border-input bg-background px-2 font-mono"
              />
              de {document.pageCount}
            </label>
            <button
              type="button"
              disabled={pageIndex >= document.pageCount - 1}
              onClick={() => setPageIndex((value) => Math.min(document.pageCount - 1, value + 1))}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-input px-2.5 text-sm hover:bg-accent disabled:opacity-40"
            >
              Próxima <ChevronRight className="size-4" aria-hidden="true" />
            </button>
            <form
              className="ml-auto flex min-w-56 flex-1 items-center gap-2 sm:max-w-sm"
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch();
              }}
            >
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-background px-2.5 focus-within:ring-2 focus-within:ring-ring">
                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">Procurar neste livro</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Procurar neste livro…"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={!query.trim() || searching}
                className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"
              >
                {searching ? "Procurando…" : "Procurar"}
              </button>
            </form>
          </div>

          {searchError && (
            <p
              role="alert"
              className="border-b border-border px-4 py-2 text-sm text-destructive md:px-6"
            >
              A busca falhou: {searchError}
            </p>
          )}
          {results && (
            <section
              aria-label="Resultados da busca neste livro"
              className="border-b border-border bg-muted/20 px-4 py-3 md:px-6"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {results.length
                    ? `${results.length} ${results.length === 1 ? "página encontrada" : "páginas encontradas"}`
                    : "Nenhuma página com esse termo."}
                </p>
                <button
                  type="button"
                  onClick={() => setResults(undefined)}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" /> Fechar resultados
                </button>
              </div>
              {results.length > 0 && (
                <ol className="mt-2 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                  {results.map((result) => (
                    <li key={`${result.documentId}:${result.pageIndex}`}>
                      <button
                        type="button"
                        onClick={() => setPageIndex(result.pageIndex)}
                        className={`w-full rounded-md border p-2.5 text-left hover:bg-accent/50 ${result.pageIndex === pageIndex ? "border-primary" : "border-border"}`}
                      >
                        <span className="text-xs font-medium text-muted-foreground">
                          Página {result.pageLabel}
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed">{result.snippet}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {pageError ? (
            <div role="alert" className="p-8 text-sm text-destructive">
              <p>A página não pôde ser carregada: {pageError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void pageQuery.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : page === undefined ? (
            <p className="p-8 text-sm italic text-muted-foreground">Carregando a página…</p>
          ) : page ? (
            <article className="mx-auto max-w-3xl px-6 py-8 md:px-10">
              <p className="meta-label">Página física {page.pageLabel}</p>
              {evidenceError && (
                <p role="status" className="mt-2 text-sm text-muted-foreground">
                  Não foi possível realçar o trecho citado; a página completa está disponível.{" "}
                  {evidenceError}
                </p>
              )}
              {pendingLinks > 0 && (
                <div
                  role="status"
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-dashed border-amber-500/60 bg-amber-500/5 px-3 py-2 text-sm"
                >
                  <p className="flex items-center gap-1.5">
                    <CircleHelp
                      className="size-4 text-amber-700 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    Esta página tem {pendingLinks}{" "}
                    {pendingLinks === 1
                      ? "ligação bíblica por confirmar"
                      : "ligações bíblicas por confirmar"}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => showPanelTab("links")}
                  >
                    Ver e confirmar
                  </Button>
                </div>
              )}
              {page.text ? (
                <div
                  onDoubleClick={() => {
                    const selected = window.getSelection()?.toString().trim().slice(0, 100) ?? "";
                    if (!selected) return;
                    setWord(selected);
                    setPanelTab("about");
                  }}
                  id="private-source-page-text"
                  className="mt-5 whitespace-pre-wrap font-serif text-[var(--reading-size)] leading-[var(--reading-leading)]"
                >
                  {evidenceSpans.length && page.pageIndex === (requestedPage ?? 1) - 1
                    ? highlighted(page.text, evidenceSpans)
                    : page.text}
                </div>
              ) : (
                <p className="mt-5 text-sm italic text-muted-foreground">
                  Esta página não tem camada de texto. Use o OCR em “Processamento” para
                  recuperá-la.
                </p>
              )}
              <SourceSelectionAction
                elementId="private-source-page-text"
                source={{
                  kind: "private-document",
                  documentId,
                  title: document.title,
                  page: page.pageIndex + 1,
                }}
              />
              <p className="mt-8 text-xs text-muted-foreground">
                Dica: dê dois cliques em uma palavra para procurá-la nos dicionários do acervo.
              </p>
            </article>
          ) : (
            <p className="p-8 text-sm text-destructive">Página não encontrada.</p>
          )}
        </section>

        <aside
          ref={panelRef}
          aria-label="Sobre esta página e o livro"
          className="min-w-0 scroll-mt-4 border-t border-border bg-card lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0"
        >
          <DocumentSidePanel
            document={document}
            page={page}
            pageIndex={pageIndex}
            links={pageLinks}
            context={bookContext}
            contextError={contextError}
            word={word}
            onWord={setWord}
            tab={panelTab}
            onTabChange={setPanelTab}
            onNavigatePage={setPageIndex}
          />
        </aside>
      </div>
    </div>
  );
}
