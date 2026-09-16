import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { passageLabel } from "../../lib/i18n";
import type { TokenOccurrence } from "../../lib/domain/scripture";

export function LexicalOccurrences({
  lexemeId,
  token,
}: {
  lexemeId: string;
  token?: TokenOccurrence;
}) {
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    offset: number;
    data?: Awaited<ReturnType<typeof ScriptureKnowledgeEngine.getLexicalOccurrences>>;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    const request = token
      ? ScriptureKnowledgeEngine.getWordKnowledgeBundle(token, offset, 30).then((bundle) =>
          bundle.concordance.status === "available"
            ? bundle.concordance.data
            : { total: 0, offset, items: [] },
        )
      : ScriptureKnowledgeEngine.getLexicalOccurrences(lexemeId, offset, 30);
    request.then(
      (data) => {
        if (active) setResult({ offset, data });
      },
      () => {
        if (active) setResult({ offset, error: "Não foi possível carregar as ocorrências." });
      },
    );
    return () => {
      active = false;
    };
  }, [lexemeId, offset, retry, token]);
  const page = result?.offset === offset ? result : null;
  if (!page)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Carregando ocorrências…
      </p>
    );
  if (page.error)
    return (
      <div role="alert" className="text-sm">
        <p>{page.error}</p>
        <button
          className="mt-2 underline"
          onClick={() => {
            setResult(null);
            setRetry((n) => n + 1);
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  const data = page.data!;
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {token ? "Ocorrências no corpus" : "Ocorrências alinhadas no NT"}:{" "}
        <strong>{data.total.toLocaleString("pt-BR")}</strong>
      </p>
      {!token && (
        <p className="text-xs text-muted-foreground">
          Somente vínculos aceitos TAGNT → SBLGNT. Lacunas de alinhamento não entram nesta contagem.
        </p>
      )}
      {data.total === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma ocorrência alinhada.</p>
      ) : (
        <>
          <ul className="space-y-1">
            {data.items.map((item) => (
              <li key={item.tokenId}>
                <Link
                  to="/scripture/$book/$chapter"
                  params={{ book: item.ref.bookId, chapter: String(item.ref.chapter) }}
                  hash={`verse-${item.ref.verseStart}`}
                  className="inline-block rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs hover:underline"
                >
                  {passageLabel(item.ref)} · palavra {item.position}
                </Link>
              </li>
            ))}
          </ul>
          <div
            className="flex items-center justify-between gap-2 text-xs"
            aria-label="Paginação de ocorrências"
          >
            <button
              disabled={offset === 0}
              className="rounded border border-input px-2 py-1 disabled:opacity-40"
              onClick={() => setOffset(Math.max(0, offset - 30))}
            >
              Anterior
            </button>
            <span>
              {offset + 1}–{Math.min(offset + 30, data.total)} de {data.total}
            </span>
            <button
              disabled={offset + 30 >= data.total}
              className="rounded border border-input px-2 py-1 disabled:opacity-40"
              onClick={() => setOffset(offset + 30)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}
