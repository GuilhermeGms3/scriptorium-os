/**
 * ============================================================================
 * DEMO / SEED DATA — Knowledge Graph fixtures
 * ============================================================================
 * A tiny, coherent demo graph: a few entities, typed relations (Knowledge
 * Bridges) and one evidence-classified claim. No real graph database yet —
 * the domain model is the deliverable of this phase.
 * ============================================================================
 */

import type {
  KnowledgeClaim,
  KnowledgeEntity,
  KnowledgeRelation,
} from "../domain/knowledge";

export const DEMO_ENTITIES: KnowledgeEntity[] = [
  { id: "ent-jesus", type: "person", name: "Jesus", description: "Central figure of the New Testament (DEMO record)." },
  { id: "ent-john", type: "person", name: "John", description: "Traditional author attribution of the Fourth Gospel (DEMO record).", traditionIds: ["christian"] },
  { id: "ent-paul", type: "person", name: "Paul", description: "Apostle; traditional author of Romans (DEMO record)." },
  { id: "ent-peter", type: "person", name: "Peter", description: "Apostle (DEMO record)." },
  { id: "ent-nazareth", type: "place", name: "Nazareth", description: "Town in Galilee (DEMO record)." },
  { id: "ent-galilee", type: "place", name: "Galilee", description: "Region of northern Palestine (DEMO record)." },
  { id: "ent-jerusalem", type: "place", name: "Jerusalem", description: "City (DEMO record)." },
  { id: "ent-rome", type: "place", name: "Rome", description: "Imperial capital (DEMO record)." },
  { id: "ent-logos", type: "concept", name: "Logos", originalForm: "λόγος", description: "DEMO concept node — 'word / reason'. Analysis to be supplied by licensed sources." },
  { id: "ent-kingdom", type: "concept", name: "Kingdom of God", description: "DEMO concept node." },
  { id: "ent-covenant", type: "concept", name: "Covenant", description: "DEMO concept node." },
  { id: "ent-john-1-1", type: "passage", name: "John 1:1", description: "Passage node in the demo graph." },
  { id: "ent-gen-1-1", type: "passage", name: "Genesis 1:1", description: "Passage node in the demo graph." },
  { id: "ent-gospel-john", type: "work", name: "Gospel of John", description: "Work node (DEMO)." },
  { id: "ent-lxx", type: "work", name: "Septuagint", description: "Greek translation corpus of the Hebrew Bible (DEMO node)." },
  { id: "ent-word-logos", type: "word", name: "λόγος", originalForm: "λόγος", description: "Greek lemma λόγος (DEMO lexical record)." },
  { id: "ent-creation", type: "event", name: "Creation", description: "DEMO event node." },
  { id: "ent-greek", type: "historical-source", name: "Greek Language", description: "Language node used for linguistic bridges (DEMO)." },
];

export const DEMO_RELATIONS: KnowledgeRelation[] = [
  { id: "rel-1", fromId: "ent-jesus", toId: "ent-nazareth", relation: "located-in", description: "Associated with Nazareth in the gospel narratives.", sourceIds: [], evidenceType: "textual" },
  { id: "rel-2", fromId: "ent-jesus", toId: "ent-galilee", relation: "located-in", description: "Ministry setting in the synoptic narratives.", sourceIds: [], evidenceType: "textual" },
  { id: "rel-3", fromId: "ent-jesus", toId: "ent-john", relation: "related-to", sourceIds: [], evidenceType: "traditional" },
  { id: "rel-4", fromId: "ent-jesus", toId: "ent-peter", relation: "related-to", sourceIds: [], evidenceType: "traditional" },
  { id: "rel-5", fromId: "ent-nazareth", toId: "ent-galilee", relation: "part-of", sourceIds: [], evidenceType: "historical" },
  { id: "rel-6", fromId: "ent-gospel-john", toId: "ent-john", relation: "authored", description: "Traditional attribution; authorship is debated in scholarship.", sourceIds: [], confidence: 0.5, evidenceType: "traditional" },
  { id: "rel-7", fromId: "ent-john-1-1", toId: "ent-word-logos", relation: "mentioned-in", description: "λόγος occurs three times in John 1:1.", sourceIds: [], evidenceType: "textual", confidence: 1 },
  { id: "rel-8", fromId: "ent-john-1-1", toId: "ent-logos", relation: "related-to", description: "The passage is the primary locus for the Logos concept in John.", sourceIds: [], evidenceType: "theological", confidence: 0.8 },
  { id: "rel-9", fromId: "ent-john-1-1", toId: "ent-gen-1-1", relation: "echoes", description: "'In the beginning' resonates with Genesis 1:1. The nature of the allusion is a scholarly question.", sourceIds: [], evidenceType: "scholarly-hypothesis", confidence: 0.6 },
  { id: "rel-10", fromId: "ent-gen-1-1", toId: "ent-creation", relation: "related-to", sourceIds: [], evidenceType: "textual" },
  { id: "rel-11", fromId: "ent-word-logos", toId: "ent-greek", relation: "part-of", description: "λόγος is a common Greek noun with a wide semantic range.", sourceIds: [], evidenceType: "linguistic" },
  { id: "rel-12", fromId: "ent-word-logos", toId: "ent-lxx", relation: "attested-in", description: "λόγος is attested in the Septuagint corpus.", sourceIds: [], evidenceType: "linguistic" },
  { id: "rel-13", fromId: "ent-logos", toId: "ent-word-logos", relation: "related-to", sourceIds: [], evidenceType: "linguistic" },
];

/** A DEMO evidence-classified claim — the shape future engines must follow. */
export const DEMO_CLAIMS: KnowledgeClaim[] = [
  {
    id: "claim-1",
    proposition:
      "The noun λόγος in John 1:1 is nominative singular masculine (DEMO morphological claim).",
    classification: "linguistic",
    sourceIds: ["src-wh-john-1-1"],
    confidence: 1,
  },
];

/** DEMO Knowledge Bridge chain rendered on /knowledge. */
export const DEMO_BRIDGE_CHAIN = [
  { entityId: "ent-john-1-1", edge: { relation: "contains word", evidenceType: "textual" } },
  { entityId: "ent-word-logos", edge: { relation: "is part of", evidenceType: "linguistic" } },
  { entityId: "ent-greek", edge: { relation: "attested in", evidenceType: "linguistic" } },
  { entityId: "ent-lxx", edge: { relation: "lexical resonance", evidenceType: "scholarly-hypothesis" } },
  { entityId: "ent-gen-1-1", edge: null },
] as const;
