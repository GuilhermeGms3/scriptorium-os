import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import type { CoursePassage } from "../../lib/domain/study-course";

export function CoursePassageReading({
  passage,
  checked,
  onCheck,
  disabled = false,
}: {
  passage: CoursePassage;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const query = useWorkspaceQuery(
    ["course-scripture", passage.ref],
    () => ScriptureKnowledgeEngine.loadPassageKnowledgeBundle(passage.ref),
    { enabled: open },
  );
  const bundle = query.data;
  const editions = bundle?.passage.editions.filter((item) => item.kind === "translation") ?? [];
  const [selected, setSelected] = useState("");
  const edition = editions.find((item) => item.id === selected) ?? editions[0];
  const verses =
    bundle?.passage.verses.filter(
      (item) =>
        item.verse >= (passage.ref.verseStart ?? 1) &&
        item.verse <= (passage.ref.verseEnd ?? Infinity),
    ) ?? [];
  const available = Boolean(
    edition && verses.length && verses.every((verse) => verse.translations[edition!.id]),
  );
  return (
    <details
      className="course-passage"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        {passage.label}
        <span>Texto e contexto</span>
      </summary>
      <p className="course-purpose">{passage.purpose}</p>
      {query.isPending && <p role="status">Abrindo a passagem…</p>}
      {query.isError && (
        <p role="alert">
          Não foi possível abrir o texto.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {available && edition ? (
        <>
          <label className="course-edition">
            Edição
            <select value={edition.id} onChange={(event) => setSelected(event.target.value)}>
              {editions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <blockquote className="course-scripture" lang={edition.language}>
            {verses.map((verse) => (
              <p key={verse.verse}>
                <sup>{verse.verse}</sup>
                {verse.translations[edition.id]}
              </p>
            ))}
          </blockquote>
        </>
      ) : (
        !query.isPending &&
        !query.isError && <p>Esta passagem não está disponível nas traduções instaladas.</p>
      )}
      <div className="course-source-actions">
        <Link
          to="/scripture/$book/$chapter"
          params={{ book: passage.ref.bookId, chapter: String(passage.ref.chapter) }}
          hash={`verse-${passage.ref.verseStart ?? 1}`}
        >
          Abrir nas Escrituras →
        </Link>
        <Link
          to="/trace"
          search={{
            state: "all",
            offset: 0,
            view: "research",
            q: `${passage.ref.bookId} ${passage.ref.chapter}:${passage.ref.verseStart ?? 1}`,
          }}
        >
          Rastro da passagem →
        </Link>
      </div>
      {onCheck && (
        <label className="course-check">
          <input
            type="checkbox"
            checked={checked ?? false}
            disabled={disabled || (!available && !checked)}
            onChange={(event) => onCheck(event.target.checked)}
          />
          Li {passage.label} e conferi a edição.
        </label>
      )}
    </details>
  );
}
