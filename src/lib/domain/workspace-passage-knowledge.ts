import type {
  KnowledgeProposal,
  KnowledgeProposalPayload,
  ReferenceRole,
  SemanticUnit,
} from "./document-knowledge";
import type { LocalTranslation, SemanticDomain } from "./semantic-content";

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

/** Whether any passage of the item's relation covers the given verse. */
export function knowledgeItemCoversVerse(
  item: WorkspacePassageKnowledgeItem,
  bookId: string,
  chapter: number,
  verse: number,
): boolean {
  const payload = item.passageRelation.payload;
  // A dictionary entry only mentions the verse; it belongs in the inspector, not under the verse.
  if (payload.referenceRole === "lexical-mention") return false;
  return [payload.passage, ...payload.additionalPassages].some((passage) => {
    if (passage.bookId !== bookId) return false;
    // Book/chapter relations belong in the contextual inspector, never duplicated below every verse.
    if (payload.relationScope === "book" || payload.relationScope === "chapter") return false;
    if (passage.chapter !== chapter) return false;
    if (passage.verseStart === undefined) return false;
    return passage.verseStart <= verse && (passage.verseEnd ?? passage.verseStart) >= verse;
  });
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
