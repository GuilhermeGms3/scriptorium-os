import {
  corpusPackageManifestSchema,
  CorpusRightsGate,
  sourceArtifactSchema,
  type CorpusEdition,
  type CorpusPackageManifest,
  type CorpusTransformation,
  type ImportedDatasetReference,
  type RightsStatus,
  type SourceArtifact,
} from "../domain/corpus";
import type { CorpusIdentity } from "../domain/corpus";
import {
  installedTagntPackage,
  tagntCorpus,
  tagntDataset,
  tagntEdition,
  tagntImportedDataset,
} from "./tagnt-registration";
import { BIBLIA_LIVRE_PACKAGE_ID } from "../corpus-config/biblia-livre";
import {
  bibliaLivreArtifacts,
  bibliaLivreImportedDataset,
  bibliaLivreTransformations,
  installedBibliaLivrePackage,
} from "./biblia-livre-registration";
import {
  CORPUS_CANDIDATES,
  CORPUS_EDITIONS,
  CORPUS_PACKAGE_CANDIDATES,
  CORPUS_TRANSFORMATIONS,
  IMPORTED_DATASETS,
  SOURCE_ARTIFACTS,
} from "../fixtures/corpus-registry.fixture";

export interface CorpusRegistryData {
  corpora: CorpusIdentity[];
  editions: CorpusEdition[];
  packages: CorpusPackageManifest[];
  artifacts: SourceArtifact[];
  transformations: CorpusTransformation[];
  datasets: ImportedDatasetReference[];
}

function uniqueMap<T extends { id: string }>(items: T[], kind: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    if (!item.id.trim()) throw new Error(`${kind} must have a stable non-empty id.`);
    if (result.has(item.id)) throw new Error(`Duplicate ${kind} id: ${item.id}.`);
    result.set(item.id, item);
  }
  return result;
}

export class CorpusRegistry {
  readonly #corpora: Map<string, CorpusIdentity>;
  readonly #editions: Map<string, CorpusEdition>;
  readonly #packages: Map<string, CorpusPackageManifest>;
  readonly #artifacts: Map<string, SourceArtifact>;
  readonly #transformations: Map<string, CorpusTransformation>;
  readonly #datasets: Map<string, ImportedDatasetReference>;

  constructor(data: CorpusRegistryData) {
    const packages = data.packages.map((manifest) => {
      corpusPackageManifestSchema.parse(manifest);
      return manifest;
    });
    const artifacts = data.artifacts.map((artifact) => {
      sourceArtifactSchema.parse(artifact);
      return artifact;
    });

    this.#corpora = uniqueMap(data.corpora, "corpus");
    this.#editions = uniqueMap(data.editions, "edition");
    this.#packages = uniqueMap(packages, "package");
    this.#artifacts = uniqueMap(artifacts, "artifact");
    this.#transformations = uniqueMap(data.transformations, "transformation");
    this.#datasets = uniqueMap(data.datasets, "dataset");

    this.#validateReferences();
  }

  #validateReferences(): void {
    for (const edition of this.#editions.values()) {
      if (!this.#corpora.has(edition.corpusId)) {
        throw new Error(`Edition ${edition.id} references missing corpus ${edition.corpusId}.`);
      }
    }

    for (const manifest of this.#packages.values()) {
      const edition = this.#editions.get(manifest.editionId);
      if (!this.#corpora.has(manifest.corpusId)) {
        throw new Error(`Package ${manifest.id} references missing corpus ${manifest.corpusId}.`);
      }
      if (!edition) {
        throw new Error(`Package ${manifest.id} references missing edition ${manifest.editionId}.`);
      }
      if (edition.corpusId !== manifest.corpusId) {
        throw new Error(`Package ${manifest.id} links an edition from another corpus.`);
      }
      if (manifest.status === "bundled") {
        const decision = CorpusRightsGate.evaluate(manifest.rights);
        if (!decision.eligible) {
          throw new Error(
            `Package ${manifest.id} cannot be bundled: ${decision.reasons.join(", ")}.`,
          );
        }
      }
      for (const artifactId of manifest.sourceArtifactIds) {
        if (!this.#artifacts.has(artifactId)) {
          throw new Error(`Package ${manifest.id} references missing artifact ${artifactId}.`);
        }
      }
      for (const artifactId of manifest.integrity.verifiedArtifactIds) {
        if (!manifest.sourceArtifactIds.includes(artifactId)) {
          throw new Error(`Package ${manifest.id} verifies an artifact outside its source list.`);
        }
      }
    }

    for (const artifact of this.#artifacts.values()) {
      const owner = this.#packages.get(artifact.packageId);
      if (!owner) {
        throw new Error(
          `Artifact ${artifact.id} references missing package ${artifact.packageId}.`,
        );
      }
      if (artifact.role === "source" && !owner.sourceArtifactIds.includes(artifact.id)) {
        throw new Error(`Source artifact ${artifact.id} is not registered by package ${owner.id}.`);
      }
      for (const sourceId of artifact.derivedFromArtifactIds ?? []) {
        const source = this.#artifacts.get(sourceId);
        if (!source)
          throw new Error(`Artifact ${artifact.id} derives from missing artifact ${sourceId}.`);
      }
    }

    for (const transformation of this.#transformations.values()) {
      for (const artifactId of [
        ...transformation.inputArtifactIds,
        ...transformation.output.artifactIds,
      ]) {
        if (!this.#artifacts.has(artifactId)) {
          throw new Error(
            `Transformation ${transformation.id} references missing artifact ${artifactId}.`,
          );
        }
      }
      for (const outputId of transformation.output.artifactIds) {
        const output = this.#artifacts.get(outputId)!;
        if (
          output.role !== "normalized" ||
          !output.derivedFromArtifactIds?.some((id) => transformation.inputArtifactIds.includes(id))
        ) {
          throw new Error(
            `Transformation ${transformation.id} output ${outputId} does not preserve input provenance.`,
          );
        }
      }
      for (const datasetId of transformation.output.datasetIds) {
        if (!this.#datasets.has(datasetId)) {
          throw new Error(
            `Transformation ${transformation.id} references missing dataset ${datasetId}.`,
          );
        }
      }
    }

    for (const dataset of this.#datasets.values()) {
      if (!this.#packages.has(dataset.packageId)) {
        throw new Error(`Dataset ${dataset.id} references missing package ${dataset.packageId}.`);
      }
      for (const transformationId of dataset.transformationIds) {
        if (!this.#transformations.has(transformationId)) {
          throw new Error(
            `Dataset ${dataset.id} references missing transformation ${transformationId}.`,
          );
        }
      }
    }
  }

  getCorpus(id: string): CorpusIdentity | null {
    return this.#corpora.get(id) ?? null;
  }

  listCorpora(): CorpusIdentity[] {
    return [...this.#corpora.values()];
  }

  getEdition(id: string): CorpusEdition | null {
    return this.#editions.get(id) ?? null;
  }

  listEditions(corpusId?: string): CorpusEdition[] {
    const editions = [...this.#editions.values()];
    return corpusId ? editions.filter((edition) => edition.corpusId === corpusId) : editions;
  }

  getPackage(id: string): CorpusPackageManifest | null {
    return this.#packages.get(id) ?? null;
  }

  listPackages(corpusId?: string): CorpusPackageManifest[] {
    const packages = [...this.#packages.values()];
    return corpusId ? packages.filter((manifest) => manifest.corpusId === corpusId) : packages;
  }

  getArtifact(id: string): SourceArtifact | null {
    return this.#artifacts.get(id) ?? null;
  }

  listArtifacts(packageId?: string): SourceArtifact[] {
    const artifacts = [...this.#artifacts.values()];
    return packageId ? artifacts.filter((artifact) => artifact.packageId === packageId) : artifacts;
  }

  getTransformation(id: string): CorpusTransformation | null {
    return this.#transformations.get(id) ?? null;
  }

  getDataset(id: string): ImportedDatasetReference | null {
    return this.#datasets.get(id) ?? null;
  }

  getRightsStatus(packageId: string): RightsStatus | null {
    return this.#packages.get(packageId)?.rights.status ?? null;
  }

  canBundle(packageId: string) {
    const manifest = this.#packages.get(packageId);
    if (!manifest) return { eligible: false, reasons: ["package-not-found"] };
    return CorpusRightsGate.evaluate(manifest.rights);
  }
}

export const corpusRegistry = new CorpusRegistry({
  corpora: [...CORPUS_CANDIDATES, tagntCorpus],
  editions: [...CORPUS_EDITIONS, tagntEdition],
  packages: [
    ...CORPUS_PACKAGE_CANDIDATES.filter((p) => p.id !== BIBLIA_LIVRE_PACKAGE_ID),
    installedBibliaLivrePackage,
    installedTagntPackage,
  ],
  artifacts: [...SOURCE_ARTIFACTS, ...bibliaLivreArtifacts, ...tagntDataset.artifacts],
  transformations: [
    ...CORPUS_TRANSFORMATIONS,
    ...bibliaLivreTransformations,
    ...tagntDataset.transformations,
  ],
  datasets: [...IMPORTED_DATASETS, bibliaLivreImportedDataset, tagntImportedDataset],
});
