import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { buildSearchNormalization } from "../../src/lib/corpus-runtime/search-normalization";
import { PORTUGUESE_KNOWLEDGE_LABELS } from "../../src/lib/content/knowledge-presentation";
import {
  ARGUMENT_RELATION_TYPES,
  ArgumentSchema,
  EvidenceRecordSchema,
  EvidenceTargetSchema,
} from "../../src/lib/domain/argument";
import {
  CLAIM_KINDS,
  ENTITY_TYPES,
  KNOWLEDGE_ORIGINS,
  REVIEW_STATUSES,
  SUPPORT_LEVELS,
} from "../../src/lib/domain/knowledge";
import { TextAnchorSchema } from "../../src/lib/domain/text-identity";
import { HistoricalRangeSchema } from "../../src/lib/domain/temporal";
import { ONTOLOGY_RELATION_TYPES } from "../../src/lib/domain/theology";

const EDITORIAL_SOURCE_ID = "source:scriptorium:editorial-taxonomy:v0.1";
const ONTOLOGY_KINDS = [
  "theological-topic",
  "doctrine",
  "tradition",
  "school",
  "method",
  "epistemic-stance",
  "interpretive-framework",
  "position",
  "theory",
] as const;
const CLAIM_PERSPECTIVE_ASSOCIATIONS = [
  "author-perspective",
  "claimed-tradition",
  "interpretive-context",
] as const;
const CLAIM_EVIDENCE_RELATIONS = [
  "supports",
  "opposes",
  "qualifies",
  "undercuts",
  "rebuts",
] as const;
const ARGUMENT_NODE_KINDS = ["claim", "argument", "evidence", "theory"] as const;
/** Each perspective dimension may only reference ontology entries of its own kind. */
const PERSPECTIVE_DIMENSIONS = [
  { field: "traditionIds", kind: "tradition" },
  { field: "schoolIds", kind: "school" },
  { field: "methodIds", kind: "method" },
  { field: "stanceIds", kind: "epistemic-stance" },
  { field: "frameworkIds", kind: "interpretive-framework" },
] as const;

const Id = z.string().min(1);
const Ids = z.array(Id);
const Text = z.string().min(1);

const PassageRefSchema = z
  .object({
    workId: Id.optional(),
    bookId: Id,
    chapter: z.number().int().positive(),
    verseStart: z.number().int().nonnegative().optional(),
    verseEnd: z.number().int().nonnegative().optional(),
    subverseStart: Text.optional(),
    subverseEnd: Text.optional(),
    versificationSchemeId: Id.optional(),
    versification: Id.optional(),
  })
  .strict();

const AnchorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("canonical-text"), anchor: TextAnchorSchema }).strict(),
  z.object({ type: z.literal("passage"), ref: PassageRefSchema }).strict(),
  z.object({ type: z.literal("text-unit"), textUnitId: Id }).strict(),
  z.object({ type: z.literal("token"), tokenId: Id }).strict(),
  z.object({ type: z.literal("lemma"), lemmaId: Id }).strict(),
  z.object({ type: z.literal("work"), workId: Id }).strict(),
  z.object({ type: z.literal("entity"), entityId: Id }).strict(),
]);

type Anchor = z.infer<typeof AnchorSchema>;

const KnowledgePackSchema = z
  .object({
    id: Id,
    version: Text,
    importedAt: z.string().datetime(),
    sources: z
      .array(
        z
          .object({
            id: Id,
            sourceType: Id,
            title: Text,
            locator: Text.optional(),
            checksum: Text.optional(),
            metadata: z.record(z.string(), z.unknown()).default({}),
          })
          .strict(),
      )
      .default([]),
    knowledgeEntities: z
      .array(
        z
          .object({
            id: Id,
            type: z.enum(ENTITY_TYPES),
            name: Text,
            originalForm: Text.optional(),
            description: Text.optional(),
            sourceIds: Ids.default([]),
          })
          .strict(),
      )
      .default([]),
    ontology: z
      .array(
        z
          .object({
            id: Id,
            kind: z.enum(ONTOLOGY_KINDS),
            name: Text,
            parentTopicId: Id.optional(),
            topicIds: Ids.optional(),
            componentClaimIds: Ids.optional(),
            aliases: z.array(Text).default([]),
            localizedLabels: z.record(z.string(), Text).default({}),
            abbreviations: z.array(Text).default([]),
            description: Text.optional(),
            historicalPeriod: HistoricalRangeSchema.optional(),
          })
          .strict(),
      )
      .default([]),
    ontologyRelations: z
      .array(
        z
          .object({
            id: Id,
            from: Id,
            to: Id,
            type: z.enum(ONTOLOGY_RELATION_TYPES),
            sourceIds: Ids.optional(),
          })
          .strict(),
      )
      .default([]),
    perspectives: z
      .array(
        z
          .object({
            id: Id,
            label: Text,
            description: Text.optional(),
            traditionIds: Ids.default([]),
            schoolIds: Ids.default([]),
            methodIds: Ids.default([]),
            stanceIds: Ids.default([]),
            frameworkIds: Ids.default([]),
          })
          .strict(),
      )
      .default([]),
    claims: z
      .array(
        z
          .object({
            id: Id,
            proposition: Text,
            kind: z.enum(CLAIM_KINDS),
            anchor: AnchorSchema.optional(),
            anchors: z.array(AnchorSchema).default([]),
            sourceIds: Ids.default([]),
            supportLevel: z.enum(SUPPORT_LEVELS),
            reviewStatus: z.enum(REVIEW_STATUSES),
            origin: z.enum(KNOWLEDGE_ORIGINS).default("source-derived"),
            assessmentNote: Text.optional(),
            perspectiveIds: Ids.default([]),
            perspectives: z
              .array(
                z
                  .object({ profileId: Id, association: z.enum(CLAIM_PERSPECTIVE_ASSOCIATIONS) })
                  .strict(),
              )
              .default([]),
            evidence: z
              .array(
                z.object({ evidenceId: Id, relation: z.enum(CLAIM_EVIDENCE_RELATIONS) }).strict(),
              )
              .default([]),
          })
          .strict(),
      )
      .default([]),
    knowledgeRelations: z
      .array(
        z
          .object({
            id: Id,
            from: AnchorSchema,
            to: AnchorSchema,
            type: Id,
            description: Text.optional(),
            sourceIds: Ids.default([]),
            reviewStatus: z.enum(REVIEW_STATUSES),
          })
          .strict(),
      )
      .default([]),
    evidence: z
      .array(
        z
          .object({
            id: Id,
            label: Text,
            target: EvidenceTargetSchema,
            sourceIds: Ids.default([]),
            reviewStatus: EvidenceRecordSchema.shape.reviewStatus,
            authorship: EvidenceRecordSchema.shape.authorship,
            notes: Text.optional(),
          })
          .strict(),
      )
      .default([]),
    arguments: z
      .array(
        z
          .object({
            id: Id,
            title: Text,
            conclusionClaimId: Id,
            premiseClaimIds: Ids.min(1),
            argumentType: ArgumentSchema.shape.argumentType,
            sourceIds: Ids.default([]),
            perspectiveIds: Ids.default([]),
          })
          .strict(),
      )
      .default([]),
    argumentRelations: z
      .array(
        z
          .object({
            id: Id,
            fromKind: z.enum(ARGUMENT_NODE_KINDS),
            fromId: Id,
            toKind: z.enum(ARGUMENT_NODE_KINDS),
            toId: Id,
            type: z.enum(ARGUMENT_RELATION_TYPES),
            sourceIds: Ids.default([]),
          })
          .strict(),
      )
      .default([]),
    lexemes: z
      .array(
        z
          .object({
            id: Id,
            language: Id,
            lemma: Text,
            transliteration: Text.optional(),
            strongs: Text.optional(),
            sourceId: Id,
            reviewStatus: z.enum(REVIEW_STATUSES),
          })
          .strict(),
      )
      .default([]),
    analyses: z
      .array(
        z
          .object({
            id: Id,
            anchor: AnchorSchema,
            lensId: Id,
            title: Text,
            summary: Text.optional(),
            status: z.enum(["placeholder", "draft", "reviewed"]),
            reviewStatus: z.enum(REVIEW_STATUSES),
            interpretationKind: z.enum(CLAIM_KINDS),
            authorship: EvidenceRecordSchema.shape.authorship,
            authorNote: Text.optional(),
            sourceIds: Ids.default([]),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

type KnowledgePack = z.infer<typeof KnowledgePackSchema>;
type Collection = Exclude<keyof KnowledgePack, "id" | "version" | "importedAt">;

const COLLECTIONS = [
  "sources",
  "knowledgeEntities",
  "ontology",
  "ontologyRelations",
  "perspectives",
  "claims",
  "knowledgeRelations",
  "evidence",
  "arguments",
  "argumentRelations",
  "lexemes",
  "analyses",
] as const satisfies readonly Collection[];

interface LoadedPack {
  file: string;
  pack: KnowledgePack;
}

export interface KnowledgeSeedReport {
  files: string[];
  problems: string[];
  counts: Record<Collection, number> & { claimPerspectives: number; claimEvidence: number };
}

export class KnowledgeContentError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      `Knowledge content has ${problems.length} problem(s):\n${problems.map((problem) => `  - ${problem}`).join("\n")}`,
    );
    this.name = "KnowledgeContentError";
    this.problems = problems;
  }
}

function normalizedAliases(...values: Array<string | undefined>): string {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .map((value) => buildSearchNormalization(value))
    .join(" ");
}

function packFiles(seedPath: string): string[] {
  const packDirectory = join(dirname(seedPath), "packs");
  const packs = existsSync(packDirectory)
    ? readdirSync(packDirectory)
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map((name) => join(packDirectory, name))
    : [];
  return [seedPath, ...packs];
}

function recordLabel(raw: unknown, path: readonly (string | number)[]): string {
  const [collection, index] = path;
  if (typeof collection !== "string" || typeof index !== "number") return "(pack)";
  const record = (raw as Record<string, unknown> | null)?.[collection];
  const item = Array.isArray(record) ? (record[index] as { id?: unknown } | undefined) : undefined;
  return typeof item?.id === "string" ? item.id : `${collection}[${index}]`;
}

function loadPacks(seedPath: string): { packs: LoadedPack[]; problems: string[] } {
  const root = dirname(seedPath);
  const packs: LoadedPack[] = [];
  const problems: string[] = [];
  for (const path of packFiles(seedPath)) {
    const file = relative(root, path).replaceAll("\\", "/");
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      problems.push(`${file} › (file) › ${(error as Error).message}`);
      continue;
    }
    const result = KnowledgePackSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path.slice(2).join(".") || issue.path.join(".") || "(root)";
        problems.push(`${file} › ${recordLabel(raw, issue.path)} › ${field}: ${issue.message}`);
      }
      continue;
    }
    packs.push({ file, pack: result.data });
  }
  return { packs, problems };
}

function claimAnchors(claim: KnowledgePack["claims"][number]): Anchor[] {
  const anchors = claim.anchor ? [claim.anchor, ...claim.anchors] : claim.anchors;
  const seen = new Set<string>();
  return anchors.filter((anchor) => {
    const key = JSON.stringify(anchor);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function claimPerspectives(
  claim: KnowledgePack["claims"][number],
): { profileId: string; association: (typeof CLAIM_PERSPECTIVE_ASSOCIATIONS)[number] }[] {
  // A bare perspectiveIds entry only says the claim is read within that profile.
  const entries = [
    ...claim.perspectiveIds.map((profileId) => ({
      profileId,
      association: "interpretive-context" as const,
    })),
    ...claim.perspectives,
  ];
  return [
    ...new Map(
      entries.map((entry) => [`${entry.profileId}\0${entry.association}`, entry]),
    ).values(),
  ];
}

function claimEvidence(
  claim: KnowledgePack["claims"][number],
): { evidenceId: string; relation: (typeof CLAIM_EVIDENCE_RELATIONS)[number] }[] {
  return [
    ...new Map(
      claim.evidence.map((entry) => [`${entry.evidenceId}\0${entry.relation}`, entry]),
    ).values(),
  ];
}

/** Cross-file checks: every identifier is unique and every reference resolves. */
function referenceProblems(packs: LoadedPack[]): string[] {
  const problems: string[] = [];
  const defined = new Map<Collection, Map<string, string>>(
    COLLECTIONS.map((collection) => [collection, new Map()]),
  );
  const ontologyKinds = new Map<string, string>();
  for (const { file, pack } of packs)
    for (const collection of COLLECTIONS)
      for (const record of pack[collection]) {
        const ids = defined.get(collection)!;
        const first = ids.get(record.id);
        if (first) {
          problems.push(
            `${file} › ${record.id} › duplicate ${collection} id (first defined in ${first})`,
          );
          continue;
        }
        ids.set(record.id, file);
        if (collection === "ontology")
          ontologyKinds.set(record.id, (record as { kind: string }).kind);
      }

  for (const { file, pack } of packs) {
    const report = (recordId: string, problem: string) =>
      problems.push(`${file} › ${recordId} › ${problem}`);
    const expect = (recordId: string, collection: Collection, id: string, role: string) => {
      if (!defined.get(collection)!.has(id)) report(recordId, `${role} ${id} does not exist`);
    };
    const expectOntology = (recordId: string, id: string, kind: string | null, role: string) => {
      const actual = ontologyKinds.get(id);
      if (!actual) report(recordId, `${role} ${id} does not exist`);
      else if (kind && actual !== kind)
        report(recordId, `${role} ${id} is a ${actual}, expected ${kind}`);
    };
    const expectSources = (recordId: string, sourceIds: readonly string[]) => {
      const seen = new Set<string>();
      for (const sourceId of sourceIds) {
        if (seen.has(sourceId)) report(recordId, `source ${sourceId} is listed twice`);
        seen.add(sourceId);
        expect(recordId, "sources", sourceId, "source");
      }
    };
    const expectAnchor = (recordId: string, anchor: Anchor, role: string) => {
      if (anchor.type === "entity") expect(recordId, "knowledgeEntities", anchor.entityId, role);
    };

    for (const entity of pack.knowledgeEntities) expectSources(entity.id, entity.sourceIds);
    if (pack.ontology.length || pack.ontologyRelations.some((relation) => !relation.sourceIds))
      expect(pack.id, "sources", EDITORIAL_SOURCE_ID, "editorial source");
    for (const item of pack.ontology) {
      if (item.parentTopicId)
        expectOntology(item.id, item.parentTopicId, "theological-topic", "parent topic");
      for (const topicId of item.topicIds ?? [])
        expectOntology(item.id, topicId, "theological-topic", "topic");
      for (const claimId of item.componentClaimIds ?? [])
        expect(item.id, "claims", claimId, "component claim");
    }
    for (const relation of pack.ontologyRelations) {
      expectOntology(relation.id, relation.from, null, "from");
      expectOntology(relation.id, relation.to, null, "to");
      expectSources(relation.id, relation.sourceIds ?? []);
    }
    for (const profile of pack.perspectives)
      for (const dimension of PERSPECTIVE_DIMENSIONS)
        for (const id of profile[dimension.field])
          expectOntology(profile.id, id, dimension.kind, dimension.field);
    for (const claim of pack.claims) {
      expectSources(claim.id, claim.sourceIds);
      claimAnchors(claim).forEach((anchor) => expectAnchor(claim.id, anchor, "anchor entity"));
      for (const { profileId } of claimPerspectives(claim))
        expect(claim.id, "perspectives", profileId, "perspective");
      for (const { evidenceId } of claimEvidence(claim))
        expect(claim.id, "evidence", evidenceId, "evidence");
    }
    for (const relation of pack.knowledgeRelations) {
      expectSources(relation.id, relation.sourceIds);
      expectAnchor(relation.id, relation.from, "from entity");
      expectAnchor(relation.id, relation.to, "to entity");
    }
    for (const item of pack.evidence) expectSources(item.id, item.sourceIds);
    for (const item of pack.arguments) {
      expectSources(item.id, item.sourceIds);
      expect(item.id, "claims", item.conclusionClaimId, "conclusion claim");
      for (const claimId of item.premiseClaimIds)
        expect(item.id, "claims", claimId, "premise claim");
      if (new Set(item.premiseClaimIds).size !== item.premiseClaimIds.length)
        report(item.id, "premise claims are listed twice");
      for (const profileId of item.perspectiveIds)
        expect(item.id, "perspectives", profileId, "perspective");
    }
    for (const relation of pack.argumentRelations) {
      expectSources(relation.id, relation.sourceIds);
      for (const [kind, id, role] of [
        [relation.fromKind, relation.fromId, "from"],
        [relation.toKind, relation.toId, "to"],
      ] as const) {
        if (kind === "theory") expectOntology(relation.id, id, "theory", `${role} theory`);
        else
          expect(
            relation.id,
            kind === "claim" ? "claims" : kind === "argument" ? "arguments" : "evidence",
            id,
            `${role} ${kind}`,
          );
      }
    }
    for (const item of pack.lexemes) expect(item.id, "sources", item.sourceId, "source");
    for (const item of pack.analyses) {
      expectSources(item.id, item.sourceIds);
      expectAnchor(item.id, item.anchor, "anchor entity");
    }
  }
  return problems;
}

function emptyCounts(): KnowledgeSeedReport["counts"] {
  return {
    ...(Object.fromEntries(COLLECTIONS.map((collection) => [collection, 0])) as Record<
      Collection,
      number
    >),
    claimPerspectives: 0,
    claimEvidence: 0,
  };
}

function countPacks(packs: LoadedPack[]): KnowledgeSeedReport["counts"] {
  const counts = emptyCounts();
  for (const { pack } of packs) {
    for (const collection of COLLECTIONS) counts[collection] += pack[collection].length;
    for (const claim of pack.claims) {
      counts.claimPerspectives += claimPerspectives(claim).length;
      counts.claimEvidence += claimEvidence(claim).length;
    }
  }
  return counts;
}

/** Loads the seed and every pack, then validates all of them without writing anything. */
export function validateKnowledgeContent(seedPath: string): KnowledgeSeedReport {
  const { packs, problems } = loadPacks(seedPath);
  if (!problems.length) problems.push(...referenceProblems(packs));
  const root = dirname(seedPath);
  return {
    files: packFiles(seedPath).map((path) => relative(root, path).replaceAll("\\", "/")),
    problems,
    counts: problems.length ? emptyCounts() : countPacks(packs),
  };
}

const json = (value: unknown) => JSON.stringify(value);

function writePack(database: DatabaseSync, pack: KnowledgePack): void {
  const insertSource = database.prepare(
    "INSERT INTO sources(id,source_type,title,locator,checksum,metadata_json) VALUES(?,?,?,?,?,?)",
  );
  for (const source of pack.sources) {
    insertSource.run(
      source.id,
      source.sourceType,
      source.title,
      source.locator ?? null,
      source.checksum ?? null,
      json(source.metadata),
    );
  }

  const insertEntity = database.prepare(
    "INSERT INTO knowledge_entities(id,entity_type,canonical_name,description,metadata_json) VALUES(?,?,?,?,?)",
  );
  const insertEntitySource = database.prepare(
    "INSERT INTO knowledge_entity_sources(entity_id,source_id) VALUES(?,?)",
  );
  for (const entity of pack.knowledgeEntities) {
    insertEntity.run(
      entity.id,
      entity.type,
      entity.name,
      entity.description ?? null,
      json({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        ...(entity.originalForm ? { originalForm: entity.originalForm } : {}),
        ...(entity.description ? { description: entity.description } : {}),
      }),
    );
    entity.sourceIds.forEach((sourceId) => insertEntitySource.run(entity.id, sourceId));
  }

  const insertOntology = database.prepare(
    "INSERT INTO ontology_entities(id,ontology_kind,canonical_name,description,aliases_json,localized_labels_json,abbreviations_json,historical_period_json,metadata_json) VALUES(?,?,?,?,?,?,?,?,?)",
  );
  const insertOntologySource = database.prepare(
    "INSERT INTO ontology_entity_sources(entity_id,source_id) VALUES(?,?)",
  );
  for (const item of pack.ontology) {
    const portuguese = PORTUGUESE_KNOWLEDGE_LABELS[item.id];
    const localizedLabels = {
      ...item.localizedLabels,
      ...(!item.localizedLabels["pt-BR"] && portuguese ? { "pt-BR": portuguese } : {}),
    };
    const model = {
      id: item.id,
      kind: item.kind,
      labels: {
        canonicalName: item.name,
        aliases: item.aliases,
        localizedLabels,
        abbreviations: item.abbreviations,
      },
      ...(item.description ? { description: item.description } : {}),
      ...(item.historicalPeriod ? { historicalPeriod: item.historicalPeriod } : {}),
      sourceIds: [EDITORIAL_SOURCE_ID],
      ...(item.parentTopicId ? { parentTopicId: item.parentTopicId } : {}),
      ...(item.topicIds ? { topicIds: item.topicIds } : {}),
      ...(item.kind === "theory"
        ? {
            componentClaimIds: item.componentClaimIds ?? [],
            assumptionClaimIds: [],
            proponentIds: [],
          }
        : {}),
    };
    insertOntology.run(
      item.id,
      item.kind,
      item.name,
      item.description ?? null,
      json(item.aliases),
      json(localizedLabels),
      json(item.abbreviations),
      item.historicalPeriod ? json(item.historicalPeriod) : null,
      json(model),
    );
    insertOntologySource.run(item.id, EDITORIAL_SOURCE_ID);
  }
  const insertOntologyRelation = database.prepare(
    "INSERT INTO ontology_relations(id,from_entity_id,to_entity_id,relation_type) VALUES(?,?,?,?)",
  );
  const insertOntologyRelationSource = database.prepare(
    "INSERT INTO ontology_relation_sources(relation_id,source_id) VALUES(?,?)",
  );
  for (const relation of pack.ontologyRelations) {
    insertOntologyRelation.run(relation.id, relation.from, relation.to, relation.type);
    for (const sourceId of relation.sourceIds ?? [EDITORIAL_SOURCE_ID])
      insertOntologyRelationSource.run(relation.id, sourceId);
  }

  const insertProfile = database.prepare(
    "INSERT INTO perspective_profiles(id,label,description) VALUES(?,?,?)",
  );
  const insertDimension = database.prepare(
    "INSERT INTO perspective_dimensions(profile_id,dimension_kind,ontology_entity_id) VALUES(?,?,?)",
  );
  for (const profile of pack.perspectives) {
    insertProfile.run(profile.id, profile.label, profile.description ?? null);
    for (const dimension of PERSPECTIVE_DIMENSIONS)
      for (const id of profile[dimension.field])
        insertDimension.run(profile.id, dimension.kind, id);
  }

  const insertClaim = database.prepare(
    "INSERT INTO claims(id,proposition,claim_type,origin,review_status,support_level,assessment_note,provenance_json) VALUES(?,?,?,?,?,?,?,?)",
  );
  const insertClaimAnchor = database.prepare(
    "INSERT INTO claim_anchors(claim_id,ordinal,anchor_json) VALUES(?,?,?)",
  );
  const insertClaimSource = database.prepare(
    "INSERT INTO claim_sources(claim_id,source_id) VALUES(?,?)",
  );
  const insertClaimPerspective = database.prepare(
    "INSERT INTO claim_perspectives(claim_id,profile_id,association_kind) VALUES(?,?,?)",
  );
  const insertClaimEvidence = database.prepare(
    "INSERT INTO claim_evidence(claim_id,evidence_id,relation_type) VALUES(?,?,?)",
  );
  for (const claim of pack.claims) {
    insertClaim.run(
      claim.id,
      claim.proposition,
      claim.kind,
      claim.origin,
      claim.reviewStatus,
      claim.supportLevel,
      claim.assessmentNote ?? null,
      json({
        seedId: pack.id,
        seedVersion: pack.version,
        importedAt: pack.importedAt,
        isDemo: false,
      }),
    );
    claimAnchors(claim).forEach((anchor, ordinal) =>
      insertClaimAnchor.run(claim.id, ordinal, json(anchor)),
    );
    claim.sourceIds.forEach((sourceId) => insertClaimSource.run(claim.id, sourceId));
    for (const { profileId, association } of claimPerspectives(claim))
      insertClaimPerspective.run(claim.id, profileId, association);
    for (const { evidenceId, relation } of claimEvidence(claim))
      insertClaimEvidence.run(claim.id, evidenceId, relation);
  }

  const insertRelation = database.prepare(
    "INSERT INTO knowledge_relations(id,from_anchor_json,to_anchor_json,relation_type,description,review_status,provenance_json) VALUES(?,?,?,?,?,?,?)",
  );
  const insertRelationSource = database.prepare(
    "INSERT INTO knowledge_relation_sources(relation_id,source_id) VALUES(?,?)",
  );
  for (const relation of pack.knowledgeRelations) {
    insertRelation.run(
      relation.id,
      json(relation.from),
      json(relation.to),
      relation.type,
      relation.description ?? null,
      relation.reviewStatus,
      json({
        seedId: pack.id,
        seedVersion: pack.version,
        importedAt: pack.importedAt,
        acquisition: "imported",
        creationMethod: "human",
        isDemo: false,
      }),
    );
    relation.sourceIds.forEach((sourceId) => insertRelationSource.run(relation.id, sourceId));
  }

  const insertEvidence = database.prepare(
    "INSERT INTO evidence(id,label,target_kind,target_json,review_status,authorship,notes) VALUES(?,?,?,?,?,?,?)",
  );
  const insertEvidenceSource = database.prepare(
    "INSERT INTO evidence_sources(evidence_id,source_id) VALUES(?,?)",
  );
  for (const item of pack.evidence) {
    insertEvidence.run(
      item.id,
      item.label,
      item.target.kind,
      json(item.target),
      item.reviewStatus,
      item.authorship,
      item.notes ?? null,
    );
    item.sourceIds.forEach((sourceId) => insertEvidenceSource.run(item.id, sourceId));
  }

  const insertArgument = database.prepare(
    "INSERT INTO arguments(id,title,conclusion_claim_id,argument_type) VALUES(?,?,?,?)",
  );
  const insertPremise = database.prepare(
    "INSERT INTO argument_premises(argument_id,claim_id,ordinal) VALUES(?,?,?)",
  );
  const insertArgumentSource = database.prepare(
    "INSERT INTO argument_sources(argument_id,source_id) VALUES(?,?)",
  );
  const insertArgumentPerspective = database.prepare(
    "INSERT INTO argument_perspectives(argument_id,profile_id) VALUES(?,?)",
  );
  for (const item of pack.arguments) {
    insertArgument.run(item.id, item.title, item.conclusionClaimId, item.argumentType ?? null);
    item.premiseClaimIds.forEach((claimId, ordinal) =>
      insertPremise.run(item.id, claimId, ordinal),
    );
    item.sourceIds.forEach((sourceId) => insertArgumentSource.run(item.id, sourceId));
    item.perspectiveIds.forEach((id) => insertArgumentPerspective.run(item.id, id));
  }
  const insertArgumentRelation = database.prepare(
    "INSERT INTO argument_relations(id,from_kind,from_id,to_kind,to_id,relation_type) VALUES(?,?,?,?,?,?)",
  );
  const insertArgumentRelationSource = database.prepare(
    "INSERT INTO argument_relation_sources(relation_id,source_id) VALUES(?,?)",
  );
  for (const relation of pack.argumentRelations) {
    insertArgumentRelation.run(
      relation.id,
      relation.fromKind,
      relation.fromId,
      relation.toKind,
      relation.toId,
      relation.type,
    );
    relation.sourceIds.forEach((sourceId) =>
      insertArgumentRelationSource.run(relation.id, sourceId),
    );
  }

  const insertLexeme = database.prepare(
    "INSERT INTO lexemes(id,language,lemma,transliteration,strongs,source_id,review_status,provenance_json) VALUES(?,?,?,?,?,?,?,?)",
  );
  for (const item of pack.lexemes) {
    insertLexeme.run(
      item.id,
      item.language,
      item.lemma,
      item.transliteration ?? null,
      item.strongs ?? null,
      item.sourceId,
      item.reviewStatus,
      json({ seedId: pack.id, importedAt: pack.importedAt, isDemo: false }),
    );
  }

  const insertAnalysis = database.prepare(
    "INSERT INTO passage_analyses(id,anchor_json,lens_id,title,summary,analysis_status,review_status,interpretation_kind,authorship,author_note) VALUES(?,?,?,?,?,?,?,?,?,?)",
  );
  const insertAnalysisSource = database.prepare(
    "INSERT INTO passage_analysis_sources(analysis_id,source_id) VALUES(?,?)",
  );
  for (const item of pack.analyses) {
    insertAnalysis.run(
      item.id,
      json(item.anchor),
      item.lensId,
      item.title,
      item.summary ?? null,
      item.status,
      item.reviewStatus,
      item.interpretationKind,
      item.authorship,
      item.authorNote ?? null,
    );
    item.sourceIds.forEach((sourceId) => insertAnalysisSource.run(item.id, sourceId));
  }

  const insertFts = database.prepare(
    "INSERT INTO knowledge_fts(record_kind,record_id,title,body,aliases) VALUES(?,?,?,?,?)",
  );
  pack.knowledgeEntities.forEach((item) =>
    insertFts.run(
      "knowledge-entity",
      item.id,
      item.name,
      item.description ?? "",
      normalizedAliases(
        item.name,
        item.description,
        item.originalForm,
        PORTUGUESE_KNOWLEDGE_LABELS[item.id],
      ),
    ),
  );
  pack.ontology.forEach((item) =>
    insertFts.run(
      item.kind,
      item.id,
      item.name,
      item.description ?? "",
      normalizedAliases(
        item.name,
        ...item.aliases,
        ...Object.values(item.localizedLabels),
        PORTUGUESE_KNOWLEDGE_LABELS[item.id],
        ...item.abbreviations,
      ),
    ),
  );
  pack.claims.forEach((item) =>
    insertFts.run(
      "claim",
      item.id,
      item.proposition,
      item.proposition,
      normalizedAliases(item.proposition),
    ),
  );
  pack.arguments.forEach((item) =>
    insertFts.run("argument", item.id, item.title, "", normalizedAliases(item.title)),
  );
  pack.lexemes.forEach((item) =>
    insertFts.run(
      "lexeme",
      item.id,
      item.lemma,
      [item.transliteration, item.strongs].filter(Boolean).join(" "),
      normalizedAliases(item.lemma, item.transliteration, item.strongs),
    ),
  );
}

/**
 * Validates the seed and every pack before writing a single row, then writes them in order. Foreign
 * keys are deferred because a claim may cite evidence defined further down or in a later pack.
 */
export function seedKnowledgeDatabase(
  database: DatabaseSync,
  seedPath: string,
): KnowledgeSeedReport {
  const { packs, problems } = loadPacks(seedPath);
  if (!problems.length) problems.push(...referenceProblems(packs));
  if (problems.length) throw new KnowledgeContentError(problems);
  database.exec("SAVEPOINT seed_knowledge; PRAGMA defer_foreign_keys = ON;");
  try {
    for (const { pack } of packs) writePack(database, pack);
    database.exec("RELEASE seed_knowledge;");
  } catch (error) {
    database.exec("ROLLBACK TO seed_knowledge; RELEASE seed_knowledge;");
    throw error;
  }
  return { files: packs.map((item) => item.file), problems: [], counts: countPacks(packs) };
}
