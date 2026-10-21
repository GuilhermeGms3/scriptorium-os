import type {
  KnowledgeProposal,
  KnowledgeProposalPayload,
  ReferenceRole,
  SemanticUnit,
} from "./document-knowledge";
import type { LocalTranslation, SemanticDomain } from "./semantic-content";
import { noteTargets, targetCoversVerse, targetIsChapterContext } from "./note-placement";

/**
 * confirmed: a person accepted the link; auto-visible: the pipeline published it and nobody has
 * reviewed it yet; pending: detected by the analyzer and still awaiting any decision.
 */
export type PassageLinkReviewState = "confirmed" | "auto-visible" | "pending";

export interface WorkspacePassageKnowledgeItem {
  id: string;
  reviewState: PassageLinkReviewState;
  document: {
    id: string;
    sourceId: string;
    title: string;
    language?: string;
  };
  unit: SemanticUnit;
  passageRelation: KnowledgeProposal & {
    payload: Extract<KnowledgeProposalPayload, { kind: "passage-relation" }>;
  };
  proposals: KnowledgeProposal[];
  translation: LocalTranslation | null;
  pages: number[];
  context: {
    sectionTitle?: string;
    authors: string[];
    attributions: string[];
    citations: string[];
    methods: string[];
    perspectiveProfileIds: string[];
  };
}

export const PASSAGE_COVERAGE_AREAS = [
  "text",
  "textual-criticism",
  "linguistics",
  "exegesis",
  "hermeneutics",
  "historical-context",
  "political-history",
  "archaeology",
  "geography",
  "tradition",
  "theology",
  "soteriology",
  "eschatology",
  "reception-history",
  "religious-currents",
] as const;

export type PassageCoverageArea = (typeof PASSAGE_COVERAGE_AREAS)[number];
export type PassageCoverageStatus = "available" | "private" | "in-review" | "missing";

export interface PassageCoverageEntry {
  area: PassageCoverageArea;
  status: PassageCoverageStatus;
  sourceCount: number;
}

export interface WorkspacePassageKnowledgeLayer {
  items: WorkspacePassageKnowledgeItem[];
  coverage: PassageCoverageEntry[];
}

/** Only published, source-backed contexts. Pending detections are not explanations. */
export function chapterContextItems(items: readonly WorkspacePassageKnowledgeItem[]) {
  return items
    .filter(
      (item) =>
        item.reviewState !== "pending" &&
        item.passageRelation.payload.contextualAnalysis?.mode === "source-excerpt" &&
        (item.passageRelation.payload.contextualAnalysis.sourceVisual ||
          item.proposals.some(
            (proposal) =>
              proposal.payload.kind === "topic-assignment" &&
              ["geography", "archaeology", "historical-context"].includes(proposal.payload.domain),
          )),
    )
    .sort(
      (a, b) =>
        Number(Boolean(b.passageRelation.payload.contextualAnalysis?.sourceVisual)) -
          Number(Boolean(a.passageRelation.payload.contextualAnalysis?.sourceVisual)) ||
        a.document.title.localeCompare(b.document.title, "pt-BR") ||
        (a.pages[0] ?? 0) - (b.pages[0] ?? 0),
    );
}

export const COVERAGE_LABELS: Record<PassageCoverageArea, string> = {
  text: "Texto",
  "textual-criticism": "Crítica textual",
  linguistics: "Linguística",
  exegesis: "Exegese",
  hermeneutics: "Hermenêutica",
  "historical-context": "Contexto histórico",
  "political-history": "Política local",
  archaeology: "Arqueologia",
  geography: "Geografia",
  tradition: "Tradição",
  theology: "Teologia",
  soteriology: "Soteriologia",
  eschatology: "Escatologia",
  "reception-history": "História da recepção",
  "religious-currents": "Correntes religiosas",
};

/** Whether the item belongs under this verse (see note-placement.ts, shared with Android). */
export function knowledgeItemCoversVerse(
  item: WorkspacePassageKnowledgeItem,
  bookId: string,
  chapter: number,
  verse: number,
): boolean {
  return noteTargets(item.passageRelation.payload).some((target) =>
    targetCoversVerse(target, bookId, chapter, verse),
  );
}

/** Whether the item speaks of the whole chapter or book: shown once, in the chapter panorama. */
export function knowledgeItemIsChapterContext(
  item: WorkspacePassageKnowledgeItem,
  bookId: string,
  chapter: number,
): boolean {
  return noteTargets(item.passageRelation.payload).some((target) =>
    targetIsChapterContext(target, bookId, chapter),
  );
}

export const REFERENCE_ROLE_LABELS: Record<ReferenceRole, string> = {
  "lexical-mention": "Menção lexical",
  intertextual: "Eco intertextual",
  "proof-text": "Texto-prova",
};

export const PASSAGE_KNOWLEDGE_GROUPS = ["library", "reference-works", "primary-sources"] as const;
export type PassageKnowledgeGroup = (typeof PASSAGE_KNOWLEDGE_GROUPS)[number];

export const PASSAGE_KNOWLEDGE_GROUP_LABELS: Record<PassageKnowledgeGroup, string> = {
  library: "Livros da biblioteca",
  "reference-works": "Dicionários e léxicos",
  "primary-sources": "Fontes primárias",
};

/** Inspector group of a linked passage, from how its book uses the reference. */
export function passageKnowledgeGroup(item: WorkspacePassageKnowledgeItem): PassageKnowledgeGroup {
  const role = item.passageRelation.payload.referenceRole;
  if (role === "lexical-mention") return "reference-works";
  if (role === "intertextual") return "primary-sources";
  return "library";
}

export function semanticDomainCoverage(domain: SemanticDomain): PassageCoverageArea | null {
  if (domain === "patristics" || domain === "liturgy") return "tradition";
  if (domain === "social-history") return "historical-context";
  if (domain === "philosophy-of-religion" || domain === "science" || domain === "other")
    return null;
  return domain;
}
