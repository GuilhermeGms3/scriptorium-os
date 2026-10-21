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
  notice?: string;
}

const SUMMA = "bce9882610a0564144fdd1fb2ced480a1c25a30db48b4cbb004958d16034fbed";
export const PRIVATE_STUDY_READINGS: readonly PrivateStudyReading[] = [
  {
    id: "ware-nicea-first-councils",
    checksum: "6a07e12ae01058d6acaa0a33bd86bda47ba94c689a56173ec24af71905afae5d",
    page: 11,
    pageTextChecksum: "fa8692fb695f0d13c780c1a50c87436cb350f5857160dd20c04a10e00b783cb4",
    locator: "Kallistos Ware · Niceia e os primeiros concílios",
    topics: [
      "study-guide:historia-tradicoes",
      "study-guide:trindade-cristologia",
      "study-guide:teologia",
    ],
    purpose:
      "Estudar a apresentação ortodoxa de Niceia, das relações Igreja–Império e das definições conciliares, distinguindo narrativa histórica e posição confessional.",
  },
  {
    id: "ware-florence-union",
    checksum: "6a07e12ae01058d6acaa0a33bd86bda47ba94c689a56173ec24af71905afae5d",
    page: 41,
    pageTextChecksum: "3f5883183cb0ca09ef1f2a40d564e98b9376e7a3baa19f2d61432fd548eb1a42",
    locator: "Kallistos Ware · Florença e a recepção da união",
    topics: ["study-guide:historia-tradicoes", "study-guide:teologia"],
    purpose:
      "Ler a perspectiva ortodoxa sobre Florença, divergências e recepção. Este capítulo não equivale às atas do concílio nem à posição de todas as tradições.",
  },
  {
    id: "catechism-prologue-catechesis",
    checksum: "17a34221d239025a27503c061c0ce69b5bf3da1c8b5e35767f0b56c4de05d332",
    page: 6,
    pageTextChecksum: "3b6c8621fc75b704657a3dc4e752f50c36bf4bc8f444384c99225ef379a29f86",
    locator: "Catecismo da Igreja Católica · prólogo, §§ 1–8",
    topics: [
      "study-guide:teologia",
      "study-guide:historia-tradicoes",
      "study-guide:etica-soteriologia",
    ],
    purpose:
      "Distinguir a exposição catequética católica, seus parágrafos e referências bíblicas. Referência de apoio doutrinário não é automaticamente comentário exegético da passagem citada.",
  },
  {
    id: "augustine-trinity-john16",
    checksum: "455fad64bb39d2f9ef1c1294f054f925d672334a06d4c51e2e96ebfbfb934227",
    page: 39,
    pageTextChecksum: "1fb2ff2ce8118e8e6123b5cb18a905a66535bc6f5ef11bab5e8cd91045c32c1b",
    locator: "A Trindade · leitura de João 16:25 e contexto",
    topics: [
      "study-guide:trindade-cristologia",
      "doctrine:trinity",
      "study-guide:patristica",
      "study-guide:exegese-recepcao",
    ],
    purpose:
      "Observar a interpretação de Agostinho acerca de falar do Pai, visão e mediação do Verbo.",
  },
  {
    id: "augustine-trinity-john5-26",
    checksum: "455fad64bb39d2f9ef1c1294f054f925d672334a06d4c51e2e96ebfbfb934227",
    page: 43,
    pageTextChecksum: "1f542e13007124fe0bc1736850a424a7fd658c504165220e2745ca880d388a30",
    locator: "A Trindade · discussão de João 5:26",
    topics: [
      "study-guide:trindade-cristologia",
      "doctrine:trinity",
      "study-guide:patristica",
      "topic:christology",
    ],
    purpose:
      "Examinar a distinção agostiniana entre geração do Filho e concessão da vida; leitura teológica do autor, não resultado lexical automático.",
  },
  {
    id: "augustine-trinity-john5-19",
    checksum: "455fad64bb39d2f9ef1c1294f054f925d672334a06d4c51e2e96ebfbfb934227",
    page: 51,
    pageTextChecksum: "7dac5ef9c5ee3454e5d9d9a0ea3fd94d7bf9e1de7d4cf50b4613a33e7210f8f6",
    locator: "A Trindade · discussão de João 5:19",
    topics: [
      "study-guide:trindade-cristologia",
      "study-guide:exegese-recepcao",
      "doctrine:trinity",
    ],
    purpose:
      "Ler como Agostinho argumenta sobre unidade da operação do Pai e do Filho a partir de João.",
  },
  {
    id: "calvin-i-2",
    checksum: "3a1ec505530e29550ac4d735a63d81854c6c75b548a1e9f19a93468e99fe063d",
    page: 41,
    pageTextChecksum: "2ecef093aea316a891b83c59d67d40f278124df00e079ec4cc256e3205aa4c87",
    locator: "Institutas · livro I, capítulo II · conhecimento de Deus",
    topics: [
      "study-guide:teologia",
      "tradition:reformed",
      "study-guide:historia-tradicoes",
      "study-guide:hermeneutica-metodos",
    ],
    purpose:
      "Estudar o vínculo entre conhecimento e piedade na exposição reformada de Calvino; este é o volume 1, não o tratado completo da justificação.",
  },
  {
    id: "reimer-acts16",
    checksum: "74684b5e9334d9864dc22d5c1d34310f649716858c9a828c949933f322384424",
    page: 36,
    pageTextChecksum: "d44bdf5ca0c87c80f87a6a055f32013f5e257291629b3d27859b6c5501eb88c1",
    locator: "Exegese e hermenêutica · Filipos, delimitação e contexto de Atos 16",
    topics: [
      "study-guide:exegese-recepcao",
      "study-guide:hermeneutica-metodos",
      "study-guide:biblia-interpretacao",
    ],
    purpose: "Acompanhar o emprego de geografia e estrutura literária na delimitação da perícope.",
  },
  {
    id: "reimer-genesis1",
    checksum: "74684b5e9334d9864dc22d5c1d34310f649716858c9a828c949933f322384424",
    page: 141,
    pageTextChecksum: "0da5de7e0d4edbddc5f5d9d04adac75962f221cc40308ef7f497207b623129e1",
    locator: "Exegese e hermenêutica · Gênesis e linguagem da criação",
    topics: ["study-guide:hermeneutica-metodos", "study-guide:biblia-interpretacao"],
    purpose:
      "Comparar a abordagem histórico-literária dos autores com leituras confessionais, preservando a diferença de método.",
  },
  {
    id: "augsburg-justification",
    checksum: "f6f4069eaadc0f2070a16665b4e70562df30d1ee7d93019496ad7bdf7d178351",
    page: 7,
    pageTextChecksum: "9513c1628151094efbc44b4d4f653c08268c732f391dd34db9682b5fa36dec99",
    locator: "Confissão de Augsburgo · artigos IV–VII e contexto",
    topics: [
      "tradition:lutheran",
      "study-guide:hamartiologia-justificacao",
      "study-guide:etica-soteriologia",
      "topic:justification",
      "study-guide:historia-tradicoes",
    ],
    purpose:
      "Conferir a formulação luterana de justificação, ministério e nova obediência no documento, sem atribuí-la às demais tradições.",
  },
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
