import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ScriptureRepository } from "../../lib/repositories/scripture-repository";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { ScriptureToolbar } from "../../components/scripture/scripture-toolbar";
import { BooksPanel } from "../../components/scripture/books-panel";
import { OriginalVerse, Verse, type ReaderView } from "../../components/scripture/verse";
import { ParallelVersions } from "../../components/scripture/parallel-versions";
import { InterlinearView } from "../../components/scripture/interlinear-view";
import { AnalysisLenses } from "../../components/scripture/analysis-lenses";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { bookLabel, passageLabel, t } from "../../lib/i18n";

export const Route = createFileRoute("/scripture/$book/$chapter")({
  loader: async ({ params }) => {
    const chapter = Number(params.chapter);
    if (Number.isInteger(chapter) && chapter > 0) {
      return ScriptureRepository.loadChapter(params.book, chapter);
    }
    return null;
  },
  pendingComponent: () => <EmptyReader message={t("scripture.loadingCorpusChapter")} />,
  errorComponent: () => <EmptyReader message={t("scripture.corpusChapterError")} />,
  head: ({ params }) => {
    const book = ScriptureRepository.listBooks().find((b) => b.id === params.book);
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
  const loadedChapter = Route.useLoaderData();
  const chapter = Number(chapterParam);
  const { setPassageContext, selectWord, readingPrefs } = useWorkbench();

  ScriptureRepository.primeChapter(loadedChapter);

  const [editionId, setEditionId] = useState(() =>
    ScriptureRepository.defaultEditionId(bookId, chapter),
  );
  const [view, setView] = useState<ReaderView>("single");

  const book = ScriptureRepository.listBooks().find((b) => b.id === bookId);
  const activeRef = useMemo(
    () => ({
      bookId,
      chapter,
    }),
    [bookId, chapter],
  );
  const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(activeRef);
  const editions = bundle?.passage.editions ?? ScriptureRepository.listEditions();
  const effectiveEditionId = editions.some((edition) => edition.id === editionId)
    ? editionId
    : ScriptureRepository.defaultEditionId(bookId, chapter);
  const displayedEdition =
    view === "original" || view === "interlinear"
      ? editions.find((edition) => edition.kind === "original-language")
      : editions.find((edition) => edition.id === effectiveEditionId);

  useEffect(() => {
    setPassageContext(book ? { ref: activeRef, label: passageLabel(activeRef) } : null);
    selectWord(null);
  }, [activeRef, book, bundle?.identity.label, chapter, setPassageContext, selectWord]);

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

              {view === "single" && (
                <div className="reading-text">
                  {bundle.passage.verses.map((v) => (
                    <Verse
                      key={v.verse}
                      verse={v}
                      editionId={effectiveEditionId}
                      bookName={bookLabel(book.id, book.name)}
                      chapter={chapter}
                      verseMode={readingPrefs.verseMode}
                    />
                  ))}
                </div>
              )}

              {view === "parallel" && (
                <ParallelVersions
                  verses={bundle.passage.verses}
                  editions={editions.filter((e) => e.kind === "translation")}
                />
              )}

              {view === "original" && (
                <div>
                  <p className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    {t("scripture.originalHint")}
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
                    {t("scripture.interlinearHint")}
                  </p>
                  {bundle.passage.verses.map((v) => (
                    <InterlinearView
                      key={v.verse}
                      verse={v}
                      bookName={bookLabel(book.id, book.name)}
                      chapter={chapter}
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
                {bundle.provenance.attribution ?? t("scripture.demoFooter")}
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
