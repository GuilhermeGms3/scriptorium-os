export type NoteFormat = "bold" | "italic" | "heading" | "list" | "quote";
export function formatNoteSelection(body: string, start: number, end: number, format: NoteFormat) {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    end > body.length
  )
    throw new Error("Seleção inválida.");
  const selected = body.slice(start, end);
  const marker = format === "bold" ? "**" : format === "italic" ? "*" : null;
  if (marker)
    return {
      body: body.slice(0, start) + marker + selected + marker + body.slice(end),
      start: start + marker.length,
      end: end + marker.length,
    };
  const prefix = format === "heading" ? "## " : format === "list" ? "- " : "> ";
  const inserted =
    (start > 0 && body[start - 1] !== "\n" ? "\n" : "") +
    selected
      .split("\n")
      .map((line) => prefix + line)
      .join("\n");
  return {
    body: body.slice(0, start) + inserted + body.slice(end),
    start: start + inserted.length,
    end: start + inserted.length,
  };
}
