export interface StudyPathResource {
  workId: string;
  label: string;
  locator?: string;
}

export interface StudyPath {
  id: string;
  title: string;
  description: string;
  coverage: "installed" | "partial";
  branch: "Bíblia e interpretação" | "Teologia" | "História e tradições" | "Literatura e fontes";
  resources: readonly StudyPathResource[];
}

export const STUDY_PATHS: readonly StudyPath[] = [
  {
    id: "exegese-recepcao",
    branch: "Bíblia e interpretação",
    title: "Exegese e história da recepção",
    description:
      "Compare o texto bíblico com uma leitura patrística extensa, sem confundir recepção antiga com sentido lexical automático.",
    coverage: "installed",
    resources: [
      { workId: "work:origen-commentary-john-books-1-2", label: "Orígenes sobre João I–II" },
    ],
  },
  {
    id: "patristica",
    branch: "História e tradições",
    title: "Patrística e cristianismo antigo",
    description:
      "Fontes primárias para comunidade, ética, martírio, formação doutrinária e autobiografia espiritual.",
    coverage: "installed",
    resources: [
      { workId: "work:didache", label: "Didaquê" },
      { workId: "work:first-clement", label: "1 Clemente" },
      { workId: "work:augustine-confessions", label: "Confissões de Agostinho" },
    ],
  },
  {
    id: "trindade-cristologia",
    branch: "Teologia",
    title: "Trindade e cristologia",
    description:
      "Coloque documentos conciliares em diálogo com a organização escolástica das questões teológicas.",
    coverage: "installed",
    resources: [
      { workId: "work:nicene-creed-325", label: "Credo de Niceia" },
      { workId: "work:chalcedonian-definition", label: "Definição de Calcedônia" },
      { workId: "work:aquinas-summa-prima-pars", label: "Suma Teológica I" },
      { workId: "work:aquinas-summa-tertia-pars", label: "Suma Teológica III" },
    ],
  },
  {
    id: "etica-soteriologia",
    branch: "Teologia",
    title: "Ética, virtudes e soteriologia",
    description:
      "Investigue atos humanos, hábitos, lei, graça, virtudes e vícios nas duas seções da Segunda Parte da Suma.",
    coverage: "installed",
    resources: [
      { workId: "work:aquinas-summa-prima-secundae", label: "Suma Teológica I–II" },
      { workId: "work:aquinas-summa-secunda-secundae", label: "Suma Teológica II–II" },
    ],
  },
  {
    id: "gnosticismo",
    branch: "Literatura e fontes",
    title: "Nag Hammadi e cristianismos antigos",
    description:
      "Comece pelo testemunho copta de Tomé e use o catálogo dos 13 códices para controlar o que ainda não possui texto licenciado.",
    coverage: "partial",
    resources: [{ workId: "work:gospel-thomas-coptic", label: "Evangelho de Tomé em copta" }],
  },
  {
    id: "eclesiologia-liturgia",
    branch: "História e tradições",
    title: "Eclesiologia e práticas comunitárias",
    description:
      "Batismo, eucaristia, ministério, disciplina e identidade eclesial em documentos dos primeiros séculos.",
    coverage: "installed",
    resources: [
      { workId: "work:didache", label: "Didaquê" },
      { workId: "work:epistle-diognetus", label: "Epístola a Diogneto" },
      { workId: "work:polycarp-philippians", label: "Policarpo aos Filipenses" },
    ],
  },
  {
    id: "escatologia",
    branch: "Teologia",
    title: "Escatologia",
    description:
      "Morte, ressurreição, juízo, esperança e leituras apocalípticas. A trilha está pronta, mas ainda carece de uma coleção especializada instalada.",
    coverage: "partial",
    resources: [],
  },
  {
    id: "pneumatologia",
    branch: "Teologia",
    title: "Pneumatologia",
    description:
      "Pessoa e obra do Espírito, dons, santificação e experiência comunitária, com separação entre texto, doutrina e tradição.",
    coverage: "partial",
    resources: [],
  },
  {
    id: "hamartiologia-justificacao",
    branch: "Teologia",
    title: "Hamartiologia e justificação",
    description:
      "Pecado, culpa, graça e justificação organizados como problemas distintos e comparáveis entre tradições.",
    coverage: "partial",
    resources: [],
  },
  {
    id: "sacramentos-santificacao",
    branch: "Teologia",
    title: "Sacramentos e santificação",
    description:
      "Práticas, doutrinas e desenvolvimento histórico sem reduzir posições confessionais a uma única resposta.",
    coverage: "partial",
    resources: [],
  },
  {
    id: "hermeneutica-metodos",
    branch: "Bíblia e interpretação",
    title: "Hermenêutica e métodos",
    description:
      "Aprenda a distinguir observação textual, exegese, aplicação, método histórico e pressupostos interpretativos.",
    coverage: "partial",
    resources: [],
  },
] as const;
