/**
 * Scriptorium — Knowledge domain model.
 *
 * The beginning of the Knowledge Graph: typed entities, typed relations
 * (Knowledge Bridges) and an evidence-based claim model. Everything a
 * future engine says must remain traceable to sources.
 */

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
  /** For words: the original-language form (e.g. λόγος). */
  originalForm?: string;
  description?: string;
  /** Tradition/corpus scoping — an entity is never assumed universal. */
  traditionIds?: string[];
}

export type RelationKind =
  | "mentioned-in"
  | "authored"
  | "located-in"
  | "related-to"
  | "translated-as"
  | "used-in"
  | "attested-in"
  | "echoes"
  | "part-of";

/**
 * A Knowledge Bridge explains HOW two entities are related —
 * the edge is as important as the nodes.
 */
export interface KnowledgeRelation {
  id: string;
  fromId: string;
  toId: string;
  relation: RelationKind | string;
  description?: string;
  sourceIds: string[];
  confidence?: number; // 0..1
  evidenceType?: EvidenceClassification;
}

export type EvidenceClassification =
  | "textual"
  | "historical"
  | "archaeological"
  | "linguistic"
  | "traditional"
  | "theological"
  | "scholarly-hypothesis";

export interface KnowledgeClaim {
  id: string;
  proposition: string;
  classification: EvidenceClassification;
  sourceIds: string[];
  confidence?: number;
  traditionId?: string;
}
