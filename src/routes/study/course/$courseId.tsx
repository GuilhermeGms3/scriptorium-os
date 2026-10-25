import { z } from "zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AcademicCourseWorkspace } from "../../../components/study/academic-course-workspace";
import { StudyCourseGate } from "../../../components/study/study-course-gate";

export const Route = createFileRoute("/study/course/$courseId")({
  component: CoursePage,
  validateSearch: z.object({ module: z.string().max(150).optional() }),
  head: () => ({ meta: [{ title: "Percurso acadêmico — Scriptorium" }] }),
});
function CoursePage() {
  const { courseId } = Route.useParams();
  const search = Route.useSearch();
  const query = useQuery({
    queryKey: ["academic-course", courseId],
    queryFn: async () => {
      if (courseId === "genesis-1")
        return (await import("../../../lib/content/study-courses/genesis")).GENESIS_COURSE;
      if (courseId === "theology-formation")
        return {
          ...(await import("../../../../scripts/mobile/theology-formation")).THEOLOGY_FORMATION,
          id: "theology-formation",
        };
      if (courseId === "conhecer-para-amar")
        return (await import("../../../lib/content/study-courses/knowing-god")).KNOWING_GOD_COURSE;
      if (courseId.startsWith("guia-"))
        return (await import("../../../lib/content/study-courses/guide-course")).guideCourse(
          courseId.slice(5),
        );
      return null;
    },
    staleTime: Infinity,
  });
  if (query.isPending)
    return (
      <p className="p-8" role="status">
        Abrindo o percurso…
      </p>
    );
  if (query.isError)
    return (
      <p className="p-8" role="alert">
        Não foi possível abrir o percurso.{" "}
        <button onClick={() => void query.refetch()}>Tentar novamente</button>
      </p>
    );
  return query.data ? (
    <StudyCourseGate course={query.data}>
      <AcademicCourseWorkspace
        key={`${courseId}:${search.module ?? ""}`}
        course={query.data}
        {...(search.module ? { initialModule: search.module } : {})}
      />
    </StudyCourseGate>
  ) : (
    <div className="p-8">
      <h1>Percurso não encontrado</h1>
      <Link to="/study" search={{}}>
        Voltar aos estudos
      </Link>
    </div>
  );
}
