import { BookMarked, ExternalLink, LockKeyhole } from "lucide-react";
import type { WorkspacePassageKnowledgeItem } from "../../lib/domain/workspace-passage-knowledge";

function containsVerse(
  item: WorkspacePassageKnowledgeItem,
  bookId: string,
  chapter: number,
  verse: number,
): boolean {
  const payload = item.passageRelation.payload;
  const passages = [payload.passage, ...payload.additionalPassages];
  return passages.some((passage) => {
    if (passage.bookId !== bookId) return false;
    if (payload.relationScope === "book") return true;
    if (passage.chapter !== chapter) return false;
    if (passage.verseStart === undefined) return true;
    return passage.verseStart <= verse && (passage.verseEnd ?? passage.verseStart) >= verse;
  });
}

export function PrivateVerseKnowledge({
  chapter,
  verse,
  items,
  sourceId,
  domain,
  bookId,
}: {
  bookId: string;
  chapter: number;
  verse: number;
  items: WorkspacePassageKnowledgeItem[];
  sourceId?: string;
  domain?: string;
}) {
  const matching = items.filter((item) => {
    if (!containsVerse(item, bookId, chapter, verse)) return false;
    if (sourceId && item.document.id !== sourceId) return false;
    if (
      domain &&
      !item.proposals.some(
        (proposal) =>
          proposal.payload.kind === "topic-assignment" && proposal.payload.domain === domain,
      )
    )
      return false;
    return true;
  });
  if (!matching.length) return null;
  return (
    <aside
      className="mb-5 ml-4 space-y-2 border-l-2 border-amber-500/30 pl-3"
      aria-label={`Conteúdo privado ligado ao versículo ${verse}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <BookMarked className="size-3.5" /> Biblioteca conectada
      </div>
      {matching.map((item) => {
        const topics = item.proposals.flatMap((proposal) =>
          proposal.payload.kind === "topic-assignment" ? [proposal.payload.domain] : [],
        );
        const machine = item.passageRelation.reviewStatus === "machine-proposed";
        return (
          <article key={item.id} className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium">{item.document.title}</p>
              <span className="inline-flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                <LockKeyhole className="size-3" /> páginas{" "}
                {item.pages.map((page) => page + 1).join(", ")}
              </span>
            </div>
            {(item.context.authors.length > 0 || item.context.sectionTitle) && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {item.context.authors.length
                  ? item.context.authors.join(", ")
                  : "Autor não catalogado"}
                {item.context.sectionTitle ? ` · ${item.context.sectionTitle}` : ""}
              </p>
            )}
            {topics.length > 0 && (
              <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">
                {[...new Set(topics)].join(" · ")}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-foreground/90">
              {item.translation?.translatedText ?? item.unit.text}
            </p>
            {item.context.attributions.length > 0 && (
              <details className="mt-2 text-[10px] text-muted-foreground">
                <summary className="cursor-pointer">Atribuições detectadas</summary>
                <ul className="mt-1 space-y-1">
                  {item.context.attributions.map((value, index) => (
                    <li key={`${item.id}:attribution:${index}`}>{value}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[9px] text-muted-foreground">
                {machine ? "Ligação inferida · lote auditado" : "Ligação revisada"} ·{" "}
                {item.passageRelation.payload.relationType}
              </p>
              <a
                href={`/library/document/${encodeURIComponent(item.document.id)}?page=${(item.pages[0] ?? 0) + 1}`}
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                Abrir fonte <ExternalLink className="size-3" />
              </a>
            </div>
          </article>
        );
      })}
    </aside>
  );
}
