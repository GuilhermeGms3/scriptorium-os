import type { PassageAnalysis } from "./analysis";
import { hasAvailableData } from "./availability";
import type { KnowledgeClaim, TextAnchor } from "./knowledge";
import type { PassageKnowledgeBundle } from "./knowledge-bundle";
import { passageRefsOverlap, type PassageRef, type TokenOccurrence } from "./scripture";
import { SEMANTIC_DOMAIN_LABELS } from "./semantic-content";
import type { Note } from "./study";
import {
  knowledgeItemCoversVerse,
  type WorkspacePassageKnowledgeItem,
} from "./workspace-passage-knowledge";

export type ExplorationArea = "language" | "context" | "interpretation" | "investigation";
export const EXPLORATION_AREA_LABELS: Record<ExplorationArea, string> = {
  language: "Texto e linguagem",
  context: "Contexto",
  interpretation: "Interpretação",
  investigation: "Sua investigação",
};
interface BlockIdentity {
  id: string;
  title: string;
  category: string;
  area: ExplorationArea;
  preview: string;
}
export type VerseExplorationBlock = BlockIdentity &
  (
    | {
        kind: "library";
        item: WorkspacePassageKnowledgeItem;
        items: WorkspacePassageKnowledgeItem[];
      }
    | { kind: "analysis"; analysis: PassageAnalysis }
    | { kind: "claim"; claim: KnowledgeClaim }
    | { kind: "language"; tokens: TokenOccurrence[] }
    | { kind: "note"; note: Note }
  );

/** Explicit anchors only: a related entity or a chapter panorama is not verse commentary. */
function covers(anchor: TextAnchor, ref: PassageRef): boolean {
  return (
    anchor.type === "passage" &&
    anchor.ref.verseStart !== undefined &&
    passageRefsOverlap(anchor.ref, ref)
  );
}

function analysisArea(analysis: PassageAnalysis): ExplorationArea {
  if (["textual", "philological"].includes(analysis.lensId)) return "language";
  if (["historical", "history-of-religions", "scientific"].includes(analysis.lensId))
    return "context";
  return "interpretation";
}

function claimArea(claim: KnowledgeClaim): ExplorationArea {
  if (
    ["textual-observation", "linguistic-analysis", "textual-critical-analysis"].includes(claim.kind)
  )
    return "language";
  if (["historical-source-observation", "historical-reconstruction"].includes(claim.kind))
    return "context";
  return "interpretation";
}

export function libraryExplorationCategory(item: WorkspacePassageKnowledgeItem): {
  category: string;
  area: ExplorationArea;
} {
  const analysis = item.passageRelation.payload.contextualAnalysis;
  const topic = item.proposals.find(
    (proposal) =>
      proposal.reviewStatus !== "rejected" && proposal.payload.kind === "topic-assignment",
  );
  if (topic?.payload.kind === "topic-assignment") {
    const domain = topic.payload.domain;
    const area: ExplorationArea = ["linguistics", "textual-criticism"].includes(domain)
      ? "language"
      : [
            "historical-context",
            "social-history",
            "political-history",
            "archaeology",
            "geography",
          ].includes(domain)
        ? "context"
        : "interpretation";
    return { category: SEMANTIC_DOMAIN_LABELS[domain], area };
  }
  if (analysis?.contentType === "historical-context")
    return { category: "Contexto histórico", area: "context" };
  if (analysis?.contentType === "exegetical-note")
    return { category: "Exegese", area: "interpretation" };
  if (item.passageRelation.payload.referenceRole === "proof-text")
    return { category: "Leitura confessional", area: "interpretation" };
  return { category: analysis ? "Comentário" : "Trecho relacionado", area: "interpretation" };
}

/** One projection per loaded chapter. No requests per verse, invented categories, or fixed chain. */
export function buildVerseExploration(
  bundle: Pick<
    PassageKnowledgeBundle,
    "identity" | "passage" | "analyses" | "claims" | "provenance"
  >,
  items: readonly WorkspacePassageKnowledgeItem[],
  notes: readonly Note[],
): Map<number, VerseExplorationBlock[]> {
  const analyses =
    hasAvailableData(bundle.analyses) && bundle.analyses.status !== "demo"
      ? bundle.analyses.data
      : [];
  const claims =
    hasAvailableData(bundle.claims) && bundle.claims.status !== "demo" ? bundle.claims.data : [];
  return new Map(
    bundle.passage.verses.map((verse) => {
      const ref: PassageRef = {
        ...bundle.identity.ref,
        verseStart: verse.verse,
        verseEnd: verse.verse,
      };
      const blocks: VerseExplorationBlock[] = [];
      const seen = new Set<string>();
      const sourceGroups = new Map<string, Extract<VerseExplorationBlock, { kind: "library" }>>();
      for (const item of items) {
        if (
          seen.has(item.id) ||
          !item.passageRelation.payload.contextualAnalysis ||
          !knowledgeItemCoversVerse(item, ref.bookId, ref.chapter, verse.verse)
        )
          continue;
        seen.add(item.id);
        const analysis = item.passageRelation.payload.contextualAnalysis;
        const category = libraryExplorationCategory(item);
        const groupKey = `${item.document.id}:${category.category}`;
        const group = sourceGroups.get(groupKey);
        if (group) {
          group.items.push(item);
          group.title = item.document.title;
          group.preview = `${group.items.length} trechos vinculados`;
          continue;
        }
        const block: Extract<VerseExplorationBlock, { kind: "library" }> = {
          id: `library:${groupKey}`,
          kind: "library",
          item,
          items: [item],
          ...category,
          title: analysis?.title ?? item.context.sectionTitle ?? item.document.title,
          preview: item.document.title,
        };
        sourceGroups.set(groupKey, block);
        blocks.push(block);
      }
      for (const analysis of analyses) {
        if (
          analysis.status === "placeholder" ||
          !analysis.summary?.trim() ||
          !covers(analysis.anchor, ref)
        )
          continue;
        blocks.push({
          id: `analysis:${analysis.id}`,
          kind: "analysis",
          analysis,
          title: analysis.title,
          preview: analysis.summary,
          area: analysisArea(analysis),
          category: "Análise da passagem",
        });
      }
      for (const claim of claims) {
        if (!claim.proposition.trim() || !claim.anchors.some((anchor) => covers(anchor, ref)))
          continue;
        blocks.push({
          id: `claim:${claim.id}`,
          kind: "claim",
          claim,
          title: claim.proposition,
          preview: "Afirmação e fundamentação",
          area: claimArea(claim),
          category: "Afirmação do acervo",
        });
      }
      const tokens = verse.original ?? [];
      if (tokens.length && !bundle.provenance.isDemo)
        blocks.push({
          id: `language:${verse.verse}`,
          kind: "language",
          tokens,
          area: "language",
          category: "Texto e linguagem",
          title: "Palavras do texto original",
          preview: tokens
            .slice(0, 5)
            .map((token) => token.surface)
            .join(" · "),
        });
      for (const note of notes) {
        if (!note.links.some((link) => link.anchor && covers(link.anchor, ref))) continue;
        blocks.push({
          id: `note:${note.id}`,
          kind: "note",
          note,
          area: "investigation",
          category: "Sua investigação",
          title: note.title || "Nota da passagem",
          preview: note.body,
        });
      }
      return [verse.verse, blocks];
    }),
  );
}
