import type {
  CorpusEdition,
  CorpusIdentity,
  CorpusPackageManifest,
  CorpusTransformation,
  ImportedDatasetReference,
  SourceArtifact,
} from "../domain/corpus";
import type { GeneratedCorpusManifest } from "../domain/generated-corpus";

/** An eBible.org USFM edition we may redistribute: what changes from one to the next. */
export interface EbibleRegistration {
  dataset: GeneratedCorpusManifest;
  /** eBible id, as in https://ebible.org/details.php?id=<code>. */
  code: string;
  name: string;
  shortName: string;
  title: string;
  abbreviation: string;
  language: string;
  /** eBible revision date, also the edition version: "2026-08-19". */
  version: string;
  retrievedAt: string;
  byteSize: number;
  work: string;
  authorsOrEditors: string[];
  recommendedCitation: string;
  reviewNote: string;
  /** Absent for public-domain texts; otherwise the open license declared at the source. */
  openLicense?: { id: string; name: string; url: string; copyrightHolder: string };
}

/** The license record of an edition: public domain, or an open license that asks for credit. */
function licenseOf(registration: EbibleRegistration, detailsUrl: string) {
  const open = registration.openLicense;
  if (!open)
    return {
      id: "Public-Domain",
      name: "Public Domain",
      status: "public-domain" as const,
      redistributionAllowed: true,
      commercialUseAllowed: true,
      attributionRequired: false,
      mayStore: true,
      mayRedistribute: true,
      mayModify: true,
      mayUseCommercially: true,
      sourceUrl: detailsUrl,
      permissions: {
        redistribution: "yes" as const,
        modification: "yes" as const,
        commercialUse: "yes" as const,
        shareAlike: "no" as const,
        attribution: "no" as const,
      },
    };
  return {
    id: open.id,
    name: open.name,
    url: open.url,
    status: "open-license" as const,
    copyrightHolder: open.copyrightHolder,
    redistributionAllowed: true,
    commercialUseAllowed: true,
    attributionRequired: true,
    attributionText: registration.recommendedCitation,
    mayStore: true,
    mayRedistribute: true,
    mayModify: true,
    mayUseCommercially: true,
    sourceUrl: detailsUrl,
    permissions: {
      redistribution: "yes" as const,
      modification: "yes" as const,
      commercialUse: "yes" as const,
      shareAlike: "yes" as const,
      attribution: "yes" as const,
    },
  };
}

/** Corpus, edition, source artifact and package records of an eBible edition, rights verified. */
export function ebibleRegistration(registration: EbibleRegistration) {
  const { dataset, code, version } = registration;
  const sourceUrl = `https://ebible.org/Scriptures/${code}_usfm.zip`;
  const detailsUrl = `https://ebible.org/details.php?id=${code}`;
  const artifactId = dataset.sourceArtifactIds[0]!;
  const packageId = dataset.packageId;
  const license = licenseOf(registration, detailsUrl);

  const corpus: CorpusIdentity = {
    id: dataset.corpusId,
    name: registration.name,
    shortName: registration.shortName,
    kind: "scripture",
    traditionIds: [],
  };

  const edition: CorpusEdition = {
    id: dataset.editionId,
    corpusId: dataset.corpusId,
    title: registration.title,
    abbreviation: registration.abbreviation,
    language: registration.language,
    script: "Latn",
    direction: "ltr",
    kind: "translation",
    version,
    revision: dataset.sourceRevision,
    releaseDate: version,
    licenseId: license.id,
  };

  const artifact: SourceArtifact = {
    id: artifactId,
    packageId,
    role: "source",
    repository: "https://ebible.org/",
    sourcePath: `${code}_usfm.zip`,
    sourceUrl,
    fileName: `${code}_usfm.zip`,
    mediaType: "application/zip",
    format: "zip",
    retrievedAt: registration.retrievedAt,
    sourceRevision: version,
    checksum: dataset.sourcePackageDigest,
    byteSize: registration.byteSize,
  };

  const installedPackage: CorpusPackageManifest = {
    id: packageId,
    corpusId: dataset.corpusId,
    editionId: dataset.editionId,
    title: edition.title,
    shortName: registration.abbreviation,
    language: registration.language,
    script: "Latn",
    direction: "ltr",
    version,
    revision: dataset.sourceRevision,
    releaseDate: version,
    canonicalSource: detailsUrl,
    sourceRepository: "https://ebible.org/",
    sourceArtifactIds: [artifactId],
    format: "usfm",
    versificationScheme: dataset.versificationScheme,
    rights: {
      id: `rights:ebible:${code}:${version}`,
      status: "verified",
      declaredBy: "eBible.org",
      declaredAtSource: detailsUrl,
      license,
      attribution: {
        work: registration.work,
        authorsOrEditors: registration.authorsOrEditors,
        license: license.name,
        canonicalSource: detailsUrl,
        recommendedCitation: registration.recommendedCitation,
      },
      evidence: [
        {
          id: `evidence:ebible:${code}:details`,
          sourceUrl: detailsUrl,
          sourceKind: "project-website",
          observedAt: registration.retrievedAt,
          licenseId: license.id,
          licenseName: license.name,
        },
      ],
      reviewNote: registration.reviewNote,
    },
    provenance: {
      acquisition: "bundled",
      creationMethod: "machine-assisted",
      packageId,
      sourceArtifactIds: [artifactId],
      transformationIds: dataset.transformations.map((item) => item.id),
      datasetId: dataset.datasetId,
      attribution: dataset.attribution,
    },
    contentCapabilities: ["verse-text", "footnotes", "cross-references", "headings"],
    integrity: {
      requiredAlgorithm: "SHA-256",
      status: "verified",
      verifiedArtifactIds: [artifactId],
      packageDigest: dataset.sourcePackageDigest,
    },
    status: "bundled",
  };

  const transformations: CorpusTransformation[] = dataset.transformations.map((transformation) => ({
    id: transformation.id,
    type: transformation.type,
    tool: { name: dataset.importer.name, version: dataset.importer.version },
    timestamp: registration.retrievedAt,
    inputArtifactIds: transformation.inputArtifactIds,
    output: { artifactIds: [], datasetIds: [transformation.outputDatasetId] },
  }));

  const importedDataset: ImportedDatasetReference = {
    id: dataset.datasetId,
    packageId,
    transformationIds: dataset.transformations.map((item) => item.id),
    internalRecordType: "TextUnit",
    internalRecordIds: [],
    recordCount: dataset.statistics.textUnits,
    recordIdPattern: dataset.editionId + ":{book}.{chapter}.{verse}",
    shardPaths: dataset.books.flatMap((book) => Object.values(book.chapterFiles)),
    createdAt: registration.retrievedAt,
  };

  return { corpus, edition, artifact, installedPackage, transformations, importedDataset };
}
