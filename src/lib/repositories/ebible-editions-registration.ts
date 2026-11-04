import novaBibliaVivaJson from "../../../generated/corpora/nova-biblia-viva/2026-10-27/manifest.json";
import bibliaLivreParaTodosJson from "../../../generated/corpora/biblia-livre-para-todos/2026-10-27/manifest.json";
import worldEnglishBibleJson from "../../../generated/corpora/world-english-bible/2026-10-27/manifest.json";
import reinaValera1909Json from "../../../generated/corpora/reina-valera-1909/2026-10-27/manifest.json";
import vulgataClementinaJson from "../../../generated/corpora/vulgata-clementina/2026-10-27/manifest.json";
import type { GeneratedCorpusManifest } from "../domain/generated-corpus";
import type { Edition } from "../domain/scripture";
import { ebibleRegistration, type EbibleRegistration } from "./ebible-registration";

const CC_BY_SA_4 = {
  id: "CC-BY-SA-4.0",
  name: "Creative Commons Atribuição-CompartilhaIgual 4.0",
  url: "https://creativecommons.org/licenses/by-sa/4.0/",
};

/** Retrieved 2026-10-27 from eBible.org; see scripts/content/ebible-editions.ts. */
const COMMON = {
  version: "2026-10-27",
  retrievedAt: "2026-10-27T00:00:00.000Z",
  authorsOrEditors: ["eBible.org"],
};

const EDITIONS: readonly (EbibleRegistration & { year: number })[] = [
  {
    ...COMMON,
    dataset: novaBibliaVivaJson as GeneratedCorpusManifest,
    code: "poronbv",
    name: "Nova Bíblia Viva",
    shortName: "NBV",
    // CC BY-SA asks for the credit wherever the text appears: it travels in the name.
    title: "Nova Bíblia Viva © 2007 Biblica, Inc.",
    abbreviation: "NBV",
    language: "pt-BR",
    year: 2007,
    byteSize: 1_717_117,
    work: "Biblica® Open Nova Bíblia Viva",
    authorsOrEditors: ["Biblica, Inc.", "eBible.org"],
    recommendedCitation:
      "Nova Bíblia Viva (Biblica® Open Nova Bíblia Viva), © 2007, 2010 Biblica, Inc. Licença CC BY-SA 4.0.",
    reviewNote:
      "Licença Creative Commons Atribuição-CompartilhaIgual 4.0 declarada na fonte: uso comercial permitido, com crédito à Biblica e a mesma licença para o texto.",
    openLicense: { ...CC_BY_SA_4, copyrightHolder: "Biblica, Inc." },
  },
  {
    ...COMMON,
    dataset: bibliaLivreParaTodosJson as GeneratedCorpusManifest,
    code: "porblt",
    name: "Bíblia Livre Para Todos",
    shortName: "BLT",
    title: "Bíblia Livre Para Todos (NT) © 2022 Free Bible Ministry",
    abbreviation: "BLT",
    language: "pt-BR",
    year: 2022,
    byteSize: 468_232,
    work: "Bíblia Livre Para Todos, Novo Testamento",
    authorsOrEditors: ["Free Bible Ministry, Inc.", "eBible.org"],
    recommendedCitation:
      "Bíblia Livre Para Todos (Novo Testamento), © 2022 Free Bible Ministry, Inc. Licença CC BY-SA 4.0.",
    reviewNote:
      "Licença Creative Commons Atribuição-CompartilhaIgual 4.0 declarada na fonte. Só o Novo Testamento.",
    openLicense: { ...CC_BY_SA_4, copyrightHolder: "Free Bible Ministry, Inc." },
  },
  {
    ...COMMON,
    dataset: worldEnglishBibleJson as GeneratedCorpusManifest,
    code: "engwebp",
    name: "World English Bible",
    shortName: "WEB",
    title: "World English Bible",
    abbreviation: "WEB",
    language: "en",
    year: 2020,
    byteSize: 2_908_005,
    work: "World English Bible",
    recommendedCitation: "World English Bible, domínio público, eBible.org.",
    reviewNote: "Domínio público declarado na fonte.",
  },
  {
    ...COMMON,
    dataset: reinaValera1909Json as GeneratedCorpusManifest,
    code: "spaRV1909",
    name: "Reina-Valera 1909",
    shortName: "RV1909",
    title: "Reina-Valera 1909",
    abbreviation: "RV1909",
    language: "es",
    year: 1909,
    byteSize: 2_384_899,
    work: "Santa Biblia — Reina-Valera 1909",
    recommendedCitation: "Santa Biblia Reina-Valera 1909, domínio público, eBible.org.",
    reviewNote: "Domínio público declarado na fonte.",
  },
  {
    ...COMMON,
    dataset: vulgataClementinaJson as GeneratedCorpusManifest,
    code: "latVUC",
    name: "Vulgata Clementina",
    shortName: "VULG",
    title: "Vulgata Clementina (1598)",
    abbreviation: "VULG",
    language: "la",
    year: 1598,
    byteSize: 3_554_559,
    work: "Biblia Sacra Vulgata Clementina",
    recommendedCitation: "Biblia Sacra Vulgata Clementina (1598), domínio público, eBible.org.",
    reviewNote:
      "Domínio público declarado na fonte. Numeração da Vulgata: nos Salmos difere da hebraica.",
  },
];

const registrations = EDITIONS.map((edition) => ({
  edition,
  records: ebibleRegistration(edition),
}));

/** The generated manifests, for the reader's chapter files and books. */
export const ebibleEditionManifests: readonly GeneratedCorpusManifest[] = EDITIONS.map(
  (edition) => edition.dataset,
);

/** The editions as the reader lists them, in this order after the King James. */
export const ebibleReaderEditions: readonly Edition[] = registrations.map(
  ({ edition, records }) => ({
    id: records.edition.id,
    corpusId: records.edition.corpusId,
    title: edition.title,
    abbreviation: edition.abbreviation,
    language: edition.language,
    script: "Latn",
    direction: "ltr",
    kind: "translation",
    year: edition.year,
    licenseId: edition.openLicense?.id ?? "Public-Domain",
  }),
);

export const ebibleEditionRecords = {
  corpora: registrations.map(({ records }) => records.corpus),
  editions: registrations.map(({ records }) => records.edition),
  packages: registrations.map(({ records }) => records.installedPackage),
  artifacts: registrations.map(({ records }) => records.artifact),
  transformations: registrations.flatMap(({ records }) => records.transformations),
  datasets: registrations.map(({ records }) => records.importedDataset),
};
