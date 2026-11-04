import { resolve } from "node:path";
import { importEbibleUsfm, type EbibleEdition } from "./ebible-usfm";

export const BPM_EDITION: EbibleEdition = {
  lockKey: "eBibleBibliaPortuguesaMundial",
  code: "porbrbsl",
  key: "bpm",
  label: "BPM",
  revision: "2026-08-19",
  sourceUrl: "https://ebible.org/Scriptures/porbrbsl_usfm.zip",
  sourcePath: "corpora/source/ebible-bpm/2026-08-19/porbrbsl_usfm.zip",
  outputRoot: "generated/corpora/biblia-portuguesa-mundial/2026-08-19",
  corpusId: "biblia-portuguesa-mundial",
  editionId: "biblia-portuguesa-mundial-2026-08-19",
  packageId: "pkg-ebible-bpm-2026-08-19",
  schemeId: "ebible-porbrbsl-2026-08-19",
  artifactId: "artifact:ebible:porbrbsl:usfm:2026-08-19",
  attribution:
    "Bíblia Portuguesa Mundial, eBible.org. Domínio público. Edição-fonte marcada como DRAFT/em revisão em 19 de agosto de 2026.",
  warnings: 1,
  structuralDecisions: [
    "A numeração e os intervalos de versículos do USFM são preservados; intervalos não são divididos artificialmente.",
    "Notas de tradução e referências cruzadas são contabilizadas, mas não misturadas ao texto bíblico.",
    "Endereços cujo conteúdo existe apenas em nota editorial não geram texto bíblico artificial.",
    "Os 83 trabalhos do pacote são mantidos, inclusive deuterocanônicos e outros apócrifos, sem declarar um cânon universal.",
    "A edição é identificada visivelmente como rascunho em revisão.",
    "Nenhum alinhamento palavra a palavra é inferido.",
  ],
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const manifest = await importEbibleUsfm(BPM_EDITION);
  process.stdout.write(`${JSON.stringify(manifest.statistics, null, 2)}\n`);
}
