/** Canonical knowledge graph backed by the same SQLite package as theology and arguments. */
import type { Database } from "@sqlite.org/sqlite-wasm";
import type { Argument, ArgumentRelation, EvidenceRecord } from "../domain/argument";
import { ArgumentRelationSchema, ArgumentSchema, EvidenceRecordSchema } from "../domain/argument";
import {
  RELATION_KINDS,
  type EntityType,
  type EvidenceLink,
  type KnowledgeClaim,
  type KnowledgeEntity,
  type KnowledgeRelation,
  type RelationType,
  type SupportLevel,
  type TextAnchor,
} from "../domain/knowledge";
import type { PassageViewpoint } from "../domain/knowledge-bundle";
import { PerspectiveProfileSchema, type PerspectiveProfile } from "../domain/perspective";
import type { PassageRef } from "../domain/scripture";
import { passageRefsOverlap } from "../domain/scripture";
import type { SourceFragment, SourceReference } from "../domain/source";
import type { PassageAnalysis } from "../domain/analysis";
import { toSafeFtsQuery } from "../corpus-runtime/search-normalization";
import {
  getKnowledgeDatabase,
  knowledgeOptionalText as optional,
  knowledgeQuery as query,
  knowledgeText as text,
  type KnowledgeRow,
} from "./knowledge-database";

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

export interface KnowledgeSearchHit {
  kind:
    | "knowledge-entity"
    | "theological-topic"
    | "doctrine"
    | "tradition"
    | "school"
    | "method"
    | "epistemic-stance"
    | "interpretive-framework"
    | "position"
    | "theory"
    | "claim"
    | "argument"
    | "lexeme";
  id: string;
  label: string;
  detail?: string;
  rank: number;
}

type SourcedRecordKind = "claim" | "relation" | "analysis";

interface IndexedSource {
  reference: SourceReference;
  locator: string | undefined;
  classification: Pick<SourceFragment, "sourceType" | "epistemicRole">;
}

interface PassageAnchorEntry {
  id: string;
  ref: PassageRef;
}

/** Read-only in-memory view of the knowledge database, built with a fixed number of queries. */
export interface KnowledgeIndex {
  /** Ordered by canonical name. */
  entities: KnowledgeEntity[];
  entitiesById: Map<string, KnowledgeEntity>;
  /** Ordered by proposition. */
  claims: KnowledgeClaim[];
  claimsById: Map<string, KnowledgeClaim>;
  /** Ordered by id. */
  relations: KnowledgeRelation[];
  /** Ordered by lens id, then id. */
  analyses: PassageAnalysis[];
  sources: Map<string, IndexedSource>;
  /** Source ids of each record, ordered by source id. */
  recordSources: Record<SourcedRecordKind, Map<string, string[]>>;
  evidence: Map<string, EvidenceRecord>;
  /** Ordered by label. */
  profiles: PerspectiveProfile[];
  profilesById: Map<string, PerspectiveProfile>;
  /** Insertion order. */
  argumentList: Argument[];
  argumentsById: Map<string, Argument>;
  argumentRelations: ArgumentRelation[];
  /** Passage anchors bucketed by book id. */
  passageAnchors: Record<SourcedRecordKind, Map<string, PassageAnchorEntry[]>>;
  claimIdsByEntity: Map<string, Set<string>>;
  relationIdsByEntity: Map<string, Set<string>>;
  argumentIdsByConclusion: Map<string, string[]>;
  argumentIdsByPremise: Map<string, string[]>;
  argumentRelationsToClaim: Map<string, ArgumentRelation[]>;
}

const EVIDENCE_KIND_BY_TARGET: Record<EvidenceRecord["target"]["kind"], EvidenceLink["kind"]> = {
  "text-anchor": "textual",
  "manuscript-witness": "textual",
  "archaeological-evidence": "archaeological",
  "historical-source": "historical",
  "academic-source": "historical",
  "linguistic-observation": "linguistic",
  "statistical-analysis": "textual",
};

const OPPOSING_RELATIONS = new Set<ArgumentRelation["relationType"]>([
  "opposes",
  "rebuts",
  "undercuts",
]);

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key);
  if (values) values.push(value);
  else map.set(key, [value]);
}

function add<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
  const values = map.get(key);
  if (values) values.add(value);
  else map.set(key, new Set([value]));
}

function groupColumn(rows: KnowledgeRow[], key: string, valueKey: string): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const row of rows) push(grouped, text(row, key), text(row, valueKey));
  return grouped;
}

function anchorPassage(anchor: TextAnchor): PassageRef | null {
  if (anchor.type === "passage") return anchor.ref;
  const passage = anchor.type === "canonical-text" ? anchor.anchor.passage : undefined;
  if (passage?.bookId === undefined || passage.chapter === undefined) return null;
  return {
    workId: passage.workId,
    bookId: passage.bookId,
    chapter: passage.chapter,
    ...(passage.verseStart !== undefined ? { verseStart: passage.verseStart } : {}),
    ...(passage.verseEnd !== undefined ? { verseEnd: passage.verseEnd } : {}),
    versificationSchemeId: passage.versificationSchemeId,
  };
}

function mapEntity(row: KnowledgeRow): KnowledgeEntity {
  const metadata = JSON.parse(text(row, "metadata_json")) as Partial<KnowledgeEntity>;
  const description = optional(row, "description");
  return {
    id: text(row, "id"),
    type: text(row, "entity_type") as EntityType,
    name: text(row, "canonical_name"),
    ...(typeof metadata.originalForm === "string" ? { originalForm: metadata.originalForm } : {}),
    ...(description ? { description } : {}),
  };
}

function mapSource(row: KnowledgeRow): SourceReference {
  const metadata = JSON.parse(text(row, "metadata_json")) as Record<string, unknown>;
  const provenance = (metadata["provenance"] ?? {
    acquisition: "imported",
    creationMethod: "human",
  }) as SourceReference["provenance"];
  const rights = metadata["rights"] as
    { license?: string; redistribution?: string; attribution?: string } | undefined;
  const rawType = text(row, "source_type");
  const sourceType: NonNullable<SourceReference["sourceType"]> =
    rawType === "edition" || rawType === "book" || rawType === "article" || rawType === "document"
      ? rawType
      : rawType.includes("dataset")
        ? "dataset"
        : "document";
  const locator = optional(row, "locator");
  return {
    id: text(row, "id"),
    work: text(row, "title"),
    ...(locator ? { url: locator } : {}),
    sourceType,
    ...(rights?.license
      ? {
          license: {
            name: rights.license,
            redistributionAllowed:
              rights.redistribution === "allowed" ||
              rights.redistribution === "allowed-with-attribution",
            ...(rights.attribution ? { attribution: rights.attribution } : {}),
          },
        }
      : {}),
    provenance,
  };
}

function fragmentSourceClassification(
  row: KnowledgeRow,
): Pick<SourceFragment, "sourceType" | "epistemicRole"> {
  const sourceType = text(row, "source_type");
  if (sourceType === "primary-source-edition" || sourceType === "scripture-edition") {
    return { sourceType: "primary-text", epistemicRole: "primary" };
  }
  return { sourceType: "secondary-work", epistemicRole: "secondary" };
}

function relationType(value: string): RelationType {
  return (RELATION_KINDS as readonly string[]).includes(value)
    ? { kind: "known", value: value as (typeof RELATION_KINDS)[number] }
    : { kind: "custom", value };
}

/** Support carried by a piece of evidence follows its relation to the claim. */
function evidenceSupport(relation: string, claimSupport: SupportLevel): SupportLevel {
  if (relation === "supports") return claimSupport === "unknown" ? "moderate" : claimSupport;
  if (relation === "qualifies") return "moderate";
  return "disputed";
}

/** Loads the whole knowledge graph with one query per table (no per-record queries). */
export function buildKnowledgeIndex(database: Database): KnowledgeIndex {
  const sources = new Map<string, IndexedSource>(
    query(database, "SELECT * FROM sources").map((row) => [
      text(row, "id"),
      {
        reference: mapSource(row),
        locator: optional(row, "locator"),
        classification: fragmentSourceClassification(row),
      },
    ]),
  );
  const recordSources: KnowledgeIndex["recordSources"] = {
    claim: groupColumn(
      query(database, "SELECT claim_id,source_id FROM claim_sources ORDER BY claim_id,source_id"),
      "claim_id",
      "source_id",
    ),
    relation: groupColumn(
      query(
        database,
        "SELECT relation_id,source_id FROM knowledge_relation_sources ORDER BY relation_id,source_id",
      ),
      "relation_id",
      "source_id",
    ),
    analysis: groupColumn(
      query(
        database,
        "SELECT analysis_id,source_id FROM passage_analysis_sources ORDER BY analysis_id,source_id",
      ),
      "analysis_id",
      "source_id",
    ),
  };
  const passageAnchors: KnowledgeIndex["passageAnchors"] = {
    claim: new Map(),
    relation: new Map(),
    analysis: new Map(),
  };
  const claimIdsByEntity = new Map<string, Set<string>>();
  const relationIdsByEntity = new Map<string, Set<string>>();

  const entities = query(database, "SELECT * FROM knowledge_entities ORDER BY canonical_name").map(
    mapEntity,
  );

  const evidenceSources = groupColumn(
    query(
      database,
      "SELECT evidence_id,source_id FROM evidence_sources ORDER BY evidence_id,source_id",
    ),
    "evidence_id",
    "source_id",
  );
  const evidence = new Map<string, EvidenceRecord>(
    query(database, "SELECT * FROM evidence ORDER BY id").map((row) => {
      const id = text(row, "id");
      return [
        id,
        EvidenceRecordSchema.parse({
          id,
          label: text(row, "label"),
          target: JSON.parse(text(row, "target_json")),
          sourceIds: evidenceSources.get(id) ?? [],
          reviewStatus: text(row, "review_status"),
          authorship: text(row, "authorship"),
          notes: optional(row, "notes"),
        }),
      ];
    }),
  );

  const anchorsByClaim = new Map<string, TextAnchor[]>();
  for (const row of query(
    database,
    "SELECT claim_id,anchor_json FROM claim_anchors ORDER BY claim_id,ordinal",
  ))
    push(anchorsByClaim, text(row, "claim_id"), JSON.parse(text(row, "anchor_json")) as TextAnchor);
  const profileIdsByClaim = new Map<string, Set<string>>();
  for (const row of query(
    database,
    "SELECT claim_id,profile_id FROM claim_perspectives ORDER BY claim_id,profile_id,association_kind",
  ))
    add(profileIdsByClaim, text(row, "claim_id"), text(row, "profile_id"));
  const evidenceByClaim = new Map<string, { evidenceId: string; relation: string }[]>();
  for (const row of query(
    database,
    "SELECT claim_id,evidence_id,relation_type FROM claim_evidence ORDER BY claim_id,evidence_id,relation_type",
  ))
    push(evidenceByClaim, text(row, "claim_id"), {
      evidenceId: text(row, "evidence_id"),
      relation: text(row, "relation_type"),
    });

  const claims = query(database, "SELECT * FROM claims ORDER BY proposition").map(
    (row): KnowledgeClaim => {
      const id = text(row, "id");
      const anchors = anchorsByClaim.get(id) ?? [];
      const supportLevel = text(row, "support_level") as SupportLevel;
      const assessmentNote = optional(row, "assessment_note");
      const evidenceLinks = (evidenceByClaim.get(id) ?? []).flatMap(
        ({ evidenceId, relation }): EvidenceLink[] => {
          const record = evidence.get(evidenceId);
          if (!record) return [];
          return [
            {
              kind: EVIDENCE_KIND_BY_TARGET[record.target.kind],
              sourceFragmentIds: record.sourceIds.map(
                (sourceId) => `fragment:evidence:${evidenceId}:${sourceId}`,
              ),
              supportLevel: evidenceSupport(relation, supportLevel),
              ...(record.notes ? { assessmentNote: record.notes } : {}),
            },
          ];
        },
      );
      for (const anchor of anchors) {
        const passage = anchorPassage(anchor);
        if (passage) push(passageAnchors.claim, passage.bookId, { id, ref: passage });
        if (anchor.type === "entity") add(claimIdsByEntity, anchor.entityId, id);
      }
      return {
        id,
        proposition: text(row, "proposition"),
        kind: text(row, "claim_type") as KnowledgeClaim["kind"],
        anchors,
        evidence: evidenceLinks,
        sourceFragmentIds: (recordSources.claim.get(id) ?? []).map(
          (sourceId) => `fragment:knowledge:${id}:${sourceId}`,
        ),
        origin: text(row, "origin") as KnowledgeClaim["origin"],
        reviewStatus: text(row, "review_status") as KnowledgeClaim["reviewStatus"],
        perspectiveProfileIds: [...(profileIdsByClaim.get(id) ?? [])],
        supportLevel,
        ...(assessmentNote ? { assessmentNote } : {}),
      };
    },
  );

  const relations = query(database, "SELECT * FROM knowledge_relations ORDER BY id").map(
    (row): KnowledgeRelation => {
      const id = text(row, "id");
      const description = optional(row, "description");
      const from = JSON.parse(text(row, "from_anchor_json")) as TextAnchor;
      const to = JSON.parse(text(row, "to_anchor_json")) as TextAnchor;
      for (const anchor of [from, to]) {
        if (anchor.type === "passage")
          push(passageAnchors.relation, anchor.ref.bookId, { id, ref: anchor.ref });
        if (anchor.type === "entity") add(relationIdsByEntity, anchor.entityId, id);
      }
      return {
        id,
        from,
        to,
        relation: relationType(text(row, "relation_type")),
        ...(description ? { description } : {}),
        evidence: [],
        sourceFragmentIds: (recordSources.relation.get(id) ?? []).map(
          (sourceId) => `fragment:knowledge:${id}:${sourceId}`,
        ),
        reviewStatus: text(row, "review_status") as KnowledgeRelation["reviewStatus"],
        provenance: JSON.parse(text(row, "provenance_json")) as KnowledgeRelation["provenance"],
      };
    },
  );

  const analyses = query(database, "SELECT * FROM passage_analyses ORDER BY lens_id,id").map(
    (row): PassageAnalysis => {
      const id = text(row, "id");
      const anchor = JSON.parse(text(row, "anchor_json")) as TextAnchor;
      if (anchor.type === "passage")
        push(passageAnchors.analysis, anchor.ref.bookId, { id, ref: anchor.ref });
      const summary = optional(row, "summary");
      const authorNote = optional(row, "author_note");
      return {
        id,
        anchor,
        lensId: text(row, "lens_id") as PassageAnalysis["lensId"],
        title: text(row, "title"),
        ...(summary ? { summary } : {}),
        status: text(row, "analysis_status") as PassageAnalysis["status"],
        reviewStatus: text(row, "review_status") as PassageAnalysis["reviewStatus"],
        interpretationKind: text(
          row,
          "interpretation_kind",
        ) as PassageAnalysis["interpretationKind"],
        sourceFragmentIds: (recordSources.analysis.get(id) ?? []).map(
          (sourceId) => `fragment:analysis:${id}:${sourceId}`,
        ),
        ...(authorNote ? { authorNote } : {}),
      };
    },
  );

  const dimensions = query(
    database,
    "SELECT profile_id,dimension_kind,ontology_entity_id FROM perspective_dimensions ORDER BY profile_id,dimension_kind,ontology_entity_id",
  );
  const profiles = query(database, "SELECT * FROM perspective_profiles ORDER BY label").map(
    (row) => {
      const id = text(row, "id");
      const ids = (kind: string) =>
        dimensions
          .filter((item) => item["profile_id"] === id && item["dimension_kind"] === kind)
          .map((item) => text(item, "ontology_entity_id"));
      return PerspectiveProfileSchema.parse({
        id,
        label: text(row, "label"),
        description: optional(row, "description"),
        authorId: optional(row, "author_id"),
        historicalContext: optional(row, "historical_context_json")
          ? JSON.parse(text(row, "historical_context_json"))
          : undefined,
        traditionIds: ids("tradition"),
        schoolIds: ids("school"),
        methodIds: ids("method"),
        epistemicStanceIds: ids("epistemic-stance"),
        interpretiveFrameworkIds: ids("interpretive-framework"),
      });
    },
  );

  const premises = groupColumn(
    query(
      database,
      "SELECT argument_id,claim_id FROM argument_premises ORDER BY argument_id,ordinal",
    ),
    "argument_id",
    "claim_id",
  );
  const argumentSources = groupColumn(
    query(
      database,
      "SELECT argument_id,source_id FROM argument_sources ORDER BY argument_id,source_id",
    ),
    "argument_id",
    "source_id",
  );
  const argumentProfiles = groupColumn(
    query(
      database,
      "SELECT argument_id,profile_id FROM argument_perspectives ORDER BY argument_id,profile_id",
    ),
    "argument_id",
    "profile_id",
  );
  const argumentIdsByConclusion = new Map<string, string[]>();
  const argumentIdsByPremise = new Map<string, string[]>();
  const argumentList = query(database, "SELECT * FROM arguments ORDER BY rowid").map((row) => {
    const id = text(row, "id");
    const argument = ArgumentSchema.parse({
      id,
      title: optional(row, "title"),
      conclusionClaimId: text(row, "conclusion_claim_id"),
      premiseClaimIds: premises.get(id) ?? [],
      argumentType: optional(row, "argument_type"),
      sourceIds: argumentSources.get(id) ?? [],
      notes: optional(row, "notes"),
      perspectiveProfileIds: argumentProfiles.get(id) ?? [],
    });
    push(argumentIdsByConclusion, argument.conclusionClaimId, id);
    for (const claimId of argument.premiseClaimIds) push(argumentIdsByPremise, claimId, id);
    return argument;
  });

  const argumentRelationSources = groupColumn(
    query(
      database,
      "SELECT relation_id,source_id FROM argument_relation_sources ORDER BY relation_id,source_id",
    ),
    "relation_id",
    "source_id",
  );
  const argumentRelationsToClaim = new Map<string, ArgumentRelation[]>();
  const argumentRelations = query(database, "SELECT * FROM argument_relations ORDER BY rowid").map(
    (row) => {
      const relation = ArgumentRelationSchema.parse({
        id: text(row, "id"),
        fromKind: text(row, "from_kind"),
        fromId: text(row, "from_id"),
        toKind: text(row, "to_kind"),
        toId: text(row, "to_id"),
        relationType: text(row, "relation_type"),
        sourceIds: argumentRelationSources.get(text(row, "id")) ?? [],
        notes: optional(row, "notes"),
      });
      if (relation.toKind === "claim") push(argumentRelationsToClaim, relation.toId, relation);
      return relation;
    },
  );

  return {
    entities,
    entitiesById: new Map(entities.map((entity) => [entity.id, entity])),
    claims,
    claimsById: new Map(claims.map((claim) => [claim.id, claim])),
    relations,
    analyses,
    sources,
    recordSources,
    evidence,
    profiles,
    profilesById: new Map(profiles.map((profile) => [profile.id, profile])),
    argumentList,
    argumentsById: new Map(argumentList.map((argument) => [argument.id, argument])),
    argumentRelations,
    passageAnchors,
    claimIdsByEntity,
    relationIdsByEntity,
    argumentIdsByConclusion,
    argumentIdsByPremise,
    argumentRelationsToClaim,
  };
}

let indexPromise: Promise<KnowledgeIndex> | null = null;

/** Cached knowledge index; a failed build is not cached, so the next call retries. */
export function getKnowledgeIndex(): Promise<KnowledgeIndex> {
  if (indexPromise) return indexPromise;
  const pending = getKnowledgeDatabase().then(buildKnowledgeIndex);
  indexPromise = pending;
  pending.catch(() => {
    if (indexPromise === pending) indexPromise = null;
  });
  return pending;
}

function overlappingIds(anchors: Map<string, PassageAnchorEntry[]>, ref: PassageRef): Set<string> {
  return new Set(
    (anchors.get(ref.bookId) ?? [])
      .filter((entry) => passageRefsOverlap(entry.ref, ref))
      .map((entry) => entry.id),
  );
}

/** Claims anchored to a passage, in proposition order. */
export function indexedClaimsForPassage(index: KnowledgeIndex, ref: PassageRef): KnowledgeClaim[] {
  const ids = overlappingIds(index.passageAnchors.claim, ref);
  return index.claims.filter((claim) => ids.has(claim.id));
}

function argumentsByIds(index: KnowledgeIndex, ids: Iterable<string>): Argument[] {
  const wanted = new Set(ids);
  return index.argumentList.filter((argument) => wanted.has(argument.id));
}

/**
 * For: arguments concluding the claim plus arguments with a `supports` relation to it.
 * Against: arguments with an `opposes`, `rebuts` or `undercuts` relation to it.
 */
export function argumentStance(
  index: KnowledgeIndex,
  claimId: string,
): { supporting: Argument[]; opposing: Argument[] } {
  const relations = (index.argumentRelationsToClaim.get(claimId) ?? []).filter(
    (relation) => relation.fromKind === "argument",
  );
  return {
    supporting: argumentsByIds(index, [
      ...(index.argumentIdsByConclusion.get(claimId) ?? []),
      ...relations
        .filter((relation) => relation.relationType === "supports")
        .map((relation) => relation.fromId),
    ]),
    opposing: argumentsByIds(
      index,
      relations
        .filter((relation) => OPPOSING_RELATIONS.has(relation.relationType))
        .map((relation) => relation.fromId),
    ),
  };
}

/**
 * A claim joins the group of every profile it is linked to and of every profile of an argument
 * that concludes it. A claim without either goes to the `profile: null` group: no perspective is
 * attributed by guesswork. Groups are ordered by profile label; the `null` group comes last.
 */
export function groupViewpoints(
  index: KnowledgeIndex,
  claims: readonly KnowledgeClaim[],
): PassageViewpoint[] {
  const groups = new Map<string | null, { claims: KnowledgeClaim[]; argumentIds: Set<string> }>();
  const stances = new Map<string, ReturnType<typeof argumentStance>>();
  for (const claim of claims) {
    const stance = argumentStance(index, claim.id);
    stances.set(claim.id, stance);
    const profileIds = new Set(claim.perspectiveProfileIds ?? []);
    for (const argumentId of index.argumentIdsByConclusion.get(claim.id) ?? [])
      for (const profileId of index.argumentsById.get(argumentId)?.perspectiveProfileIds ?? [])
        profileIds.add(profileId);
    const keys = [...profileIds].filter((id) => index.profilesById.has(id));
    for (const key of keys.length ? keys : [null]) {
      const group = groups.get(key) ?? { claims: [], argumentIds: new Set<string>() };
      group.claims.push(claim);
      groups.set(key, group);
    }
  }
  const viewpoints = [...groups.entries()].map(([profileId, group]): PassageViewpoint => {
    const supporting = group.claims.flatMap((claim) =>
      (stances.get(claim.id)?.supporting ?? []).map((argument) => argument.id),
    );
    const opposing = group.claims.flatMap((claim) =>
      (stances.get(claim.id)?.opposing ?? []).map((argument) => argument.id),
    );
    return {
      profile: profileId ? index.profilesById.get(profileId)! : null,
      claims: group.claims,
      supportingArguments: argumentsByIds(index, supporting),
      opposingArguments: argumentsByIds(index, opposing),
    };
  });
  return viewpoints.sort((left, right) =>
    left.profile && right.profile
      ? left.profile.label.localeCompare(right.profile.label, "pt-BR")
      : left.profile
        ? -1
        : right.profile
          ? 1
          : 0,
  );
}

/** Shared implementation of the three sourcesFor* lookups, ordered by record id and source id. */
function sourcesFor(
  index: KnowledgeIndex,
  kind: SourcedRecordKind,
  recordIds: string[],
): { references: SourceReference[]; fragments: SourceFragment[] } {
  const prefix = kind === "analysis" ? "fragment:analysis" : "fragment:knowledge";
  const references = new Map<string, SourceReference>();
  const fragments: SourceFragment[] = [];
  for (const recordId of [...new Set(recordIds)].sort()) {
    for (const sourceId of index.recordSources[kind].get(recordId) ?? []) {
      const source = index.sources.get(sourceId);
      if (!source) continue;
      if (!references.has(sourceId)) references.set(sourceId, source.reference);
      fragments.push({
        id: `${prefix}:${recordId}:${sourceId}`,
        sourceId,
        locator: source.locator ?? source.reference.work,
        ...source.classification,
        provenance: source.reference.provenance,
      });
    }
  }
  return { references: [...references.values()], fragments };
}

export const KnowledgeRepository = {
  async listEntities(type?: EntityType): Promise<KnowledgeEntity[]> {
    const { entities } = await getKnowledgeIndex();
    return type ? entities.filter((entity) => entity.type === type) : [...entities];
  },
  async getEntity(id: string): Promise<KnowledgeEntity | null> {
    return (await getKnowledgeIndex()).entitiesById.get(id) ?? null;
  },
  async relationsOf(entityId: string): Promise<KnowledgeRelation[]> {
    const index = await getKnowledgeIndex();
    const ids = index.relationIdsByEntity.get(entityId) ?? new Set<string>();
    return index.relations.filter((relation) => ids.has(relation.id));
  },
  async relationsForPassage(ref: PassageRef): Promise<KnowledgeRelation[]> {
    const index = await getKnowledgeIndex();
    const ids = overlappingIds(index.passageAnchors.relation, ref);
    return index.relations.filter((relation) => ids.has(relation.id));
  },
  async allRelations(): Promise<KnowledgeRelation[]> {
    return [...(await getKnowledgeIndex()).relations];
  },
  async listClaims(): Promise<KnowledgeClaim[]> {
    return [...(await getKnowledgeIndex()).claims];
  },
  async getClaim(id: string): Promise<KnowledgeClaim | null> {
    return (await getKnowledgeIndex()).claimsById.get(id) ?? null;
  },
  async claimsForEntity(entityId: string): Promise<KnowledgeClaim[]> {
    const index = await getKnowledgeIndex();
    const ids = index.claimIdsByEntity.get(entityId) ?? new Set<string>();
    return index.claims.filter((claim) => ids.has(claim.id));
  },
  async claimsForPassage(ref: PassageRef): Promise<KnowledgeClaim[]> {
    return indexedClaimsForPassage(await getKnowledgeIndex(), ref);
  },
  async analysesForPassage(ref: PassageRef): Promise<PassageAnalysis[]> {
    const index = await getKnowledgeIndex();
    const ids = overlappingIds(index.passageAnchors.analysis, ref);
    return index.analyses.filter((analysis) => ids.has(analysis.id));
  },
  async perspectiveProfiles(): Promise<PerspectiveProfile[]> {
    return [...(await getKnowledgeIndex()).profiles];
  },
  async argumentsForClaim(
    claimId: string,
  ): Promise<{ supporting: Argument[]; opposing: Argument[] }> {
    return argumentStance(await getKnowledgeIndex(), claimId);
  },
  async viewpointsForPassage(ref: PassageRef): Promise<PassageViewpoint[]> {
    const index = await getKnowledgeIndex();
    return groupViewpoints(index, indexedClaimsForPassage(index, ref));
  },
  async sourcesForClaims(
    claimIds: string[],
  ): Promise<{ references: SourceReference[]; fragments: SourceFragment[] }> {
    return sourcesFor(await getKnowledgeIndex(), "claim", claimIds);
  },
  async sourcesForRelations(
    relationIds: string[],
  ): Promise<{ references: SourceReference[]; fragments: SourceFragment[] }> {
    return sourcesFor(await getKnowledgeIndex(), "relation", relationIds);
  },
  async sourcesForAnalyses(
    analysisIds: string[],
  ): Promise<{ references: SourceReference[]; fragments: SourceFragment[] }> {
    return sourcesFor(await getKnowledgeIndex(), "analysis", analysisIds);
  },
  async search(searchText: string, limit = 30): Promise<KnowledgeSearchHit[]> {
    const normalized = toSafeFtsQuery(searchText);
    if (!normalized) return [];
    return query(
      await getKnowledgeDatabase(),
      "SELECT record_kind,record_id,title,body,bm25(knowledge_fts) rank FROM knowledge_fts WHERE knowledge_fts MATCH ? ORDER BY rank LIMIT ?",
      [normalized, limit],
    ).map((row) => {
      const detail = optional(row, "body");
      return {
        kind: text(row, "record_kind") as KnowledgeSearchHit["kind"],
        id: text(row, "record_id"),
        label: text(row, "title"),
        ...(detail ? { detail } : {}),
        rank: Number(row["rank"] ?? 0),
      };
    });
  },
};
