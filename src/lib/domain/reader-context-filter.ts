import type { WorkspacePassageKnowledgeItem } from "./workspace-passage-knowledge";

export interface ReaderContextFilter {
  tradition: string;
  kind: "all" | "commentary" | "confessional";
  domain?: string;
  source?: string;
}
export function itemTradition(item: WorkspacePassageKnowledgeItem): string | undefined {
  const declared = item.passageRelation.payload.contextualAnalysis?.sourceContext?.traditionLabel;
  if (declared) return declared;
  // Edition-pinned editorial orientation: the installed PDF explicitly identifies
  // its Reformed study project on physical page 8. This is not each author's identity.
  if (
    item.document.id ===
    "private-document:504c2c2665f24c40bf29287605cacc5f1e81e05206fcd4c6452a0fab9cd7bc6c"
  )
    return "Reformada · perfil editorial da fonte";
  return undefined;
}
/** Filtering does not rewrite a source in another tradition's voice. Unclassified is not universal. */
export function readerContextMatches(
  item: WorkspacePassageKnowledgeItem,
  filter: ReaderContextFilter,
): boolean {
  if (filter.source && filter.source !== item.document.id) return false;
  if (
    filter.domain &&
    !item.proposals.some(
      (proposal) =>
        proposal.payload.kind === "topic-assignment" && proposal.payload.domain === filter.domain,
    )
  )
    return false;
  if (filter.tradition && itemTradition(item) !== filter.tradition) return false;
  const confessional = item.passageRelation.payload.referenceRole === "proof-text";
  return filter.kind === "all" || (filter.kind === "confessional" ? confessional : !confessional);
}
