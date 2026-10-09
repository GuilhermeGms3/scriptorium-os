import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { ScriptureToolbar } from "../../components/scripture/scripture-toolbar";
import { BooksPanel } from "../../components/scripture/books-panel";
import { OriginalVerse, Verse, type ReaderView } from "../../components/scripture/verse";
import { ParallelVersions } from "../../components/scripture/parallel-versions";
import { InterlinearView } from "../../components/scripture/interlinear-view";
import { AnalysisLenses } from "../../components/scripture/analysis-lenses";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { bookLabel, passageLabel, t } from "../../lib/i18n";
import { hasAvailableData } from "../../lib/domain/availability";
import { VerseExplanations } from "../../components/scripture/verse-explanations";
import { PrivateVerseKnowledge } from "../../components/scripture/private-verse-knowledge";
import { Button } from "@/components/ui/button";
import { WorkspacePassageKnowledgeService } from "../../lib/application/workspace-passage-knowledge-service";
import {
  knowledgeItemCoversVerse,
  type WorkspacePassageKnowledgeLayer,
} from "../../lib/domain/workspace-passage-knowledge";
import { SEMANTIC_DOMAIN_LABELS, type SemanticDomain } from "../../lib/domain/semantic-content";

export const Route = createFileRoute("/scripture/$book/$chapter")({
  // Corpus SQLite/WASM is intentionally client-only. This prevents the isomorphic
  // loader from initializing WASM or attempting OPFS access during SSR.
  ssr: false,
  loader: async ({ params }) => {
    const chapter = Number(params.chapter);
    if (Number.isInteger(chapter) && chapter > 0) {
      return ScriptureKnowledgeEngine.loadPassageKnowledgeBundle({
        bookId: params.book,
        chapter,
      });
    }
    return null;
  },
  pendingComponent: () => <EmptyReader message={t("scripture.loadingCorpusChapter")} />,
  errorComponent: () => <EmptyReader message={t("scripture.corpusChapterError")} />,
  head: ({ params }) => {
    const book = ScriptureKnowledgeEngine.getBook(params.book);
    const localizedBook = book ? bookLabel(book.id, book.name) : t("navigation.scripture");
    const title = `${localizedBook} ${params.chapter} — ${t("scripture.reader")} Scriptorium`;
    const description = t("scripture.metaDescription");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ChapterReader,
});

function ChapterReader() {
  const { book: bookId, chapter: chapterParam } = Route.useParams();
  const loadedBundle = Route.useLoaderData();
  const chapter = Number(chapterParam);
  const { setPassageContext, selectWord, readingPrefs } = useWorkbench();

  const [editionId, setEditionId] = useState(() =>
    ScriptureKnowledgeEngine.defaultEditionId(bookId, chapter),
  );
  const [view, setView] = useState<ReaderView>("single");
  const [showExplanations, setShowExplanations] = useState(true);
  const [privateKnowledge, setPrivateKnowledge] = useState<WorkspacePassageKnowledgeLayer>();
  const [privateKnowledgeError, setPrivateKnowledgeError] = useState<string>();
  const [sourceFilter, setSourceFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [openVerses, setOpenVerses] = useState<ReadonlySet<number>>(() => new Set());
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  const book = ScriptureKnowledgeEngine.getBook(bookId);
  const activeRef = useMemo(
    () => ({
      bookId,
      chapter,
    }),
    [bookId, chapter],
  );
  const inspectorRef = useMemo(
    () => ({
      ...activeRef,
      ...(selectedVerse !== null ? { verseStart: selectedVerse, verseEnd: selectedVerse } : {}),
    }),
    [activeRef, selectedVerse],
  );
  const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(activeRef) ?? loadedBundle;
  const editions = bundle?.passage.editions ?? ScriptureKnowledgeEngine.listEditions();
  const effectiveEditionId = editions.some((edition) => edition.id === editionId)
    ? editionId
    : ScriptureKnowledgeEngine.defaultEditionId(bookId, chapter);
  const displayedEdition =
    view === "original" || view === "interlinear"
      ? editions.find((edition) => edition.kind === "original-language")
      : editions.find((edition) => edition.id === effectiveEditionId);
  const hasOriginal = Boolean(bundle?.passage.verses.some((verse) => verse.original?.length));
  const hasInterlinear = Boolean(
    hasOriginal && bundle && hasAvailableData(bundle.linguisticAnnotations),
  );
  const availableAnalyses = bundle && hasAvailableData(bundle.analyses) ? bundle.analyses.data : [];
  const availableClaims = bundle && hasAvailableData(bundle.claims) ? bundle.claims.data : [];
  const explanationsAvailable =
    availableAnalyses.length > 0 ||
    availableClaims.length > 0 ||
    Boolean(privateKnowledge?.items.length);
  const availableViews = useMemo<Record<ReaderView, boolean>>(
    () => ({
      single: true,
      parallel: editions.length > 1,
      original: hasOriginal,
      interlinear: hasInterlinear,
    }),
    [editions.length, hasInterlinear, hasOriginal],
  );

  useEffect(() => {
    if (!availableViews[view]) setView("single");
  }, [availableViews, view]);

  useEffect(() => {
    setPassageContext(book ? { ref: inspectorRef, label: passageLabel(inspectorRef) } : null);
    selectWord(null);
  }, [book, bundle?.identity.label, chapter, inspectorRef, setPassageContext, selectWord]);

  useEffect(() => {
    setOpenVerses(new Set());
    setSelectedVerse(null);
  }, [activeRef]);

  useEffect(() => {
    let active = true;
    const load = () => {
      setPrivateKnowledgeError(undefined);
      void WorkspacePassageKnowledgeService.load(activeRef, bundle ?? null, undefined, {
        includePending: true,
      }).then(
        (value) => {
          if (active) setPrivateKnowledge(value);
        },
        (cause: unknown) => {
          if (active)
            setPrivateKnowledgeError(cause instanceof Error ? cause.message : String(cause));
        },
      );
    };
    load();
    window.addEventListener("scriptorium:knowledge-changed", load);
    return () => {
      active = false;
      window.removeEventListener("scriptorium:knowledge-changed", load);
    };
  }, [activeRef, bundle]);

  const privateSources = useMemo(
    () => [
      ...new Map(
        (privateKnowledge?.items ?? []).map((item) => [item.document.id, item.document]),
      ).values(),
    ],
    [privateKnowledge],
  );
  const privateDomains = useMemo(
    () =>
      [
        ...new Set(
          (privateKnowledge?.items ?? []).flatMap((item) =>
            item.proposals.flatMap((proposal) =>
              proposal.payload.kind === "topic-assignment" ? [proposal.payload.domain] : [],
            ),
          ),
        ),
      ].sort(),
    [privateKnowledge],
  );
  const unconfirmedItems = useMemo(
    () => (privateKnowledge?.items ?? []).filter((item) => item.reviewState !== "confirmed"),
    [privateKnowledge],
  );
  const unconfirmedVerses = useMemo(
    () =>
      (bundle?.passage.verses ?? [])
        .map((verse) => verse.verse)
        .filter((verse) =>
          unconfirmedItems.some((item) => knowledgeItemCoversVerse(item, bookId, chapter, verse)),
        ),
    [bookId, bundle, chapter, unconfirmedItems],
  );
  const setVerseOpen = (verse: number, open: boolean) =>
    setOpenVerses((current) => {
      const next = new Set(current);
      if (open) next.add(verse);
      else next.delete(verse);
      return next;
    });
  const confirmNow = () => {
    setView("single");
    setSourceFilter("");
    setDomainFilter("");
    setOpenVerses(new Set(unconfirmedVerses));
    const first = unconfirmedVerses[0];
    if (first !== undefined)
      requestAnimationFrame(() =>
        document
          .getElementById(`verse-${first}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
  };

  if (!book) {
    return <EmptyReader message={t("scripture.unknownBook")} />;
  }

  return (
    <div className="flex h-full min-w-0">
      <div className="hidden w-44 shrink-0 border-r border-border lg:block">
        <BooksPanel activeBookId={bookId} activeChapter={chapter} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <ScriptureToolbar
          book={book}
          chapter={chapter}
          editions={editions}
          editionId={effectiveEditionId}
          onEditionChange={setEditionId}
          view={view}
          onViewChange={setView}
          hasPrev={chapter > 1}
          hasNext={chapter < book.chapters}
          availableViews={availableViews}
          showExplanations={showExplanations}
          onShowExplanationsChange={setShowExplanations}
          explanationsAvailable={explanationsAvailable}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!bundle ? (
            <EmptyReader
              message={t("scripture.notInDemo", {
                passage: `${bookLabel(book.id, book.name)} ${chapter}`,
              })}
              hint={t("scripture.demoChapters")}
            />
          ) : (
            <article className="mx-auto max-w-3xl px-5 py-6 md:px-8">
              <header className="mb-5 border-b border-border pb-3">
                <p className="meta-label">
                  {view === "parallel" ? t("scripture.parallelReading") : displayedEdition?.title}
                </p>
                <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
                  {bookLabel(book.id, book.name)} {chapter}
                </h1>
              </header>

              {unconfirmedItems.length > 0 && (
                <div
                  role="status"
                  className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"
                >
                  <p className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
                    Sua biblioteca tem {unconfirmedItems.length}{" "}
                    {unconfirmedItems.length === 1 ? "ligação" : "ligações"} para confirmar neste
                    capítulo
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={confirmNow}
                  >
                    Confirmar agora
                  </Button>
                </div>
              )}

              {showExplanations && privateKnowledge?.items.length ? (
                <div className="mb-5 flex flex-wrap items-center gap-2 rounded border border-border bg-muted/20 p-2 text-xs">
                  <span className="font-medium">Filtrar biblioteca conectada</span>
                  <label>
                    Fonte{" "}
                    <select
                      value={sourceFilter}
                      onChange={(event) => setSourceFilter(event.target.value)}
                      className="ml-1 rounded border border-input bg-background p-1"
                    >
                      <option value="">Todas</option>
                      {privateSources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Área{" "}
                    <select
                      value={domainFilter}
                      onChange={(event) => setDomainFilter(event.target.value)}
                      className="ml-1 rounded border border-input bg-background p-1"
                    >
                      <option value="">Todas</option>
                      {privateDomains.map((domain) => (
                        <option key={domain} value={domain}>
                          {SEMANTIC_DOMAIN_LABELS[domain as SemanticDomain] ?? domain}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              {privateKnowledgeError ? (
                <p role="alert" className="mb-4 text-xs text-destructive">
                  A biblioteca privada não pôde ser carregada: {privateKnowledgeError}
                </p>
              ) : null}

              {view === "single" && (
                <div className="reading-text">
                  {bundle.passage.verses.map((v) => (
                    <div key={v.verse}>
                      <Verse
                        verse={v}
                        editionId={effectiveEditionId}
                        bookName={bookLabel(book.id, book.name)}
                        chapter={chapter}
                        verseMode={showExplanations ? "verse" : readingPrefs.verseMode}
                        selected={selectedVerse === v.verse}
                        onSelect={() => setSelectedVerse(v.verse)}
                      />
                      {showExplanations && (
                        <VerseExplanations
                          bookId={book.id}
                          chapter={chapter}
                          verse={v.verse}
                          analyses={availableAnalyses}
                          claims={availableClaims}
                        />
                      )}
                      {showExplanations && (
                        <PrivateVerseKnowledge
                          bookId={book.id}
                          chapter={chapter}
                          verse={v.verse}
                          items={privateKnowledge?.items ?? []}
                          open={openVerses.has(v.verse)}
                          onOpenChange={(open) => setVerseOpen(v.verse, open)}
                          {...(sourceFilter ? { sourceId: sourceFilter } : {})}
                          {...(domainFilter ? { domain: domainFilter } : {})}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {view === "parallel" && (
                <ParallelVersions
                  verses={bundle.passage.verses}
                  editions={editions.filter(
                    (e) => e.kind === "translation" || e.kind === "original-language",
                  )}
                />
              )}

              {view === "original" && (
                <div>
                  <p className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    {t(
                      bundle.passage.verses[0]?.original?.[0]?.language === "hbo"
                        ? "scripture.originalHintHebrew"
                        : "scripture.originalHint",
                    )}
                  </p>
                  {bundle.passage.verses.map((v) => (
                    <OriginalVerse
                      key={v.verse}
                      verse={v}
                      bookName={bookLabel(book.id, book.name)}
                      chapter={chapter}
                    />
                  ))}
                </div>
              )}

              {view === "interlinear" && (
                <div>
                  <p className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    {t(
                      bundle.passage.verses[0]?.original?.[0]?.language === "hbo"
                        ? "scripture.interlinearHintHebrew"
                        : "scripture.interlinearHint",
                    )}
                  </p>
                  {bundle.passage.verses.map((v) => (
                    <InterlinearView
                      key={v.verse}
                      verse={v}
                      bookName={bookLabel(book.id, book.name)}
                      chapter={chapter}
                      annotations={
                        hasAvailableData(bundle.linguisticAnnotations)
                          ? bundle.linguisticAnnotations.data.filter((annotation) =>
                              v.original?.some((token) => token.id === annotation.targetTokenId),
                            )
                          : []
                      }
                    />
                  ))}
                </div>
              )}

              <div className="mt-10 border-t border-border pt-6">
                <AnalysisLenses
                  passageLabel={passageLabel(bundle.identity.ref)}
                  lenses={bundle.lenses}
                  analyses={bundle.analyses}
                />
              </div>

              <footer className="mt-8 border-t border-border pt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                <details>
                  <summary className="cursor-pointer">
                    {displayedEdition?.title ?? "Fontes desta passagem"}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {bundle.texts.map((layer) => (
                      <p key={layer.edition.id}>
                        <strong>{layer.edition.title}</strong> · {layer.edition.language} ·{" "}
                        {layer.edition.licenseId}
                        <br />
                        {layer.provenance.attribution}
                      </p>
                    ))}
                  </div>
                </details>
              </footer>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyReader({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="meta-label">{t("scripture.notImported")}</p>
      <p className="mt-2 text-sm text-foreground">{message}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      <Link
        to="/scripture"
        className="mt-5 inline-flex rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        {t("scripture.back")}
      </Link>
    </div>
  );
}
