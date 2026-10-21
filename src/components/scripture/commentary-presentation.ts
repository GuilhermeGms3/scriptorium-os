import type { WorkspacePassageKnowledgeItem } from "../../lib/domain/workspace-passage-knowledge";

function passageWidth(item: WorkspacePassageKnowledgeItem): number {
  const address = item.passageRelation.payload.passage;
  return (address.verseEnd ?? address.verseStart ?? 0) - (address.verseStart ?? 0);
}

/**
 * A note that explains a wide stretch (more than seven verses) or a long patristic exposition: it
 * belongs to the chapter, not to each verse it touches.
 */
export function isBroadCommentary(item: WorkspacePassageKnowledgeItem): boolean {
  const scope = item.passageRelation.payload.relationScope;
  if (scope === "chapter" || scope === "book") return true;
  const analysis = item.passageRelation.payload.contextualAnalysis;
  const longPatristicContext =
    analysis?.sourceContext?.kind === "patristic-exposition" && analysis.summary.length > 1500;
  return passageWidth(item) > 6 || longPatristicContext;
}

export function belongsInChapterOverview(
  item: WorkspacePassageKnowledgeItem,
  summary: boolean,
): boolean {
  const scope = item.passageRelation.payload.relationScope;
  return scope === "chapter" || scope === "book" || (summary && isBroadCommentary(item));
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
