import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { BookOpen, Library, Network, StickyNote } from "lucide-react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { AnalysisRepository } from "../../lib/repositories/analysis-repository";
import { passageLabel, studyItemKindLabel, studyLensPresentation, t } from "../../lib/i18n";
import { StudyRepository } from "../../lib/repositories/study-repository";
import type { ResearchQuestion } from "../../lib/domain/research";

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
  const { notes, studies, addNote, refreshUserData, setPassageContext, workspacePersistence } =
    useWorkbench();
  const study = studies.find((candidate) => candidate.slug === slug);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const lenses = AnalysisRepository.listLenses();
  useEffect(() => setPassageContext(null), [setPassageContext]);
  useEffect(() => {
    if (study) void StudyRepository.listResearchQuestions(study.id).then(setQuestions);
  }, [study]);

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

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() && !body.trim()) return;
    await addNote(title.trim() || t("study.untitledDeduction"), body.trim(), [
      { kind: "study", target: study.id, label: study.title },
    ]);
    setTitle("");
    setBody("");
    await refreshUserData();
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">
      <header className="border-b border-border pb-3">
        <p className="meta-label">{t("study.workspace")}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">{study.title}</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          {study.description ?? t("study.privateDescription")}
        </p>
      </header>

      <nav
        className="mt-3 flex gap-1 overflow-x-auto border-b border-border pb-2"
        aria-label={t("study.sections")}
      >
        {[
          ["overview", t("study.tab.overview")],
          ["passages", t("study.tab.passages")],
          ["sources", t("study.tab.sources")],
          ["notes", t("study.tab.notes")],
          ["concepts", t("study.tab.concepts")],
          ["lenses", t("study.tab.lenses")],
          ["timeline", t("study.tab.timeline")],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>

      <section
        className="mt-5 rounded-md border border-border bg-card p-3"
        aria-labelledby="research-questions-heading"
      >
        <h2 id="research-questions-heading" className="meta-label">
          Perguntas de pesquisa
        </h2>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const clean = question.trim();
            if (!clean) return;
            void StudyRepository.createResearchQuestion({
              question: clean,
              studyId: study.id,
            }).then(async () => {
              setQuestion("");
              setQuestions(await StudyRepository.listResearchQuestions(study.id));
            });
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
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {questions.map((item) => (
            <ResearchQuestionItem
              key={item.id}
              item={item}
              onChanged={async () =>
                setQuestions(await StudyRepository.listResearchQuestions(study.id))
              }
            />
          ))}
        </ul>
      </section>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <section id="overview">
            <h2 className="meta-label">{t("study.collected")}</h2>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {study.items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <li key={item.id} className="flex items-center gap-2.5 py-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1 text-[13px]">
                      {item.passageRef ? passageLabel(item.passageRef) : item.label}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {studyItemKindLabel(item.kind)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section id="lenses" className="mt-7">
            <h2 className="meta-label">{t("study.lenses")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("study.lensesDescription")}</p>
            <div className="mt-2 grid border-y border-border sm:grid-cols-2">
              {lenses.map((lens) => {
                const presentation = studyLensPresentation(lens);
                return (
                  <div key={lens.id} className="border-b border-border p-2.5 sm:border-r">
                    <p className="text-xs font-medium">{presentation.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {presentation.question}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside id="notes">
          <h2 className="meta-label">{t("study.notesDeductions")}</h2>
          <form
            onSubmit={(event) => void saveNote(event)}
            className="mt-2 space-y-2 rounded-md border border-border bg-card p-3"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("common.title")}
              aria-label={t("study.noteTitle")}
              className="h-8 w-full border-b border-border bg-transparent text-sm outline-none"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("study.notePlaceholder")}
              aria-label={t("study.noteBody")}
              className="min-h-24 w-full resize-y bg-transparent text-[13px] leading-relaxed outline-none"
            />
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              {t("common.saveLocally")}
            </button>
          </form>
          <ul className="mt-3 space-y-2">
            {linkedNotes.map((note) => (
              <li key={note.id} className="border-l-2 border-border pl-3">
                <p className="text-[13px] font-medium">{note.title}</p>
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
    </div>
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
          className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-1 text-[10px]"
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
          className="rounded border border-input px-2 text-[10px]"
        >
          Salvar
        </button>
      </div>
      <textarea
        aria-label="Conclusão provisória"
        value={conclusion}
        onChange={(event) => setConclusion(event.target.value)}
        placeholder="Conclusão provisória pessoal"
        className="mt-1 min-h-14 w-full rounded border border-input bg-background p-1.5 text-[10px]"
      />
    </li>
  );
}
