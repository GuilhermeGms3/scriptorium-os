import datasetJson from "../../../generated/corpora/biblia-portuguesa-mundial/2026-08-19/manifest.json";
import type {
  CorpusEdition,
  CorpusPackageManifest,
  CorpusTransformation,
  ImportedDatasetReference,
  SourceArtifact,
} from "../domain/corpus";
import type { CorpusIdentity } from "../domain/corpus";
import type { GeneratedCorpusManifest } from "../domain/generated-corpus";

const RETRIEVED_AT = "2026-09-22T00:00:00.000Z";
const SOURCE_URL = "https://ebible.org/Scriptures/porbrbsl_usfm.zip";
const DETAILS_URL = "https://ebible.org/details.php?id=porbrbsl";
const ARTIFACT_ID = "artifact:ebible:porbrbsl:usfm:2026-08-19";
const PACKAGE_ID = "pkg-ebible-bpm-2026-08-19";

export const bpmDataset = datasetJson as GeneratedCorpusManifest;

export const bpmCorpus: CorpusIdentity = {
  id: bpmDataset.corpusId,
  name: "Bíblia Portuguesa Mundial",
  shortName: "BPM",
  kind: "scripture",
  traditionIds: [],
};

export const bpmEdition: CorpusEdition = {
  id: bpmDataset.editionId,
  corpusId: bpmDataset.corpusId,
  title: "Bíblia Portuguesa Mundial — rascunho em revisão (2026-08-19)",
  abbreviation: "BPM rasc.",
  language: "pt-BR",
  script: "Latn",
  direction: "ltr",
  kind: "translation",
  version: "2026-08-19",
  revision: "ebible-porbrbsl-2026-08-19",
  releaseDate: "2026-08-19",
  licenseId: "Public-Domain",
};

export const bpmArtifact: SourceArtifact = {
  id: ARTIFACT_ID,
  packageId: PACKAGE_ID,
  role: "source",
  repository: "https://ebible.org/",
  sourcePath: "porbrbsl_usfm.zip",
  sourceUrl: SOURCE_URL,
  fileName: "porbrbsl_usfm.zip",
  mediaType: "application/zip",
  format: "zip",
  retrievedAt: RETRIEVED_AT,
  sourceRevision: "2026-08-19",
  checksum: bpmDataset.sourcePackageDigest,
  byteSize: 1_868_556,
};

export const installedBpmPackage: CorpusPackageManifest = {
  id: PACKAGE_ID,
  corpusId: bpmDataset.corpusId,
  editionId: bpmDataset.editionId,
  title: bpmEdition.title,
  shortName: "BPM rasc.",
  language: "pt-BR",
  script: "Latn",
  direction: "ltr",
  version: "2026-08-19",
  revision: bpmDataset.sourceRevision,
  releaseDate: "2026-08-19",
  canonicalSource: DETAILS_URL,
  sourceRepository: "https://ebible.org/",
  sourceArtifactIds: [ARTIFACT_ID],
  format: "usfm",
  versificationScheme: bpmDataset.versificationScheme,
  rights: {
    id: "rights:ebible:porbrbsl:2026-08-19",
    status: "verified",
    declaredBy: "eBible.org",
    declaredAtSource: DETAILS_URL,
    license: {
      id: "Public-Domain",
      name: "Public Domain",
      status: "public-domain",
      redistributionAllowed: true,
      commercialUseAllowed: true,
      attributionRequired: false,
      mayStore: true,
      mayRedistribute: true,
      mayModify: true,
      mayUseCommercially: true,
      sourceUrl: DETAILS_URL,
      permissions: {
        redistribution: "yes",
        modification: "yes",
        commercialUse: "yes",
        shareAlike: "no",
        attribution: "no",
      },
    },
    attribution: {
      work: "Bíblia Portuguesa Mundial",
      authorsOrEditors: ["eBible.org contributors"],
      license: "Public Domain",
      canonicalSource: DETAILS_URL,
      recommendedCitation:
        "Bíblia Portuguesa Mundial, eBible.org, revisão de 19 de agosto de 2026.",
    },
    evidence: [
      {
        id: "evidence:ebible:porbrbsl:details",
        sourceUrl: DETAILS_URL,
        sourceKind: "project-website",
        observedAt: RETRIEVED_AT,
        licenseId: "Public-Domain",
        licenseName: "Public Domain",
      },
    ],
    reviewNote:
      "A fonte identifica a edição como DRAFT/em revisão. O status editorial é mostrado ao usuário e não altera a declaração de domínio público.",
  },
  provenance: {
    acquisition: "bundled",
    creationMethod: "machine-assisted",
    packageId: PACKAGE_ID,
    sourceArtifactIds: [ARTIFACT_ID],
    transformationIds: bpmDataset.transformations.map((item) => item.id),
    datasetId: bpmDataset.datasetId,
    attribution: bpmDataset.attribution,
  },
  contentCapabilities: ["verse-text", "footnotes", "cross-references", "headings"],
  integrity: {
    requiredAlgorithm: "SHA-256",
    status: "verified",
    verifiedArtifactIds: [ARTIFACT_ID],
    packageDigest: bpmDataset.sourcePackageDigest,
  },
  status: "bundled",
};

export const bpmTransformations: CorpusTransformation[] = bpmDataset.transformations.map(
  (transformation) => ({
    id: transformation.id,
    type: transformation.type,
    tool: { name: bpmDataset.importer.name, version: bpmDataset.importer.version },
    timestamp: RETRIEVED_AT,
    inputArtifactIds: transformation.inputArtifactIds,
    output: { artifactIds: [], datasetIds: [transformation.outputDatasetId] },
  }),
);

export const bpmImportedDataset: ImportedDatasetReference = {
  id: bpmDataset.datasetId,
  packageId: PACKAGE_ID,
  transformationIds: bpmDataset.transformations.map((item) => item.id),
  internalRecordType: "TextUnit",
  internalRecordIds: [],
  recordCount: bpmDataset.statistics.textUnits,
  recordIdPattern: bpmDataset.editionId + ":{book}.{chapter}.{verse}",
  shardPaths: bpmDataset.books.flatMap((book) => Object.values(book.chapterFiles)),
  createdAt: RETRIEVED_AT,
};
