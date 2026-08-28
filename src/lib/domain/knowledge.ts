/** Evidence-aware knowledge contracts. Structured observations stay in scripture models. */

import type { PassageRef } from "./scripture";
import type { Provenance } from "./source";

export type EntityType =
  | "person"
  | "place"
  | "event"
  | "passage"
  | "work"
  | "concept"
  | "word"
  | "manuscript"
  | "historical-source";

export interface KnowledgeEntity {
  id: string;
  type: EntityType;
  name: string;
  originalForm?: string;
  description?: string;
  traditionIds?: string[];
}

export type TextAnchor =
  | { type: "passage"; ref: PassageRef }
  | { type: "text-unit"; textUnitId: string }
  | { type: "token"; tokenId: string }
  | { type: "lemma"; lemmaId: string }
  | { type: "work"; workId: string }
  | { type: "entity"; entityId: string };

export function anchorKey(anchor: TextAnchor): string {
  switch (anchor.type) {
    case "passage":
      return `passage:${anchor.ref.bookId}.${anchor.ref.chapter}.${anchor.ref.verseStart ?? "*"}-${anchor.ref.verseEnd ?? anchor.ref.verseStart ?? "*"}`;
    case "text-unit":
      return `text-unit:${anchor.textUnitId}`;
    case "token":
      return `token:${anchor.tokenId}`;
    case "lemma":
      return `lemma:${anchor.lemmaId}`;
    case "work":
      return `work:${anchor.workId}`;
    case "entity":
      return `entity:${anchor.entityId}`;
  }
}

export type EvidenceKind =
  "textual" | "linguistic" | "historical" | "archaeological" | "traditional" | "theological";

/** @deprecated Use EvidenceKind; retained as an import bridge for older components. */
export type EvidenceClassification = EvidenceKind;

export type ClaimKind =
  | "linguistic-analysis"
  | "textual-critical-analysis"
  | "historical-reconstruction"
  | "exegetical-interpretation"
  | "theological-interpretation"
  | "symbolic-interpretation"
  | "mystical-tradition"
  | "philosophical-analysis"
  | "reception-history"
  | "academic-hypothesis"
  | "speculation";

export type KnowledgeOrigin =
  "source-derived" | "editorial" | "user" | "machine-assisted" | "ai-generated";

export type ReviewStatus =
  "imported" | "machine-linked" | "draft" | "reviewed" | "verified" | "disputed";

export type SupportLevel = "direct" | "strong" | "moderate" | "weak" | "disputed" | "unknown";

export interface EvidenceLink {
  kind: EvidenceKind;
  sourceFragmentIds: string[];
  supportLevel: SupportLevel;
  assessmentNote?: string;
}

export type RelationKind =
  | "mentioned-in"
  | "contains-occurrence-of"
  | "authored"
  | "located-in"
  | "related-to"
  | "translated-as"
  | "used-in"
  | "attested-in"
  | "echoes"
  | "part-of";

export type RelationType =
  { kind: "known"; value: RelationKind } | { kind: "custom"; value: string };

export interface KnowledgeRelation {
  id: string;
  from: TextAnchor;
  to: TextAnchor;
  relation: RelationType;
  description?: string;
  evidence: EvidenceLink[];
  sourceFragmentIds: string[];
  perspectiveId?: string;
  reviewStatus: ReviewStatus;
  provenance: Provenance;
}

export interface KnowledgeClaim {
  id: string;
  proposition: string;
  anchors: TextAnchor[];
  kind: ClaimKind;
  evidence: EvidenceLink[];
  sourceFragmentIds: string[];
  origin: KnowledgeOrigin;
  reviewStatus: ReviewStatus;
  perspectiveId?: string;
  supportLevel: SupportLevel;
  assessmentNote?: string;
  /** @deprecated Numeric confidence implies false precision; do not use for new records. */
  confidence?: number;
}
