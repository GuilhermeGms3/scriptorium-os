import type { WorkspacePassageKnowledgeItem } from "../../lib/domain/workspace-passage-knowledge";
import { knowledgeItemIsChapterContext } from "../../lib/domain/workspace-passage-knowledge";

function passageWidth(item: WorkspacePassageKnowledgeItem): number {
  const address = item.passageRelation.payload.passage;
  return (address.verseEnd ?? address.verseStart ?? 0) - (address.verseStart ?? 0);
}

/**
 * A note that explains a wide stretch (more than seven verses) or a long patristic exposition: it
 * belongs to the chapter, not to each verse it touches.
 */
export function isBroadCommentary(item: WorkspacePassageKnowledgeItem): boolean {
  const analysis = item.passageRelation.payload.contextualAnalysis;
  const longPatristicContext =
    analysis?.sourceContext?.kind === "patristic-exposition" && analysis.summary.length > 1500;
  return passageWidth(item) > 6 || longPatristicContext;
}

/** What a library note is and how it was linked, in the words shown under it on screen and paper. */
export function commentaryProvenance(item: WorkspacePassageKnowledgeItem): string {
  const payload = item.passageRelation.payload;
  const analysis = payload.contextualAnalysis;
  const kind =
    analysis?.mode === "source-excerpt"
      ? payload.referenceRole === "proof-text"
        ? `Texto confessional original · ${analysis.sourceContext?.traditionLabel ?? "tradição da fonte"} · citação, não exegese universal`
        : "Comentário original da fonte"
      : analysis
        ? "Síntese contextual assistida"
        : "Trecho literal da fonte";
  return `${kind} · ${
    item.reviewState === "confirmed"
      ? "ligação confirmada"
      : "ligação automática, não é interpretação revisada"
  }`;
}

export function belongsInChapterOverview(
  item: WorkspacePassageKnowledgeItem,
  summary: boolean,
  bookId: string,
  chapter: number,
): boolean {
  if (item.passageRelation.payload.referenceRole === "lexical-mention") return false;
  return (
    knowledgeItemIsChapterContext(item, bookId, chapter) || (summary && isBroadCommentary(item))
  );
}

/** Contextual notes first by how narrowly they speak of the verse, then by source and page. */
export function contextualCommentary(
  items: readonly WorkspacePassageKnowledgeItem[],
): WorkspacePassageKnowledgeItem[] {
  // A detected cross-reference is not automatically commentary on this verse.
  return items
    .filter((item) => item.passageRelation.payload.contextualAnalysis)
    .sort(
      (a, b) =>
        passageWidth(a) - passageWidth(b) ||
        a.document.title.localeCompare(b.document.title, "pt-BR") ||
        (a.pages[0] ?? 0) - (b.pages[0] ?? 0) ||
        (a.unit.spans[0]?.startOffset ?? 0) - (b.unit.spans[0]?.startOffset ?? 0),
    );
}
