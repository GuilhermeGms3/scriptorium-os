/**
 * BooksPanel — book/chapter navigation column inside the reader.
 * Books without installed corpus text are visibly marked, never faked.
 */

import { Link } from "@tanstack/react-router";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { cn } from "../../lib/utils";
import { bookLabel, t } from "../../lib/i18n";

export function BooksPanel({
  activeBookId,
  activeChapter,
}: {
  activeBookId?: string;
  activeChapter?: number;
}) {
  const books = ScriptureKnowledgeEngine.listBooks();

  return (
    <nav aria-label={t("scripture.booksAria")} className="h-full overflow-y-auto py-2">
      <p className="meta-label px-3 pb-1">{t("scripture.books")}</p>
      <ul>
        {books.map((book) => {
          const available = ScriptureKnowledgeEngine.availableChapters(book.id);
          const active = book.id === activeBookId;
          return (
            <li key={book.id}>
              {available.length > 0 ? (
                <Link
                  to="/scripture/$book/$chapter"
                  params={{ book: book.id, chapter: String(available[0]) }}
                  className={cn(
                    "flex items-baseline justify-between gap-2 px-3 py-1 text-[13px] transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-foreground/80 hover:bg-accent/60",
                  )}
                >
                  <span className="min-w-0 truncate">{bookLabel(book.id, book.name)}</span>
                  <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                    {t("scripture.chapterCount", { count: available.length })}
                  </span>
                </Link>
              ) : (
                <span
                  className="flex items-baseline justify-between gap-2 px-3 py-1 text-[13px] text-muted-foreground/50"
                  title={t("scripture.noImportedText")}
                >
                  {bookLabel(book.id, book.name)}
                  <span className="font-mono text-[10px]">—</span>
                </span>
              )}
              {active && available.length > 1 && (
                <ul
                  className="grid max-h-44 grid-cols-5 gap-1 overflow-y-auto border-y border-border/60 bg-muted/20 px-3 py-2"
                  aria-label={t("scripture.chaptersForBook", {
                    book: bookLabel(book.id, book.name),
                  })}
                >
                  {available.map((c) => (
                    <li key={c}>
                      <Link
                        to="/scripture/$book/$chapter"
                        params={{ book: book.id, chapter: String(c) }}
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[11px]",
                          c === activeChapter
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent",
                        )}
                      >
                        {c}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="px-3 pt-3 text-[10px] leading-relaxed text-muted-foreground">
        {t("scripture.booksHintCompact")}
      </p>
    </nav>
  );
}
