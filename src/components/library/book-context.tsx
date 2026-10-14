import { useEffect, useRef, useState } from "react";
import { BookReadingService } from "../../lib/application/book-reading-service";
import type { PrivateDocumentSearchHit } from "../../lib/domain/private-document";
import { SEMANTIC_DOMAIN_LABELS, SemanticDomainSchema } from "../../lib/domain/semantic-content";

export function BookContext({
  context,
  contextError,
  word,
  onWord,
}: {
  context: Awaited<ReturnType<typeof BookReadingService.context>> | undefined;
  contextError?: string | undefined;
  word: string;
  onWord: (word: string) => void;
}) {
  const [hits, setHits] = useState<PrivateDocumentSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    pending.current = controller;
    setHits([]);
    setError("");
    setSearched(false);
    setBusy(false);
    return () => controller.abort();
  }, [word]);
  return (
    <aside className="min-h-0 overflow-y-auto border-l border-border p-4">
      <h2 className="font-serif text-lg">Sobre este livro</h2>
      {context ? (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            {context.summary?.unitCount ?? 0} unidades citáveis · {context.nodes.length} elementos
            estruturais detectados
          </p>
          <h3 className="meta-label mt-6">Assuntos detectados</h3>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Classificação de máquina, não interpretação aprovada.
          </p>
          <ul className="mt-2 space-y-1">
            {context.topics.map((topic) => {
              const domain = SemanticDomainSchema.safeParse(topic.domain);
              return (
                <li key={topic.domain} className="text-xs">
                  {domain.success ? SEMANTIC_DOMAIN_LABELS[domain.data] : topic.domain}{" "}
                  <span className="text-muted-foreground">({topic.occurrences})</span>
                </li>
              );
            })}
          </ul>
          {!context.topics.length && (
            <p className="mt-2 text-xs text-muted-foreground">Nenhum assunto extraído ainda.</p>
          )}
        </>
      ) : contextError ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {contextError}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Carregando estrutura documental…</p>
      )}
      <details className="mt-6 border-t border-border pt-4" open={Boolean(word)}>
        <summary className="cursor-pointer font-serif">Dicionários do acervo</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Selecione uma palavra com duplo clique ou pesquise. Resultados são ocorrências em páginas
          reais, não definições geradas.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const controller = pending.current;
            if (!controller) return;
            setBusy(true);
            setError("");
            try {
              const result = await BookReadingService.dictionary(word);
              if (!controller.signal.aborted) {
                setHits(result);
                setSearched(true);
              }
            } catch (cause) {
              if (!controller.signal.aborted)
                setError(cause instanceof Error ? cause.message : String(cause));
            } finally {
              if (!controller.signal.aborted) setBusy(false);
            }
          }}
        >
          <input
            aria-label="Palavra no dicionário"
            value={word}
            onChange={(event) => onWord(event.target.value)}
            className="min-w-0 w-full border border-input bg-background px-2 py-2 text-xs"
          />
          <button
            disabled={!word.trim() || busy}
            className="border border-input px-2 text-xs disabled:opacity-50"
          >
            {busy ? "…" : "Buscar"}
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
        {searched && !busy && !error && !hits.length && (
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhuma ocorrência nos dicionários identificados no acervo.
          </p>
        )}
        <ul className="mt-3 space-y-4">
          {hits.map((hit) => (
            <li key={`${hit.documentId}:${hit.pageIndex}`}>
              <a
                href={`/library/document/${encodeURIComponent(hit.documentId)}?page=${hit.pageIndex + 1}`}
                className="text-xs text-primary underline underline-offset-4"
              >
                {hit.title} · p. {hit.pageLabel}
              </a>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{hit.snippet}</p>
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
