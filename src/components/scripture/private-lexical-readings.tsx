import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { privateLexicalReadings } from "../../lib/application/private-lexicon-service";
import { useSourceReader } from "../study/source-reader-context";
export function PrivateLexicalReadings({ lemmas }: { lemmas: readonly string[] }) {
  const open = useSourceReader();
  const query = useWorkspaceQuery(
    ["private-lexicon", lemmas],
    () => privateLexicalReadings(lemmas),
    { refreshOnKnowledgeChange: true },
  );
  return (
    <section
      className="flex flex-col gap-3 border-t border-border pt-3"
      aria-label="Dicionários privados em português"
    >
      <h3 className="meta-label">Nos seus dicionários em português</h3>
      {query.isPending && (
        <p role="status" className="text-sm">
          Consultando verbetes e ocorrências…
        </p>
      )}
      {query.error && (
        <p role="alert" className="text-sm">
          Não foi possível consultar os dicionários.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {query.data?.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum verbete ou ocorrência encontrado para os lemas disponíveis. Isso não prova ausência
          no livro, especialmente em OCR hebraico.
        </p>
      )}
      {query.data?.map((entry, index) => (
        <article
          className="flex flex-col gap-2 border-l border-border pl-3"
          key={`${entry.documentId}:${entry.page}:${index}`}
        >
          <p className="text-xs text-muted-foreground">
            {entry.identified
              ? "Trecho lexical delimitado — confira o método abaixo"
              : "Ocorrência de busca — verbete ainda não identificado"}
          </p>
          <p className="whitespace-pre-wrap text-sm">{entry.text}</p>
          {entry.qualification && (
            <p className="text-xs text-muted-foreground">{entry.qualification}</p>
          )}
          <button
            className="text-left text-xs underline underline-offset-4"
            onClick={() =>
              open({
                source: {
                  kind: "private-document",
                  documentId: entry.documentId,
                  title: entry.title,
                  page: entry.page,
                  ...(entry.start !== undefined &&
                  entry.end !== undefined &&
                  entry.text.length <= 20000
                    ? { selection: { start: entry.start, end: entry.end, quote: entry.text } }
                    : {}),
                },
              })
            }
          >
            {entry.title} · p. {entry.page} · ler e anotar
          </button>
        </article>
      ))}
    </section>
  );
}
