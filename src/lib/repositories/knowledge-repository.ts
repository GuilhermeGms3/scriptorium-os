/**
 * KnowledgeRepository — Knowledge Graph access seam. Currently a flat
 * fixture store; a graph engine (local or remote) can replace it later.
 */

import type {
  EntityType,
  KnowledgeClaim,
  KnowledgeEntity,
  KnowledgeRelation,
} from "../domain/knowledge";
import {
  DEMO_BRIDGE_CHAIN,
  DEMO_CLAIMS,
  DEMO_ENTITIES,
  DEMO_RELATIONS,
} from "../fixtures/knowledge.fixture";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: "Person",
  place: "Place",
  event: "Event",
  passage: "Passage",
  work: "Work",
  concept: "Concept",
  word: "Word",
  manuscript: "Manuscript",
  "historical-source": "Historical Source",
};

export const KnowledgeRepository = {
  listEntities(type?: EntityType): KnowledgeEntity[] {
    return type ? DEMO_ENTITIES.filter((e) => e.type === type) : DEMO_ENTITIES;
  },

  getEntity(id: string): KnowledgeEntity | null {
    return DEMO_ENTITIES.find((e) => e.id === id) ?? null;
  },

  relationsOf(entityId: string): KnowledgeRelation[] {
    return DEMO_RELATIONS.filter(
      (r) => r.fromId === entityId || r.toId === entityId,
    );
  },

  allRelations(): KnowledgeRelation[] {
    return DEMO_RELATIONS;
  },

  listClaims(): KnowledgeClaim[] {
    return DEMO_CLAIMS;
  },

  /** The curated demo bridge chain (John 1:1 → λόγος → … → Genesis). */
  demoBridgeChain() {
    return DEMO_BRIDGE_CHAIN;
  },

  search(query: string): KnowledgeEntity[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return DEMO_ENTITIES.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.originalForm?.toLowerCase().includes(q),
    );
  },
};
