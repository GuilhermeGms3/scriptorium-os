import type { Argument, ArgumentRelation, EvidenceRecord } from "../domain/argument";
import { ArgumentRelationSchema, EvidenceRecordSchema } from "../domain/argument";
import type { KnowledgeClaim, TextAnchor } from "../domain/knowledge";
import type { OntologyEntity, OntologyRelation } from "../domain/theology";
import { OntologyEntitySchema, OntologyRelationSchema } from "../domain/theology";
import type { PerspectiveFilter, PerspectiveProfile } from "../domain/perspective";
import { PerspectiveProfileSchema, perspectiveMatches } from "../domain/perspective";
import {
  getKnowledgeDatabase as database,
  knowledgeOptionalText as optional,
  knowledgeQuery as query,
  knowledgeText as value,
  type KnowledgeRow as Row,
} from "./knowledge-database";
import { getKnowledgeIndex } from "./knowledge-repository";

function ontology(row: Row): OntologyEntity {
  return OntologyEntitySchema.parse(JSON.parse(value(row, "metadata_json")));
}
function claim(row: Row, anchors: TextAnchor[]): KnowledgeClaim {
  const assessmentNote = optional(row, "assessment_note");
  return {
    id: value(row, "id"),
    proposition: value(row, "proposition"),
    kind: value(row, "claim_type") as KnowledgeClaim["kind"],
    anchors,
    evidence: [],
    sourceFragmentIds: [],
    origin: value(row, "origin") as KnowledgeClaim["origin"],
    reviewStatus: value(row, "review_status") as KnowledgeClaim["reviewStatus"],
    supportLevel: value(row, "support_level") as KnowledgeClaim["supportLevel"],
    ...(assessmentNote ? { assessmentNote } : {}),
  };
}
async function getClaimInternal(id: string): Promise<KnowledgeClaim | null> {
  const db = await database();
  const row = query(db, "SELECT * FROM claims WHERE id=?", [id])[0];
  if (!row) return null;
  const anchors = query(
    db,
    "SELECT anchor_json FROM claim_anchors WHERE claim_id=? ORDER BY ordinal",
    [id],
  ).map((item) => JSON.parse(value(item, "anchor_json")) as TextAnchor);
  return claim(row, anchors);
}
/** Arguments related to a claim through argument_relations, in relation order. */
async function argumentsRelatedTo(
  claimId: string,
  types: readonly ArgumentRelation["relationType"][],
): Promise<Argument[]> {
  const index = await getKnowledgeIndex();
  const ids = new Set(
    (index.argumentRelationsToClaim.get(claimId) ?? [])
      .filter(
        (relation) => relation.fromKind === "argument" && types.includes(relation.relationType),
      )
      .map((relation) => relation.fromId),
  );
  return [...ids].flatMap((id) => index.argumentsById.get(id) ?? []);
}

export const TheologyRepository = {
  async listEntities(kind?: OntologyEntity["kind"]): Promise<OntologyEntity[]> {
    const db = await database();
    return query(
      db,
      `SELECT metadata_json FROM ontology_entities${kind ? " WHERE ontology_kind=?" : ""} ORDER BY canonical_name`,
      kind ? [kind] : [],
    ).map(ontology);
  },
  async getEntity(id: string): Promise<OntologyEntity | null> {
    const row = query(await database(), "SELECT metadata_json FROM ontology_entities WHERE id=?", [
      id,
    ])[0];
    return row ? ontology(row) : null;
  },
  async getRelations(id: string): Promise<OntologyRelation[]> {
    return query(
      await database(),
      "SELECT * FROM ontology_relations WHERE from_entity_id=? OR to_entity_id=?",
      [id, id],
    ).map((row) =>
      OntologyRelationSchema.parse({
        id: value(row, "id"),
        fromEntityId: value(row, "from_entity_id"),
        toEntityId: value(row, "to_entity_id"),
        relationType: value(row, "relation_type"),
        sourceIds: [],
        historicalValidity: optional(row, "historical_validity_json")
          ? JSON.parse(value(row, "historical_validity_json"))
          : undefined,
        notes: optional(row, "notes"),
      }),
    );
  },
};

export const PerspectiveRepository = {
  async list(filter: PerspectiveFilter = {}): Promise<PerspectiveProfile[]> {
    const db = await database();
    const profiles: PerspectiveProfile[] = [];
    for (const row of query(db, "SELECT * FROM perspective_profiles ORDER BY label")) {
      const id = value(row, "id");
      const dimensions = query(
        db,
        "SELECT dimension_kind,ontology_entity_id FROM perspective_dimensions WHERE profile_id=?",
        [id],
      );
      const ids = (kind: string) =>
        dimensions
          .filter((item) => item["dimension_kind"] === kind)
          .map((item) => value(item, "ontology_entity_id"));
      profiles.push(
        PerspectiveProfileSchema.parse({
          id,
          label: value(row, "label"),
          description: optional(row, "description"),
          authorId: optional(row, "author_id"),
          historicalContext: optional(row, "historical_context_json")
            ? JSON.parse(value(row, "historical_context_json"))
            : undefined,
          traditionIds: ids("tradition"),
          schoolIds: ids("school"),
          methodIds: ids("method"),
          epistemicStanceIds: ids("epistemic-stance"),
          interpretiveFrameworkIds: ids("interpretive-framework"),
        }),
      );
    }
    return profiles.filter((profile) => perspectiveMatches(profile, filter));
  },
};

export const ArgumentRepository = {
  getClaim: getClaimInternal,
  async getArgumentsForClaim(id: string): Promise<Argument[]> {
    const index = await getKnowledgeIndex();
    const ids = new Set([
      ...(index.argumentIdsByConclusion.get(id) ?? []),
      ...(index.argumentIdsByPremise.get(id) ?? []),
    ]);
    return index.argumentList.filter((argument) => ids.has(argument.id));
  },
  async getSupportingArguments(id: string): Promise<Argument[]> {
    return argumentsRelatedTo(id, ["supports"]);
  },
  async getOpposingArguments(id: string): Promise<Argument[]> {
    return argumentsRelatedTo(id, ["opposes", "rebuts", "undercuts"]);
  },
  async getObjections(argumentId: string): Promise<ArgumentRelation[]> {
    return this.getRelationsTo("argument", argumentId, ["objects-to", "undercuts", "rebuts"]);
  },
  async getResponses(objectionId: string): Promise<ArgumentRelation[]> {
    return this.getRelationsTo("argument", objectionId, ["responds-to"]);
  },
  async getRelationsTo(
    toKind: ArgumentRelation["toKind"],
    toId: string,
    types?: ArgumentRelation["relationType"][],
  ): Promise<ArgumentRelation[]> {
    const db = await database();
    const records = query(db, "SELECT * FROM argument_relations WHERE to_kind=? AND to_id=?", [
      toKind,
      toId,
    ]);
    return records
      .map((row) =>
        ArgumentRelationSchema.parse({
          id: value(row, "id"),
          fromKind: value(row, "from_kind"),
          fromId: value(row, "from_id"),
          toKind: value(row, "to_kind"),
          toId: value(row, "to_id"),
          relationType: value(row, "relation_type"),
          sourceIds: [],
          notes: optional(row, "notes"),
        }),
      )
      .filter((relation) => !types || types.includes(relation.relationType));
  },
  async getEvidenceForClaim(id: string): Promise<EvidenceRecord[]> {
    const db = await database();
    return query(
      db,
      "SELECT e.* FROM evidence e JOIN claim_evidence ce ON ce.evidence_id=e.id WHERE ce.claim_id=?",
      [id],
    ).map((row) =>
      EvidenceRecordSchema.parse({
        id: value(row, "id"),
        label: value(row, "label"),
        target: JSON.parse(value(row, "target_json")),
        sourceIds: [],
        reviewStatus: value(row, "review_status"),
        authorship: value(row, "authorship"),
        notes: optional(row, "notes"),
      }),
    );
  },
  async getCompetingTheories(id: string): Promise<OntologyEntity[]> {
    const relations = await this.getRelationsTo("theory", id, ["alternative-to", "competes-with"]);
    return (
      await Promise.all(relations.map((relation) => TheologyRepository.getEntity(relation.fromId)))
    ).filter((entity): entity is OntologyEntity => entity?.kind === "theory");
  },
  async getClaimsForOntologyEntity(id: string): Promise<KnowledgeClaim[]> {
    const entity = await TheologyRepository.getEntity(id);
    const claimIds =
      entity?.kind === "theory" ? [...entity.componentClaimIds, ...entity.assumptionClaimIds] : [];
    return (await Promise.all(claimIds.map(getClaimInternal))).filter(
      (item): item is KnowledgeClaim => item !== null,
    );
  },
};
