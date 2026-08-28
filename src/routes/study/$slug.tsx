import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { BookOpen, Library, Network, StickyNote } from "lucide-react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { AnalysisRepository } from "../../lib/repositories/analysis-repository";
import { passageLabel, studyItemKindLabel, studyLensPresentation, t } from "../../lib/i18n";

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
  const { notes, studies, addNote, refreshUserData, setPassageContext } = useWorkbench();
  const study = studies.find((candidate) => candidate.slug === slug);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const lenses = AnalysisRepository.listLenses();
  useEffect(() => setPassageContext(null), [setPassageContext]);

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

  const saveNote = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() && !body.trim()) return;
    addNote(title.trim() || t("study.untitledDeduction"), body.trim(), [
      { kind: "study", target: study.id, label: study.title },
    ]);
    setTitle("");
    setBody("");
    refreshUserData();
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
            onSubmit={saveNote}
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
