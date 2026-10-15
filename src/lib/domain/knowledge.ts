/** Evidence-aware knowledge contracts. Structured observations stay in scripture models. */

import { passageRefKey, type PassageRef } from "./scripture";
import { textAnchorKey, type TextAnchor as CanonicalTextAnchor } from "./text-identity";
import type { Provenance } from "./source";

export const ENTITY_TYPES = [
  "person",
  "place",
  "event",
  "passage",
  "work",
  "concept",
  "word",
  "manuscript",
  "historical-source",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export interface KnowledgeEntity {
  id: string;
  type: EntityType;
  name: string;
  originalForm?: string;
  description?: string;
  traditionIds?: string[];
}

export type TextAnchor =
  | { type: "canonical-text"; anchor: CanonicalTextAnchor }
  | { type: "passage"; ref: PassageRef }
  | { type: "text-unit"; textUnitId: string }
  | { type: "token"; tokenId: string }
  | { type: "lemma"; lemmaId: string }
  | { type: "work"; workId: string }
  | { type: "entity"; entityId: string };

export function anchorKey(anchor: TextAnchor): string {
  switch (anchor.type) {
    case "canonical-text":
      return textAnchorKey(anchor.anchor);
    case "passage":
      return `passage:${passageRefKey(anchor.ref)}`;
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

export const CLAIM_KINDS = [
  "textual-observation",
  "historical-source-observation",
  "linguistic-analysis",
  "textual-critical-analysis",
  "historical-reconstruction",
  "exegetical-interpretation",
  "theological-interpretation",
  "symbolic-interpretation",
  "mystical-tradition",
  "philosophical-analysis",
  "reception-history",
  "academic-hypothesis",
  "speculation",
] as const;

export type ClaimKind = (typeof CLAIM_KINDS)[number];

export const KNOWLEDGE_ORIGINS = [
  "source-derived",
  "editorial",
  "user",
  "machine-assisted",
  "ai-generated",
] as const;

export type KnowledgeOrigin = (typeof KNOWLEDGE_ORIGINS)[number];

export const REVIEW_STATUSES = [
  "imported",
  "machine-linked",
  "source-checked",
  "draft",
  "reviewed",
  "verified",
  "disputed",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const SUPPORT_LEVELS = [
  "direct",
  "strong",
  "moderate",
  "weak",
  "disputed",
  "unknown",
] as const;

export type SupportLevel = (typeof SUPPORT_LEVELS)[number];

export interface EvidenceLink {
  kind: EvidenceKind;
  sourceFragmentIds: string[];
  supportLevel: SupportLevel;
  assessmentNote?: string;
}

export const RELATION_KINDS = [
  "mentioned-in",
  "contains-occurrence-of",
  "authored",
  "located-in",
  "related-to",
  "translated-as",
  "used-in",
  "attested-in",
  "echoes",
  "part-of",
] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

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
  /** @deprecated Use perspectiveProfileIds with explicit association kinds. */
  perspectiveId?: string;
  perspectiveProfileIds?: string[];
  supportLevel: SupportLevel;
  assessmentNote?: string;
  /** @deprecated Numeric confidence implies false precision; do not use for new records. */
  confidence?: number;
}
