import type { Argument, ArgumentRelation } from "../domain/argument";
import type { KnowledgeClaim, KnowledgeEntity, KnowledgeRelation } from "../domain/knowledge";
import type { OntologyEntity, OntologyRelation } from "../domain/theology";
import { ArgumentRepository, TheologyRepository } from "../repositories/argument-repository";
import { KnowledgeRepository } from "../repositories/knowledge-repository";

export type ExplorerEntity =
  { kind: "knowledge"; entity: KnowledgeEntity } | { kind: "ontology"; entity: OntologyEntity };

export interface KnowledgeExplorerBundle {
  selected: ExplorerEntity;
  claims: KnowledgeClaim[];
  arguments: Argument[];
  argumentRelations: ArgumentRelation[];
  knowledgeRelations: KnowledgeRelation[];
  ontologyRelations: OntologyRelation[];
  relatedTheories: OntologyEntity[];
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
      return {
        selected: { kind: "ontology", entity: ontology },
        claims,
        arguments: argumentsList,
        argumentRelations,
        knowledgeRelations: [],
        ontologyRelations: await TheologyRepository.getRelations(id),
        relatedTheories:
          ontology.kind === "theory" ? await ArgumentRepository.getCompetingTheories(id) : [],
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
    return {
      selected: { kind: "knowledge", entity },
      claims,
      arguments: argumentsForClaims.flat(),
      argumentRelations: [],
      knowledgeRelations,
      ontologyRelations: [],
      relatedTheories: [],
    };
  },
};
