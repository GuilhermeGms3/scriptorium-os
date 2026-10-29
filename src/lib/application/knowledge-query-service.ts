import type { Argument, ArgumentRelation, EvidenceRecord } from "../domain/argument";
import type { KnowledgeClaim, KnowledgeEntity, KnowledgeRelation } from "../domain/knowledge";
import type { PerspectiveProfile } from "../domain/perspective";
import type { OntologyEntity, OntologyRelation } from "../domain/theology";
import {
  ArgumentRepository,
  PerspectiveRepository,
  TheologyRepository,
} from "../repositories/argument-repository";
import { KnowledgeRepository } from "../repositories/knowledge-repository";

export type ExplorerEntity =
  { kind: "knowledge"; entity: KnowledgeEntity } | { kind: "ontology"; entity: OntologyEntity };

export interface KnowledgeExplorerBundle {
  selected: ExplorerEntity;
  claims: KnowledgeClaim[];
  argumentClaims: KnowledgeClaim[];
  arguments: Argument[];
  argumentRelations: ArgumentRelation[];
  knowledgeRelations: KnowledgeRelation[];
  ontologyRelations: OntologyRelation[];
  relatedTheories: OntologyEntity[];
  supportingArguments: Argument[];
  opposingArguments: Argument[];
  objections: ArgumentRelation[];
  responses: ArgumentRelation[];
  evidence: EvidenceRecord[];
  perspectives: PerspectiveProfile[];
}

function uniqueById<T extends { id: string }>(values: readonly T[]): T[] {
  return values.filter(
    (value, index, all) => all.findIndex((candidate) => candidate.id === value.id) === index,
  );
}

async function enrichClaimsAndArguments(claims: KnowledgeClaim[], argumentsList: Argument[]) {
  const referencedClaimIds = new Set(
    argumentsList.flatMap((argument) => [argument.conclusionClaimId, ...argument.premiseClaimIds]),
  );
  const [supporting, opposing, evidence, objections, responses, allPerspectives, argumentClaims] =
    await Promise.all([
      Promise.all(claims.map((claim) => ArgumentRepository.getSupportingArguments(claim.id))),
      Promise.all(claims.map((claim) => ArgumentRepository.getOpposingArguments(claim.id))),
      Promise.all(claims.map((claim) => ArgumentRepository.getEvidenceForClaim(claim.id))),
      Promise.all(argumentsList.map((argument) => ArgumentRepository.getObjections(argument.id))),
      Promise.all(argumentsList.map((argument) => ArgumentRepository.getResponses(argument.id))),
      PerspectiveRepository.list(),
      Promise.all([...referencedClaimIds].map((claimId) => KnowledgeRepository.getClaim(claimId))),
    ]);
  const perspectiveIds = new Set([
    ...claims.flatMap((claim) => claim.perspectiveProfileIds ?? []),
    ...argumentsList.flatMap((argument) => argument.perspectiveProfileIds),
  ]);
  return {
    supportingArguments: uniqueById(supporting.flat()),
    opposingArguments: uniqueById(opposing.flat()),
    evidence: uniqueById(evidence.flat()),
    objections: uniqueById(objections.flat()),
    responses: uniqueById(responses.flat()),
    perspectives: allPerspectives.filter((profile) => perspectiveIds.has(profile.id)),
    argumentClaims: argumentClaims.filter((claim): claim is KnowledgeClaim => claim !== null),
  };
}

export const KnowledgeQueryService = {
  async listEntities(): Promise<ExplorerEntity[]> {
    const [knowledge, ontology] = await Promise.all([
      KnowledgeRepository.listEntities(),
      TheologyRepository.listEntities(),
    ]);
    return [
      ...knowledge.map((entity): ExplorerEntity => ({
        kind: "knowledge",
        entity,
      })),
      ...ontology.map((entity): ExplorerEntity => ({ kind: "ontology", entity })),
    ];
  },

  async getExplorerBundle(id: string): Promise<KnowledgeExplorerBundle | null> {
    const ontology = await TheologyRepository.getEntity(id);
    if (ontology) {
      const claims = await ArgumentRepository.getClaimsForOntologyEntity(id);
      const argumentsForClaims = await Promise.all(
        claims.map((claim) => ArgumentRepository.getArgumentsForClaim(claim.id)),
      );
      const argumentsList = argumentsForClaims
        .flat()
        .filter(
          (argument, index, all) =>
            all.findIndex((candidate) => candidate.id === argument.id) === index,
        );
      const argumentRelations = (
        await Promise.all(
          argumentsList.map((argument) =>
            ArgumentRepository.getRelationsTo("argument", argument.id),
          ),
        )
      ).flat();
      const enriched = await enrichClaimsAndArguments(claims, argumentsList);
      return {
        selected: { kind: "ontology", entity: ontology },
        claims,
        arguments: argumentsList,
        argumentRelations,
        knowledgeRelations: [],
        ontologyRelations: await TheologyRepository.getRelations(id),
        relatedTheories:
          ontology.kind === "theory" ? await ArgumentRepository.getCompetingTheories(id) : [],
        ...enriched,
      };
    }
    const entity = await KnowledgeRepository.getEntity(id);
    if (!entity) return null;
    const [claims, knowledgeRelations] = await Promise.all([
      KnowledgeRepository.claimsForEntity(id),
      KnowledgeRepository.relationsOf(id),
    ]);
    const argumentsForClaims = await Promise.all(
      claims.map((claim) => ArgumentRepository.getArgumentsForClaim(claim.id)),
    );
    const argumentsList = uniqueById(argumentsForClaims.flat());
    return {
      selected: { kind: "knowledge", entity },
      claims,
      arguments: argumentsList,
      argumentRelations: [],
      knowledgeRelations,
      ontologyRelations: [],
      relatedTheories: [],
      ...(await enrichClaimsAndArguments(claims, argumentsList)),
    };
  },
};
