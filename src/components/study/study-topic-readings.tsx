import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, NotebookPen } from "lucide-react";
import type {
  StudyTopic,
  TopicReadings,
  TopicReading,
} from "../../lib/application/study-topic-service";
import { topicNoteLinks } from "../../lib/application/study-topic-service";
import { useSourceReader } from "./source-reader-context";
import { Button } from "../ui/button";
import { languageLabel } from "../../lib/i18n";
import { TopicSourceText } from "./topic-source-text";

const ORIGINS = [
  {
    id: "catalog",
    label: "Obras de partida",
    detail: "Correspondências editoriais conferidas no catálogo instalado.",
  },
  {
    id: "primary-search",
    label: "Nos textos",
    detail: "Trechos encontrados por busca textual. A ocorrência não confirma uma interpretação.",
  },
  {
    id: "private-search",
    label: "Nos meus livros",
    detail: "Páginas do seu acervo privado. A extração permanece ligada ao documento original.",
  },
] as const;

export function StudyTopicReadings({
  topic,
  readings,
  pending,
  error,
  onRetry,
  studyId,
}: {
  topic: StudyTopic;
  readings?: TopicReadings;
  pending: boolean;
  error: boolean;
  onRetry: () => void;
  studyId?: string;
}) {
  const [origin, setOrigin] = useState<TopicReading["origin"]>();
  const [index, setIndex] = useState(0);
  const openSource = useSourceReader();
  if (pending)
    return (
      <p role="status" className="py-12 text-sm text-muted-foreground">
        Consultando textos instalados e páginas do seu acervo…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="py-8 text-sm text-destructive">
        Não foi possível consultar as leituras.{" "}
        <button onClick={onRetry} className="underline">
          Tentar novamente
        </button>
      </p>
    );
  const activeOrigin =
    origin ??
    (readings?.items.some((item) => item.origin === "private-search")
      ? "private-search"
      : undefined) ??
    (readings?.items.some((item) => item.origin === "primary-search")
      ? "primary-search"
      : undefined) ??
    ORIGINS.find((candidate) => readings?.items.some((item) => item.origin === candidate.id))?.id ??
    "catalog";
  const items = readings?.items.filter((item) => item.origin === activeOrigin) ?? [];
  const current = items[Math.min(index, Math.max(0, items.length - 1))];
  return (
    <section aria-label="Leituras do tema">
      <div className="topic-section-heading">
        <p className="meta-label">Ler antes de concluir</p>
        <h2>Uma fonte de cada vez</h2>
        <p>
          O texto e sua origem permanecem juntos. Escolha uma leitura, confira o contexto e registre
          o que ela permite afirmar.
        </p>
      </div>
      {readings?.warnings.map((warning) => (
        <p key={warning} role="status" className="mt-3 text-sm text-muted-foreground">
          {warning}
        </p>
      ))}
      <div className="topic-reading-origins" role="group" aria-label="Origem das leituras">
        {ORIGINS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={activeOrigin === item.id}
            onClick={() => {
              setOrigin(item.id);
              setIndex(0);
            }}
          >
            <BookOpen className="size-4" />
            <span>{item.label}</span>
            <small>
              {readings?.items.filter((reading) => reading.origin === item.id).length ?? 0}
            </small>
          </button>
        ))}
      </div>
      <p className="mb-6 text-xs leading-6 text-muted-foreground">
        {ORIGINS.find((item) => item.id === activeOrigin)?.detail}
      </p>
      {current ? (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="min-w-0 max-w-full text-sm">
              <span className="sr-only">Selecionar leitura</span>
              <select
                className="topic-reading-select"
                aria-label="Selecionar leitura"
                value={Math.min(index, items.length - 1)}
                onChange={(event) => setIndex(Number(event.target.value))}
              >
                {items.map((item, i) => (
                  <option key={item.id} value={i}>
                    {item.title} · {item.locator}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-muted-foreground">
              {Math.min(index + 1, items.length)} de {items.length}
            </span>
          </div>
          <article className="topic-reading-desk">
            <p className="meta-label">
              {current.source.kind === "private-document" ? "Acervo privado" : "Texto instalado"}
              {current.language ? ` · ${languageLabel(current.language)}` : ""}
            </p>
            <h3 className="mt-3 font-serif text-2xl">{current.title}</h3>
            <p className="mt-2 text-xs text-muted-foreground">{current.locator}</p>
            <TopicSourceText key={current.id} reading={current} />
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
              {current.source.kind === "primary-text" && !current.source.unitId ? (
                <Button asChild variant="outline">
                  <Link to="/library/read/$workId" params={{ workId: current.source.workId }}>
                    <BookOpen className="mr-2 size-4" />
                    Abrir a obra
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    openSource({
                      source: current.source,
                      context: `Estudo de ${topic.title} · ${current.origin === "catalog" ? "fonte do roteiro" : "resultado de busca textual"}`,
                      links: topicNoteLinks(topic),
                      ...(studyId ? { studyId } : {}),
                    })
                  }
                >
                  <NotebookPen className="mr-2 size-4" />
                  Ler o contexto e anotar
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                O original permanece na Biblioteca.
              </span>
            </div>
          </article>
          <div className="topic-pager">
            <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              <ArrowLeft className="mr-2 size-4" />
              Leitura anterior
            </Button>
            <Button
              variant="ghost"
              disabled={index >= items.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              Próxima leitura
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </>
      ) : (
        <div className="topic-empty">
          <BookOpen className="size-7 text-primary" />
          <h3>Nenhuma leitura nesta origem</h3>
          <p>
            O índice não retornou material para este tema. Consulte outra origem ou importe uma
            fonte na Biblioteca. Nenhum texto foi criado para preencher esta lacuna.
          </p>
          <Button asChild variant="outline">
            <Link to="/library">Abrir Biblioteca</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
