import type { StudyGuide } from "../content/study-guides";
import type { StudyPathResource } from "../content/study-paths";
import { corpusPackageRegistry } from "../corpus-runtime/corpus-package-registry";
import type { PrivateDocumentSearchHit } from "../domain/private-document";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { KnowledgeRepository, type KnowledgeSearchHit } from "../repositories/knowledge-repository";

export interface GuideResource extends StudyPathResource {
  languages: string[];
}
export interface GuideMaterials {
  resources: GuideResource[];
  missingResources: StudyPathResource[];
  excerpts: PrivateDocumentSearchHit[];
  concepts: KnowledgeSearchHit[];
  warnings: string[];
}
interface GuideDependencies {
  packages: () => Promise<{ works: string[]; languages: string[] }[]>;
  searchDocuments: (
    query: string,
    options: { limit: number },
  ) => Promise<PrivateDocumentSearchHit[]>;
  searchKnowledge: (query: string, limit: number) => Promise<KnowledgeSearchHit[]>;
}
const dependencies: GuideDependencies = {
  packages: () => corpusPackageRegistry.listAvailable(),
  searchDocuments: (query, options) => PrivateDocumentRepository.search(query, options),
  searchKnowledge: (query, limit) => KnowledgeRepository.search(query, limit),
};

/** Read-only, bounded indexed discovery. No publication decisions or corpus text downloads. */
export async function loadStudyGuideMaterials(
  guide: StudyGuide,
  sources: GuideDependencies = dependencies,
): Promise<GuideMaterials> {
  const terms = [...new Set(guide.keywords)].slice(0, 3);
  const [packages, documents, knowledge] = await Promise.all([
    Promise.allSettled([sources.packages()]),
    Promise.allSettled(terms.map((term) => sources.searchDocuments(term, { limit: 6 }))),
    Promise.allSettled(terms.map((term) => sources.searchKnowledge(term, 6))),
  ]);
  const manifests = packages[0]?.status === "fulfilled" ? packages[0].value : [];
  const resources = guide.resources.flatMap((resource) => {
    const manifest = manifests.find((item) => item.works.includes(resource.workId));
    return manifest ? [{ ...resource, languages: manifest.languages }] : [];
  });
  const excerpts = [
    ...new Map(
      documents
        .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
        .map((hit) => [`${hit.documentId}:${hit.pageIndex}`, hit]),
    ).values(),
  ].slice(0, 12);
  const concepts = [
    ...new Map(
      knowledge
        .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
        .filter((hit) => !["claim", "argument", "lexeme"].includes(hit.kind))
        .map((hit) => [hit.id, hit]),
    ).values(),
  ].slice(0, 12);
  return {
    resources,
    missingResources: guide.resources.filter(
      (resource) => !resources.some((item) => item.workId === resource.workId),
    ),
    excerpts,
    concepts,
    warnings: [
      ...(packages.some((result) => result.status === "rejected")
        ? ["Não foi possível consultar o catálogo de fontes. Tente novamente."]
        : []),
      ...(documents.some((result) => result.status === "rejected")
        ? [
            "A consulta ao acervo privado está incompleta ou indisponível. Tente novamente após a abertura do workspace.",
          ]
        : []),
      ...(knowledge.some((result) => result.status === "rejected")
        ? ["Os conceitos relacionados não puderam ser consultados integralmente."]
        : []),
    ],
  };
}
