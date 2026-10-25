import { Link } from "@tanstack/react-router";
import { useStudyReveal } from "../../hooks/use-study-reveal";
import type { CourseProgress } from "../../lib/domain/study-course";
import { KNOWING_GOD_COURSE } from "../../lib/content/study-courses/knowing-god";

export function StudyCourseEntry({
  progress,
  ready,
}: {
  progress: readonly CourseProgress[];
  ready: boolean;
}) {
  const ref = useStudyReveal();
  const course = KNOWING_GOD_COURSE;
  const done = course.modules.filter((module) =>
    progress.some((p) => p.moduleId === module.id && p.completedAt),
  ).length;
  const next =
    course.modules.find(
      (module) => !progress.some((p) => p.moduleId === module.id && p.completedAt),
    ) ?? course.modules[0]!;
  return (
    <div ref={ref} className="study-course-entry">
      <svg viewBox="0 0 600 100" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <path
            key={index}
            data-study-path=""
            pathLength={1}
            strokeDasharray="1"
            d={`M20 50 C180 50,180 ${12 + index * 12},${300 + (index % 3) * 130} ${12 + index * 12}`}
          />
        ))}
      </svg>
      <div data-study-enter="">
        <h2>{course.title}</h2>
        <p>Teologia fundamental · seis módulos</p>
        {ready && (
          <>
            <h3>{next.title}</h3>
            <progress max={course.modules.length} value={done} aria-label="Módulos concluídos" />
            <p>
              {done} de {course.modules.length} módulos concluídos
            </p>
          </>
        )}
        <Link to="/study/course/$courseId" params={{ courseId: course.id }}>
          {!ready
            ? "Abrir percurso"
            : done === course.modules.length
              ? "Revisar percurso"
              : progress.length
                ? "Retomar percurso"
                : "Iniciar percurso"}{" "}
          →
        </Link>
      </div>
    </div>
  );
}
