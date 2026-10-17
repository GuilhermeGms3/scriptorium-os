import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { bookLabel } from "../../lib/i18n";
import type { TokenOccurrence } from "../../lib/domain/scripture";

export function LexicalStatistics({
  lexemeId,
  token,
}: {
  lexemeId: string;
  token?: TokenOccurrence;
}) {
  const query = useWorkspaceQuery(
    ["lexical-statistics", token?.editionId, token?.lemmaId ?? lexemeId],
    () => ScriptureKnowledgeEngine.getLexicalStatistics(lexemeId, token),
  );
  if (query.isPending)
    return (
      <p role="status" className="text-xs">
        Calculando distribuição e palavras vizinhas…
      </p>
    );
  if (query.error)
    return (
      <div role="alert" className="text-xs">
        <p>Não foi possível calcular as estatísticas deste corpus.</p>
        <button type="button" onClick={() => void query.refetch()} className="underline">
          Tentar novamente
        </button>
      </div>
    );
  const data = query.data;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-3 text-xs" aria-label="Estatísticas lexicais">
      <p className="break-words text-muted-foreground">
        Edição: {data.editionId}. {data.total.toLocaleString("pt-BR")} tokens. Contagem do corpus
        linguístico instalado, não frequência em todas as tradições textuais.
      </p>
      <h3 className="font-medium">Distribuição por livro</h3>
      {data.editionId.startsWith("wlc-") && (
        <p className="text-muted-foreground">
          Referências compostas do OSHB não são unificadas automaticamente em uma raiz. Vizinhos sem
          lema escrito mostram a forma hebraica, não o código Strong.
        </p>
      )}
      {data.books.length === 0 ? (
        <p>Nenhuma ocorrência neste índice.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {data.books.map((book) => (
            <li key={book.bookId} className="flex justify-between gap-2">
              <span>
                {book.bookId === "unknown" ? "Sem endereço de livro" : bookLabel(book.bookId)}
              </span>
              <span>
                {book.count} · {((100 * book.count) / data.total).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
      <h3 className="font-medium">Palavras vizinhas</h3>
      <p className="text-muted-foreground">
        Até {data.window} posições antes/depois, somente na mesma unidade textual. Coocorrência não
        equivale a significado ou tradução.
      </p>
      {data.neighbors.length === 0 ? (
        <p>Sem vizinhos nesta janela.</p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {data.neighbors.map((neighbor) => (
            <li
              key={`${neighbor.lemma}:${neighbor.direction}:${neighbor.distance}`}
              className="flex justify-between gap-2"
            >
              <span dir="auto">{neighbor.lemma}</span>
              <span>
                {neighbor.distance} {neighbor.direction === "before" ? "antes" : "depois"} ·{" "}
                {neighbor.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
