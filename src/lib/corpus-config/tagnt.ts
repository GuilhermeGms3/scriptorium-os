import type { CorpusPackageManifest } from "../domain/corpus";

export const TAGNT_COMMIT = "efe428a0047bf7b9c3ce2624f60c252c6e435945";
export const TAGNT_REPOSITORY = "https://github.com/STEPBible/STEPBible-Data";
export const TAGNT_BOOKS: Record<string, string> = {
  Mat: "matthew",
  Mrk: "mark",
  Luk: "luke",
  Jhn: "john",
  Act: "acts",
  Rom: "romans",
  "1Co": "1-corinthians",
  "2Co": "2-corinthians",
  Gal: "galatians",
  Eph: "ephesians",
  Php: "philippians",
  Col: "colossians",
  "1Th": "1-thessalonians",
  "2Th": "2-thessalonians",
  "1Ti": "1-timothy",
  "2Ti": "2-timothy",
  Tit: "titus",
  Phm: "philemon",
  Heb: "hebrews",
  Jas: "james",
  "1Pe": "1-peter",
  "2Pe": "2-peter",
  "1Jn": "1-john",
  "2Jn": "2-john",
  "3Jn": "3-john",
  Jud: "jude",
  Rev: "revelation",
};
export const TAGNT_FILES = [
  "README.md",
  "Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
  "Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
  "Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt",
] as const;
export const TAGNT_ATTRIBUTION =
  "STEP Bible (https://www.stepbible.org/), Tyndale House Cambridge. TAGNT / TEGMC, CC BY 4.0. Scriptorium: selected fields, NFC comparison, SBLGNT alignment and indexes; not a replacement edition.";
export function tagntSourceUrl(path: string): string {
  return `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${TAGNT_COMMIT}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
export const TAGNT_PACKAGE: CorpusPackageManifest = {
  id: "pkg-stepbible-tagnt",
  corpusId: "stepbible-tagnt",
  editionId: "stepbible-tagnt-pinned",
  title: "STEPBible TAGNT linguistic layer",
  shortName: "TAGNT",
  language: "grc",
  script: "Grek",
  direction: "ltr",
  version: TAGNT_COMMIT,
  revision: TAGNT_COMMIT,
  canonicalSource: TAGNT_REPOSITORY,
  sourceRepository: TAGNT_REPOSITORY,
  acquisitionPlan: {
    repository: TAGNT_REPOSITORY,
    commitSha: TAGNT_COMMIT,
    artifactRoot: ".",
    artifactPattern: "explicit-files",
    expectedBookIds: Object.values(TAGNT_BOOKS),
  },
  sourceArtifactIds: [],
  format: "tsv",
  versificationScheme: "tagnt-nrsv-with-edition-markers",
  rights: {
    id: "rights-tagnt-pinned",
    status: "verified",
    license: {
      id: "CC-BY-4.0",
      name: "Creative Commons Attribution 4.0 International",
      url: "https://creativecommons.org/licenses/by/4.0/",
      status: "open-license",
      redistributionAllowed: true,
      commercialUseAllowed: true,
      attributionRequired: true,
      permissions: {
        redistribution: "yes",
        modification: "yes",
        commercialUse: "yes",
        shareAlike: "no",
        attribution: "yes",
      },
    },
    declaredBy: "STEP Bible / Tyndale House Cambridge",
    declaredAtSource: tagntSourceUrl("README.md"),
    attribution: {
      work: "TAGNT and TEGMC",
      authorsOrEditors: ["STEP Bible", "Tyndale House Cambridge"],
      license: "CC BY 4.0",
      canonicalSource: TAGNT_REPOSITORY,
      requiredText: TAGNT_ATTRIBUTION,
    },
    evidence: [
      ...TAGNT_FILES,
      "Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt",
    ].map((path, index) => ({
      id: `rights-tagnt-notice-${index}`,
      sourceUrl: tagntSourceUrl(path),
      sourceKind: "official-repository" as const,
      observedAt: "2026-08-27T00:00:00.000Z",
      licenseId: "CC-BY-4.0",
      note:
        index === 4
          ? "Upstream lexical identity notice reviewed; TBESG dictionary definitions are not imported."
          : "Explicit CC BY 4.0 notice; see reviewNote for the central-distribution request and field exclusions.",
    })),
    reviewNote:
      "Operational review, not a legal opinion: README and file headers explicitly permit inclusion in software under CC BY 4.0. The accompanying request to centralize distribution is treated as a non-license courtesy request (CC BY legal code, considerations for the public), not silently discarded. Preserve official links and change notice. Only source identity, Greek form/transliteration, edition metadata, dStrong/sStrong identifiers, lemma forms and grammar are enabled. English/Spanish translations, glosses, submeanings and dictionary definitions are excluded; their upstream permission is not inferred from the repository license.",
  },
  provenance: {
    acquisition: "editorial",
    creationMethod: "human",
    note: "Pinned source and field-specific rights review before acquisition.",
  },
  contentCapabilities: ["lemmas", "morphology", "strong-numbers"],
  integrity: { requiredAlgorithm: "SHA-256", status: "not-verified", verifiedArtifactIds: [] },
  status: "ready-for-import",
};
