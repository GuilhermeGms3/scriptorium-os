import type { StudyCourse } from "../../../domain/study-course";
import { HUMANITY_UNITS } from "./humanity";
import { FIVE_WAYS } from "./five-ways";
import { CHRIST_DEATH_UNITS } from "./christ-death";
import { GRACE_PROVIDENCE_UNITS, PRAYER_UNIT, SYNTHESIS_UNIT } from "./grace-providence";
import { TRADITION_UNITS } from "./traditions";
import { REFERENCES } from "./sources";
import { developFallGraceModule } from "./development";

const localWorks = {
  summaI: { workId: "work:aquinas-summa-prima-pars", label: "Suma Teológica I" },
  summaI_II: { workId: "work:aquinas-summa-prima-secundae", label: "Suma Teológica I–II" },
  summaII_II: { workId: "work:aquinas-summa-secunda-secundae", label: "Suma Teológica II–II" },
  summaIII: { workId: "work:aquinas-summa-tertia-pars", label: "Suma Teológica III" },
  augustine: { workId: "work:augustine-confessions", label: "Confissões de Agostinho" },
};
const assigned: Readonly<Record<string, readonly { workId: string; label: string }[]>> = {
  sentido: [localWorks.augustine],
  "cinco-vias": [localWorks.summaI],
  adao: [localWorks.summaI, localWorks.augustine],
  alteridade: [localWorks.summaI],
  queda: [localWorks.summaI_II, localWorks.augustine],
  cristo: [localWorks.summaIII],
  graca: [localWorks.summaI_II],
  providencia: [localWorks.summaI],
  oracao: [localWorks.summaII_II],
  sintese: [localWorks.augustine],
};

/** Independent track. It never changes the IDs or unlock rules of existing courses. */
export const FALL_GRACE_COURSE = {
  id: "queda-graca-providencia",
  revision: 1,
  title: "Queda, graça e providência",
  description:
    "Antropologia cristã, razão e fé, morte e ressurreição, graça, providência e oração. Um percurso de leitura filosófica e teológica com hipóteses identificadas, fontes primárias e comparação entre tradições reformada, luterana e anglicana.",
  prerequisites: [
    "É recomendável conhecer as distinções entre texto, interpretação e fonte do percurso Conhecimento de Deus — fé e razão.",
    "Não é exigida adesão a uma confissão; a progressão registra leitura e elaboração argumentativa.",
  ],
  outcomes: [
    "Distinguir a leitura de Adão como arquétipo de afirmações históricas e da tipologia cristã.",
    "Explicar as cinco vias e avaliar uma objeção a cada argumento.",
    "Examinar queda, alteridade, morte e ressurreição sem confundir seus sentidos.",
    "Comparar graça, providência, eleição e oração em fontes identificadas.",
    "Registrar uma posição própria com passagem, localizador, objeção e limite.",
  ],
  modules: [
    HUMANITY_UNITS[0]!,
    FIVE_WAYS,
    ...HUMANITY_UNITS.slice(1),
    ...CHRIST_DEATH_UNITS,
    ...GRACE_PROVIDENCE_UNITS,
    ...TRADITION_UNITS,
    PRAYER_UNIT,
    SYNTHESIS_UNIT,
  ]
    .map(developFallGraceModule)
    .map((module) => ({ ...module, libraryWorks: assigned[module.id] ?? [] })),
  references: REFERENCES,
} satisfies StudyCourse;
