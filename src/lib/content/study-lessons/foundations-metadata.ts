import type { StudyFoundation } from "../../domain/study-foundation";
import { LESSON_REFERENCES } from "./references";

const locators: Readonly<Record<string, string>> = {
  "dei-verbum": "§§11–13 e 21–25; conferir a seção usada na interpretação",
  "catechism-god": "§§198–421; exposição confessional sobre Deus, criação e pecado",
  "catechism-scripture": "§§50–141; revelação e Escritura",
  augsburg: "Artigos pertinentes ao tema; IV e VI para justificação e obediência",
  westminster: "Recensão da OPC; identificar o capítulo consultado",
  didache: "Texto primário; capítulos variam conforme a questão tratada",
  clement: "1 Clemente; especialmente 42–44 quando a questão é ministério",
  diognetus: "Epístola a Diogneto; capítulos 5–6 para a representação da vida cristã",
  "calvin-justification": "Institutas III.11",
  summa: "Prima Pars; a questão e o artigo devem ser identificados ao citar",
};

/** Bibliography is deliberately not presented as a verified source for every sentence. */
export function chapterFoundation(
  id: string,
  references: readonly string[],
): readonly StudyFoundation[] {
  const sources = references
    .map((key) => LESSON_REFERENCES.find((reference) => reference.id === key))
    .filter((item) => item !== undefined);
  if (!sources.length) return [];
  const area =
    id === "method:social-scientific"
      ? "Antropologia social"
      : id.includes("thomism") || id === "faith-reason"
        ? "Filosofia"
        : id.startsWith("entity:historical:") ||
            id.startsWith("history:") ||
            id.startsWith("tradition:") ||
            id.startsWith("entity:council:")
          ? "História"
          : id.startsWith("method:") ||
              id.startsWith("stance:") ||
              id.startsWith("theory:") ||
              id.startsWith("entity:concept:")
            ? "Leitura textual"
            : "Teologia";
  return [
    {
      claim: "Base bibliográfica do capítulo",
      area,
      status: "Bibliografia temática",
      basis:
        "A exposição é uma síntese editorial. As obras abaixo permitem examinar o tema e comparar perspectivas; sua presença não comprova automaticamente cada frase da aula.",
      sources: sources.map((reference) => ({
        title: reference.title,
        url: reference.url,
        locator:
          locators[reference.id] ??
          "Referência temática; consultar a unidade pertinente antes de atribuir uma afirmação ao autor",
        perspective: reference.perspective,
        supports: "Leitura de referência para o problema apresentado neste capítulo.",
        limit:
          "O vínculo é bibliográfico. Não há atribuição automática de toda a redação do Scriptorium a esta fonte, nem revisão humana frase a frase.",
      })),
      alternatives:
        "Compare a pergunta, os pressupostos e o alcance de cada fonte. Uma posição confessional, um argumento filosófico e uma reconstrução histórica não têm o mesmo tipo de fundamentação.",
    },
  ];
}
