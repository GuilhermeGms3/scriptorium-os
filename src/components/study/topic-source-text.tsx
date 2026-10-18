import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { loadTopicReadingText } from "../../lib/application/topic-reading-text";
import type { TopicReading } from "../../lib/application/study-topic-service";

export function TopicSourceText({ reading }: { reading: TopicReading }) {
  const query = useWorkspaceQuery(
    ["topic-original-text", reading.source],
    () => loadTopicReadingText(reading.source),
    { refreshOnKnowledgeChange: true },
  );
  if (query.isPending)
    return (
      <p role="status" className="my-6 text-sm">
        Abrindo o texto original…
      </p>
    );
  if (query.isError)
    return (
      <p role="alert" className="my-6 text-sm">
        Não foi possível carregar o trecho original.{" "}
        <button className="underline" onClick={() => void query.refetch()}>
          Tentar novamente
        </button>
      </p>
    );
  if (query.data === null)
    return (
      <p className="my-6 text-sm text-muted-foreground">
        Esta indicação corresponde à obra completa. Abra a obra para escolher sua seção.
      </p>
    );
  return (
    <>
      <p className="mt-6 text-xs text-muted-foreground">
        {reading.source.kind === "private-document"
          ? "Texto integral da página encontrada · extração do documento"
          : "Texto integral da unidade encontrada · idioma da edição"}
      </p>
      {query.data.trim() ? (
        <blockquote className="topic-reading-excerpt topic-original-text">{query.data}</blockquote>
      ) : (
        <p className="my-6 text-sm">
          Esta página não contém texto extraído disponível. Consulte o documento original.
        </p>
      )}
    </>
  );
}
