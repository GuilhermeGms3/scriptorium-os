import { cn } from "../../lib/utils";
import { MARK_COLOR_LABELS, type MarkColor } from "../../lib/domain/verse-marks";
import { PrintDocument, PrintSection } from "./print-document";
import "../scripture/verse-marks.css";

export interface MarkedVersePrint {
  key: string;
  /** "João 3:16". */
  reference: string;
  /** Null while the text could not be read; the reference still prints. */
  text: string | null;
  color?: MarkColor;
  favorite: boolean;
}

/** The marked verses on paper, book by book, each with its highlighter color and star. */
export function MarksPrint({
  selection,
  books,
  printedAt,
}: {
  /** Which marks: "Todas as marcações", "Favoritos", "Cor amarela". */
  selection: string;
  books: readonly { book: string; verses: readonly MarkedVersePrint[] }[];
  printedAt?: Date;
}) {
  return (
    <PrintDocument
      kind="Marcações"
      title="Versículos marcados"
      subtitle={<p>{selection}</p>}
      {...(printedAt ? { printedAt } : {})}
    >
      {books.length === 0 && <p className="pd-empty">Nenhum versículo marcado nesta seleção.</p>}
      {books.map(({ book, verses }) => (
        <PrintSection key={book} title={book}>
          <ul className="pd-marks">
            {verses.map((verse) => (
              <li
                key={verse.key}
                className={cn("pd-marked-verse", verse.color && `verse-mark-${verse.color}`)}
              >
                <p className="pd-comment-source">
                  {verse.favorite && "★ "}
                  {verse.reference}
                  {verse.color ? ` · ${MARK_COLOR_LABELS[verse.color]}` : ""}
                </p>
                <p>
                  {verse.text === null ? (
                    <span className="pd-empty">texto indisponível</span>
                  ) : (
                    <span className={cn(verse.color && "pd-mark")}>{verse.text}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </PrintSection>
      ))}
    </PrintDocument>
  );
}
