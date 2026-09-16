import datasetJson from "../../../generated/corpora/biblia-livre/2025.1.0/manifest.json";
import custodyJson from "../../../corpora/source/biblia-livre/a315a15e9f4d01883b62206fe441d57762f126b3/artifact-manifest.json";
import { BIBLIA_LIVRE_PACKAGE } from "../corpus-config/biblia-livre";
import type {
  CorpusPackageManifest,
  CorpusTransformation,
  ImportedDatasetReference,
  SourceArtifact,
} from "../domain/corpus";
import type { GeneratedCorpusManifest } from "../domain/generated-corpus";

export const bibliaLivreDataset = datasetJson as GeneratedCorpusManifest;
const custody = custodyJson as { artifacts: SourceArtifact[]; retrievedAt: string };
export const installedBibliaLivrePackage: CorpusPackageManifest = {
  ...BIBLIA_LIVRE_PACKAGE,
  status: "bundled",
  sourceArtifactIds: custody.artifacts.map((a) => a.id),
  integrity: {
    requiredAlgorithm: "SHA-256",
    status: "verified",
    verifiedArtifactIds: custody.artifacts.map((a) => a.id),
    packageDigest: bibliaLivreDataset.sourcePackageDigest,
  },
  provenance: {
    acquisition: "bundled",
    creationMethod: "machine-assisted",
    packageId: BIBLIA_LIVRE_PACKAGE.id,
    sourceArtifactIds: custody.artifacts.map((a) => a.id),
    transformationIds: bibliaLivreDataset.transformations.map((t) => t.id),
    datasetId: bibliaLivreDataset.datasetId,
    attribution: bibliaLivreDataset.attribution,
  },
};
export const bibliaLivreArtifacts = custody.artifacts;
export const bibliaLivreTransformations: CorpusTransformation[] =
  bibliaLivreDataset.transformations.map((t) => ({
    id: t.id,
    type: t.type,
    tool: { name: bibliaLivreDataset.importer.name, version: bibliaLivreDataset.importer.version },
    timestamp: custody.retrievedAt,
    inputArtifactIds: t.inputArtifactIds,
    output: { artifactIds: [], datasetIds: [t.outputDatasetId] },
  }));
export const bibliaLivreImportedDataset: ImportedDatasetReference = {
  id: bibliaLivreDataset.datasetId,
  packageId: bibliaLivreDataset.packageId,
  transformationIds: bibliaLivreDataset.transformations.map((t) => t.id),
  internalRecordType: "TextUnit",
  internalRecordIds: [],
  recordCount: bibliaLivreDataset.statistics.textUnits,
  recordIdPattern: `${bibliaLivreDataset.editionId}:{book}.{chapter}.{verse}`,
  shardPaths: bibliaLivreDataset.books.flatMap((b) => Object.values(b.chapterFiles)),
  createdAt: custody.retrievedAt,
};
