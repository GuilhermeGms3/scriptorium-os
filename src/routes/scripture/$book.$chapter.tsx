import {
  readerContextMatches,
  itemTradition,
  type ReaderContextFilter,
} from "../../lib/domain/reader-context-filter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { ScriptureAudioActions } from "../../components/audio/scripture-audio-actions";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { CommentaryDock, type CommentaryLayout } from "../../components/scripture/commentary-dock";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { ScriptureToolbar } from "../../components/scripture/scripture-toolbar";
import { OriginalVerse, Verse, type ReaderView } from "../../components/scripture/verse";
import { ParallelVersions } from "../../components/scripture/parallel-versions";
import { InterlinearView } from "../../components/scripture/interlinear-view";
import { AnalysisLenses } from "../../components/scripture/analysis-lenses";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { bookLabel, passageLabel, t } from "../../lib/i18n";
import { textDirectionForLanguage } from "../../lib/i18n/locale";
import { usePrintJob } from "../../components/print/use-print-job";
import { useVerseMarks } from "../../hooks/use-verse-marks";
import { VerseMarkControls } from "../../components/scripture/verse-mark-controls";
import { ChapterPrint } from "../../components/print/chapter-print";
import { chapterPrintModel } from "../../components/print/chapter-print-model";
import { hasAvailableData } from "../../lib/domain/availability";
import { VerseCommentary } from "../../components/scripture/verse-commentary";
import { CommentarySourceBar } from "../../components/scripture/commentary-source-bar";
import { ReaderContextControls } from "../../components/scripture/reader-context-controls";
import { useHiddenCommentarySources } from "../../hooks/use-hidden-commentary-sources";
import { useIsMobile } from "../../hooks/use-mobile";
import { CommentaryNote } from "../../components/scripture/private-verse-knowledge";
import {
  contextualCommentary,
  belongsInChapterOverview,
} from "../../components/scripture/commentary-presentation";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/utils";
import { RouteError } from "../../components/layout/route-error";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { WorkspacePassageKnowledgeService } from "../../lib/application/workspace-passage-knowledge-service";
import {
  knowledgeItemCoversVerse,
  type WorkspacePassageKnowledgeItem,
} from "../../lib/domain/workspace-passage-knowledge";
import type { LinguisticAnnotation } from "../../lib/domain/linguistic";

export const Route = createFileRoute("/scripture/$book/$chapter")({
  // `v`: open the chapter at this verse, selected (links from search, the verse list, notes).
  validateSearch: (search: Record<string, unknown>): { edition?: string; v?: number } => {
    const verse = Number(search["v"]);
    return {
      ...(typeof search["edition"] === "string" && search["edition"].length <= 250
        ? { edition: search["edition"] }
        : {}),
      ...(Number.isInteger(verse) && verse > 0 && verse < 1000 ? { v: verse } : {}),
    };
  },
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
  errorComponent: (props) => (
    <RouteError
      {...props}
      title={t("scripture.corpusChapterError")}
      description="Tente novamente ou escolha outro capítulo."
    />
  ),
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
  const { edition: requestedEdition, v: requestedVerse } = Route.useSearch();
  const navigate = Route.useNavigate();
  const chapter = Number(chapterParam);
  const { setPassageContext, selectWord, readingPrefs, setInspectorOpen } = useWorkbench();

  const [editionId, setEditionId] = useState(
    () => requestedEdition ?? ScriptureKnowledgeEngine.defaultEditionId(bookId, chapter),
  );
  const [view, setView] = useState<ReaderView>("single");
  const [commentaryLayout, setCommentaryLayout] = useState<CommentaryLayout>(() => {
    if (typeof window === "undefined") return "inline";
    try {
      const saved = window.localStorage.getItem("scriptorium.commentary-layout.v1");
      return saved === "full" || saved === "dock" || saved === "hidden" ? saved : "inline";
    } catch {
      return "inline";
    }
  });
  const showExplanations = commentaryLayout === "inline" || commentaryLayout === "full";
  const density = commentaryLayout === "inline" ? "summary" : "full";
  const dockOpen = commentaryLayout === "dock" && view === "single";
  const [dockVerse, setDockVerse] = useState(1);
  const changeCommentaryLayout = (layout: CommentaryLayout) => {
    setCommentaryLayout(layout);
    try {
      window.localStorage.setItem("scriptorium.commentary-layout.v1", layout);
    } catch {
      // Not remembered in this browser; it still applies now.
    }
    if (layout === "dock") {
      setDockVerse(selectedVerse ?? 1);
      setInspectorOpen(false);
    }
  };
  const [hiddenSources, setHiddenSources] = useHiddenCommentarySources();
  const { markOf } = useVerseMarks();
  const isMobile = useIsMobile();
  const [domainFilter, setDomainFilter] = useState("");
  const [contextFilter, setContextFilter] = useState<ReaderContextFilter>({
    tradition: "",
    kind: "all",
  });
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
  // Built once per chapter: the engine returns a new object on every call, and effects below
  // depend on it (as a dependency it made the reader reload without end).
  const bundle = useMemo(
    () => ScriptureKnowledgeEngine.getPassageKnowledgeBundle(activeRef) ?? loadedBundle,
    [activeRef, loadedBundle],
  );
  const privateKnowledgeQuery = useWorkspaceQuery(
    ["passage-knowledge", bookId, chapter],
    () => WorkspacePassageKnowledgeService.load(activeRef, bundle ?? null),
    { refreshOnKnowledgeChange: true },
  );
  const availableTraditions = [
    ...new Set(
      (privateKnowledgeQuery.data?.items ?? []).flatMap((item) =>
        itemTradition(item) ? [itemTradition(item)!] : [],
      ),
    ),
  ].sort();
  const privateKnowledge = useMemo(
    () =>
      privateKnowledgeQuery.data
        ? {
            ...privateKnowledgeQuery.data,
            items: privateKnowledgeQuery.data.items.filter((item) =>
              readerContextMatches(item, contextFilter),
            ),
          }
        : undefined,
    [privateKnowledgeQuery.data, contextFilter],
  );
  const privateKnowledgeError = privateKnowledgeQuery.error
    ? errorMessage(privateKnowledgeQuery.error)
    : undefined;
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
    setPassageContext(
      book
        ? {
            ref: inspectorRef,
            label: passageLabel(inspectorRef),
            editionId: effectiveEditionId,
            contextFilter: {
              ...contextFilter,
              domain: domainFilter,
              hiddenSources: [...hiddenSources],
            },
          }
        : null,
    );
    selectWord(null);
    window.localStorage.setItem("scriptorium:last-reading", JSON.stringify({ bookId, chapter }));
  }, [
    book,
    bookId,
    bundle?.identity.label,
    chapter,
    inspectorRef,
    setPassageContext,
    selectWord,
    contextFilter,
    domainFilter,
    hiddenSources,
    effectiveEditionId,
  ]);

  useEffect(() => {
    setOpenVerses(new Set());
    setSelectedVerse(null);
    setDockVerse(1);
    // A subject chosen in another chapter may not exist here; it used to hide every comment.
    setDomainFilter("");
  }, [activeRef]);

  // Open at the verse asked for (search, the verse list, a note): selected, at the top of the
  // text. Once more after the library has loaded, since its notes push the verse down.
  const targetVerse =
    requestedVerse ??
    (typeof window !== "undefined"
      ? Number(/^#verse-(\d+)$/.exec(window.location.hash)?.[1]) || undefined
      : undefined);
  const scrolledFor = useRef("");
  useEffect(() => {
    if (!bundle || !targetVerse) return;
    const key = `${bookId}:${chapter}:${targetVerse}:${privateKnowledgeQuery.isFetched ? 1 : 0}`;
    if (scrolledFor.current === key) return;
    scrolledFor.current = key;
    setSelectedVerse(targetVerse);
    setDockVerse(targetVerse);
    // The effect runs after the verses are on the page; once more shortly after, in case the
    // selection or late content moved them.
    scrollToVerse(targetVerse);
    const settle = window.setTimeout(() => scrollToVerse(targetVerse), 200);
    return () => window.clearTimeout(settle);
  }, [bookId, bundle, chapter, privateKnowledgeQuery.isFetched, targetVerse]);
  const goToVerse = (verse: number) => {
    // Same verse again (the reader scrolled away): just take them back to it.
    if (verse === requestedVerse) {
      setSelectedVerse(verse);
      scrollToVerse(verse);
      return;
    }
    void navigate({ search: (previous) => ({ ...previous, v: verse }), replace: true });
  };

  const privateSources = useMemo(
    () => [
      ...new Map(
        (privateKnowledgeQuery.data?.items ?? []).map((item) => [item.document.id, item.document]),
      ).values(),
    ],
    [privateKnowledgeQuery.data],
  );
  // Notes about the whole chapter or book always go here, once, as on Android. A long stretch of
  // the chapter joins them when comments are summarised, instead of repeating under every verse.
  const chapterOverview = useMemo(
    () =>
      contextualCommentary(
        (privateKnowledge?.items ?? []).filter(
          (item) =>
            belongsInChapterOverview(item, density === "summary", bookId, chapter) &&
            !hiddenSources.has(item.document.id) &&
            (!domainFilter ||
              item.proposals.some(
                (proposal) =>
                  proposal.payload.kind === "topic-assignment" &&
                  proposal.payload.domain === domainFilter,
              )),
        ),
      ),
    [bookId, chapter, density, domainFilter, hiddenSources, privateKnowledge],
  );
  const privateDomains = useMemo(
    () =>
      [
        ...new Set(
          (privateKnowledgeQuery.data?.items ?? []).flatMap((item) =>
            item.proposals.flatMap((proposal) =>
              proposal.payload.kind === "topic-assignment" ? [proposal.payload.domain] : [],
            ),
          ),
        ),
      ].sort(),
    [privateKnowledgeQuery.data],
  );
  // Grouped once per answer, not re-filtered by every verse on every render.
  const privateItemsByVerse = useMemo(() => {
    const items = privateKnowledge?.items ?? [];
    return new Map(
      (bundle?.passage.verses ?? []).map((verse) => [
        verse.verse,
        items.filter((item) => knowledgeItemCoversVerse(item, bookId, chapter, verse.verse)),
      ]),
    );
  }, [bookId, bundle, chapter, privateKnowledge]);
  const annotationsByToken = useMemo(() => {
    const byToken = new Map<string, LinguisticAnnotation[]>();
    if (bundle && hasAvailableData(bundle.linguisticAnnotations))
      for (const annotation of bundle.linguisticAnnotations.data)
        byToken.set(annotation.targetTokenId, [
          ...(byToken.get(annotation.targetTokenId) ?? []),
          annotation,
        ]);
    return byToken;
  }, [bundle]);
  const unconfirmedItems = useMemo(
    () => (privateKnowledge?.items ?? []).filter((item) => item.reviewState === "pending"),
    [privateKnowledge],
  );
  const unconfirmedVerses = useMemo(
    () =>
      [...privateItemsByVerse]
        .filter(([, items]) => items.some((item) => item.reviewState === "pending"))
        .map(([verse]) => verse),
    [privateItemsByVerse],
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
    changeCommentaryLayout("inline");
    setHiddenSources(new Set());
    setDomainFilter("");
    setOpenVerses(new Set(unconfirmedVerses));
    const first = unconfirmedVerses[0];
    if (first !== undefined) requestAnimationFrame(() => scrollToVerse(first));
  };

  // On paper: the edition being read and, in reading mode, the comments the reader kept on.
  const printsOriginal = view === "original" || view === "interlinear";
  const print = usePrintJob(
    book && bundle
      ? {
          title: `${bookLabel(book.id, book.name)} ${chapter} — ${displayedEdition?.abbreviation ?? ""}`,
          render: () => {
            const model = chapterPrintModel({
              bookId,
              chapter,
              verses: bundle.passage.verses,
              editionId: effectiveEditionId,
              original: printsOriginal,
              includeComments: view === "single" && commentaryLayout !== "hidden",
              claims: availableClaims,
              sources: bundle.sources,
              libraryItems: privateKnowledge?.items ?? [],
              hiddenSources,
              domain: domainFilter,
              markOf: (verse) => markOf({ bookId, chapter, verse }),
            });
            const commented =
              model.overview.length > 0 || model.verses.some((verse) => verse.comments.length > 0);
            const language = bundle.passage.verses[0]?.original?.[0]?.language;
            return (
              <ChapterPrint
                title={`${bookLabel(book.id, book.name)} ${chapter}`}
                chapter={chapter}
                edition={`${displayedEdition?.title ?? "Edição"}${commented ? " · com comentários" : ""}`}
                model={model}
                verseMode={readingPrefs.verseMode}
                direction={
                  printsOriginal && language
                    ? textDirectionForLanguage(language)
                    : (displayedEdition?.direction ?? "ltr")
                }
                notes={[
                  `Texto: ${displayedEdition?.title ?? "edição selecionada"}${displayedEdition?.licenseId ? ` · licença ${displayedEdition.licenseId}` : ""}.`,
                  ...(commented
                    ? [
                        "Comentários: trechos e sínteses das fontes indicadas em cada um. Ligações automáticas não equivalem a interpretação revisada.",
                      ]
                    : []),
                ]}
              />
            );
          },
        }
      : null,
  );
  const sourceBar =
    commentaryLayout !== "hidden" && view === "single" && privateSources.length > 0 ? (
      <CommentarySourceBar
        sources={privateSources.map((source) => ({ id: source.id, title: source.title }))}
        hidden={hiddenSources}
        onHiddenChange={setHiddenSources}
        domains={privateDomains}
        domain={domainFilter}
        onDomainChange={setDomainFilter}
        className={isMobile ? "border-b-0 bg-transparent pt-0" : undefined}
      >
        <ReaderContextControls
          value={contextFilter}
          traditions={availableTraditions}
          onChange={setContextFilter}
        />
      </CommentarySourceBar>
    ) : null;
  const shownSourceCount = privateSources.filter((source) => !hiddenSources.has(source.id)).length;

  if (!book) {
    return <EmptyReader message={t("scripture.unknownBook")} />;
  }

  return (
    <div className="flex h-full min-w-0">
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
          commentaryLayout={commentaryLayout}
          onCommentaryLayoutChange={changeCommentaryLayout}
          explanationsAvailable={explanationsAvailable}
          verses={bundle?.passage.verses.map((verse) => verse.verse) ?? []}
          selectedVerse={selectedVerse}
          onVerseChange={goToVerse}
          {...(bundle ? { onPrint: print } : {})}
        />
        {/* On phones listening and the comment sources share one row and open on demand, so the
            fixed bars above the text stay short. */}
        <div className="flex flex-wrap border-b border-border bg-card md:block md:border-b-0">
          <ScriptureAudioActions
            key={`${bookId}:${chapter}:${effectiveEditionId}`}
            bookId={bookId}
            chapter={chapter}
            editionId={effectiveEditionId}
            selectedVerse={selectedVerse}
            className="max-md:min-w-0 max-md:flex-1 max-md:border-b-0 max-md:open:basis-full"
          />
          {sourceBar &&
            (isMobile ? (
              <details className="min-w-0 flex-1 text-sm open:basis-full">
                <summary className="w-fit cursor-pointer list-none px-4 py-2 font-medium pointer-coarse:py-3">
                  <Library aria-hidden="true" className="mr-2 inline size-4" />
                  Fontes · {shownSourceCount} de {privateSources.length}
                </summary>
                {sourceBar}
              </details>
            ) : (
              sourceBar
            ))}
        </div>

        <Group orientation="vertical" className="min-h-0 flex-1" id="scripture-reading-layout">
          <Panel id="scripture-text" minSize="25%" defaultSize="62%">
            <div className="h-full overflow-y-auto" data-reading-scroller="">
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
                      {view === "parallel"
                        ? t("scripture.parallelReading")
                        : displayedEdition?.title}
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
                        {unconfirmedItems.length === 1 ? "ligação" : "ligações"} para confirmar
                        neste capítulo
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={confirmNow}
                      >
                        Confirmar agora
                      </Button>
                    </div>
                  )}

                  {privateKnowledgeQuery.data?.items.length && !privateKnowledge?.items.length ? (
                    <p role="status" className="my-4 text-sm">
                      Nenhuma ligação corresponde ao contexto escolhido neste capítulo. Limpe os
                      filtros para consultar as demais fontes.
                    </p>
                  ) : null}
                  {showExplanations && chapterOverview.length > 0 && (
                    <details className="mb-6 rounded-md border border-border bg-muted/10 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Panorama do capítulo · {chapterOverview.length}{" "}
                        {chapterOverview.length === 1 ? "nota" : "notas"} sobre o capítulo todo
                      </summary>
                      <div className="mt-3">
                        {chapterOverview.map((item) => (
                          <CommentaryNote
                            key={item.id}
                            item={item}
                            label="Trecho da biblioteca sobre o capítulo"
                          />
                        ))}
                      </div>
                    </details>
                  )}
                  {privateKnowledgeError ? (
                    <p role="alert" className="mb-4 text-xs text-destructive">
                      A biblioteca privada não pôde ser carregada: {privateKnowledgeError}
                    </p>
                  ) : null}

                  {view === "single" && (
                    <div className="reading-text">
                      {bundle.passage.verses.map((v) => (
                        // In paragraph reading the verses flow as one text; only a verse with a
                        // comment breaks the line, where its comment opens.
                        <div
                          key={v.verse}
                          className={
                            readingPrefs.verseMode === "paragraph" ? "contents" : undefined
                          }
                        >
                          <Verse
                            verse={v}
                            editionId={effectiveEditionId}
                            bookName={bookLabel(book.id, book.name)}
                            chapter={chapter}
                            verseMode={readingPrefs.verseMode}
                            selected={selectedVerse === v.verse}
                            mark={markOf({ bookId, chapter, verse: v.verse })}
                            onSelect={() => {
                              setSelectedVerse(v.verse);
                              if (dockOpen) setDockVerse(v.verse);
                              else setInspectorOpen(true);
                            }}
                          />
                          {showExplanations && (
                            <VerseCommentary
                              bundle={bundle}
                              verse={v.verse}
                              items={privateItemsByVerse.get(v.verse) ?? NO_ITEMS}
                              open={openVerses.has(v.verse)}
                              onOpenChange={(open) => setVerseOpen(v.verse, open)}
                              hiddenSources={hiddenSources}
                              density={density}
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
                          annotations={(v.original ?? []).flatMap(
                            (token) => annotationsByToken.get(token.id) ?? [],
                          )}
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

                  <footer className="mt-8 border-t border-border pt-3 font-mono text-xs leading-relaxed text-muted-foreground">
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
          </Panel>
          {dockOpen && bundle && (
            <>
              <Separator
                aria-label="Redimensionar painel de comentários"
                className="commentary-resizer"
              />
              <Panel id="scripture-comments" defaultSize="38%" minSize="20%" maxSize="70%">
                <CommentaryDock
                  label={`${bookLabel(book.id, book.name)} ${chapter}`}
                  verses={bundle.passage.verses.map((verse) => verse.verse)}
                  selectedVerse={dockVerse}
                  onSelectVerse={(verse) => {
                    setDockVerse(verse);
                    setSelectedVerse(verse || null);
                  }}
                  onClose={() => {
                    changeCommentaryLayout("hidden");
                    document.getElementById("commentary-layout")?.focus();
                  }}
                >
                  {/* In the dock, tapping a verse does not open the study panel: mark it here. */}
                  {dockVerse > 0 && (
                    <VerseMarkControls
                      verse={{ bookId, chapter, verse: dockVerse }}
                      editionId={effectiveEditionId}
                      className="mb-4 border-b border-border pb-3"
                    />
                  )}
                  {chapterOverview.length > 0 && (
                    <details className="mb-4 border-b border-border pb-3">
                      <summary className="cursor-pointer text-sm">
                        Contextos de capítulo e livro · {chapterOverview.length}
                      </summary>
                      {chapterOverview.map((item) => (
                        <CommentaryNote
                          key={item.id}
                          item={item}
                          label={
                            item.passageRelation.payload.relationScope === "book"
                              ? "Contexto do livro, não exclusivo deste capítulo"
                              : "Contexto do capítulo"
                          }
                        />
                      ))}
                    </details>
                  )}
                  {privateKnowledgeQuery.isPending && (
                    <p role="status" className="mb-4 text-sm text-muted-foreground">
                      Consultando sua biblioteca…
                    </p>
                  )}
                  {privateKnowledgeError && (
                    <p role="alert" className="mb-4 text-sm text-destructive">
                      A biblioteca privada não pôde ser carregada: {privateKnowledgeError}
                    </p>
                  )}
                  {(dockVerse === 0
                    ? bundle.passage.verses
                    : bundle.passage.verses.filter((verse) => verse.verse === dockVerse)
                  ).map((verse) => (
                    <section
                      key={verse.verse}
                      className="dock-verse-section"
                      aria-label={`Comentários de ${bookLabel(book.id, book.name)} ${chapter}:${verse.verse}`}
                    >
                      <h3 className="mb-4 font-mono text-xs text-primary">
                        {bookLabel(book.id, book.name)} {chapter}:{verse.verse}
                      </h3>
                      <VerseCommentary
                        bundle={bundle}
                        verse={verse.verse}
                        items={privateItemsByVerse.get(verse.verse) ?? NO_ITEMS}
                        open={openVerses.has(verse.verse)}
                        onOpenChange={(open) => setVerseOpen(verse.verse, open)}
                        hiddenSources={hiddenSources}
                        {...(domainFilter ? { domain: domainFilter } : {})}
                        showEmpty
                      />
                    </section>
                  ))}
                </CommentaryDock>
              </Panel>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}

const NO_ITEMS: WorkspacePassageKnowledgeItem[] = [];

/**
 * Brings a verse to the top of the text column. Only that column scrolls: scrollIntoView also
 * moved the whole app shell on phones, hiding the top bar.
 */
function scrollToVerse(verse: number): void {
  const element = document.getElementById(`verse-${verse}`);
  const scroller = element?.closest<HTMLElement>("[data-reading-scroller]");
  if (!element || !scroller) return;
  scroller.scrollTo({
    top:
      element.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      8,
  });
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
