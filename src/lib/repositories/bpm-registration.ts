import datasetJson from "../../../generated/corpora/biblia-portuguesa-mundial/2026-08-19/manifest.json";
import type { GeneratedCorpusManifest } from "../domain/generated-corpus";
import { ebibleRegistration } from "./ebible-registration";

export const bpmDataset = datasetJson as GeneratedCorpusManifest;

const registration = ebibleRegistration({
  dataset: bpmDataset,
  code: "porbrbsl",
  name: "Bíblia Portuguesa Mundial",
  shortName: "BPM",
  title: "Bíblia Portuguesa Mundial — rascunho em revisão (2026-08-19)",
  abbreviation: "BPM rasc.",
  language: "pt-BR",
  version: "2026-08-19",
  retrievedAt: "2026-09-22T00:00:00.000Z",
  byteSize: 1_868_556,
  work: "Bíblia Portuguesa Mundial",
  authorsOrEditors: ["eBible.org contributors"],
  recommendedCitation: "Bíblia Portuguesa Mundial, eBible.org, revisão de 19 de agosto de 2026.",
  reviewNote:
    "A fonte identifica a edição como DRAFT/em revisão. O status editorial é mostrado ao usuário e não altera a declaração de domínio público.",
});

export const bpmCorpus = registration.corpus;
export const bpmEdition = registration.edition;
export const bpmArtifact = registration.artifact;
export const installedBpmPackage = registration.installedPackage;
export const bpmTransformations = registration.transformations;
export const bpmImportedDataset = registration.importedDataset;
