/** Editorial locators, not redistributed book text or automatically verified doctrine.
 * Physical pages and extracted-page hashes belong to this exact private edition.
 */
export interface PrivateStudyReading {
  id: string;
  checksum: string;
  page: number;
  pageTextChecksum: string;
  locator: string;
  topics: readonly string[];
  purpose: string;
}

const SUMMA = "bce9882610a0564144fdd1fb2ced480a1c25a30db48b4cbb004958d16034fbed";
export const PRIVATE_STUDY_READINGS: readonly PrivateStudyReading[] = [
  {
    id: "summa-i-q1",
    checksum: SUMMA,
    page: 117,
    pageTextChecksum: "a38f7937871abf0c5e7e32fcb8e8735e21cb062df824380372c3ca7d31d717bb",
    locator: "Suma Teológica · I, q. 1, a. 1 · doutrina sagrada",
    topics: ["study-guide:teologia", "study-guide:hermeneutica-metodos", "topic:bibliology"],
    purpose: "Estudar como Tomás delimita a doutrina sagrada e a relação entre razão e revelação.",
  },
  {
    id: "summa-i-q2",
    checksum: SUMMA,
    page: 127,
    pageTextChecksum: "b1a7941f512d50f772237ef0d819efd31b1dce10a94a14f10ccc4178b16e7b88",
    locator: "Suma Teológica · I, q. 2 · existência de Deus (abertura)",
    topics: ["study-guide:teologia"],
    purpose:
      "Acompanhar a formulação do problema antes de avaliar os argumentos; esta página inicia a questão.",
  },
  {
    id: "summa-i-q27",
    checksum: SUMMA,
    page: 321,
    pageTextChecksum: "dc97d3275b7062f95661d2a286c69dfce0b047298b876b40e9b67c8ef9744850",
    locator: "Suma Teológica · I, q. 27, a. 1 · processões divinas",
    topics: [
      "study-guide:trindade-cristologia",
      "doctrine:trinity",
      "topic:pneumatology",
      "study-guide:pneumatologia",
    ],
    purpose:
      "Examinar a argumentação trinitária de Tomás, distinguindo a solução das posições que ele contesta.",
  },
  {
    id: "summa-i-q31",
    checksum: SUMMA,
    page: 346,
    pageTextChecksum: "c0aa1091e1b4b7e8029c501f18dd43219a0ceda65ed0828d0ac8e64888d5feb2",
    locator: "Suma Teológica · I, q. 31, a. 1 · unidade e Trindade",
    topics: ["study-guide:trindade-cristologia", "doctrine:trinity"],
    purpose:
      "Ler a distinção entre unidade da essência e pluralidade das pessoas no argumento escolástico.",
  },
  {
    id: "summa-i-q44",
    checksum: SUMMA,
    page: 435,
    pageTextChecksum: "eae734883af8688ade364088fb59322c6661e4ce10dc3922891e3735ef2d0a3f",
    locator: "Suma Teológica · I, q. 44, a. 1 · causa primeira",
    topics: ["study-guide:teologia"],
    purpose:
      "Investigar a criação como questão teológica e filosófica, não como descrição arqueológica.",
  },
  {
    id: "summa-i-q45",
    checksum: SUMMA,
    page: 440,
    pageTextChecksum: "55aaf83df77b17eb67c1c8bd6dd57371286a4bac8d419b4d62eebd9791079ea9",
    locator: "Suma Teológica · I, q. 45, a. 1 · criação",
    topics: ["study-guide:teologia"],
    purpose:
      "Comparar a pergunta, as objeções e a solução de Tomás sobre criação a partir do nada.",
  },
  {
    id: "summa-i-q48",
    checksum: SUMMA,
    page: 463,
    pageTextChecksum: "f43a10ce5a0771e8e208232537a2d0b83b3da1ff5178fbee24d92620977dec8e",
    locator: "Suma Teológica · I, q. 48, a. 1 · bem e mal",
    topics: [
      "study-guide:hamartiologia-justificacao",
      "topic:hamartiology",
      "study-guide:teologia",
    ],
    purpose:
      "Distinguir a discussão metafísica sobre o mal de uma explicação direta de cada narrativa bíblica.",
  },
  {
    id: "summa-i-q75",
    checksum: SUMMA,
    page: 613,
    pageTextChecksum: "3d7a2cc796b20ca7975fb8263bfab6aa4f25c9ea0dcb299692276de2a807ca15",
    locator: "Suma Teológica · I, q. 75, a. 1 · alma",
    topics: ["study-guide:teologia"],
    purpose: "Introduzir a antropologia de Tomás pela questão da alma e de sua relação com a vida.",
  },
  {
    id: "summa-i-ii-q81",
    checksum: SUMMA,
    page: 1446,
    pageTextChecksum: "b5eda18157099b68c3836b4098caaa72c15b38c31fc03b5e29e66aeb96b69190",
    locator: "Suma Teológica · I–II, q. 81, a. 1 · pecado original",
    topics: ["study-guide:hamartiologia-justificacao", "topic:hamartiology"],
    purpose:
      "Estudar uma posição católica medieval sobre transmissão do pecado, sem tratá-la como consenso de todas as tradições.",
  },
  {
    id: "summa-i-ii-q109",
    checksum: SUMMA,
    page: 1676,
    pageTextChecksum: "0ea4b60abc6c1d11c0e759847aed3557d72c0763e617c35e6215490c89624471",
    locator: "Suma Teológica · I–II, q. 109, a. 1 · necessidade da graça",
    topics: [
      "study-guide:etica-soteriologia",
      "topic:soteriology",
      "topic:justification",
      "study-guide:hamartiologia-justificacao",
    ],
    purpose:
      "Examinar como Tomás articula natureza, conhecimento e auxílio divino na abertura do tratado da graça.",
  },
  {
    id: "summa-iii-q1",
    checksum: SUMMA,
    page: 2899,
    pageTextChecksum: "4d6ae06945a74bff86b5bce75d9f6d6975378bc39c345b3545749e7908bab178",
    locator: "Suma Teológica · III, q. 1, a. 1 · encarnação",
    topics: ["study-guide:trindade-cristologia", "topic:christology", "doctrine:incarnation"],
    purpose: "Ler a conveniência da encarnação dentro da estrutura argumentativa de Tomás.",
  },
  {
    id: "summa-iii-q60",
    checksum: SUMMA,
    page: 3339,
    pageTextChecksum: "0ad000f490ac235f73a6d1b46406cb0cfc479789772e8e0098399e1478bd9b34",
    locator: "Suma Teológica · III, q. 60, a. 1 · sacramentos",
    topics: ["study-guide:sacramentos-santificacao", "topic:sacramentology"],
    purpose:
      "Começar pela definição e pelo caráter de sinal dos sacramentos, antes de comparar doutrinas confessionais.",
  },
];

export const SUMMA_READING_NOTICE =
  "Leitura temática da tradição escolástica católica; não é comentário direto de cada versículo. Leia as objeções, a SOLUÇÃO e as respostas sem atribuir as objeções ao autor. Esta compilação privada informa traduções de procedências diferentes; não foi certificada como edição crítica.";
