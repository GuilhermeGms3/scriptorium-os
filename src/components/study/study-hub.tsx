import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { KNOWING_GOD_COURSE } from "../../lib/content/study-courses/knowing-god";
import { guideCourse } from "../../lib/content/study-courses/guide-course";
import { STUDY_GUIDES, guideIdForNode } from "../../lib/content/study-guides";
import { STUDY_SKILL_NODES } from "../../lib/content/study-skill-tree";
import { StudyCourseRepository } from "../../lib/repositories/study-course-repository";
import { KnowledgeQueryService } from "../../lib/application/knowledge-query-service";
import { groupStudyKnowledge, studyEntityTitle } from "../../lib/content/study-knowledge";
import { StudySkillTree } from "./study-skill-tree";
import { StudyCourseEntry } from "./study-course-entry";
import "./study-hub.css";

export function StudyHub({ onSelectEntity }: { onSelectEntity: (id: string) => void }) {
  const navigate = useNavigate();
  const [area, setArea] = useState("Árvore");
  const [group, setGroup] = useState("");
  const [query, setQuery] = useState("");
  const progress = useWorkspaceQuery(
    ["study-tree-completion"],
    async () => {
      const discovery = await StudyCourseRepository.load(KNOWING_GOD_COURSE);
      const completed = new Set<string>();
      if (
        KNOWING_GOD_COURSE.modules.every((module) =>
          discovery.some((p) => p.moduleId === module.id && p.completedAt),
        )
      )
        completed.add("study-origin");
      const guides = await Promise.all(
        STUDY_SKILL_NODES.filter((node) => node.kind !== "origin").map(async (node) => {
          const course = guideCourse(guideIdForNode(node));
          if (!course) return null;
          const marks = await StudyCourseRepository.load(course);
          return course.modules.every((module) =>
            marks.some((p) => p.moduleId === module.id && p.completedAt),
          )
            ? node.id
            : null;
        }),
      );
      guides.forEach((id) => {
        if (id) completed.add(id);
      });
      return { discovery, completed };
    },
    { refreshOnKnowledgeChange: true },
  );
  const catalog = useWorkspaceQuery(
    ["knowledge-entities"],
    () => KnowledgeQueryService.listEntities(),
    { enabled: area === "Temas" },
  );
  const groups = useMemo(() => groupStudyKnowledge(catalog.data ?? []), [catalog.data]);
  const selected = groups.find((item) => item.id === group);
  const entries = (selected?.entities ?? groups.flatMap((item) => item.entities)).filter((entity) =>
    studyEntityTitle(entity).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  );
  function openNode(id: string) {
    const node = STUDY_SKILL_NODES.find((item) => item.id === id);
    if (node)
      void navigate({
        to: "/study/course/$courseId",
        params: {
          courseId: node.kind === "origin" ? KNOWING_GOD_COURSE.id : `guia-${guideIdForNode(node)}`,
        },
      });
  }
  return (
    <section className="study-hub">
      <nav className="study-hub-tabs" aria-label="Áreas de Estudos">
        {["Árvore", "Percursos", "Temas"].map((label) => (
          <button
            key={label}
            type="button"
            aria-pressed={area === label}
            onClick={() => setArea(label)}
          >
            {label}
          </button>
        ))}
      </nav>
      {area === "Árvore" ? (
        <>
          {progress.isPending && <p role="status">Carregando progresso…</p>}
          {progress.error && (
            <p role="alert">
              Progresso indisponível.{" "}
              <button onClick={() => void progress.refetch()}>Tentar novamente</button>
            </p>
          )}
          <StudySkillTree
            completed={progress.data?.completed ?? new Set()}
            ready={progress.isSuccess}
            open={openNode}
          />
          <StudyCourseEntry progress={progress.data?.discovery ?? []} ready={progress.isSuccess} />
        </>
      ) : area === "Percursos" ? (
        <div className="study-course-catalog">
          <Link to="/study/course/$courseId" params={{ courseId: KNOWING_GOD_COURSE.id }}>
            <h2>{KNOWING_GOD_COURSE.title}</h2>
            <p>Teologia fundamental · seis módulos</p>
          </Link>
          <Link to="/study/course/$courseId" params={{ courseId: "theology-formation" }}>
            <h2>Formação em Teologia</h2>
            <p>Método, história e sistemática · dezoito módulos</p>
          </Link>
          <Link to="/study/course/$courseId" params={{ courseId: "genesis-1" }}>
            <h2>Gênesis 1</h2>
            <p>Texto, contexto e interpretações · seis módulos</p>
          </Link>
          <h2>Guias por área</h2>
          {STUDY_GUIDES.filter((guide) => guide.id !== "teologia").map((guide) => (
            <Link
              key={guide.id}
              to="/study/course/$courseId"
              params={{ courseId: `guia-${guide.id}` }}
            >
              {guide.title} →
            </Link>
          ))}
        </div>
      ) : (
        <div className="study-topic-catalog">
          <label>
            Buscar tema
            <input value={query} onChange={(event) => setQuery(event.target.value.slice(0, 200))} />
          </label>
          {catalog.isPending ? (
            <p role="status">Consultando temas…</p>
          ) : catalog.error ? (
            <p role="alert">
              Catálogo indisponível.{" "}
              <button onClick={() => void catalog.refetch()}>Tentar novamente</button>
            </p>
          ) : !group && !query ? (
            <div className="study-area-grid">
              {groups.map((item) => (
                <button key={item.id} onClick={() => setGroup(item.id)}>
                  <h2>{item.title}</h2>
                  <p>{item.entities.length} temas</p>
                </button>
              ))}
            </div>
          ) : (
            <>
              <button
                className="study-catalog-back"
                onClick={() => {
                  setGroup("");
                  setQuery("");
                }}
              >
                ← Áreas de estudo
              </button>
              <h2>{selected?.title ?? "Resultados"}</h2>
              {entries.length ? (
                <ul>
                  {entries.map((entity) => (
                    <li key={entity.entity.id}>
                      <button onClick={() => onSelectEntity(entity.entity.id)}>
                        {studyEntityTitle(entity)} <span>→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum tema encontrado.</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
