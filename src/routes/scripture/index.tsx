import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ScriptureRepository } from "../../lib/repositories/scripture-repository";
import { useWorkbench } from "../../lib/workbench/workbench-context";

export const Route = createFileRoute("/scripture/")({
  head: () => {
    const title = "Scripture Reader — Scriptorium";
    const description =
      "Browse books and chapters, read parallel translations and inspect original-language words in the Scriptorium reader.";
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

  const books = ScriptureRepository.listBooks();
  const withText = books.filter((b) => ScriptureRepository.availableChapters(b.id).length > 0);

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 md:px-8">
      <header className="border-b border-border pb-3">
        <p className="meta-label">Scripture</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">Reader</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Navigation covers the canonical book list; text is only shown where an edition has been
          imported. This prototype bundles four public-domain sample chapters.
        </p>
      </header>

      <section className="mt-5">
        <h2 className="meta-label">Available in this build</h2>
        <ul className="mt-2 divide-y divide-border border-y border-border">
          {withText.map((book) => (
            <li key={book.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{book.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {book.testament === "ot" ? "Hebrew Bible / OT" : "New Testament"} · chapter{" "}
                  {ScriptureRepository.availableChapters(book.id).join(", ")}
                </p>
              </div>
              <div className="flex gap-1.5">
                {ScriptureRepository.availableChapters(book.id).map((c) => (
                  <Link
                    key={c}
                    to="/scripture/$book/$chapter"
                    params={{ book: book.id, chapter: String(c) }}
                    className="rounded-md border border-input px-2.5 py-1 font-mono text-xs transition-colors hover:bg-accent"
                  >
                    {book.abbreviation} {c}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="meta-label">Full canonical navigation</h2>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {books.map((b) => {
            const chapters = ScriptureRepository.availableChapters(b.id);
            return chapters.length > 0 ? (
              <Link
                key={b.id}
                to="/scripture/$book/$chapter"
                params={{ book: b.id, chapter: String(chapters[0]) }}
                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent"
              >
                {b.name}
              </Link>
            ) : (
              <span
                key={b.id}
                className="rounded border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground/60"
                title="Not imported"
              >
                {b.name}
              </span>
            );
          })}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Dashed entries have no imported text. Versification, corpora and canon profiles are part
          of the domain model and will drive this list in later phases.
        </p>
      </section>
    </div>
  );
}
