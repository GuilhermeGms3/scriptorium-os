import { readingTextSections } from "../../lib/domain/reading-sections";

/** No labels/numbers are inserted into source text: selection offsets stay exact. */
export function ReadingTextSections({
  text,
  marks = [],
}: {
  text: string;
  marks?: readonly { start: number; end: number }[];
}) {
  return readingTextSections(text).map((section, index) => {
    const valid = marks
      .filter(
        (mark) =>
          mark.start >= 0 &&
          mark.end <= text.length &&
          mark.end > mark.start &&
          mark.start < section.end &&
          mark.end > section.start,
      )
      .sort((a, b) => a.start - b.start);
    let cursor = section.start;
    const parts = [];
    for (const mark of valid) {
      const start = Math.max(cursor, mark.start);
      const end = Math.min(section.end, mark.end);
      if (end <= start) continue;
      parts.push(text.slice(cursor, start));
      parts.push(
        <mark
          key={`${start}:${end}`}
          className="bg-amber-500/20 text-inherit underline decoration-amber-500 underline-offset-4"
        >
          {text.slice(start, end)}
        </mark>,
      );
      cursor = end;
    }
    parts.push(text.slice(cursor, section.end));
    return (
      <span key={section.start} data-reading-section="" data-reading-label={`Trecho ${index + 1}`}>
        {parts}
      </span>
    );
  });
}
