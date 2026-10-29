import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { StudyCourse } from "../../lib/domain/study-course";
import { STUDY_SKILL_NODES } from "../../lib/content/study-skill-tree";
import { STUDY_MAP_EDGES } from "../../lib/content/study-learning-map";
import { guideIdForNode } from "../../lib/content/study-guides";
import { KNOWING_GOD_COURSE } from "../../lib/content/study-courses/knowing-god";
import { guideCourse } from "../../lib/content/study-courses/guide-course";
import { StudyCourseRepository } from "../../lib/repositories/study-course-repository";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";

export function StudyCourseGate({
  course,
  children,
}: {
  course: StudyCourse;
  children: ReactNode;
}) {
  const node = STUDY_SKILL_NODES.find((item) => `guia-${guideIdForNode(item)}` === course.id);
  const parents = STUDY_MAP_EDGES.filter((edge) => edge.to === node?.id)
    .map((edge) => STUDY_SKILL_NODES.find((item) => item.id === edge.from)!)
    .map((parent) =>
      parent.kind === "origin" ? KNOWING_GOD_COURSE : guideCourse(guideIdForNode(parent)),
    )
    .filter((item): item is StudyCourse => item !== null);
  const check = useWorkspaceQuery(
    ["guide-prerequisites", course.id],
    async () => {
      const own = await StudyCourseRepository.load(course);
      if (own.some((mark) => mark.completedAt)) return true;
      const marks = await Promise.all(
        parents.map(async (parent) => {
          const progress = await StudyCourseRepository.load(parent);
          return parent.modules.every((module) =>
            progress.some((p) => p.moduleId === module.id && p.completedAt),
          );
        }),
      );
      return marks.every(Boolean);
    },
    { enabled: parents.length > 0, refreshOnKnowledgeChange: true },
  );
  if (!parents.length || check.data === true) return children;
  return (
    <section className="study-gate">
      <h1>{course.title}</h1>
      {check.isPending ? (
        <p role="status">Verificando progresso…</p>
      ) : check.error ? (
        <p role="alert">
          Não foi possível consultar o progresso.{" "}
          <button onClick={() => void check.refetch()}>Tentar novamente</button>
        </p>
      ) : (
        <>
          <p>Conclua o percurso anterior para avançar neste ramo.</p>
          {parents.map((parent) => (
            <Link key={parent.id} to="/study/course/$courseId" params={{ courseId: parent.id }}>
              {parent.title} →
            </Link>
          ))}
        </>
      )}
      <Link to="/study" search={{}}>
        Voltar à árvore
      </Link>
    </section>
  );
}
