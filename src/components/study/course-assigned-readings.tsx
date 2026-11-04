import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { CourseModule } from "../../lib/domain/study-course";
import type { NoteLink } from "../../lib/domain/study";
import { studyGuideById } from "../../lib/content/study-guides";
import { describeStudyGuide, loadTopicReadings } from "../../lib/application/study-topic-service";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { useSourceReader } from "./source-reader-context";
import { Button } from "../ui/button";

/** The canonical topic service resolves only real installed works and indexed private pages. */
export function CourseAssignedReadings({
  courseId,
  module,
  links,
  studyId,
}: {
  courseId: string;
  module: CourseModule;
  links: NoteLink[];
  studyId?: string;
}) {
  const [index, setIndex] = useState(0);
  const openSource = useSourceReader();
  const topic = useMemo(() => {
    const guide = module.studyGuideId ? studyGuideById(module.studyGuideId) : undefined;
    if (!guide) return null;
    const base = describeStudyGuide(guide);
    return {
      ...base,
      id: `study-course:${courseId}:${module.id}`,
      title: module.title,
      terms: (module.readingSearch ?? module.title)
        .split(/\s+/)
        .filter((term) => term.length > 3)
        .slice(0, 3),
      guide: { ...guide, resources: module.libraryWorks ?? [] },
    };
  }, [courseId, module]);
  const query = useWorkspaceQuery(
    ["course-assigned-readings", courseId, module.id],
    () =>
      topic ? loadTopicReadings(topic) : Promise.reject(new Error("Guia de apoio não encontrado.")),
    { refreshOnKnowledgeChange: true },
  );
  const readings = query.data?.items ?? [];
  const current = readings[Math.min(index, Math.max(0, readings.length - 1))];
  return (
    <section className="course-private-readings" aria-label="Acervo para este módulo">
      <h2>Acervo para este módulo</h2>
      {query.isPending ? (
        <p role="status">Consultando livros e páginas instaladas…</p>
      ) : query.error ? (
        <p role="alert">
          Não foi possível consultar o acervo.{" "}
          <button onClick={() => void query.refetch()}>Tentar novamente</button>
        </p>
      ) : current ? (
        <>
          <label>
            Selecionar fonte
            <select
              className="topic-reading-select"
              value={current.id}
              onChange={(event) =>
                setIndex(readings.findIndex((item) => item.id === event.target.value))
              }
            >
              {readings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.locator}
                </option>
              ))}
            </select>
          </label>
          <article className="course-section course-section-example">
            <h3>{current.title}</h3>
            <p className="text-sm text-muted-foreground">
              {current.locator} ·{" "}
              {current.origin === "catalog"
                ? "Obra vinculada; conferir a seção indicada na fundamentação"
                : current.origin === "private-curated"
                  ? "Leitura documental; conferir a associação e o contexto"
                  : "Resultado de busca; a ocorrência não comprova a interpretação"}
            </p>
            {current.excerpt && <p className="line-clamp-3">{current.excerpt}</p>}
            {current.source.kind === "primary-text" && !current.source.unitId ? (
              <Button asChild variant="outline">
                <Link to="/library/read/$workId" params={{ workId: current.source.workId }}>
                  Abrir obra na Biblioteca
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() =>
                  openSource({
                    source: current.source,
                    context: `${courseId} · ${module.title}`,
                    links,
                    ...(studyId ? { studyId } : {}),
                  })
                }
              >
                Abrir leitura e contexto
              </Button>
            )}
          </article>
          <div className="topic-pager">
            <Button variant="ghost" disabled={index <= 0} onClick={() => setIndex(index - 1)}>
              Fonte anterior
            </Button>
            <Button
              variant="ghost"
              disabled={index >= readings.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              Próxima fonte
            </Button>
          </div>
        </>
      ) : (
        <p>
          Nenhuma obra ou página correspondente está disponível nesta instalação. As fontes
          primárias externas continuam na fundamentação.
        </p>
      )}
      {query.data?.warnings.map((warning) => (
        <p key={warning} role="status" className="text-sm text-muted-foreground">
          {warning}
        </p>
      ))}
    </section>
  );
}
