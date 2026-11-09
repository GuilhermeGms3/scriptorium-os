import { Fragment, type ReactNode } from "react";
import { wikiReferences, type NoteTarget } from "../../lib/domain/note-document";

/** A deliberately small, safe Markdown subset: never interprets HTML or arbitrary URLs. */
export function NoteMarkdown({
  body,
  notes,
  onOpen,
}: {
  body: string;
  notes: readonly NoteTarget[];
  /** Without it (on paper) a link to another note is just its title. */
  onOpen?: (id: string) => void;
}) {
  function inline(text: string): ReactNode[] {
    const references = wikiReferences(text, notes);
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (const ref of references) {
      parts.push(...format(text.slice(cursor, ref.index), cursor));
      parts.push(
        ref.targetId && !onOpen ? (
          <span key={`ref${ref.index}`} className="font-medium">
            {ref.label}
          </span>
        ) : ref.targetId && onOpen ? (
          <button
            key={`ref${ref.index}`}
            type="button"
            className="text-primary underline decoration-primary/50 underline-offset-4 hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpen(ref.targetId!)}
          >
            {ref.label}
          </button>
        ) : (
          <span
            key={`ref${ref.index}`}
            className="border-b border-dashed border-muted-foreground"
            title="Nota não encontrada ou título ambíguo. Use Inserir link para escolher o destino."
          >
            {ref.label}
          </span>
        ),
      );
      cursor = ref.index + ref.raw.length;
    }
    parts.push(...format(text.slice(cursor), cursor));
    return parts;
  }
  function format(text: string, offset: number): ReactNode[] {
    return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, index) =>
      part.startsWith("`") ? (
        <code
          key={`text-${offset}-${index}`}
          className="rounded bg-muted px-1 font-mono text-[.85em]"
        >
          {part.slice(1, -1)}
        </code>
      ) : part.startsWith("**") ? (
        <strong key={`text-${offset}-${index}`}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("*") ? (
        <em key={`text-${offset}-${index}`}>{part.slice(1, -1)}</em>
      ) : (
        <Fragment key={`text-${offset}-${index}`}>{part}</Fragment>
      ),
    );
  }
  const lines = body.split("\n");
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (line.startsWith("```")) {
      const code: string[] = [];
      while (++index < lines.length && !lines[index]?.startsWith("```"))
        code.push(lines[index] ?? "");
      blocks.push(
        <pre key={index} className="overflow-x-auto rounded bg-muted p-4 font-mono text-sm">
          <code>{code.join("\n")}</code>
        </pre>,
      );
    } else if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = inline(line.slice(level + 1));
      blocks.push(
        level === 1 ? (
          <h2 key={index} className="mt-7 text-2xl font-semibold">
            {text}
          </h2>
        ) : level === 2 ? (
          <h3 key={index} className="mt-6 text-xl font-semibold">
            {text}
          </h3>
        ) : (
          <h4 key={index} className="mt-4 text-lg font-semibold">
            {text}
          </h4>
        ),
      );
    } else if (/^[-*] /.test(line)) {
      const items = [line];
      while (/^[-*] /.test(lines[index + 1] ?? "")) items.push(lines[++index]!);
      blocks.push(
        <ul key={index} className="list-disc pl-6">
          {items.map((item, i) => (
            <li key={i}>{inline(item.slice(2))}</li>
          ))}
        </ul>,
      );
    } else if (line.startsWith("> "))
      blocks.push(
        <blockquote key={index} className="border-l-2 border-primary/50 pl-4 text-muted-foreground">
          {inline(line.slice(2))}
        </blockquote>,
      );
    else if (line.trim()) {
      const paragraph = [line];
      while (lines[index + 1]?.trim() && !/^(#{1,3} |[-*] |> |```)/.test(lines[index + 1]!))
        paragraph.push(lines[++index]!);
      blocks.push(
        <p key={index} className="whitespace-pre-wrap">
          {inline(paragraph.join("\n"))}
        </p>,
      );
    }
  }
  return (
    <div className="flex flex-col gap-5 font-serif text-lg leading-[1.85] break-words">
      {blocks.length ? (
        blocks
      ) : (
        <p className="text-muted-foreground">
          Esta página ainda está em branco. Escolha Escrever para começar.
        </p>
      )}
    </div>
  );
}
