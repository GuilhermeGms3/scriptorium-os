import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { fetchEbibleUsfm, importEbibleUsfm, type EbibleEdition } from "./ebible-usfm";

/**
 * Translations from eBible.org whose rights allow storing and redistributing them, retrieved on
 * 2026-10-27: two in Portuguese under CC BY-SA 4.0 and three public-domain texts in English,
 * Spanish and Latin. Copyrighted translations (NAA, NVI, ARA...) are not here: they need a license.
 */
const REVISION = "2026-10-27";

function edition(
  input: Pick<EbibleEdition, "code" | "key" | "label" | "attribution" | "structuralDecisions"> & {
    lockKey: string;
    corpusId: string;
  },
): EbibleEdition {
  return {
    ...input,
    revision: REVISION,
    sourceUrl: `https://ebible.org/Scriptures/${input.code}_usfm.zip`,
    sourcePath: `corpora/source/ebible-${input.key}/${REVISION}/${input.code}_usfm.zip`,
    outputRoot: `generated/corpora/${input.corpusId}/${REVISION}`,
    editionId: `${input.corpusId}-${REVISION}`,
    packageId: `pkg-ebible-${input.key}-${REVISION}`,
    schemeId: `ebible-${input.code}-${REVISION}`,
    artifactId: `artifact:ebible:${input.code}:usfm:${REVISION}`,
    warnings: 0,
  };
}

const COMMON_DECISIONS = [
  "A numeração e os intervalos de versículos do USFM são preservados; intervalos não são divididos artificialmente.",
  "Notas e referências cruzadas do USFM são contabilizadas, mas não misturadas ao texto bíblico.",
  "Nenhum alinhamento palavra a palavra é inferido.",
];

export const EBIBLE_EDITIONS: readonly EbibleEdition[] = [
  edition({
    lockKey: "eBibleNovaBibliaViva",
    code: "poronbv",
    key: "onbv",
    label: "NBV",
    corpusId: "nova-biblia-viva",
    attribution:
      "Nova Bíblia Viva (Biblica® Open Nova Bíblia Viva), © 2007, 2010 Biblica, Inc. Licença Creative Commons Atribuição-CompartilhaIgual 4.0. Obtida em eBible.org.",
    structuralDecisions: [
      ...COMMON_DECISIONS,
      "Paráfrase em português contemporâneo: o texto é mantido como publicado pela Biblica, sem revisão.",
    ],
  }),
  edition({
    lockKey: "eBibleBibliaLivreParaTodos",
    code: "porblt",
    key: "blt",
    label: "BLT",
    corpusId: "biblia-livre-para-todos",
    attribution:
      "Bíblia Livre Para Todos (Novo Testamento), © 2022 Free Bible Ministry, Inc. Licença Creative Commons Atribuição-CompartilhaIgual 4.0. Obtida em eBible.org.",
    structuralDecisions: [
      ...COMMON_DECISIONS,
      "Só o Novo Testamento: o Antigo Testamento não existe nesta edição.",
    ],
  }),
  edition({
    lockKey: "eBibleWorldEnglishBible",
    code: "engwebp",
    key: "web",
    label: "WEB",
    corpusId: "world-english-bible",
    attribution: "World English Bible, domínio público. Obtida em eBible.org.",
    structuralDecisions: [...COMMON_DECISIONS, "Inglês contemporâneo, sem livros deuterocanônicos."],
  }),
  edition({
    lockKey: "eBibleReinaValera1909",
    code: "spaRV1909",
    key: "rv1909",
    label: "RV1909",
    corpusId: "reina-valera-1909",
    attribution: "Santa Biblia — Reina-Valera 1909, domínio público. Obtida em eBible.org.",
    structuralDecisions: [
      ...COMMON_DECISIONS,
      "Espanhol de 1909, com a grafia da época, sem modernização.",
    ],
  }),
  edition({
    lockKey: "eBibleVulgataClementina",
    code: "latVUC",
    key: "vulgate",
    label: "VULG",
    corpusId: "vulgata-clementina",
    attribution: "Biblia Sacra Vulgata Clementina (1598), domínio público. Obtida em eBible.org.",
    structuralDecisions: [
      ...COMMON_DECISIONS,
      "Os livros deuterocanônicos da Vulgata são mantidos, sem declarar um cânon universal.",
      "A numeração é a da Vulgata: nos Salmos e em alguns capítulos ela difere da hebraica usada pelas outras edições, por isso o modo Paralelo pode mostrar versículos diferentes lado a lado.",
    ],
  }),
];

/** Number of scripture books in a package, as content/source-lock.json records it. */
async function worksIn(path: string): Promise<number> {
  const archive = unzipSync(await readFile(path));
  return Object.keys(archive).filter(
    (name) =>
      name.endsWith(".usfm") && !/^\d+-(FRT|BAK|OTH|INT|CNC|GLO|TDX|NDX)/.test(name),
  ).length;
}

// npm run content:ebible -- fetch|import [key]
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const [command, only] = process.argv.slice(2);
  const selected = EBIBLE_EDITIONS.filter((item) => !only || item.key === only);
  if (!selected.length) throw new Error(`Unknown edition ${only}.`);
  for (const item of selected) {
    if (command === "fetch") {
      // The New Testament alone (Bíblia Livre Para Todos) is under half a megabyte.
      const fetched = await fetchEbibleUsfm(item, 200_000);
      const bytes = await readFile(fetched.output);
      process.stdout.write(
        `${JSON.stringify({
          [item.lockKey]: {
            revision: item.revision,
            url: item.sourceUrl,
            details: `https://ebible.org/details.php?id=${item.code}`,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            sizeBytes: bytes.byteLength,
            works: await worksIn(fetched.output),
          },
        })}\n`,
      );
    } else if (command === "import") {
      const manifest = await importEbibleUsfm(item);
      process.stdout.write(`${item.label}: ${JSON.stringify(manifest.statistics)}\n`);
    } else {
      throw new Error("Use: fetch or import, optionally followed by an edition key.");
    }
  }
}
