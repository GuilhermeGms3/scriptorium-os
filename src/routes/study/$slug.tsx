import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Library, Network, StickyNote } from "lucide-react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { AnalysisRepository } from "../../lib/repositories/analysis-repository";
import { passageLabel, studyItemKindLabel, studyLensPresentation, t } from "../../lib/i18n";
import { StudyRepository } from "../../lib/repositories/study-repository";
import type { ResearchQuestion } from "../../lib/domain/research";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { errorMessage } from "@/lib/utils";
import { studyGuideById } from "../../lib/content/study-guides";
import { PageContainer } from "../../components/layout/page-container";
import { PageHeader } from "../../components/layout/page-header";

export const Route = createFileRoute("/study/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug} — ${t("study.section")} Scriptorium` }],
  }),
  component: StudyWorkspace,
});

const KIND_ICON = {
  passage: BookOpen,
  word: BookOpen,
  concept: Network,
  resource: Library,
  note: StickyNote,
  person: Network,
  place: Network,
};

function StudyWorkspace() {
  const { slug } = Route.useParams();
  const { notes, studies, refreshUserData, setPassageContext, workspacePersistence } =
    useWorkbench();
  const study = studies.find((candidate) => candidate.slug === slug);
  const [question, setQuestion] = useState("");
  const lenses = AnalysisRepository.listLenses();
  useEffect(() => setPassageContext(null), [setPassageContext]);
  // Keyed by id: `study` is a new object after every note, which used to refetch the questions.
  const studyId = study?.id;
  const questionsQuery = useWorkspaceQuery(
    ["research-questions", studyId],
    () => StudyRepository.listResearchQuestions(studyId),
    { enabled: studyId !== undefined },
  );
  const questions = questionsQuery.data ?? [];
  const [questionError, setQuestionError] = useState<string>();

  if (!study && workspacePersistence === "loading")
    return <p className="p-8 text-sm text-muted-foreground">Abrindo workspace local…</p>;
  if (!study)
    return (
      <div className="p-8">
        <p className="text-sm">{t("study.notFound")}</p>
        <Link to="/study" className="mt-3 inline-block text-xs underline">
          {t("study.back")}
        </Link>
      </div>
    );
  const linkedNotes = notes.filter((note) =>
    note.links.some((link) => link.kind === "study" && link.target === study.id),
  );

  const guideId = study.items
    .find((item) => item.refId.startsWith("study-guide:"))
    ?.refId.slice("study-guide:".length);
  const guide = guideId ? studyGuideById(guideId) : undefined;

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow={t("study.workspace")}
        title={study.title}
        description={study.description ?? t("study.privateDescription")}
      >
        {guide && (
          <Link
            to="/study/guide/$topic"
            params={{ topic: guide.id }}
            className="mb-3 inline-block text-xs text-primary hover:underline"
          >
            Voltar ao guia de {guide.title}
          </Link>
        )}
      </PageHeader>

      <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        Use este estudo como uma mesa de pesquisa: formule uma pergunta, reúna passagens e fontes
        durante a leitura e registre abaixo o que você concluiu — inclusive suas dúvidas.
      </p>

      <section
        className="mt-5 rounded-md border border-border bg-card p-3"
        aria-labelledby="research-questions-heading"
      >
        <h2 id="research-questions-heading" className="meta-label">
          1. Pergunta central
        </h2>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const clean = question.trim();
            if (!clean) return;
            setQuestionError(undefined);
            void StudyRepository.createResearchQuestion({
              question: clean,
              studyId: study.id,
            }).then(
              async () => {
                setQuestion("");
                await questionsQuery.refetch();
              },
              (cause: unknown) => setQuestionError(errorMessage(cause)),
            );
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Nova pergunta de pesquisa</span>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Que problema esta investigação precisa responder?"
              className="h-9 w-full rounded border border-input bg-background px-3 text-sm"
            />
          </label>
          <button
            disabled={!question.trim()}
            className="rounded bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>
        {(questionError || questionsQuery.error) && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {questionError ??
              `As perguntas não puderam ser carregadas: ${errorMessage(questionsQuery.error)}`}
          </p>
        )}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {questions.map((item) => (
            <ResearchQuestionItem
              key={item.id}
              item={item}
              onChanged={async () => {
                await questionsQuery.refetch();
              }}
            />
          ))}
        </ul>
      </section>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <section id="overview">
            <h2 className="meta-label">2. {t("study.collected")}</h2>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {study.items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <li key={item.id} className="flex items-center gap-2.5 py-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1 text-sm">
                      {item.passageRef ? passageLabel(item.passageRef) : item.label}
                    </span>
                    <span className="meta-label tracking-wider text-muted-foreground">
                      {studyItemKindLabel(item.kind)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {study.items.length === 0 && (
              <div className="mt-2 rounded-md border border-dashed border-border p-4">
                <p className="text-sm font-medium">Nenhum material reunido ainda</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Abra uma passagem bíblica ou uma fonte da Biblioteca e use a ação de adicionar ao
                  estudo. O item aparecerá aqui com seu vínculo de origem.
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/scripture/$book/$chapter"
                    params={{ book: "john", chapter: "1" }}
                    className="rounded border border-input px-2.5 py-1.5 text-xs"
                  >
                    Abrir João 1
                  </Link>
                  <Link to="/library" className="rounded border border-input px-2.5 py-1.5 text-xs">
                    Abrir Biblioteca
                  </Link>
                </div>
              </div>
            )}
          </section>

          <details id="lenses" className="mt-7 rounded-md border border-border px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium">{t("study.lenses")}</summary>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Abra esta lista quando precisar de perguntas-guia para examinar o texto por ângulos
              como linguagem, história, arqueologia, geografia, exegese e hermenêutica. Ela não é
              conteúdo pronto e não substitui fontes.
            </p>
            <div className="mt-3 grid border-y border-border sm:grid-cols-2">
              {lenses.map((lens) => {
                const presentation = studyLensPresentation(lens);
                return (
                  <div key={lens.id} className="border-b border-border p-2.5 sm:border-r">
                    <p className="text-xs font-medium">{presentation.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {presentation.question}
                    </p>
                  </div>
                );
              })}
            </div>
          </details>
        </div>

        <aside id="notes">
          <h2 className="meta-label">3. {t("study.notesDeductions")}</h2>
          <Link
            to="/notes"
            search={{ group: study.id }}
            className="mt-3 inline-block text-sm text-primary underline"
          >
            Abrir notas desta investigação
          </Link>
          <ul className="mt-3 space-y-2">
            {linkedNotes.slice(0, 3).map((note) => (
              <li key={note.id} className="border-l-2 border-border pl-3">
                <p className="text-sm font-medium">{note.title}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {note.body || t("study.emptyNote")}
                </p>
              </li>
            ))}
            {linkedNotes.length === 0 && (
              <li className="text-xs italic text-muted-foreground">{t("study.noNotes")}</li>
            )}
          </ul>
        </aside>
      </div>
    </PageContainer>
  );
}

function ResearchQuestionItem({
  item,
  onChanged,
}: {
  item: ResearchQuestion;
  onChanged: () => Promise<void>;
}) {
  const [status, setStatus] = useState(item.status);
  const [conclusion, setConclusion] = useState(item.provisionalConclusion ?? "");
  return (
    <li className="border-l-2 border-border pl-3">
      <p className="text-xs font-medium">{item.question}</p>
      <div className="mt-2 flex gap-1">
        <select
          aria-label="Status da pergunta"
          value={status}
          onChange={(event) => setStatus(event.target.value as ResearchQuestion["status"])}
          className="h-8 min-w-0 flex-1 rounded border border-input bg-background px-1 text-xs"
        >
          <option value="open">Aberta</option>
          <option value="investigating">Investigando</option>
          <option value="provisional">Provisória</option>
          <option value="answered">Respondida</option>
          <option value="archived">Arquivada</option>
        </select>
        <button
          type="button"
          onClick={() =>
            void StudyRepository.updateResearchQuestion(item.id, {
              status,
              ...(conclusion.trim() ? { provisionalConclusion: conclusion } : {}),
            }).then(onChanged)
          }
          className="rounded border border-input px-2 text-xs"
        >
          Salvar
        </button>
      </div>
      <textarea
        aria-label="Conclusão provisória"
        value={conclusion}
        onChange={(event) => setConclusion(event.target.value)}
        placeholder="Conclusão provisória pessoal"
        className="mt-1 min-h-14 w-full rounded border border-input bg-background p-1.5 text-xs"
      />
    </li>
  );
}
