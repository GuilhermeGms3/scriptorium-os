import { resolve } from "node:path";
import { importEbibleUsfm, type EbibleEdition } from "./ebible-usfm";

export const KJV_EDITION: EbibleEdition = {
  lockKey: "eBibleKingJamesVersion",
  code: "eng-kjv",
  key: "kjv",
  label: "KJV",
  books: {
    // Only the additions (10:4–16:24), not a complete Greek Esther like the BPM one.
    ESG: {
      id: "additions-to-esther",
      name: "Adições a Ester",
      abbreviation: "AdEt",
      testament: "other",
    },
  },
  revision: "2026-09-26",
  sourceUrl: "https://ebible.org/Scriptures/eng-kjv_usfm.zip",
  sourcePath: "corpora/source/ebible-kjv/2026-09-26/eng-kjv_usfm.zip",
  outputRoot: "generated/corpora/king-james-version/2026-09-26",
  corpusId: "king-james-version",
  editionId: "king-james-version-2026-09-26",
  packageId: "pkg-ebible-kjv-2026-09-26",
  schemeId: "ebible-eng-kjv-2026-09-26",
  artifactId: "artifact:ebible:eng-kjv:usfm:2026-09-26",
  attribution:
    "King James Version (Authorized Version), texto padronizado de 1769, com apócrifos; eBible.org e Crosswire Bible Society. Domínio público fora do Reino Unido, onde a impressão depende da patente da Coroa.",
  warnings: 0,
  structuralDecisions: [
    "A numeração e os intervalos de versículos do USFM são preservados; intervalos não são divididos artificialmente.",
    "Notas e referências cruzadas do USFM são contabilizadas, mas não misturadas ao texto bíblico.",
    "Os livros apócrifos do pacote são mantidos, sem declarar um cânon universal.",
    'O "Esther (Greek)" da KJV contém só as adições (10:4–16:24) e fica como "Adições a Ester", sem ser alinhado ao Ester Grego completo da BPM.',
    "O texto inglês de 1769 é mantido como está, sem modernização de grafia.",
    "A numeração coincide com a da Bíblia Livre nos 1.189 capítulos canônicos; a única diferença é Marcos 5:19, que a Bíblia Livre junta ao versículo 18.",
    "Nenhum alinhamento palavra a palavra é inferido.",
  ],
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const manifest = await importEbibleUsfm(KJV_EDITION);
  process.stdout.write(`${JSON.stringify(manifest.statistics, null, 2)}\n`);
}
