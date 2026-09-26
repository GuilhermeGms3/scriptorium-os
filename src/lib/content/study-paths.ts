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
  resources: readonly StudyPathResource[];
}

export const STUDY_PATHS: readonly StudyPath[] = [
  {
    id: "exegese-recepcao",
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
    title: "Nag Hammadi e cristianismos antigos",
    description:
      "Comece pelo testemunho copta de Tomé e use o catálogo dos 13 códices para controlar o que ainda não possui texto licenciado.",
    coverage: "partial",
    resources: [{ workId: "work:gospel-thomas-coptic", label: "Evangelho de Tomé em copta" }],
  },
  {
    id: "eclesiologia-liturgia",
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
] as const;
