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
import type { PassageRef } from "../domain/scripture";
import { passageRefsOverlap } from "../domain/scripture";
import { DEMO_CLAIMS, DEMO_ENTITIES, DEMO_RELATIONS } from "../fixtures/knowledge.fixture";

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
      (relation) =>
        (relation.from.type === "entity" && relation.from.entityId === entityId) ||
        (relation.to.type === "entity" && relation.to.entityId === entityId),
    );
  },

  relationsForPassage(ref: PassageRef): KnowledgeRelation[] {
    return DEMO_RELATIONS.filter(
      (relation) =>
        (relation.from.type === "passage" && passageRefsOverlap(relation.from.ref, ref)) ||
        (relation.to.type === "passage" && passageRefsOverlap(relation.to.ref, ref)),
    );
  },

  allRelations(): KnowledgeRelation[] {
    return DEMO_RELATIONS;
  },

  listClaims(): KnowledgeClaim[] {
    return DEMO_CLAIMS;
  },

  claimsForPassage(ref: PassageRef): KnowledgeClaim[] {
    return DEMO_CLAIMS.filter((claim) =>
      claim.anchors.some(
        (anchor) => anchor.type === "passage" && passageRefsOverlap(anchor.ref, ref),
      ),
    );
  },

  search(query: string): KnowledgeEntity[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return DEMO_ENTITIES.filter(
      (e) => e.name.toLowerCase().includes(q) || e.originalForm?.toLowerCase().includes(q),
    );
  },
};
