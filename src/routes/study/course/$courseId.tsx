import { z } from "zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AcademicCourseWorkspace } from "../../../components/study/academic-course-workspace";

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
    queryFn: async () =>
      courseId === "genesis-1"
        ? (await import("../../../lib/content/study-courses/genesis")).GENESIS_COURSE
        : null,
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
    <AcademicCourseWorkspace
      key={`${courseId}:${search.module ?? ""}`}
      course={query.data}
      {...(search.module ? { initialModule: search.module } : {})}
    />
  ) : (
    <div className="p-8">
      <h1>Percurso não encontrado</h1>
      <Link to="/study" search={{}}>
        Voltar aos estudos
      </Link>
    </div>
  );
}
