/** DEMO / SEED DATA — typed graph records. Unsourced edges remain draft/demo. */
import type {
  EvidenceKind,
  KnowledgeClaim,
  KnowledgeEntity,
  KnowledgeRelation,
  RelationKind,
  SupportLevel,
  TextAnchor,
} from "../domain/knowledge";

const demoProvenance = {
  acquisition: "bundled",
  creationMethod: "human",
  isDemo: true,
} as const;

const entity = (entityId: string): TextAnchor => ({ type: "entity", entityId });
const passage = (bookId: string, chapter: number, verse: number): TextAnchor => ({
  type: "passage",
  ref: { bookId, chapter, verseStart: verse },
});

function demoRelation(
  id: string,
  from: TextAnchor,
  to: TextAnchor,
  kind: RelationKind,
  evidenceKind: EvidenceKind,
  description?: string,
  sourceFragmentIds: string[] = [],
  supportLevel: SupportLevel = sourceFragmentIds.length > 0 ? "direct" : "unknown",
): KnowledgeRelation {
  return {
    id,
    from,
    to,
    relation: { kind: "known", value: kind },
    ...(description !== undefined ? { description } : {}),
    evidence: [
      {
        kind: evidenceKind,
        sourceFragmentIds,
        supportLevel,
        ...(!sourceFragmentIds.length
          ? { assessmentNote: "DEMO / UNSOURCED relation awaiting a source." }
          : {}),
      },
    ],
    sourceFragmentIds,
    reviewStatus: sourceFragmentIds.length ? "imported" : "draft",
    provenance: demoProvenance,
  };
}

export const DEMO_ENTITIES: KnowledgeEntity[] = [
  {
    id: "ent-jesus",
    type: "person",
    name: "Jesus",
    description: "Central figure of the New Testament (DEMO record).",
  },
  {
    id: "ent-john",
    type: "person",
    name: "John",
    description: "Traditional author attribution of the Fourth Gospel (DEMO record).",
    traditionIds: ["christian"],
  },
  {
    id: "ent-paul",
    type: "person",
    name: "Paul",
    description: "Apostle; traditional author of Romans (DEMO record).",
  },
  { id: "ent-peter", type: "person", name: "Peter", description: "Apostle (DEMO record)." },
  {
    id: "ent-nazareth",
    type: "place",
    name: "Nazareth",
    description: "Town in Galilee (DEMO record).",
  },
  {
    id: "ent-galilee",
    type: "place",
    name: "Galilee",
    description: "Region of northern Palestine (DEMO record).",
  },
  { id: "ent-jerusalem", type: "place", name: "Jerusalem", description: "City (DEMO record)." },
  { id: "ent-rome", type: "place", name: "Rome", description: "Imperial capital (DEMO record)." },
  {
    id: "ent-logos",
    type: "concept",
    name: "Logos",
    originalForm: "λόγος",
    description: "DEMO concept node — analysis awaits licensed sources.",
  },
  { id: "ent-kingdom", type: "concept", name: "Kingdom of God", description: "DEMO concept node." },
  { id: "ent-covenant", type: "concept", name: "Covenant", description: "DEMO concept node." },
  {
    id: "ent-john-1-1",
    type: "passage",
    name: "John 1:1",
    description: "Passage node in the demo graph.",
  },
  {
    id: "ent-gen-1-1",
    type: "passage",
    name: "Genesis 1:1",
    description: "Passage node in the demo graph.",
  },
  { id: "ent-gospel-john", type: "work", name: "Gospel of John", description: "Work node (DEMO)." },
  {
    id: "ent-lxx",
    type: "work",
    name: "Septuagint",
    description: "Catalog-level DEMO node; no corpus imported.",
  },
  {
    id: "ent-word-logos",
    type: "word",
    name: "λόγος",
    originalForm: "λόγος",
    description: "Greek lemma λόγος (DEMO lexical record).",
  },
  { id: "ent-creation", type: "event", name: "Creation", description: "DEMO event node." },
  {
    id: "ent-greek",
    type: "historical-source",
    name: "Greek Language",
    description: "Language node used for DEMO bridges.",
  },
];

export const DEMO_RELATIONS: KnowledgeRelation[] = [
  demoRelation(
    "rel-1",
    entity("ent-jesus"),
    entity("ent-nazareth"),
    "located-in",
    "textual",
    "DEMO association awaiting an explicit source.",
  ),
  demoRelation(
    "rel-2",
    entity("ent-jesus"),
    entity("ent-galilee"),
    "located-in",
    "textual",
    "DEMO association awaiting an explicit source.",
  ),
  demoRelation("rel-3", entity("ent-jesus"), entity("ent-john"), "related-to", "traditional"),
  demoRelation("rel-4", entity("ent-jesus"), entity("ent-peter"), "related-to", "traditional"),
  demoRelation("rel-5", entity("ent-nazareth"), entity("ent-galilee"), "part-of", "historical"),
  demoRelation(
    "rel-6",
    entity("ent-gospel-john"),
    entity("ent-john"),
    "authored",
    "traditional",
    "Traditional attribution; DEMO / UNSOURCED in this dataset.",
  ),
  demoRelation(
    "rel-7",
    passage("john", 1, 1),
    { type: "lemma", lemmaId: "grc:λόγος" },
    "contains-occurrence-of",
    "textual",
    "The token occurrences in the bundled edition link this passage to the lemma.",
    ["frag-wh-john-1-1"],
  ),
  demoRelation(
    "rel-8",
    passage("john", 1, 1),
    entity("ent-logos"),
    "related-to",
    "theological",
    "DEMO conceptual link awaiting a scholarly source.",
  ),
  demoRelation(
    "rel-9",
    passage("john", 1, 1),
    passage("genesis", 1, 1),
    "echoes",
    "textual",
    "DEMO / UNSOURCED proposed resonance; not verified scholarship.",
  ),
  demoRelation("rel-10", passage("genesis", 1, 1), entity("ent-creation"), "related-to", "textual"),
  demoRelation(
    "rel-11",
    { type: "lemma", lemmaId: "grc:λόγος" },
    entity("ent-greek"),
    "part-of",
    "linguistic",
    "Structured lexical link in the DEMO model.",
    ["frag-demo-lexicon-logos"],
  ),
  demoRelation(
    "rel-12",
    { type: "lemma", lemmaId: "grc:λόγος" },
    entity("ent-lxx"),
    "attested-in",
    "linguistic",
    "DEMO / UNSOURCED. LXX corpus is not imported.",
  ),
  demoRelation(
    "rel-13",
    entity("ent-logos"),
    { type: "lemma", lemmaId: "grc:λόγος" },
    "related-to",
    "linguistic",
    "DEMO conceptual link awaiting a source.",
  ),
];

export const DEMO_CLAIMS: KnowledgeClaim[] = [
  {
    id: "claim-1",
    proposition:
      "The occurrence λόγος in John 1:1 is parsed as nominative singular masculine in the DEMO token data.",
    anchors: [
      passage("john", 1, 1),
      { type: "token", tokenId: "j1.1.5" },
      { type: "lemma", lemmaId: "grc:λόγος" },
    ],
    kind: "linguistic-analysis",
    evidence: [
      {
        kind: "linguistic",
        sourceFragmentIds: ["frag-demo-lexicon-logos"],
        supportLevel: "unknown",
        assessmentNote: "DEMO morphology only; no production morphology source is imported.",
      },
    ],
    sourceFragmentIds: ["frag-demo-lexicon-logos"],
    origin: "editorial",
    reviewStatus: "draft",
    supportLevel: "unknown",
    assessmentNote: "DEMO morphology record; a production morphology dataset is not imported.",
  },
];
