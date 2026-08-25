import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScriptureRepository } from "../../lib/repositories/scripture-repository";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { ScriptureToolbar } from "../../components/scripture/scripture-toolbar";
import { BooksPanel } from "../../components/scripture/books-panel";
import { OriginalVerse, Verse, type ReaderView } from "../../components/scripture/verse";
import { ParallelVersions } from "../../components/scripture/parallel-versions";
import { InterlinearView } from "../../components/scripture/interlinear-view";

export const Route = createFileRoute("/scripture/$book/$chapter")({
  head: ({ params }) => {
    const book = ScriptureRepository.listBooks().find((b) => b.id === params.book);
    const title = `${book?.name ?? "Scripture"} ${params.chapter} — Scriptorium Reader`;
    const description = `Read ${book?.name ?? "scripture"} ${params.chapter} with parallel translations, original-language tokens and word-level analysis in Scriptorium.`;
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
  const chapter = Number(chapterParam);
  const { setPassageContext, selectWord, readingPrefs } = useWorkbench();

  const [editionId, setEditionId] = useState("web");
  const [view, setView] = useState<ReaderView>("single");

  const book = ScriptureRepository.listBooks().find((b) => b.id === bookId);
  const content = ScriptureRepository.getChapter(bookId, chapter);
  const editions = ScriptureRepository.listEditions();

  useEffect(() => {
    setPassageContext(book ? `${book.name} ${chapter}` : null);
    selectWord(null);
  }, [book, chapter, setPassageContext, selectWord]);

  if (!book) {
    return <EmptyReader message="Unknown book." />;
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
          editionId={editionId}
          onEditionChange={setEditionId}
          view={view}
          onViewChange={setView}
          hasPrev={chapter > 1}
          hasNext={chapter < book.chapters}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!content ? (
            <EmptyReader
              message={`${book.name} ${chapter} is not part of the bundled demo dataset.`}
              hint="Chapters available in this prototype: Genesis 1, Psalm 23, John 1, Romans 5."
            />
          ) : (
            <article className="mx-auto max-w-3xl px-5 py-6 md:px-8">
              <header className="mb-5 border-b border-border pb-3">
                <p className="meta-label">
                  {view === "parallel" ? "Parallel reading" : editions.find((e) => e.id === editionId)?.title}
                </p>
                <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
                  {book.name} {chapter}
                </h1>
              </header>

              {view === "single" && (
                <div className="reading-text">
                  {content.verses.map((v) => (
                    <Verse
                      key={v.verse}
                      verse={v}
                      editionId={editionId}
                      bookName={book.name}
                      chapter={chapter}
                      verseMode={readingPrefs.verseMode}
                    />
                  ))}
                </div>
              )}

              {view === "parallel" && (
                <ParallelVersions
                  verses={content.verses}
                  editions={editions.filter((e) => e.kind === "translation")}
                />
              )}

              {view === "original" && (
                <div>
                  <p className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Click any word to open the Word Inspector. Original-language tokens are bundled
                    only for a few demo verses.
                  </p>
                  {content.verses.map((v) => (
                    <OriginalVerse key={v.verse} verse={v} bookName={book.name} chapter={chapter} />
                  ))}
                </div>
              )}

              {view === "interlinear" && (
                <div>
                  <p className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Visual interlinear scaffold (surface / transliteration / gloss / parsing). A real
                    alignment engine is future work.
                  </p>
                  {content.verses.map((v) => (
                    <InterlinearView key={v.verse} verse={v} bookName={book.name} chapter={chapter} />
                  ))}
                </div>
              )}

              <footer className="mt-8 border-t border-border pt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                DEMO / SEED DATA. English text: World English Bible &amp; American Standard Version
                (public domain). Greek: Westcott &amp; Hort 1881 (public domain). Hebrew: Masoretic
                text (public domain). No copyrighted translation is bundled.
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
      <p className="meta-label">Not imported</p>
      <p className="mt-2 text-sm text-foreground">{message}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      <Link
        to="/scripture"
        className="mt-5 inline-flex rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        Back to Scripture
      </Link>
    </div>
  );
}
