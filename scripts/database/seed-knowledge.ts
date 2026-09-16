import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { buildSearchNormalization } from "../../src/lib/corpus-runtime/search-normalization";

type JsonRecord = Record<string, unknown>;

function normalizedAliases(...values: Array<string | undefined>): string {
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => buildSearchNormalization(value))
    .join(" ");
}

interface ContentSeed {
  id: string;
  version: string;
  importedAt: string;
  sources: Array<{
    id: string;
    sourceType: string;
    title: string;
    locator?: string;
    checksum?: string;
    metadata: JsonRecord;
  }>;
  knowledgeEntities: Array<{
    id: string;
    type: string;
    name: string;
    originalForm?: string;
    description?: string;
    sourceIds: string[];
  }>;
  ontology: Array<{
    id: string;
    kind: string;
    name: string;
    parentTopicId?: string;
    topicIds?: string[];
    componentClaimIds?: string[];
  }>;
  ontologyRelations: Array<{
    id: string;
    from: string;
    to: string;
    type: string;
    sourceIds?: string[];
  }>;
  perspectives: Array<{
    id: string;
    label: string;
    methodIds?: string[];
    stanceIds?: string[];
    traditionIds?: string[];
    frameworkIds?: string[];
  }>;
  claims: Array<{
    id: string;
    proposition: string;
    kind: string;
    anchor?: JsonRecord;
    sourceIds: string[];
    supportLevel: string;
    reviewStatus: string;
  }>;
  knowledgeRelations: Array<{
    id: string;
    from: JsonRecord;
    to: JsonRecord;
    type: string;
    description?: string;
    sourceIds: string[];
    reviewStatus: string;
  }>;
  evidence: Array<{
    id: string;
    label: string;
    target: JsonRecord;
    sourceIds: string[];
    reviewStatus: string;
    authorship: string;
  }>;
  arguments: Array<{
    id: string;
    title: string;
    conclusionClaimId: string;
    premiseClaimIds: string[];
    argumentType?: string;
    sourceIds: string[];
    perspectiveIds?: string[];
  }>;
  argumentRelations: Array<{
    id: string;
    fromKind: string;
    fromId: string;
    toKind: string;
    toId: string;
    type: string;
    sourceIds: string[];
  }>;
  lexemes: Array<{
    id: string;
    language: string;
    lemma: string;
    transliteration?: string;
    strongs?: string;
    sourceId: string;
    reviewStatus: string;
  }>;
  analyses?: Array<{
    id: string;
    anchor: JsonRecord;
    lensId: string;
    title: string;
    summary?: string;
    status: string;
    reviewStatus: string;
    interpretationKind: string;
    authorship: string;
    authorNote?: string;
    sourceIds: string[];
  }>;
}

function contentSeed(path: string): ContentSeed {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object") throw new Error("Content seed must be an object.");
  const seed = parsed as Partial<ContentSeed>;
  for (const key of [
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
  ] as const) {
    if (!Array.isArray(seed[key])) throw new Error(`Content seed is missing ${key}.`);
  }
  if (
    typeof seed.id !== "string" ||
    typeof seed.version !== "string" ||
    typeof seed.importedAt !== "string"
  ) {
    throw new Error("Content seed identity is invalid.");
  }
  return seed as ContentSeed;
}

const json = (value: unknown) => JSON.stringify(value);

function seedKnowledgeFile(database: DatabaseSync, seedPath: string): void {
  const seed = contentSeed(seedPath);
  const editorialSourceId = "source:scriptorium:editorial-taxonomy:v0.1";
  const insertSource = database.prepare(
    "INSERT INTO sources(id,source_type,title,locator,checksum,metadata_json) VALUES(?,?,?,?,?,?)",
  );
  for (const source of seed.sources) {
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
  for (const entity of seed.knowledgeEntities) {
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
  for (const item of seed.ontology) {
    const model = {
      id: item.id,
      kind: item.kind,
      labels: { canonicalName: item.name, aliases: [], localizedLabels: {}, abbreviations: [] },
      sourceIds: [editorialSourceId],
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
    insertOntology.run(item.id, item.kind, item.name, null, "[]", "{}", "[]", null, json(model));
    insertOntologySource.run(item.id, editorialSourceId);
  }
  const insertOntologyRelation = database.prepare(
    "INSERT INTO ontology_relations(id,from_entity_id,to_entity_id,relation_type) VALUES(?,?,?,?)",
  );
  const insertOntologyRelationSource = database.prepare(
    "INSERT INTO ontology_relation_sources(relation_id,source_id) VALUES(?,?)",
  );
  for (const relation of seed.ontologyRelations) {
    insertOntologyRelation.run(relation.id, relation.from, relation.to, relation.type);
    for (const sourceId of relation.sourceIds ?? [editorialSourceId])
      insertOntologyRelationSource.run(relation.id, sourceId);
  }

  const insertProfile = database.prepare(
    "INSERT INTO perspective_profiles(id,label,description) VALUES(?,?,?)",
  );
  const insertDimension = database.prepare(
    "INSERT INTO perspective_dimensions(profile_id,dimension_kind,ontology_entity_id) VALUES(?,?,?)",
  );
  for (const profile of seed.perspectives) {
    insertProfile.run(
      profile.id,
      profile.label,
      "Scriptorium Content Seed v0.1 perspective profile.",
    );
    for (const id of profile.methodIds ?? []) insertDimension.run(profile.id, "method", id);
    for (const id of profile.stanceIds ?? [])
      insertDimension.run(profile.id, "epistemic-stance", id);
    for (const id of profile.traditionIds ?? []) insertDimension.run(profile.id, "tradition", id);
    for (const id of profile.frameworkIds ?? [])
      insertDimension.run(profile.id, "interpretive-framework", id);
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
  for (const claim of seed.claims) {
    insertClaim.run(
      claim.id,
      claim.proposition,
      claim.kind,
      "source-derived",
      claim.reviewStatus,
      claim.supportLevel,
      null,
      json({
        seedId: seed.id,
        seedVersion: seed.version,
        importedAt: seed.importedAt,
        isDemo: false,
      }),
    );
    if (claim.anchor) insertClaimAnchor.run(claim.id, 0, json(claim.anchor));
    claim.sourceIds.forEach((sourceId) => insertClaimSource.run(claim.id, sourceId));
  }

  const insertRelation = database.prepare(
    "INSERT INTO knowledge_relations(id,from_anchor_json,to_anchor_json,relation_type,description,review_status,provenance_json) VALUES(?,?,?,?,?,?,?)",
  );
  const insertRelationSource = database.prepare(
    "INSERT INTO knowledge_relation_sources(relation_id,source_id) VALUES(?,?)",
  );
  for (const relation of seed.knowledgeRelations) {
    insertRelation.run(
      relation.id,
      json(relation.from),
      json(relation.to),
      relation.type,
      relation.description ?? null,
      relation.reviewStatus,
      json({
        seedId: seed.id,
        seedVersion: seed.version,
        importedAt: seed.importedAt,
        acquisition: "imported",
        creationMethod: "human",
        isDemo: false,
      }),
    );
    relation.sourceIds.forEach((sourceId) => insertRelationSource.run(relation.id, sourceId));
  }

  const insertEvidence = database.prepare(
    "INSERT INTO evidence(id,label,target_kind,target_json,review_status,authorship) VALUES(?,?,?,?,?,?)",
  );
  const insertEvidenceSource = database.prepare(
    "INSERT INTO evidence_sources(evidence_id,source_id) VALUES(?,?)",
  );
  for (const item of seed.evidence) {
    insertEvidence.run(
      item.id,
      item.label,
      String(item.target["kind"] ?? "source"),
      json(item.target),
      item.reviewStatus,
      item.authorship,
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
  for (const item of seed.arguments) {
    insertArgument.run(item.id, item.title, item.conclusionClaimId, item.argumentType ?? null);
    item.premiseClaimIds.forEach((claimId, ordinal) =>
      insertPremise.run(item.id, claimId, ordinal),
    );
    item.sourceIds.forEach((sourceId) => insertArgumentSource.run(item.id, sourceId));
    (item.perspectiveIds ?? []).forEach((id) => insertArgumentPerspective.run(item.id, id));
  }
  const insertArgumentRelation = database.prepare(
    "INSERT INTO argument_relations(id,from_kind,from_id,to_kind,to_id,relation_type) VALUES(?,?,?,?,?,?)",
  );
  const insertArgumentRelationSource = database.prepare(
    "INSERT INTO argument_relation_sources(relation_id,source_id) VALUES(?,?)",
  );
  for (const relation of seed.argumentRelations) {
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
  for (const item of seed.lexemes) {
    insertLexeme.run(
      item.id,
      item.language,
      item.lemma,
      item.transliteration ?? null,
      item.strongs ?? null,
      item.sourceId,
      item.reviewStatus,
      json({ seedId: seed.id, importedAt: seed.importedAt, isDemo: false }),
    );
  }

  const insertAnalysis = database.prepare(
    "INSERT INTO passage_analyses(id,anchor_json,lens_id,title,summary,analysis_status,review_status,interpretation_kind,authorship,author_note) VALUES(?,?,?,?,?,?,?,?,?,?)",
  );
  const insertAnalysisSource = database.prepare(
    "INSERT INTO passage_analysis_sources(analysis_id,source_id) VALUES(?,?)",
  );
  for (const item of seed.analyses ?? []) {
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
  seed.knowledgeEntities.forEach((item) =>
    insertFts.run(
      "knowledge-entity",
      item.id,
      item.name,
      item.description ?? "",
      normalizedAliases(item.name, item.description, item.originalForm),
    ),
  );
  seed.ontology.forEach((item) =>
    insertFts.run(item.kind, item.id, item.name, "", normalizedAliases(item.name)),
  );
  seed.claims.forEach((item) =>
    insertFts.run(
      "claim",
      item.id,
      item.proposition,
      item.proposition,
      normalizedAliases(item.proposition),
    ),
  );
  seed.arguments.forEach((item) =>
    insertFts.run("argument", item.id, item.title, "", normalizedAliases(item.title)),
  );
  seed.lexemes.forEach((item) =>
    insertFts.run(
      "lexeme",
      item.id,
      item.lemma,
      [item.transliteration, item.strongs].filter(Boolean).join(" "),
      normalizedAliases(item.lemma, item.transliteration, item.strongs),
    ),
  );
}

export function seedKnowledgeDatabase(database: DatabaseSync, seedPath: string): void {
  seedKnowledgeFile(database, seedPath);
  const packDirectory = join(dirname(seedPath), "packs");
  if (!existsSync(packDirectory)) return;
  for (const file of readdirSync(packDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort()) {
    seedKnowledgeFile(database, join(packDirectory, file));
  }
}
