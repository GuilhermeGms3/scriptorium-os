import type { NoteTarget } from "../../lib/domain/note-document";
import { studySourceLabel, type StudySource } from "../../lib/domain/study-notebook";
import { NoteMarkdown } from "../notes/note-markdown";
import { PrintDocument } from "./print-document";

/** One note on paper: as it reads in "Ler", with its group and the source it was written from. */
export function NotePrint({
  title,
  body,
  place,
  source,
  notes,
  printedAt,
}: {
  title: string;
  body: string;
  /** Study and folder, e.g. "Romanos / Graça". */
  place?: string;
  source?: StudySource;
  /** Other notes, so that links to them print as their titles. */
  notes: readonly NoteTarget[];
  printedAt?: Date;
}) {
  return (
    <PrintDocument
      kind="Nota"
      title={title.trim() || "Nota sem título"}
      subtitle={
        place || source ? (
          <>
            {place && <p>{place}</p>}
            {source && <p>Fonte: {studySourceLabel(source)}</p>}
          </>
        ) : undefined
      }
      {...(printedAt ? { printedAt } : {})}
    >
      <div className="pd-markdown">
        {body.trim() ? (
          <NoteMarkdown body={body} notes={notes} />
        ) : (
          <p className="pd-empty">Esta nota ainda não tem texto.</p>
        )}
      </div>
    </PrintDocument>
  );
}
