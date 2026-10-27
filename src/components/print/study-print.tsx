import type { ResearchQuestion } from "../../lib/domain/research";
import type { Note, Study } from "../../lib/domain/study";
import { passageLabel, researchQuestionStatusLabel, studyItemKindLabel } from "../../lib/i18n";
import { NoteMarkdown } from "../notes/note-markdown";
import { PrintDocument, PrintSection } from "./print-document";

/**
 * A study on paper, in the order of the screen: the questions with their provisional conclusions,
 * the material gathered and every note of the study (the screen shows only the first three).
 */
export function StudyPrint({
  study,
  questions,
  notes,
  allNotes,
  printedAt,
}: {
  study: Study;
  questions: readonly ResearchQuestion[];
  /** The notes of this study. */
  notes: readonly Note[];
  /** Every note, so links between notes print as titles. */
  allNotes: readonly Note[];
  printedAt?: Date;
}) {
  const empty = !questions.length && !study.items.length && !notes.length;
  return (
    <PrintDocument
      kind="Estudo"
      title={study.title}
      {...(study.description ? { subtitle: <p>{study.description}</p> } : {})}
      {...(printedAt ? { printedAt } : {})}
    >
      {empty && (
        <p className="pd-empty">Este estudo ainda não tem perguntas, material reunido ou notas.</p>
      )}
      {questions.length > 0 && (
        <PrintSection title="Perguntas de pesquisa">
          <ol className="pd-list">
            {questions.map((question) => (
              <li key={question.id} className="pd-question">
                <p className="pd-question-text">{question.question}</p>
                <p className="pd-meta">{researchQuestionStatusLabel(question.status)}</p>
                {question.provisionalConclusion?.trim() && (
                  <p>
                    <span className="pd-label">Conclusão provisória: </span>
                    {question.provisionalConclusion}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </PrintSection>
      )}
      {study.items.length > 0 && (
        <PrintSection title="Material reunido">
          <ul className="pd-list">
            {study.items.map((item) => (
              <li key={item.id}>
                {item.passageRef ? passageLabel(item.passageRef) : item.label}
                <span className="pd-meta"> · {studyItemKindLabel(item.kind)}</span>
              </li>
            ))}
          </ul>
        </PrintSection>
      )}
      {notes.length > 0 && (
        <PrintSection title="Notas e deduções">
          {notes.map((note) => (
            <section key={note.id} className="pd-note">
              <h3 className="pd-subheading">{note.title.trim() || "Nota sem título"}</h3>
              <div className="pd-markdown">
                {note.body.trim() ? (
                  <NoteMarkdown body={note.body} notes={allNotes} />
                ) : (
                  <p className="pd-empty">Nota sem texto.</p>
                )}
              </div>
            </section>
          ))}
        </PrintSection>
      )}
    </PrintDocument>
  );
}
