import { createFileRoute } from "@tanstack/react-router";
import { BookMarked, ChevronLeft, ChevronRight, Library, LockKeyhole, Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentKnowledgeWorkbench } from "../../../components/library/document-knowledge-workbench";
import { PrivateLinkCard } from "../../../components/scripture/private-verse-knowledge";
import { WorkspacePassageKnowledgeService } from "../../../lib/application/workspace-passage-knowledge-service";
import type {
  PrivateDocument,
  PrivateDocumentPage,
  PrivateDocumentSearchHit,
} from "../../../lib/domain/private-document";
import type { WorkspacePassageKnowledgeItem } from "../../../lib/domain/workspace-passage-knowledge";
import { DocumentKnowledgeRepository } from "../../../lib/repositories/document-knowledge-repository";
import { PrivateDocumentRepository } from "../../../lib/repositories/private-document-repository";
import { useWorkbench } from "../../../lib/workbench/workbench-context";

export const Route = createFileRoute("/library/document/$documentId")({
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const value = Number(search["page"]);
    return Number.isInteger(value) && value > 0 ? { page: value } : {};
  },
  component: PrivateDocumentReaderPage,
  head: () => ({ meta: [{ title: "Documento privado — Scriptorium" }] }),
});

interface PageLinks {
  items?: WorkspacePassageKnowledgeItem[];
  analyzed: boolean;
  error?: string;
}

/** Bible references detected on the open page, reloaded after every knowledge change. */
function usePageLinks(documentId: string, pageIndex: number): PageLinks {
  const [state, setState] = useState<PageLinks>({ analyzed: false });
  useEffect(() => {
    let active = true;
    let generation = 0;
    const load = () => {
      const request = ++generation;
      void Promise.all([
        WorkspacePassageKnowledgeService.loadDocumentPage(documentId, pageIndex),
        DocumentKnowledgeRepository.getSummary(documentId),
      ]).then(
        ([items, summary]) => {
          if (active && request === generation)
            setState({ items, analyzed: summary?.status === "ready" });
        },
        (cause: unknown) => {
          if (active && request === generation)
            setState({
              analyzed: false,
              error: cause instanceof Error ? cause.message : String(cause),
            });
        },
      );
    };
    setState({ analyzed: false });
    load();
    window.addEventListener("scriptorium:knowledge-changed", load);
    return () => {
      active = false;
      window.removeEventListener("scriptorium:knowledge-changed", load);
    };
  }, [documentId, pageIndex]);
  return state;
}

function PageBibleLinks({ links, sectionId }: { links: PageLinks; sectionId: string }) {
  return (
    <section
      id={sectionId}
      aria-labelledby={`${sectionId}-title`}
      className="mt-10 scroll-mt-16 border-t border-border pt-4"
    >
      <h2 id={`${sectionId}-title`} className="meta-label flex items-center gap-1.5">
        <BookMarked className="size-3.5" aria-hidden="true" /> Referências bíblicas nesta página
      </h2>
      {links.error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          As referências desta página não puderam ser carregadas: {links.error}
        </p>
      ) : links.items === undefined ? (
        <p className="mt-2 text-xs italic text-muted-foreground">Procurando referências…</p>
      ) : !links.analyzed ? (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Use “Desmontar livro” em “Conhecimento do livro” para detectar as referências bíblicas.
        </p>
      ) : !links.items.length ? (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Nenhuma referência bíblica detectada nesta página.
        </p>
      ) : (
        <div className="mt-3 space-y-2 border-l-2 border-amber-500/30 pl-3">
          {links.items.map((item) => (
            <PrivateLinkCard key={item.id} item={item} context="book-reader" />
          ))}
        </div>
      )}
    </section>
  );
}

function PrivateDocumentReaderPage() {
  const { documentId } = Route.useParams();
  const { page: requestedPage } = Route.useSearch();
  const { setPassageContext } = useWorkbench();
  const [document, setDocument] = useState<PrivateDocument | null>();
  const [pageIndex, setPageIndex] = useState(() => Math.max(0, (requestedPage ?? 1) - 1));
  const [page, setPage] = useState<PrivateDocumentPage | null>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PrivateDocumentSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>();
  const pageLinks = usePageLinks(documentId, pageIndex);
  const linksSectionId = useId();
  const unconfirmedLinks = (pageLinks.items ?? []).filter(
    (item) => item.reviewState !== "confirmed",
  ).length;

  useEffect(() => setPassageContext(null), [setPassageContext]);
  useEffect(() => {
    if (requestedPage !== undefined) setPageIndex(Math.max(0, requestedPage - 1));
  }, [requestedPage]);
  useEffect(() => {
    let active = true;
    setDocument(undefined);
    void PrivateDocumentRepository.getDocument(documentId).then(
      (value) => {
        if (active) setDocument(value);
      },
      (cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
    return () => {
      active = false;
    };
  }, [documentId]);

  useEffect(() => {
    if (!document) return;
    let active = true;
    setPage(undefined);
    void PrivateDocumentRepository.getPage(document.id, pageIndex).then(
      (value) => {
        if (active) setPage(value);
      },
      (cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
    return () => {
      active = false;
    };
  }, [document, pageIndex]);

  const runSearch = async () => {
    if (!document || !query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError(undefined);
    try {
      setResults(await PrivateDocumentRepository.search(query, { documentId: document.id }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSearching(false);
    }
  };
  if (document === undefined)
    return <p className="p-8 text-sm italic text-muted-foreground">Abrindo documento local…</p>;
  if (!document)
    return <p className="p-8 text-sm text-destructive">Documento privado não encontrado.</p>;

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr]">
      <header className="border-b border-border px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <a
              href="/library"
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <Library className="size-3" /> Biblioteca
            </a>
            <h1 className="mt-1 truncate font-serif text-lg font-semibold">{document.title}</h1>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <LockKeyhole className="size-3" /> Documento privado · {document.pageCount} páginas ·
              OPFS local
            </p>
          </div>
          <form
            className="flex min-w-64 flex-1 items-center gap-2 md:max-w-xl"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
          >
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded border border-input bg-background px-2">
              <Search className="size-3.5 text-muted-foreground" />
              <span className="sr-only">Pesquisar neste documento</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar no texto completo…"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={!query.trim() || searching}
              className="h-9 rounded bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </form>
        </div>
      </header>
      <div className="grid min-h-0 lg:grid-cols-[300px_1fr]">
        <aside className="min-h-0 overflow-y-auto border-r border-border p-3">
          <p className="meta-label">Resultados locais</p>
          {!results.length ? (
            <p className="mt-3 text-xs italic text-muted-foreground">
              Pesquise uma palavra ou expressão para localizar páginas neste livro.
            </p>
          ) : (
            <ol className="mt-2 space-y-2">
              {results.map((result) => (
                <li key={`${result.documentId}:${result.pageIndex}`}>
                  <button
                    type="button"
                    onClick={() => setPageIndex(result.pageIndex)}
                    className="w-full rounded border border-border p-2 text-left hover:bg-accent/50"
                  >
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      Página {result.pageLabel}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed">{result.snippet}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <DocumentKnowledgeWorkbench
            documentId={document.id}
            {...(document.language ? { documentLanguage: document.language } : {})}
            onNavigatePage={setPageIndex}
          />
        </aside>
        <main className="min-h-0 overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:px-8">
            <button
              type="button"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
              className="inline-flex h-8 items-center gap-1 rounded border border-input px-2 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" /> Anterior
            </button>
            <label className="flex items-center gap-2 text-xs">
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
                className="h-8 w-20 rounded border border-input bg-background px-2 font-mono"
              />
              de {document.pageCount}
            </label>
            <button
              type="button"
              disabled={pageIndex >= document.pageCount - 1}
              onClick={() => setPageIndex((value) => Math.min(document.pageCount - 1, value + 1))}
              className="inline-flex h-8 items-center gap-1 rounded border border-input px-2 text-xs disabled:opacity-40"
            >
              Próxima <ChevronRight className="size-3.5" />
            </button>
          </div>
          {error ? (
            <p role="alert" className="p-8 text-sm text-destructive">
              {error}
            </p>
          ) : page === undefined ? (
            <p className="p-8 text-sm italic text-muted-foreground">Carregando página…</p>
          ) : page ? (
            <article className="mx-auto max-w-3xl px-6 py-8 md:px-10">
              <p className="meta-label">Página física {page.pageLabel}</p>
              {unconfirmedLinks > 0 && (
                <div
                  role="status"
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"
                >
                  <p className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
                    Esta página tem {unconfirmedLinks}{" "}
                    {unconfirmedLinks === 1
                      ? "referência bíblica para confirmar"
                      : "referências bíblicas para confirmar"}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() =>
                      window.document
                        .getElementById(linksSectionId)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    Confirmar agora
                  </Button>
                </div>
              )}
              {page.text ? (
                <div className="mt-5 whitespace-pre-wrap font-serif text-[var(--reading-size)] leading-[var(--reading-leading)]">
                  {page.text}
                </div>
              ) : (
                <p className="mt-5 text-sm italic text-muted-foreground">
                  Esta página não possui camada textual. OCR ainda não foi executado.
                </p>
              )}
              <PageBibleLinks links={pageLinks} sectionId={linksSectionId} />
            </article>
          ) : (
            <p className="p-8 text-sm text-destructive">Página não encontrada.</p>
          )}
        </main>
      </div>
    </div>
  );
}
