import type { PassageKnowledgeBundle } from "../../lib/domain/knowledge-bundle";
import type { WorkspacePassageKnowledgeItem } from "../../lib/domain/workspace-passage-knowledge";
import { hasAvailableData } from "../../lib/domain/availability";
import { VerseExplanations } from "./verse-explanations";
import { PrivateVerseKnowledge } from "./private-verse-knowledge";

/** One rendering path for inline and dock; review actions retain their canonical repositories. */
export function VerseCommentary({
  bundle,
  verse,
  items,
  sourceId,
  domain,
  open,
  onOpenChange,
  showEmpty = false,
}: {
  bundle: PassageKnowledgeBundle;
  verse: number;
  items: WorkspacePassageKnowledgeItem[];
  sourceId?: string;
  domain?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showEmpty?: boolean;
}) {
  const ref = bundle.identity.ref;
  const analyses = hasAvailableData(bundle.analyses) ? bundle.analyses.data : [];
  const claims = hasAvailableData(bundle.claims) ? bundle.claims.data : [];
  const matchingItems = items.filter(
    (item) =>
      (!sourceId || item.document.id === sourceId) &&
      (!domain ||
        item.proposals.some(
          (proposal) =>
            proposal.payload.kind === "topic-assignment" && proposal.payload.domain === domain,
        )),
  );
  const beginsHere = (anchor: (typeof claims)[number]["anchors"][number]) =>
    anchor.type === "passage" &&
    anchor.ref.bookId === ref.bookId &&
    anchor.ref.chapter === ref.chapter &&
    (anchor.ref.verseStart ?? 1) === verse;
  const hasEditorial =
    analyses.some((analysis) => beginsHere(analysis.anchor)) ||
    claims.some(
      (claim) =>
        !["textual-observation", "linguistic-analysis", "textual-critical-analysis"].includes(
          claim.kind,
        ) && claim.anchors.some(beginsHere),
    );
  return (
    <>
      <VerseExplanations
        bookId={ref.bookId}
        chapter={ref.chapter}
        verse={verse}
        analyses={analyses}
        claims={claims}
        sources={bundle.sources}
      />
      <PrivateVerseKnowledge
        bookId={ref.bookId}
        chapter={ref.chapter}
        verse={verse}
        items={matchingItems}
        open={open}
        onOpenChange={onOpenChange}
      />
      {showEmpty && !hasEditorial && !matchingItems.length && (
        <p className="text-sm text-muted-foreground">
          Sem comentário disponível para este versículo nos filtros atuais.
        </p>
      )}
    </>
  );
}
