import type { StudyCourse } from "../../domain/study-course";
import { GENESIS_ORIENTATION, GENESIS_TEXT } from "./genesis-orientation";
import { GENESIS_LANGUAGE } from "./genesis-language";
import { GENESIS_CONTEXT } from "./genesis-context";
import { GENESIS_INTERPRETATIONS, GENESIS_SYNTHESIS } from "./genesis-interpretations";
import { GENESIS_DEEPENING } from "./genesis-deepening";

export const GENESIS_COURSE: StudyCourse = {
  id: "genesis-1",
  revision: 1,
  title: "Gênesis 1: texto, contexto e interpretações",
  description:
    "Um percurso acadêmico de leitura: da primeira observação à investigação pessoal, com Bíblia, fontes, comparação de interpretações e atividades registradas.",
  prerequisites: [
    "Leitura em português. As expressões hebraicas são explicadas, sem exigir domínio prévio do idioma.",
    "Disposição para distinguir texto, interpretação e convicção pessoal.",
  ],
  outcomes: [
    "Delimitar e descrever Gênesis 1:1–2:3.",
    "Investigar linguagem e contexto com fontes identificadas.",
    "Comparar argumentos de diferentes perspectivas.",
    "Produzir uma síntese própria que possa ser revisada.",
  ],
  modules: [
    GENESIS_ORIENTATION,
    GENESIS_TEXT,
    GENESIS_LANGUAGE,
    GENESIS_CONTEXT,
    GENESIS_INTERPRETATIONS,
    GENESIS_SYNTHESIS,
  ].map((module) => ({ ...module, lessons: module.lessons.map((lesson, index) => index > 0 ? lesson : {
    ...lesson,
    sections: lesson.sections.map((section, sectionIndex, sections) => {
      const first = sections.findIndex((item) => item.kind === section.kind) === sectionIndex;
      const deeper = GENESIS_DEEPENING[module.id];
      const extra = first && (section.kind === "concept" ? deeper?.analysis : section.kind === "example" ? deeper?.caseStudy : section.kind === "discussion" ? deeper?.reflection : undefined);
      return { ...section, paragraphs: extra ? [...section.paragraphs, extra] : section.paragraphs };
    }),
  }) })),
  references: [
    {
      id: "net",
      title: "NET Bible — notas de Gênesis 1",
      url: "https://www.stepbible.org/?q=version%3DNET2full%40reference%3DGen.1",
      perspective:
        "Tradução e notas de equipe cristã evangélica; alternativas gramaticais identificadas.",
    },
    {
      id: "oshb",
      title: "Open Scriptures Hebrew Bible — dados de morfologia",
      url: "https://github.com/openscriptures/morphhb",
      perspective:
        "Dataset linguístico; análise e licença próprias, sem representar uma conclusão teológica.",
    },
    {
      id: "museum",
      title: "British Museum — tablete de Enūma Eliš II e oração a Marduk",
      url: "https://www.britishmuseum.org/collection/object/W_1880-0617-1258",
      perspective:
        "Registro de objeto material; não constitui prova direta de dependência de Gênesis.",
    },
    {
      id: "rashi",
      title: "Rashi sobre Gênesis 1:1 — Sefaria",
      url: "https://www.sefaria.org/Rashi_on_Genesis.1.1/",
      perspective:
        "Comentário judaico medieval; uma tradição de interpretação, não todas as vozes judaicas.",
    },
    {
      id: "augustine",
      title: "Agostinho — Confissões, livro XI",
      url: "https://www.newadvent.org/fathers/110111.htm",
      perspective:
        "Fonte cristã antiga em tradução inglesa histórica; reflexão sobre criação e tempo.",
    },
    {
      id: "catechism",
      title: "Catecismo da Igreja Católica — O Criador, §§279–324",
      url: "https://www.vatican.va/content/catechism/en/part_one/section_two/chapter_one/article_1/paragraph_4_the_creator.html",
      perspective: "Formulação confessional católica romana.",
    },
    {
      id: "westminster",
      title: "Confissão de Westminster — capítulo IV",
      url: "https://opc.org/wcf.html",
      perspective:
        "Formulação reformada na recensão disponibilizada pela Orthodox Presbyterian Church.",
    },
  ],
};
