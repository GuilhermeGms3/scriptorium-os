import type { CourseModule } from "../../../domain/study-course";

function passage(
  label: string,
  explanation: string,
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): CourseModule["connections"][number] {
  return {
    label,
    explanation,
    ref: { bookId, chapter, verseStart, verseEnd, versificationSchemeId: "scriptorium-bcv-1" },
  };
}

/** Optional complements: never added to the required reading IDs or completion gates. */
export const DEVELOPMENT_CONNECTIONS: Readonly<Record<string, CourseModule["connections"]>> = {
  sentido: [
    passage(
      "Lamento e fidelidade — Salmo 73:21–28",
      "Comparar sofrimento, discernimento e relação com Deus, sem reduzir o poema a garantia de sucesso.",
      "psalms",
      73,
      21,
      28,
    ),
  ],
  "cinco-vias": [
    passage(
      "Razão e testemunho — Atos 17:22–31",
      "Distinguir a argumentação do discurso, suas referências culturais e a afirmação da ressurreição; o texto não é uma transcrição das cinco vias.",
      "acts",
      17,
      22,
      31,
    ),
  ],
  adao: [
    passage(
      "Adão e Cristo — 1 Coríntios 15:45–49",
      "Relacionar representação e condição de vida sem converter a comparação numa tese arqueológica.",
      "1-corinthians",
      15,
      45,
      49,
    ),
  ],
  alteridade: [
    passage(
      "O próximo como sujeito — Gênesis 4:1–16",
      "Comparar fraternidade, responsabilidade e recusa de responder pelo outro com as cenas anteriores de reconhecimento e acusação.",
      "genesis",
      4,
      1,
      16,
    ),
  ],
  queda: [
    passage(
      "Agência e conflito — Romanos 7:14–25",
      "Examinar o conflito do querer e os problemas de identificar a voz da passagem, sem tratá-la como teoria clínica universal.",
      "romans",
      7,
      14,
      25,
    ),
  ],
  cristo: [
    passage(
      "Encarnação e testemunho — João 1:1–18",
      "Ler a relação entre Verbo, vida, testemunho e encarnação na unidade do prólogo.",
      "john",
      1,
      1,
      18,
    ),
    passage(
      "Humilhação e exaltação — Filipenses 2:5–11",
      "Relacionar a afirmação cristológica à exortação sobre a vida comum; não deduzir abandono da divindade da linguagem de esvaziamento.",
      "philippians",
      2,
      5,
      11,
    ),
    passage(
      "Reconhecimento e corpo — Lucas 24:36–49",
      "Investigar continuidade, reconhecimento e interpretação das Escrituras na narrativa da ressurreição.",
      "luke",
      24,
      36,
      49,
    ),
  ],
  sheol: [
    passage(
      "Transformação e esperança — 1 Coríntios 15:35–58",
      "Investigar corpo, incorruptibilidade e vitória sobre a morte sem identificar espiritual com simplesmente imaterial.",
      "1-corinthians",
      15,
      35,
      58,
    ),
    passage(
      "Consumação — Apocalipse 21:1–5",
      "Comparar juízo e esperança para a criação; o desaparecimento da morte situa o debate para além do estado intermediário.",
      "revelation",
      21,
      1,
      5,
    ),
    passage(
      "Juízo e duração — Mateus 25:31–46",
      "Ler uma passagem importante no debate entre modelos escatológicos e declarar como se interpreta sua linguagem.",
      "matthew",
      25,
      31,
      46,
    ),
  ],
  graca: [
    passage(
      "Dom e vida renovada — Tito 3:3–8",
      "Relacionar gratuidade, renovação e prática do bem; distinguir causa da salvação e resposta.",
      "titus",
      3,
      3,
      8,
    ),
  ],
  providencia: [
    passage(
      "Planejamento e limite — Tiago 4:13–17",
      "Examinar a crítica à autossuficiência sem deduzir que planejar ou agir tenha se tornado dispensável.",
      "james",
      4,
      13,
      17,
    ),
  ],
  calvinismo: [
    passage(
      "Eleição e advertência — Romanos 11:17–24",
      "Completar o recorte de Romanos 9 no problema de Israel, promessa e vanglória; não usar eleição para superioridade étnica ou pessoal.",
      "romans",
      11,
      17,
      24,
    ),
  ],
  luteranismo: [
    passage(
      "Liberdade e serviço — Gálatas 5:13–26",
      "Comparar liberdade, amor e vida orientada pelo Espírito com a discussão sobre justificação e obediência.",
      "galatians",
      5,
      13,
      26,
    ),
  ],
  anglicanismo: [
    passage(
      "Inteligibilidade do culto — 1 Coríntios 14:6–19",
      "Investigar compreensão e edificação da comunidade, sem converter a unidade em regulamento de uma liturgia posterior específica.",
      "1-corinthians",
      14,
      6,
      19,
    ),
  ],
  oracao: [
    passage(
      "Pedido e limite — 2 Coríntios 12:7–10",
      "Relacionar pedido reiterado, fraqueza e resposta sem usar o caso para explicar antecipadamente o sofrimento de outra pessoa.",
      "2-corinthians",
      12,
      7,
      10,
    ),
  ],
  sintese: [
    passage(
      "Responsabilidade no saber — 1 Coríntios 8:1–13",
      "Confrontar conhecimento, liberdade e responsabilidade pelo outro; não tratar elaboração intelectual como medida de superioridade.",
      "1-corinthians",
      8,
      1,
      13,
    ),
  ],
};
