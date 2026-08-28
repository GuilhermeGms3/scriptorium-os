import data from "../../../generated/corpora/stepbible-tagnt/efe428a0047bf7b9c3ce2624f60c252c6e435945/manifest.json";
import { TAGNT_PACKAGE } from "../corpus-config/tagnt";
import type {
  CorpusEdition,
  CorpusIdentity,
  CorpusPackageManifest,
  ImportedDatasetReference,
} from "../domain/corpus";
import type { LinguisticDataset } from "../domain/linguistic";
export const tagntDataset = data as LinguisticDataset;
export const tagntCorpus: CorpusIdentity = {
  id: TAGNT_PACKAGE.corpusId,
  name: "STEPBible TAGNT",
  shortName: "TAGNT",
  kind: "linguistic-dataset",
  traditionIds: [],
};
export const tagntEdition: CorpusEdition = {
  id: TAGNT_PACKAGE.editionId,
  corpusId: TAGNT_PACKAGE.corpusId,
  title: TAGNT_PACKAGE.title,
  abbreviation: "TAGNT",
  language: "grc",
  script: "Grek",
  direction: "ltr",
  kind: "linguistic-dataset",
  revision: tagntDataset.sourceRevision,
  licenseId: "CC-BY-4.0",
};
export const installedTagntPackage: CorpusPackageManifest = {
  ...TAGNT_PACKAGE,
  status: "bundled",
  sourceArtifactIds: tagntDataset.artifacts.map((a) => a.id),
  integrity: {
    requiredAlgorithm: "SHA-256",
    status: "verified",
    verifiedArtifactIds: tagntDataset.artifacts.map((a) => a.id),
    packageDigest: { algorithm: "SHA-256", value: tagntDataset.sourcePackageDigest },
  },
  provenance: {
    acquisition: "bundled",
    creationMethod: "machine-assisted",
    packageId: tagntDataset.packageId,
    datasetId: tagntDataset.id,
    sourceArtifactIds: tagntDataset.artifacts.map((a) => a.id),
    transformationIds: tagntDataset.transformations.map((t) => t.id),
    attribution: tagntDataset.attribution,
  },
};
export const tagntImportedDataset: ImportedDatasetReference = {
  id: tagntDataset.id,
  packageId: tagntDataset.packageId,
  transformationIds: tagntDataset.transformations.map((t) => t.id),
  internalRecordType: "LinguisticAnnotation + TokenAlignment",
  internalRecordIds: [],
  recordCount: tagntDataset.statistics.sourceRecords,
  recordIdPattern: `${tagntDataset.id}:record:{raw-locator}`,
  shardPaths: Object.entries(tagntDataset.books).flatMap(([book, chapters]) =>
    chapters.map((c) => `books/${book}/${c}.json`),
  ),
  createdAt: tagntDataset.artifacts[0]!.retrievedAt,
};
