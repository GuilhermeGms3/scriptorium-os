import { createFileRoute, Link } from "@tanstack/react-router";
import { studyGuideById } from "../../../lib/content/study-guides";
import { describeStudyGuide } from "../../../lib/application/study-topic-service";
import { StudyTopicWorkspace } from "../../../components/study/study-topic-workspace";

export const Route = createFileRoute("/study/guide/$topic")({
  head: ({ params }) => ({
    meta: [
      {
        title: `${studyGuideById(params.topic)?.title ?? "Guia não encontrado"} — Estudos — Scriptorium`,
      },
    ],
  }),
  component: StudyGuidePage,
});
function StudyGuidePage() {
  const { topic } = Route.useParams();
  const guide = studyGuideById(topic);
  if (!guide)
    return (
      <div className="p-7">
        <h1 className="font-serif text-2xl">Guia não encontrado</h1>
        <Link to="/study" className="mt-5 inline-block text-sm text-primary hover:underline">
          Voltar à árvore de estudos
        </Link>
      </div>
    );
  return <StudyTopicWorkspace key={guide.id} topic={describeStudyGuide(guide)} />;
}
