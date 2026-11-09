import { Link } from "@tanstack/react-router";
import { BookPlus, LockKeyhole, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DOCUMENT_PROFILE_LABELS,
  type DocumentProfileKind,
} from "../../lib/domain/document-profile";
import type { PrivateDocument } from "../../lib/domain/private-document";
import { classifyDocumentProfile } from "../../lib/application/document-profile-classifier";
import { EmptyState } from "../layout/empty-state";
import { SectionHeader } from "../layout/section-header";
import { BookShelf, type ShelfEntry } from "./book-shelf";

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

/**
 * The reader's own books first: a search field, a filter by kind of book (the profile confirmed
 * in the book, or the one suggested by its title) and the shelf.
 */
export function PrivateBooksSection({
  documents,
  storedProfiles,
  loading,
  error,
  emptyHint,
  origin,
}: {
  documents: readonly PrivateDocument[];
  storedProfiles: ReadonlyMap<string, DocumentProfileKind>;
  loading: boolean;
  error?: string;
  emptyHint: string;
  origin?: string;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<DocumentProfileKind | "all">("all");
  const entries = useMemo<ShelfEntry[]>(
    () =>
      documents.map((document) => ({
        document,
        profile: storedProfiles.get(document.id) ?? classifyDocumentProfile(document.title).profile,
      })),
    [documents, storedProfiles],
  );
  const kinds = useMemo(() => {
    const counts = new Map<DocumentProfileKind, number>();
    for (const entry of entries) counts.set(entry.profile, (counts.get(entry.profile) ?? 0) + 1);
    return [...counts.entries()].sort(([left], [right]) =>
      DOCUMENT_PROFILE_LABELS[left].localeCompare(DOCUMENT_PROFILE_LABELS[right], "pt-BR"),
    );
  }, [entries]);
  const shown = useMemo(() => {
    const term = plain(query);
    return entries.filter(
      (entry) =>
        (kind === "all" || entry.profile === kind) &&
        (!term ||
          plain(`${entry.document.title} ${DOCUMENT_PROFILE_LABELS[entry.profile]}`).includes(
            term,
          )),
    );
  }, [entries, kind, query]);

  return (
    <section aria-labelledby="my-books-title" className="space-y-4">
      <SectionHeader
        id="my-books-title"
        title={`Meus livros${documents.length ? ` · ${documents.length}` : ""}`}
        description="Ficam só neste computador: o arquivo, o texto extraído, as revisões e as traduções."
        icon={<LockKeyhole className="size-4 text-muted-foreground" aria-hidden="true" />}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Abrindo seus livros…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : !documents.length ? (
        <EmptyState
          icon={BookPlus}
          title="Ainda não há livros aqui"
          action={
            <Link
              to="/library/process"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground"
            >
              <BookPlus className="size-4" aria-hidden="true" /> Adicionar livro
            </Link>
          }
        >
          <p>{emptyHint}</p>
          {origin && <p className="mt-1 font-mono text-xs">Endereço atual: {origin}</p>}
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring sm:max-w-md">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Procurar nos meus livros</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Procurar pelo título…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Tipo de livro
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as DocumentProfileKind | "all")}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              >
                <option value="all">Todos · {documents.length}</option>
                {kinds.map(([value, count]) => (
                  <option key={value} value={value}>
                    {DOCUMENT_PROFILE_LABELS[value]} · {count}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {shown.length ? (
            <BookShelf entries={shown} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum livro com esse título ou tipo. Limpe a busca ou escolha “Todos”.
            </p>
          )}
        </>
      )}
    </section>
  );
}
