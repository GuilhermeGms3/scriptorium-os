import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { bookLabel, t } from "../../lib/i18n";

export const Route = createFileRoute("/scripture/")({
  head: () => {
    const title = t("scripture.metaTitle");
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
  component: ScriptureIndex,
});

function ScriptureIndex() {
  const { setPassageContext } = useWorkbench();
  useEffect(() => setPassageContext(null), [setPassageContext]);

  const books = ScriptureKnowledgeEngine.listBooks();
  const withText = books.filter(
    (book) => ScriptureKnowledgeEngine.availableChapters(book.id).length > 0,
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 md:px-8">
      <header className="border-b border-border pb-3">
        <p className="meta-label">{t("scripture.section")}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
          {t("scripture.reader")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {t("scripture.indexDescription")}
        </p>
      </header>

      <section className="mt-5">
        <h2 className="meta-label">{t("scripture.available")}</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {withText.map((book) => (
            <li key={book.id} className="min-w-0 rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">{bookLabel(book.id, book.name)}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {book.testament === "ot"
                    ? t("scripture.hebrewBible")
                    : book.testament === "nt"
                      ? t("scripture.newTestament")
                      : t("scripture.otherBooks")}{" "}
                  · {book.chapters} capítulos
                </p>
              </div>
              <div
                className="mt-2 grid grid-cols-5 gap-1 sm:grid-cols-6"
                aria-label={`Capítulos de ${bookLabel(book.id, book.name)}`}
              >
                {ScriptureKnowledgeEngine.availableChapters(book.id).map((c) => (
                  <Link
                    key={c}
                    to="/scripture/$book/$chapter"
                    params={{ book: book.id, chapter: String(c) }}
                    className="rounded-md border border-input px-1.5 py-1 text-center font-mono text-xs transition-colors hover:bg-accent"
                    aria-label={`${bookLabel(book.id, book.name)} ${c}`}
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="meta-label">{t("scripture.fullNavigation")}</h2>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {books.map((b) => {
            const chapters = ScriptureKnowledgeEngine.availableChapters(b.id);
            return chapters.length > 0 ? (
              <Link
                key={b.id}
                to="/scripture/$book/$chapter"
                params={{ book: b.id, chapter: String(chapters[0]) }}
                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent"
              >
                {bookLabel(b.id, b.name)}
              </Link>
            ) : (
              <span
                key={b.id}
                className="rounded border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground/60"
                title={t("scripture.notImported")}
              >
                {bookLabel(b.id, b.name)}
              </span>
            );
          })}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">{t("scripture.navigationHint")}</p>
      </section>
    </div>
  );
}
