import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Highlighter, Printer, Star, X } from "lucide-react";
import { PageContainer } from "../components/layout/page-container";
import { PageHeader } from "../components/layout/page-header";
import { Button } from "../components/ui/button";
import { usePrintJob } from "../components/print/use-print-job";
import { MarksPrint, type MarkedVersePrint } from "../components/print/marks-print";
import { useVerseMarkActions, useVerseMarks } from "../hooks/use-verse-marks";
import {
  MARK_COLOR_LABELS,
  MARK_COLORS,
  sortVerseMarks,
  verseMarkKey,
  type MarkColor,
  type VerseMark,
} from "../lib/domain/verse-marks";
import { ScriptureKnowledgeEngine } from "../lib/knowledge-engine/scripture-knowledge-engine";
import { bookLabel, formatDate, passageLabel } from "../lib/i18n";
import { workspaceQueryKey } from "../lib/workspace-runtime/workspace-queries";
import { cn, errorMessage } from "../lib/utils";
import "../components/scripture/verse-marks.css";

export const Route = createFileRoute("/highlights")({
  head: () => ({ meta: [{ title: "Marcações — Scriptorium" }] }),
  component: HighlightsPage,
});

type Filter = "all" | "favorites" | MarkColor;

function filterLabel(filter: Filter): string {
  if (filter === "all") return "Todas as marcações";
  if (filter === "favorites") return "Favoritos";
  return `Cor ${MARK_COLOR_LABELS[filter].toLocaleLowerCase("pt-BR")}`;
}

function matches(mark: VerseMark, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "favorites") return mark.favorite;
  return mark.color === filter;
}

function bookOrder(bookId: string): number {
  return ScriptureKnowledgeEngine.getBook(bookId)?.order ?? Number.MAX_SAFE_INTEGER;
}

function bookName(bookId: string): string {
  const book = ScriptureKnowledgeEngine.getBook(bookId);
  return book ? bookLabel(book.id, book.name) : bookId;
}

function reference(mark: VerseMark): string {
  return passageLabel({
    bookId: mark.bookId,
    chapter: mark.chapter,
    verseStart: mark.verse,
    verseEnd: mark.verse,
  });
}

/** Verse texts of one chapter by edition, read from the same corpus as the reader. */
async function chapterTexts(bookId: string, chapter: number) {
  const bundle = await ScriptureKnowledgeEngine.loadPassageKnowledgeBundle({ bookId, chapter });
  return {
    defaultEditionId: ScriptureKnowledgeEngine.defaultEditionId(bookId, chapter),
    verses: new Map(
      (bundle?.passage.verses ?? []).map((verse) => [verse.verse, verse.translations]),
    ),
  };
}

function HighlightsPage() {
  const { marks, loading, error } = useVerseMarks();
  const { setColor, setFavorite } = useVerseMarkActions();
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(() => sortVerseMarks(marks, bookOrder), [marks]);
  const shown = useMemo(() => sorted.filter((mark) => matches(mark, filter)), [sorted, filter]);
  const chapters = useMemo(
    () => [...new Map(shown.map((mark) => [`${mark.bookId}:${mark.chapter}`, mark])).values()],
    [shown],
  );
  const texts = useQueries({
    queries: chapters.map((mark) => ({
      queryKey: workspaceQueryKey(["chapter-texts", mark.bookId, mark.chapter]),
      queryFn: () => chapterTexts(mark.bookId, mark.chapter),
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    })),
  });
  const textsLoading = texts.some((query) => query.isPending);
  const textOf = (
    mark: VerseMark,
  ): { text: string | null; edition?: string | undefined } | undefined => {
    const index = chapters.findIndex(
      (chapter) => chapter.bookId === mark.bookId && chapter.chapter === mark.chapter,
    );
    const loaded = texts[index]?.data;
    if (!loaded) return texts[index]?.isError ? { text: null } : undefined;
    const translations = loaded.verses.get(mark.verse);
    const editionId =
      mark.editionId && translations?.[mark.editionId] ? mark.editionId : loaded.defaultEditionId;
    return {
      text: translations?.[editionId] ?? null,
      edition: ScriptureKnowledgeEngine.listEditions().find((edition) => edition.id === editionId)
        ?.abbreviation,
    };
  };

  const books = useMemo(() => {
    const groups = new Map<string, VerseMark[]>();
    for (const mark of shown) groups.set(mark.bookId, [...(groups.get(mark.bookId) ?? []), mark]);
    return [...groups.entries()];
  }, [shown]);

  const print = usePrintJob(
    shown.length && !textsLoading
      ? {
          title: `Marcações — ${filterLabel(filter)}`,
          render: () => (
            <MarksPrint
              selection={filterLabel(filter)}
              books={books.map(([bookId, verses]) => ({
                book: bookName(bookId),
                verses: verses.map((mark): MarkedVersePrint => ({
                  key: verseMarkKey(mark),
                  reference: reference(mark),
                  text: textOf(mark)?.text ?? null,
                  ...(mark.color ? { color: mark.color } : {}),
                  favorite: mark.favorite,
                })),
              }))}
            />
          ),
        }
      : null,
  );

  const counts = {
    all: marks.length,
    favorites: marks.filter((mark) => mark.favorite).length,
    ...Object.fromEntries(
      MARK_COLORS.map((color) => [color, marks.filter((mark) => mark.color === color).length]),
    ),
  } as Record<Filter, number>;
  const filters: Filter[] = [
    "all",
    "favorites",
    ...MARK_COLORS.filter((color) => counts[color] > 0),
  ];

  return (
    <PageContainer width="narrow">
      <PageHeader
        eyebrow="Ler"
        title="Marcações"
        icon={<Highlighter className="size-7 text-muted-foreground" aria-hidden="true" />}
        description="Os versículos que você marcou com cor ou guardou como favoritos. Ficam neste aparelho e entram na cópia de segurança."
        {...(shown.length
          ? {
              actions: (
                <Button variant="outline" size="sm" onClick={print} disabled={textsLoading}>
                  <Printer data-icon="inline-start" />
                  {textsLoading ? "Carregando textos…" : "Imprimir ou salvar PDF"}
                </Button>
              ),
            }
          : {})}
      />

      {error ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          As marcações não puderam ser carregadas: {errorMessage(error)}
        </p>
      ) : loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Abrindo suas marcações…</p>
      ) : marks.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-border p-5">
          <p className="font-medium">Nenhum versículo marcado ainda</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Abra um capítulo, toque num versículo e escolha uma cor ou a estrela de favorito. Ele
            aparece aqui, com o texto, para voltar a ele quando quiser.
          </p>
          <Link
            to="/scripture"
            className="mt-4 inline-flex min-h-10 items-center rounded-md border border-input px-3 text-sm hover:bg-accent pointer-coarse:min-h-11"
          >
            Abrir as Escrituras
          </Link>
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-label="Mostrar"
            className="mt-5 flex flex-wrap items-center gap-1.5"
          >
            {filters.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11",
                  filter === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent",
                )}
              >
                {option === "favorites" && <Star className="size-3.5" aria-hidden="true" />}
                {option !== "all" && option !== "favorites" && (
                  <span
                    aria-hidden="true"
                    className={cn("mark-swatch size-3 rounded-full", `mark-swatch-${option}`)}
                  />
                )}
                {option === "all"
                  ? "Todas"
                  : option === "favorites"
                    ? "Favoritos"
                    : MARK_COLOR_LABELS[option]}
                <span className="text-xs opacity-75">{counts[option]}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 && (
            <p className="mt-6 text-sm text-muted-foreground">
              Nenhum versículo nesta seleção. Escolha outra acima.
            </p>
          )}

          {books.map(([bookId, verses]) => (
            <section key={bookId} className="mt-7" aria-label={bookName(bookId)}>
              <h2 className="border-b border-border pb-1 font-serif text-xl font-semibold">
                {bookName(bookId)}
              </h2>
              <ul className="divide-y divide-border">
                {verses.map((mark) => {
                  const loaded = textOf(mark);
                  return (
                    <li key={verseMarkKey(mark)} className="py-4">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        {mark.favorite && (
                          <Star
                            className="size-4 shrink-0 self-center fill-amber-400 text-amber-500"
                            aria-label="favorito"
                          />
                        )}
                        <Link
                          to="/scripture/$book/$chapter"
                          params={{ book: mark.bookId, chapter: String(mark.chapter) }}
                          search={{
                            v: mark.verse,
                            ...(mark.editionId ? { edition: mark.editionId } : {}),
                          }}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {reference(mark)}
                        </Link>
                        {loaded?.edition && (
                          <span className="text-xs text-muted-foreground">{loaded.edition}</span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDate(mark.markedAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 font-serif text-lg leading-relaxed">
                        {loaded === undefined ? (
                          <span className="text-sm text-muted-foreground">Carregando texto…</span>
                        ) : loaded.text === null ? (
                          <span className="text-sm text-muted-foreground">
                            Texto indisponível neste aparelho.
                          </span>
                        ) : (
                          <span
                            className={cn(
                              mark.color && "verse-mark",
                              mark.color && `verse-mark-${mark.color}`,
                            )}
                          >
                            {loaded.text}
                          </span>
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {mark.color && (
                          <button
                            type="button"
                            onClick={() => void setColor(mark, null, mark.editionId)}
                            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
                          >
                            <X className="size-4" aria-hidden="true" /> Tirar a cor
                          </button>
                        )}
                        {mark.favorite && (
                          <button
                            type="button"
                            onClick={() => void setFavorite(mark, false, mark.editionId)}
                            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
                          >
                            <Star className="size-4" aria-hidden="true" /> Tirar dos favoritos
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </PageContainer>
  );
}
