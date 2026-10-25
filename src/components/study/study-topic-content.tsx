import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import type { StudyTopic } from "../../lib/application/study-topic-service";
import { Button } from "../ui/button";
import { StudyTopicDeepening } from "./study-topic-deepening";

export function StudyTopicContent({ topic }: { topic: StudyTopic }) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  function turnPage(position: number) {
    setIndex(position);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start" });
    });
  }
  const query = useQuery({
    queryKey: ["study-lesson", topic.id, topic.title],
    queryFn: async () => {
      const catalog = await import("../../lib/content/study-lessons/catalog");
      return { lesson: catalog.lessonForTopic(topic), references: catalog.LESSON_REFERENCES };
    },
    staleTime: Infinity,
    retry: false,
  });
  if (query.isPending) return <p role="status">Abrindo o conteúdo do tema…</p>;
  if (query.isError)
    return (
      <p role="alert">
        Não foi possível abrir o conteúdo.{" "}
        <button className="underline" onClick={() => void query.refetch()}>
          Tentar novamente
        </button>
      </p>
    );
  const lesson = query.data.lesson;
  if (!lesson)
    return (
      <div className="topic-empty">
        <BookOpen />
        <h2>Este tema ainda não tem um texto explicativo próprio</h2>
        <p>
          As fontes e páginas encontradas no acervo estão disponíveis abaixo. O sistema não atribui
          a este tema um texto de outro assunto.
        </p>
      </div>
    );
  const selected = Math.min(index, lesson.chapters.length - 1);
  const current = lesson.chapters[selected]!;
  const references = current.references
    .map((id) => query.data.references.find((item) => item.id === id))
    .filter((item) => item !== undefined);
  return (
    <section className="topic-lesson" aria-label={`Conteúdo sobre ${topic.title}`}>
      {[
        "study-guide:biblia-interpretacao",
        "study-guide:teologia",
        "topic:bibliology",
        "study-guide:exegese-recepcao",
        "study-guide:hermeneutica-metodos",
      ].includes(topic.id) && (
        <aside className="course-entry">
          <p className="meta-label">Percurso acadêmico disponível</p>
          <h2>Gênesis 1: texto, contexto e interpretações</h2>
          <p>
            Seis módulos com aulas desenvolvidas, leitura bíblica, fontes do acervo, atividades e
            avanço salvo.
          </p>
          <Link to="/study/course/$courseId" params={{ courseId: "genesis-1" }}>
            Entrar no percurso de formação →
          </Link>
        </aside>
      )}
      <div className="topic-lesson-heading">
        <p className="meta-label">Biblioteca de estudo · conteúdo do tema</p>
        <p>Uma leitura para compreender. Seu acervo amplia a conversa logo abaixo.</p>
      </div>
      <nav className="topic-lesson-navigation" aria-label="Capítulos do conteúdo">
        <label>
          <span className="sr-only">Capítulo para estudar</span>
          <select
            className="topic-reading-select"
            aria-label="Capítulo para estudar"
            value={selected}
            onChange={(event) => setIndex(Number(event.target.value))}
          >
            {lesson.chapters.map((item, position) => (
              <option key={item.id} value={position}>
                {String(position + 1).padStart(2, "0")} · {item.title}
              </option>
            ))}
          </select>
        </label>
        <span>
          {selected + 1} de {lesson.chapters.length}
        </span>
      </nav>
      <article className="topic-lesson-text" aria-labelledby="lesson-title">
        <p className="topic-role-label">
          {selected === 0 ? "Começar a leitura" : "Aprofundamento"}
        </p>
        <h2 id="lesson-title" ref={heading} tabIndex={-1}>
          {current.title}
        </h2>
        {current.paragraphs.map((paragraph, position) => (
          <p key={`${current.id}:${position}`}>{paragraph}</p>
        ))}
        {current.deepening && (
          <StudyTopicDeepening
            key={current.id}
            content={current.deepening}
            passages={current.passages ?? []}
          />
        )}
        <details className="topic-lesson-bibliography">
          <summary>
            Sobre este texto e referências {references.length > 0 ? `(${references.length})` : ""}
          </summary>
          <p>
            Texto explicativo original do Scriptorium, separado das citações dos seus livros. As
            referências permitem aprofundar e comparar perspectivas; fontes confessionais
            representam a tradição indicada. Não é transcrição nem revisão acadêmica do material.
          </p>
          {references.length === 0 ? (
            <p>
              Exemplo de leitura de Marcos 4, especialmente os versículos 1–20. O texto bíblico pode
              ser consultado nas Escrituras.
            </p>
          ) : (
            <ul>
              {references.map((reference) => (
                <li key={reference.id}>
                  <a href={reference.url} target="_blank" rel="noreferrer">
                    {reference.title} ↗
                  </a>
                  <small>{reference.perspective}</small>
                </li>
              ))}
            </ul>
          )}
        </details>
      </article>
      <div className="topic-pager">
        <Button variant="ghost" disabled={selected === 0} onClick={() => turnPage(selected - 1)}>
          <ArrowLeft className="mr-2 size-4" />
          Capítulo anterior
        </Button>
        <Button
          variant="ghost"
          disabled={selected === lesson.chapters.length - 1}
          onClick={() => turnPage(selected + 1)}
        >
          Próximo capítulo
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </section>
  );
}
