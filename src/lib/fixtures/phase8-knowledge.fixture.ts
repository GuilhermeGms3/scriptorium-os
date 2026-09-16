import type { Argument, ArgumentRelation, EvidenceRecord } from "../domain/argument";
import type { KnowledgeClaim } from "../domain/knowledge";
import type { PerspectiveProfile } from "../domain/perspective";
import type { OntologyEntity, OntologyRelation } from "../domain/theology";
import type { TextAnchor } from "../domain/text-identity";

const labels = (canonicalName: string, aliases: string[] = []) => ({
  canonicalName,
  aliases,
  localizedLabels: {},
  abbreviations: [],
});

export const PHASE8_ONTOLOGY: OntologyEntity[] = [
  {
    id: "topic:soteriology",
    kind: "theological-topic",
    labels: labels("Soteriology"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "topic:atonement",
    kind: "theological-topic",
    labels: labels("Atonement"),
    parentTopicId: "topic:soteriology",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "doctrine:atonement",
    kind: "doctrine",
    labels: labels("Doctrine of Atonement"),
    topicIds: ["topic:atonement"],
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "position:christus-victor",
    kind: "position",
    labels: labels("Christus Victor"),
    doctrineIds: ["doctrine:atonement"],
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "position:penal-substitution",
    kind: "position",
    labels: labels("Penal Substitution"),
    doctrineIds: ["doctrine:atonement"],
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "position:moral-influence",
    kind: "position",
    labels: labels("Moral Influence"),
    doctrineIds: ["doctrine:atonement"],
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "tradition:reformed",
    kind: "tradition",
    labels: labels("Reformed"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "tradition:roman-catholic",
    kind: "tradition",
    labels: labels("Roman Catholic"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "school:thomism",
    kind: "school",
    labels: labels("Thomism"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "method:historical-critical",
    kind: "method",
    labels: labels("Historical-critical"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "method:historical-grammatical",
    kind: "method",
    labels: labels("Historical-grammatical"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "method:textual-criticism",
    kind: "method",
    labels: labels("Textual criticism"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "stance:confessional",
    kind: "epistemic-stance",
    labels: labels("Confessional"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "stance:non-confessional",
    kind: "epistemic-stance",
    labels: labels("Non-confessional"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "stance:methodological-naturalism",
    kind: "epistemic-stance",
    labels: labels("Methodological naturalism"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "framework:covenant-theology",
    kind: "interpretive-framework",
    labels: labels("Covenant theology"),
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "theory:two-source",
    kind: "theory",
    labels: labels("Two-Source Hypothesis"),
    componentClaimIds: ["claim:markan-priority", "claim:q-source"],
    assumptionClaimIds: [],
    proponentIds: [],
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "theory:farrer",
    kind: "theory",
    labels: labels("Farrer Hypothesis"),
    componentClaimIds: ["claim:markan-priority", "claim:luke-used-matthew"],
    assumptionClaimIds: [],
    proponentIds: [],
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "theory:griesbach",
    kind: "theory",
    labels: labels("Griesbach Hypothesis"),
    componentClaimIds: ["claim:matthean-priority"],
    assumptionClaimIds: [],
    proponentIds: [],
    sourceIds: ["source:demo:phase8"],
  },
];

export const PHASE8_ONTOLOGY_RELATIONS: OntologyRelation[] = [
  {
    id: "ontology:atonement-topic",
    fromEntityId: "doctrine:atonement",
    toEntityId: "topic:atonement",
    relationType: "belongs-to-topic",
    sourceIds: ["source:demo:phase8"],
  },
  ...["position:christus-victor", "position:penal-substitution", "position:moral-influence"].map(
    (fromEntityId, index) => ({
      id: `ontology:position:${index}`,
      fromEntityId,
      toEntityId: "doctrine:atonement",
      relationType: "addresses-doctrine" as const,
      sourceIds: ["source:demo:phase8"],
    }),
  ),
  {
    id: "ontology:two-source-farrer",
    fromEntityId: "theory:two-source",
    toEntityId: "theory:farrer",
    relationType: "competes-with",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "ontology:two-source-griesbach",
    fromEntityId: "theory:two-source",
    toEntityId: "theory:griesbach",
    relationType: "competes-with",
    sourceIds: ["source:demo:phase8"],
  },
];

export const PHASE8_PERSPECTIVES: PerspectiveProfile[] = [
  {
    id: "perspective:reformed-hg-covenant",
    label: "Reformed · historical-grammatical · covenant",
    traditionIds: ["tradition:reformed"],
    schoolIds: [],
    methodIds: ["method:historical-grammatical"],
    epistemicStanceIds: ["stance:confessional"],
    interpretiveFrameworkIds: ["framework:covenant-theology"],
  },
  {
    id: "perspective:historical-critical-naturalist",
    label: "Historical-critical · methodological naturalism",
    traditionIds: [],
    schoolIds: [],
    methodIds: ["method:historical-critical"],
    epistemicStanceIds: ["stance:methodological-naturalism"],
    interpretiveFrameworkIds: [],
  },
  {
    id: "perspective:catholic-thomist",
    label: "Roman Catholic · Thomist",
    traditionIds: ["tradition:roman-catholic"],
    schoolIds: ["school:thomism"],
    methodIds: [],
    epistemicStanceIds: ["stance:confessional"],
    interpretiveFrameworkIds: [],
  },
  {
    id: "perspective:textual-nonconfessional",
    label: "Textual criticism · non-confessional",
    traditionIds: [],
    schoolIds: [],
    methodIds: ["method:textual-criticism"],
    epistemicStanceIds: ["stance:non-confessional"],
    interpretiveFrameworkIds: [],
  },
];

const matthewMarkAnchor: TextAnchor = {
  kind: "passage",
  workId: "work:mark",
  versificationSchemeId: "scriptorium-bcv-1",
  passage: {
    workId: "work:mark",
    versificationSchemeId: "scriptorium-bcv-1",
    bookId: "mark",
    chapter: 1,
  },
};

function claim(id: string, proposition: string): KnowledgeClaim {
  return {
    id,
    proposition,
    anchors: [{ type: "canonical-text", anchor: matthewMarkAnchor }],
    kind: "academic-hypothesis",
    evidence: [],
    sourceFragmentIds: [],
    origin: "editorial",
    reviewStatus: "draft",
    supportLevel: "unknown",
    assessmentNote: "DEMO fixture; no real academic citation is asserted.",
  };
}

export const PHASE8_CLAIMS: KnowledgeClaim[] = [
  {
    id: "claim:john-logos-linguistic",
    proposition: "The term λόγος occurs in the Greek text of John 1:1.",
    anchors: [
      {
        type: "canonical-text",
        anchor: {
          kind: "passage",
          workId: "work:john",
          versificationSchemeId: "scriptorium-bcv-1",
          passage: {
            workId: "work:john",
            versificationSchemeId: "scriptorium-bcv-1",
            bookId: "john",
            chapter: 1,
            verseStart: 1,
          },
        },
      },
    ],
    kind: "linguistic-analysis",
    evidence: [],
    sourceFragmentIds: [],
    origin: "editorial",
    reviewStatus: "draft",
    supportLevel: "unknown",
    assessmentNote: "DEMO fixture; linked citation is synthetic and not scholarship.",
  },
  claim("claim:markan-priority", "Mark was composed before Matthew and Luke."),
  claim(
    "claim:q-source",
    "Matthew and Luke independently used a hypothetical sayings source conventionally called Q.",
  ),
  claim("claim:luke-used-matthew", "Luke used Matthew directly, making Q unnecessary."),
  claim("claim:matthean-priority", "Matthew was composed before Mark."),
  claim(
    "claim:triple-tradition-pattern",
    "The shared ordering in triple-tradition material requires a literary explanation.",
  ),
  claim("claim:q-objection", "The hypothetical Q source lacks a surviving manuscript witness."),
  claim(
    "claim:q-response",
    "Absence of a surviving witness does not by itself exclude a lost source.",
  ),
];

export const PHASE8_EVIDENCE: EvidenceRecord[] = [
  {
    id: "evidence:triple-tradition-demo",
    label: "Triple-tradition ordering pattern (DEMO)",
    target: { kind: "statistical-analysis", analysisId: "analysis:demo:triple-tradition" },
    sourceIds: ["source:demo:phase8"],
    reviewStatus: "draft",
    authorship: "human-authored",
    notes: "Synthetic fixture only.",
  },
];

export const PHASE8_ARGUMENTS: Argument[] = [
  {
    id: "argument:two-source-demo",
    title: "Two-Source model (DEMO)",
    conclusionClaimId: "claim:q-source",
    premiseClaimIds: ["claim:markan-priority", "claim:triple-tradition-pattern"],
    argumentType: "abductive",
    perspectiveProfileIds: ["perspective:historical-critical-naturalist"],
    sourceIds: ["source:demo:phase8"],
    notes: "Architecture fixture, not an academic conclusion.",
  },
  {
    id: "argument:q-objection-demo",
    title: "Witness objection (DEMO)",
    conclusionClaimId: "claim:q-objection",
    premiseClaimIds: ["claim:q-objection"],
    perspectiveProfileIds: ["perspective:textual-nonconfessional"],
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "argument:q-response-demo",
    title: "Response to witness objection (DEMO)",
    conclusionClaimId: "claim:q-response",
    premiseClaimIds: ["claim:q-response"],
    perspectiveProfileIds: ["perspective:historical-critical-naturalist"],
    sourceIds: ["source:demo:phase8"],
  },
];

export const PHASE8_ARGUMENT_RELATIONS: ArgumentRelation[] = [
  {
    id: "argrel:argument-support",
    fromKind: "argument",
    fromId: "argument:two-source-demo",
    toKind: "claim",
    toId: "claim:q-source",
    relationType: "supports",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "argrel:argument-depends",
    fromKind: "argument",
    fromId: "argument:two-source-demo",
    toKind: "claim",
    toId: "claim:markan-priority",
    relationType: "depends-on",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "argrel:argument-opposes",
    fromKind: "argument",
    fromId: "argument:q-objection-demo",
    toKind: "claim",
    toId: "claim:q-source",
    relationType: "opposes",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "argrel:response-rebuts",
    fromKind: "argument",
    fromId: "argument:q-response-demo",
    toKind: "claim",
    toId: "claim:q-objection",
    relationType: "rebuts",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "argrel:evidence-support",
    fromKind: "evidence",
    fromId: "evidence:triple-tradition-demo",
    toKind: "claim",
    toId: "claim:triple-tradition-pattern",
    relationType: "supports",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "argrel:objection",
    fromKind: "argument",
    fromId: "argument:q-objection-demo",
    toKind: "argument",
    toId: "argument:two-source-demo",
    relationType: "objects-to",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "argrel:response",
    fromKind: "argument",
    fromId: "argument:q-response-demo",
    toKind: "argument",
    toId: "argument:q-objection-demo",
    relationType: "responds-to",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "argrel:farrer-alternative",
    fromKind: "theory",
    fromId: "theory:farrer",
    toKind: "theory",
    toId: "theory:two-source",
    relationType: "alternative-to",
    sourceIds: ["source:demo:phase8"],
  },
  {
    id: "argrel:griesbach-competes",
    fromKind: "theory",
    fromId: "theory:griesbach",
    toKind: "theory",
    toId: "theory:two-source",
    relationType: "competes-with",
    sourceIds: ["source:demo:phase8"],
  },
];
