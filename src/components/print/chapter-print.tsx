import type { ReactNode } from "react";
import type { ChapterPrintModel, ChapterPrintVerse, PrintComment } from "./chapter-print-model";
import { PrintDocument, PrintSection } from "./print-document";

function Comments({ comments }: { comments: readonly PrintComment[] }) {
  return (
    <div className="pd-comments">
      {comments.map((comment) => (
        <aside key={comment.id} className="pd-comment">
          <p className="pd-comment-source">
            {comment.source}
            {comment.passage ? ` · ${comment.passage}` : ""}
          </p>
          <p className="pd-comment-text">{comment.text}</p>
          <p className="pd-comment-meta">{comment.provenance}</p>
        </aside>
      ))}
    </div>
  );
}

function VerseText({ verse }: { verse: ChapterPrintVerse }) {
  return (
    <>
      <sup className="pd-verse-number">{verse.verse}</sup>
      {verse.text ?? <span className="pd-empty">texto indisponível nesta edição</span>}
    </>
  );
}

/** The chapter as read on screen: the chosen edition, verse by verse or in paragraphs. */
export function ChapterPrint({
  title,
  edition,
  model,
  verseMode,
  direction,
  notes,
  printedAt,
}: {
  title: string;
  /** Edition named under the title, e.g. "Bíblia Livre · com comentários". */
  edition: string;
  model: ChapterPrintModel;
  verseMode: "verse" | "paragraph";
  direction: "ltr" | "rtl";
  notes: readonly string[];
  printedAt?: Date;
}) {
  const blocks: ReactNode[] = [];
  if (verseMode === "verse") {
    for (const verse of model.verses)
      blocks.push(
        <div key={verse.verse} className="pd-verse-block">
          <p className="pd-verse">
            <VerseText verse={verse} />
          </p>
          {verse.comments.length > 0 && <Comments comments={verse.comments} />}
        </div>,
      );
  } else {
    // Running text: a paragraph ends where the edition starts a new one or where a comment opens.
    let run: ChapterPrintVerse[] = [];
    const closeRun = () => {
      if (!run.length) return;
      const verses = run;
      blocks.push(
        <p key={`p${verses[0]!.verse}`} className="pd-paragraph">
          {verses.map((verse, index) => (
            <span key={verse.verse}>
              {index > 0 && " "}
              <VerseText verse={verse} />
            </span>
          ))}
        </p>,
      );
      run = [];
    };
    for (const verse of model.verses) {
      if (verse.startsParagraph) closeRun();
      run.push(verse);
      if (verse.comments.length) {
        closeRun();
        blocks.push(<Comments key={`c${verse.verse}`} comments={verse.comments} />);
      }
    }
    closeRun();
  }
  return (
    <PrintDocument
      kind="Leitura bíblica"
      title={title}
      subtitle={<p>{edition}</p>}
      notes={notes}
      {...(printedAt ? { printedAt } : {})}
    >
      {model.overview.length > 0 && (
        <PrintSection title="Panorama do capítulo">
          <Comments comments={model.overview} />
        </PrintSection>
      )}
      <section className="pd-scripture" dir={direction}>
        {blocks}
      </section>
    </PrintDocument>
  );
}
