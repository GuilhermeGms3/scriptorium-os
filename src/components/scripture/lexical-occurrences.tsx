import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LinguisticRepository } from "../../lib/repositories/linguistic-repository";
import { passageLabel } from "../../lib/i18n";

export function LexicalOccurrences({ lexemeId }: { lexemeId: string }) {
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    offset: number;
    data?: Awaited<ReturnType<typeof LinguisticRepository.getOccurrencesByLexeme>>;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    LinguisticRepository.getOccurrencesByLexeme(lexemeId, offset, 30).then(
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
  }, [lexemeId, offset, retry]);
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
        Ocorrências alinhadas no NT: <strong>{data.total.toLocaleString("pt-BR")}</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        Somente vínculos aceitos TAGNT → SBLGNT. Lacunas de alinhamento não entram nesta contagem.
      </p>
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
