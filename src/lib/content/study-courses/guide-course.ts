import type { StudyCourse } from "../../domain/study-course";
import { studyGuideById } from "../study-guides";
import { lessonForTopic, LESSON_REFERENCES } from "../study-lessons/catalog";
import { chapterFoundation } from "../study-lessons/foundations-metadata";

/** Web learning completion uses the existing course repository, never note counts. */
export function guideCourse(id: string): StudyCourse | null {
  const guide = studyGuideById(id);
  if (!guide) return null;
  const lesson = lessonForTopic({ id: `study-guide:${id}`, title: guide.title });
  if (!lesson) return null;
  const passages = [
    ...new Map(
      guide.modules.flatMap((module) => module.passages).map((p) => [`${p.book}:${p.chapter}`, p]),
    ).values(),
  ];
  const references = [...new Set(lesson.chapters.flatMap((chapter) => chapter.references))];
  return {
    id: `guia-${id}`,
    revision: 1,
    title: guide.title,
    description: guide.introduction,
    prerequisites: ["Concluir o percurso anterior na árvore para avançar na formação."],
    outcomes: ["Ler as unidades do guia, consultar as fontes e elaborar uma síntese fundamentada."],
    modules: [
      {
        id: "estudo",
        title: guide.title,
        description: guide.introduction,
        domains: [],
        objectives: [
          "Distinguir texto, interpretação e aplicação.",
          "Comparar fontes e registrar os limites da conclusão.",
        ],
        lessons: lesson.chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          sections: [
            {
              kind: "concept",
              title: chapter.title,
              paragraphs: chapter.paragraphs,
              references: chapter.references,
            },
            ...(chapter.deepening
              ? [
                  {
                    kind: "concept" as const,
                    title: "Análise",
                    paragraphs: [chapter.deepening.analysis],
                    references: chapter.references,
                  },
                  {
                    kind: "example" as const,
                    title: "Caso de leitura",
                    paragraphs: [chapter.deepening.caseStudy],
                    references: chapter.references,
                  },
                  {
                    kind: "discussion" as const,
                    title: "Síntese",
                    paragraphs: [chapter.deepening.reflection],
                    references: chapter.references,
                  },
                ]
              : []),
          ],
        })),
        passages: passages.map((p) => ({
          id: `${p.book}:${p.chapter}`,
          label: p.label,
          purpose: "Examinar a unidade em seu contexto e registrar observações.",
          ref: { bookId: p.book, chapter: p.chapter, versificationSchemeId: "scriptorium-bcv-1" },
        })),
        foundation: chapterFoundation(`study-guide:${id}`, references),
        activity: {
          prompt:
            "Produza uma síntese sobre a questão estudada, citando a passagem e uma fonte com localizador. Compare uma interpretação alternativa e delimite o alcance de sua conclusão.",
          criteria: [
            "Distingui a observação do texto e minha interpretação.",
            "Registrei a fonte e o localizador.",
            "Considerei uma alternativa e um limite da conclusão.",
          ],
        },
        connections: [],
        videos: [],
      },
    ],
    references: LESSON_REFERENCES,
  };
}
