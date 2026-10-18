import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import type { GuidePassage } from "../../lib/content/study-guides";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";

export function TopicPassageReading({ passage }: { passage: GuidePassage }) {
  const [open, setOpen] = useState(false);
  const query = useWorkspaceQuery(
    ["topic-passage", passage.book, passage.chapter],
    () =>
      ScriptureKnowledgeEngine.loadPassageKnowledgeBundle({
        bookId: passage.book,
        chapter: passage.chapter,
      }),
    { enabled: open },
  );
  const bundle = query.data;
  const edition =
    bundle?.passage.editions.find((item) => item.language === "pt-BR" || item.language === "pt") ??
    bundle?.passage.editions.find((item) => item.kind === "translation");
  const verses = bundle?.passage.verses.slice(0, 3) ?? [];
  return (
    <details className="topic-passage" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <BookOpen className="size-4" />
        {passage.label}
        <span className="ml-auto text-xs text-muted-foreground">Abrir leitura de partida</span>
      </summary>
      {query.isPending && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Abrindo o texto instalado…
        </p>
      )}
      {query.error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Não foi possível abrir o texto.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {bundle && edition && (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            {edition.title} · abertura do capítulo, versículos {verses[0]?.verse}–
            {verses[verses.length - 1]?.verse}
          </p>
          <blockquote className="reading-text my-4">
            {verses.map((verse) => (
              <p key={verse.verse}>
                <sup className="mr-2 font-mono text-xs text-primary">{verse.verse}</sup>
                {verse.translations[edition.id]}
              </p>
            ))}
          </blockquote>
        </>
      )}
      {!query.isPending && !query.error && (!bundle || !edition) && (
        <p className="mt-4 text-sm text-muted-foreground">
          Texto não disponível nas edições instaladas.
        </p>
      )}
      <Link
        to="/scripture/$book/$chapter"
        params={{ book: passage.book, chapter: String(passage.chapter) }}
        className="mt-4 inline-flex text-sm text-primary hover:underline"
      >
        Ler o capítulo completo →
      </Link>
    </details>
  );
}
