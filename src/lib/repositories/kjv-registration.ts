import datasetJson from "../../../generated/corpora/king-james-version/2026-09-26/manifest.json";
import type { GeneratedCorpusManifest } from "../domain/generated-corpus";
import { ebibleRegistration } from "./ebible-registration";

export const kjvDataset = datasetJson as GeneratedCorpusManifest;

const registration = ebibleRegistration({
  dataset: kjvDataset,
  code: "eng-kjv",
  name: "King James Version",
  shortName: "KJV",
  title: "King James Version (1769)",
  abbreviation: "KJV",
  language: "en",
  version: "2026-09-26",
  retrievedAt: "2026-10-21T00:00:00.000Z",
  byteSize: 2_771_083,
  work: "King James Version (Authorized Version), texto padronizado de 1769, com apócrifos",
  authorsOrEditors: ["eBible.org", "Crosswire Bible Society"],
  recommendedCitation: "King James Version (1769), eBible.org, revisão de 26 de setembro de 2026.",
  reviewNote:
    "Domínio público fora do Reino Unido, onde a impressão depende da patente da Coroa (Cambridge, Oxford e Collins); a fonte declara isso explicitamente.",
});

export const kjvCorpus = registration.corpus;
export const kjvEdition = registration.edition;
export const kjvArtifact = registration.artifact;
export const installedKjvPackage = registration.installedPackage;
export const kjvTransformations = registration.transformations;
export const kjvImportedDataset = registration.importedDataset;
