import type { CourseReference } from "../../../domain/study-course";
import type { FoundationSource, StudyFoundation } from "../../../domain/study-foundation";

/** Primary texts consulted on 2026-10-26. Exposition is original, not a translation. */
export const SOURCES = {
  ways: {
    title: "Tomás de Aquino — cinco vias",
    url: "https://www.newadvent.org/summa/1002.htm",
    perspective: "Suma Teológica I, q.2; escolástica latina, tradução histórica inglesa.",
  },
  evil: {
    title: "Tomás de Aquino — natureza do mal",
    url: "https://www.newadvent.org/summa/1048.htm",
    perspective: "Suma Teológica I, q.48; análise metafísica da privação.",
  },
  providence: {
    title: "Tomás de Aquino — providência",
    url: "https://www.newadvent.org/summa/1022.htm",
    perspective: "Suma Teológica I, q.22; distingue governo, causas e contingência.",
  },
  grace: {
    title: "Tomás de Aquino — necessidade da graça",
    url: "https://www.newadvent.org/summa/2109.htm",
    perspective: "Suma Teológica I–II, q.109; natureza, cura e elevação.",
  },
  prayer: {
    title: "Tomás de Aquino — oração",
    url: "https://www.newadvent.org/summa/3083.htm",
    perspective: "Suma Teológica II–II, q.83; petição e providência.",
  },
  death: {
    title: "Tomás de Aquino — morte de Cristo",
    url: "https://www.newadvent.org/summa/4050.htm",
    perspective: "Suma Teológica III, q.50; morte humana e união com o Verbo.",
  },
  resurrection: {
    title: "Tomás de Aquino — ressurreição de Cristo",
    url: "https://www.newadvent.org/summa/4053.htm",
    perspective: "Suma Teológica III, q.53; exposição cristológica escolástica.",
  },
  augustine: {
    title: "Agostinho — Confissões VII",
    url: "https://www.newadvent.org/fathers/110107.htm",
    perspective: "Relato autobiográfico e argumento cristão antigo; tradução histórica inglesa.",
  },
  irenaeus: {
    title: "Irineu — Contra as heresias III.22",
    url: "https://www.newadvent.org/fathers/0103322.htm",
    perspective: "Recepção patrística de Adão, Eva e Cristo; não hipótese arqueológica.",
  },
  athanasius: {
    title: "Atanásio — Sobre a encarnação",
    url: "https://www.newadvent.org/fathers/2802.htm",
    perspective: "Tratado cristão antigo; corrupção, encarnação e vitória sobre a morte.",
  },
  calvin: {
    title: "Calvino — Institutas I.17",
    url: "https://ccel.org/ccel/calvin/institutes.iii.xviii.html",
    perspective:
      "Exposição reformada sobre o uso da doutrina da providência; tradução histórica inglesa.",
  },
  westminster: {
    title: "Confissão de Westminster",
    url: "https://www.opc.org/wcf.html",
    perspective:
      "Recensão publicada pela Orthodox Presbyterian Church; fonte confessional reformada.",
  },
  augsburg: {
    title: "Confissão de Augsburgo",
    url: "https://thebookofconcord.org/augsburg-confession-single-page/",
    perspective: "Fonte confessional luterana de 1530, em tradução histórica inglesa.",
  },
  anglican: {
    title: "Trinta e Nove Artigos de Religião",
    url: "https://anglicancommunion.org/wp-content/uploads/2026/02/Thirty-Nine-Articles-of-Religion.pdf",
    perspective:
      "Formulário histórico anglicano, publicado pelo Anglican Communion Office; não retrato uniforme de todas as províncias atuais.",
  },
  sheol: {
    title: "Catecismo — descida à mansão dos mortos",
    url: "https://www.vatican.va/archive/cathechism_po/index_new/p1s2cap2_422-682_po.html",
    perspective:
      "Autodescrição católica romana; §§632–637, distinguida da análise lexical bíblica.",
  },
  nietzsche: {
    title: "Nietzsche — Genealogia da moral",
    url: "https://www.gutenberg.org/cache/epub/52319/pg52319-images.html",
    perspective:
      "Crítica filosófica da moral e do ideal ascético; III, §§1 e 28; tradução inglesa de 1913.",
  },
} satisfies Record<string, Omit<CourseReference, "id">>;

export type SourceKey = keyof typeof SOURCES;
export const REFERENCES: readonly CourseReference[] = Object.entries(SOURCES).map(
  ([id, source]) => ({ id, ...source }),
);
export function source(
  key: SourceKey,
  locator: string,
  supports: string,
  limit: string,
): FoundationSource {
  return { ...SOURCES[key], locator, supports, limit };
}
export function foundation(
  claim: string,
  area: StudyFoundation["area"],
  status: StudyFoundation["status"],
  basis: string,
  sources: FoundationSource[],
  alternatives: string,
): StudyFoundation[] {
  return [{ claim, area, status, basis, sources, alternatives }];
}
