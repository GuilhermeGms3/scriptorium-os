import { hasAvailableData } from "../domain/availability";
import type { KnowledgeProposal, KnowledgeProposalPayload } from "../domain/document-knowledge";
import type { PassageKnowledgeBundle } from "../domain/knowledge-bundle";
import type { PassageRef } from "../domain/scripture";
import type {
  PassageCoverageArea,
  PassageCoverageEntry,
  WorkspacePassageKnowledgeItem,
  WorkspacePassageKnowledgeLayer,
} from "../domain/workspace-passage-knowledge";
import {
  PASSAGE_COVERAGE_AREAS,
  semanticDomainCoverage,
} from "../domain/workspace-passage-knowledge";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { LocalTranslationRepository } from "../repositories/local-translation-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";

type PassageRelationProposal = KnowledgeProposal & {
  payload: Extract<KnowledgeProposalPayload, { kind: "passage-relation" }>;
};

function claimCoverage(proposal: KnowledgeProposal): PassageCoverageArea[] {
  if (proposal.payload.kind !== "claim") return [];
  switch (proposal.payload.claimKind) {
    case "textual-observation":
    case "textual-critical-analysis":
      return ["textual-criticism"];
    case "linguistic-analysis":
      return ["linguistics"];
    case "historical-source-observation":
    case "historical-reconstruction":
      return ["historical-context"];
    case "exegetical-interpretation":
      return ["exegesis"];
    case "theological-interpretation":
      return ["theology"];
    case "reception-history":
    case "mystical-tradition":
      return ["reception-history", "tradition"];
    default:
      return [];
  }
}

function privateAreas(
  items: readonly WorkspacePassageKnowledgeItem[],
): Map<PassageCoverageArea, Set<string>> {
  const result = new Map<PassageCoverageArea, Set<string>>();
  const add = (area: PassageCoverageArea, documentId: string) => {
    const sources = result.get(area) ?? new Set<string>();
    sources.add(documentId);
    result.set(area, sources);
  };
  for (const item of items) {
    for (const proposal of item.proposals) {
      if (proposal.payload.kind === "topic-assignment") {
        const area = semanticDomainCoverage(proposal.payload.domain);
        if (area) add(area, item.document.id);
      }
      for (const area of claimCoverage(proposal)) add(area, item.document.id);
      if (
        (proposal.payload.kind === "claim" || proposal.payload.kind === "argument") &&
        proposal.payload.perspectiveProfileIds.length
      )
        add("tradition", item.document.id);
    }
  }
  return result;
}

function curatedAreas(bundle: PassageKnowledgeBundle | null): Set<PassageCoverageArea> {
  const result = new Set<PassageCoverageArea>();
  if (!bundle) return result;
  if (bundle.texts.length) result.add("text");
  if (hasAvailableData(bundle.variants)) result.add("textual-criticism");
  if (hasAvailableData(bundle.linguistics) || hasAvailableData(bundle.linguisticAnnotations))
    result.add("linguistics");
  if (hasAvailableData(bundle.viewpoints)) result.add("tradition");
  if (hasAvailableData(bundle.analyses)) {
    for (const analysis of bundle.analyses.data) {
      if (analysis.lensId === "exegetical") result.add("exegesis");
      if (analysis.lensId === "hermeneutical") result.add("hermeneutics");
      if (analysis.lensId === "historical") result.add("historical-context");
      if (analysis.lensId === "reception-history") result.add("reception-history");
      if (analysis.lensId === "history-of-religions") result.add("religious-currents");
    }
  }
  if (hasAvailableData(bundle.claims)) {
    for (const claim of bundle.claims.data) {
      if (claim.kind === "exegetical-interpretation") result.add("exegesis");
      if (claim.kind === "theological-interpretation") result.add("theology");
      if (claim.kind === "reception-history" || claim.kind === "mystical-tradition")
        result.add("reception-history");
    }
  }
  return result;
}

export const WorkspacePassageKnowledgeService = {
  async load(
    passage: PassageRef,
    curatedBundle: PassageKnowledgeBundle | null,
    database?: WorkspaceDatabase,
  ): Promise<WorkspacePassageKnowledgeLayer> {
    const relations = (
      await DocumentKnowledgeRepository.listVisiblePassageRelations(passage, database)
    ).filter(
      (proposal): proposal is PassageRelationProposal =>
        proposal.payload.kind === "passage-relation",
    );
    const proposals = await DocumentKnowledgeRepository.listAcceptedProposalsForUnits(
      relations.map((proposal) => proposal.semanticUnitId),
      database,
    );
    const proposalsByUnit = new Map<string, KnowledgeProposal[]>();
    for (const proposal of proposals) {
      const values = proposalsByUnit.get(proposal.semanticUnitId) ?? [];
      values.push(proposal);
      proposalsByUnit.set(proposal.semanticUnitId, values);
    }

    const items: WorkspacePassageKnowledgeItem[] = [];
    const documentIds = [...new Set(relations.map((proposal) => proposal.documentId))];
    for (const documentId of documentIds) {
      const documentRelations = relations.filter((proposal) => proposal.documentId === documentId);
      const [document, units] = await Promise.all([
        PrivateDocumentRepository.getDocument(documentId, database),
        DocumentKnowledgeRepository.listUnits(
          documentId,
          documentRelations.map((proposal) => proposal.semanticUnitId),
          database,
        ),
      ]);
      if (!document) continue;
      const unitsById = new Map(units.map((unit) => [unit.id, unit]));
      const translations = await LocalTranslationRepository.listForSources(
        "private-segment",
        units.map((unit) => unit.id),
        database,
      );
      const translationsBySource = new Map(
        translations.map((translation) => [translation.sourceId, translation]),
      );
      for (const relation of documentRelations) {
        const unit = unitsById.get(relation.semanticUnitId);
        if (!unit) continue;
        items.push({
          id: relation.id,
          document: {
            id: document.id,
            sourceId: document.sourceId,
            title: document.title,
            ...(document.language ? { language: document.language } : {}),
          },
          unit,
          passageRelation: relation,
          proposals: proposalsByUnit.get(unit.id) ?? [relation],
          translation: translationsBySource.get(unit.id) ?? null,
          pages: [...new Set(unit.spans.map((span) => span.pageIndex))],
        });
      }
    }

    const curated = curatedAreas(curatedBundle);
    const local = privateAreas(items);
    const coverage: PassageCoverageEntry[] = PASSAGE_COVERAGE_AREAS.map((area) => ({
      area,
      status: curated.has(area) ? "available" : local.has(area) ? "private" : "missing",
      sourceCount: local.get(area)?.size ?? (curated.has(area) ? 1 : 0),
    }));
    return { items, coverage };
  },
};
