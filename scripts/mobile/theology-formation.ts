import { FORMATION_CHAPTERS } from "./formation-content";
import { STUDY_GUIDES } from "../../src/lib/content/study-guides";
import { lessonForTopic, LESSON_REFERENCES } from "../../src/lib/content/study-lessons/catalog";
import type { StudyCourse, CourseModule } from "../../src/lib/domain/study-course";

interface FormationPlan {
  id: string;
  title: string;
  phase: string;
  guide: string;
  chapters: readonly string[];
  objective: string;
  task: string;
  practicalIndices?: readonly number[];
  passages?: readonly { book: string; chapter: number; label: string }[];
}

/** Editorial learning order. Reuses actual chapters verbatim, rather than inventing book excerpts. */
export const FORMATION_PLAN: readonly FormationPlan[] = [
  {
    id: "orientation",
    title: "Aprender a investigar",
    phase: "Fundamentos",
    guide: "teologia",
    chapters: ["theology", "faith-reason"],
    objective:
      "Distinguir descrição histórica, argumento filosófico e interpretação confessional; formular uma pergunta investigável.",
    task: "Formule uma pergunta delimitada sobre teologia. Indique o tipo de resposta procurada, o método e uma fonte identificável. Explique o que contaria como evidência contrária à sua hipótese.",
  },
  {
    id: "scripture",
    title: "Bíblia, texto e contexto",
    phase: "Fundamentos",
    guide: "biblia-interpretacao",
    chapters: ["overview:topic:bibliology", "overview:doctrine:canon", "context"],
    objective:
      "Reconhecer edição, gênero, contexto e argumento antes de formular uma conclusão sobre um versículo.",
    task: "Escolha uma passagem, identifique a edição, delimite a unidade literária e descreva o gênero. Registre três observações do texto e separe uma hipótese que ainda dependa de consulta a fontes.",
  },
  {
    id: "old-testament",
    title: "Panorama do Antigo Testamento",
    phase: "Bíblia",
    guide: "biblia-interpretacao",
    chapters: ["formation:old-testament"],
    practicalIndices: [],
    passages: [
      { book: "genesis", chapter: 1, label: "Gênesis 1" },
      { book: "exodus", chapter: 3, label: "Êxodo 3" },
      { book: "psalms", chapter: 104, label: "Salmo 104" },
      { book: "isaiah", chapter: 40, label: "Isaías 40" },
    ],
    objective:
      "Distinguir narrativa, lei, poesia e profecia e construir relações entre passagens sem apagar suas diferenças.",
    task: "Compare uma narrativa, um salmo e um discurso profético. Registre gênero, problema, observações e uma relação justificada entre os textos. Consulte um comentário com localizador e identifique uma dúvida ainda aberta.",
  },
  {
    id: "new-testament",
    title: "Panorama do Novo Testamento",
    phase: "Bíblia",
    guide: "biblia-interpretacao",
    chapters: ["formation:new-testament"],
    practicalIndices: [],
    passages: [
      { book: "luke", chapter: 1, label: "Lucas 1" },
      { book: "acts", chapter: 2, label: "Atos 2" },
      { book: "romans", chapter: 8, label: "Romanos 8" },
      { book: "revelation", chapter: 21, label: "Apocalipse 21" },
    ],
    objective:
      "Distinguir narrativa, argumento epistolar e visão e reconhecer os problemas próprios de cada obra.",
    task: "Compare uma unidade de evangelho, uma de carta e uma de Apocalipse. Identifique como cada texto comunica, consulte uma fonte interna e explicite por que os mesmos critérios não podem ser aplicados mecanicamente a todos.",
  },
  {
    id: "hermeneutics",
    title: "Pressupostos e hermenêutica",
    phase: "Método",
    guide: "hermeneutica-metodos",
    chapters: ["interpretation"],
    objective:
      "Explicitar os pressupostos de leitura e distinguir observação, interpretação e aplicação.",
    task: "Retome a passagem anterior. Compare duas perguntas de interpretação, explicite os pressupostos envolvidos e mostre como uma aplicação contemporânea depende de um argumento adicional.",
  },
  {
    id: "exegesis",
    title: "Praticar exegese",
    phase: "Método",
    guide: "exegese-recepcao",
    chapters: ["parable", "reception"],
    objective:
      "Construir uma leitura apoiada no contexto e comparar sua recepção sem confundir interpretação antiga com intenção original.",
    task: "Analise Marcos 4 ou outra unidade delimitada. Reconstrua seu argumento, confronte dois comentários com localizadores e apresente uma interpretação alternativa plausível. Identifique a diferença entre recepção e evidência textual.",
  },
  {
    id: "ancient-history",
    title: "Cristianismo antigo e concílios",
    phase: "História",
    guide: "patristica",
    chapters: [
      "ancient-christianity",
      "council-reading",
      "history:nicaea325",
      "history:constantinople381",
      "history:ephesus431",
      "history:chalcedon451",
      "history:constantinople553",
      "history:constantinople680",
      "history:nicaea787",
      "council-confession",
    ],
    objective:
      "Situar autores e documentos, distinguir credo, cânone e recepção e reconhecer a diversidade das tradições antigas.",
    task: "Monte uma breve linha do tempo de dois documentos antigos. Identifique gênero, edição, controvérsia e limites da fonte. Compare a recepção em duas tradições sem tratar uma delas como classificação universal.",
  },
  {
    id: "traditions",
    title: "História e comparação de tradições",
    phase: "História",
    guide: "historia-tradicoes",
    chapters: [
      "history:crusades",
      "history:cathars",
      "history:islam",
      "history:reformations",
      "history:orthodoxies",
      "doctrine-history",
    ],
    objective:
      "Comparar fontes de períodos distintos, reconhecer relatos adversários e diferenciar autodescrição de uma tradição e interpretação histórica.",
    task: "Compare dois testemunhos sobre uma controvérsia histórica. Anote autoria, posição, período e localizador. Apresente convergências, uma divergência documentada e algo que as fontes não permitem concluir.",
  },
  {
    id: "god",
    title: "Deus, criação e providência",
    phase: "Sistemática",
    guide: "teologia-sistematica",
    chapters: ["overview:topic:theology-proper"],
    practicalIndices: [],
    passages: [
      { book: "genesis", chapter: 1, label: "Gênesis 1" },
      { book: "job", chapter: 38, label: "Jó 38" },
    ],
    objective:
      "Distinguir linguagem sobre Deus, argumento filosófico e leitura de textos sobre criação e condição humana.",
    task: "Reconstrua um argumento sobre Deus e criação, explicitando premissas e uma objeção. Relacione-o a uma passagem e a uma fonte interna, distinguindo o que cada tipo de evidência permite concluir.",
  },
  {
    id: "trinity",
    title: "Deus e linguagem trinitária",
    phase: "Sistemática",
    guide: "trindade-cristologia",
    chapters: ["trinity-persons"],
    objective:
      "Relacionar linguagem bíblica e formulação doutrinária, distinguindo termos, problemas e níveis de argumento.",
    task: "Reconstrua um argumento trinitário com suas premissas e passagens. Compare a formulação com um credo ou obra interna e registre uma objeção. Separe observação gramatical e conclusão doutrinária.",
  },
  {
    id: "christology",
    title: "Pessoa e obra de Cristo",
    phase: "Sistemática",
    guide: "trindade-cristologia",
    chapters: ["christ-person"],
    objective:
      "Distinguir pessoa, natureza e linguagem sobre a obra de Cristo, retomando os documentos históricos já estudados.",
    task: "Compare João 1 ou Filipenses 2 com uma formulação cristológica histórica. Explique qual problema o vocabulário procura responder, indique as fontes e identifique o limite do argumento.",
  },
  {
    id: "humanity",
    title: "Humanidade, criação e pecado",
    phase: "Sistemática",
    guide: "hamartiologia-justificacao",
    chapters: ["human-person", "sin"],
    objective:
      "Distinguir condição humana, responsabilidade, ação e condição do pecado sem reduzir tradições diferentes a caricaturas.",
    task: "Analise uma afirmação sobre condição humana e pecado. Distinga ação, condição e responsabilidade; compare duas fontes e relacione a conclusão a uma passagem em seu contexto.",
  },
  {
    id: "salvation",
    title: "Graça, salvação e transformação",
    phase: "Sistemática",
    guide: "etica-soteriologia",
    chapters: ["salvation-language", "grace-faith"],
    objective:
      "Comparar imagens e modelos de salvação e distinguir justificação, santificação, graça e ação humana.",
    task: "Compare dois modelos de expiação ou duas formulações de justificação. Explicite o problema, as premissas, as passagens e as fontes utilizadas. Mostre uma convergência e uma divergência que permaneça relevante.",
  },
  {
    id: "spirit",
    title: "Espírito e discernimento",
    phase: "Sistemática",
    guide: "pneumatologia",
    chapters: ["spirit-scripture", "spirit"],
    objective:
      "Relacionar Pentecostes, dons e vida comunitária a leituras textuais e a formulações trinitárias sem confundir os níveis.",
    task: "Estude Atos 2 ou 1 Coríntios 12–14. Diferencie o relato ou argumento do texto e sua recepção numa tradição. Justifique uma conclusão sobre dons e comunidade e registre uma alternativa.",
  },
  {
    id: "church",
    title: "Igreja, sacramentos e vida ética",
    phase: "Sistemática",
    guide: "eclesiologia-liturgia",
    chapters: ["church-community", "sacraments"],
    objective:
      "Comparar comunidade, autoridade, missão e sinais sacramentais, articulando doutrina e responsabilidade prática.",
    task: "Compare duas compreensões de Igreja ou sacramento. Cite fontes específicas, explicite a relação com o texto bíblico e discuta uma consequência para a vida comunitária sem transformar sua preferência em evidência.",
  },
  {
    id: "hope",
    title: "Esperança e nova criação",
    phase: "Sistemática",
    guide: "escatologia",
    chapters: ["resurrection-creation", "last-things"],
    objective:
      "Distinguir gênero apocalíptico, afirmações sobre esperança e reconstruções interpretativas do futuro.",
    task: "Examine uma passagem sobre ressurreição ou esperança. Identifique o gênero e as imagens, compare duas interpretações e explique o que o texto sustenta e o que permanece uma hipótese do intérprete.",
  },
  {
    id: "ethics",
    title: "Ética e prática teológica",
    phase: "Prática",
    guide: "etica-soteriologia",
    chapters: ["formation:ethics"],
    practicalIndices: [2],
    passages: [
      { book: "matthew", chapter: 5, label: "Mateus 5" },
      { book: "james", chapter: 2, label: "Tiago 2" },
      { book: "romans", chapter: 12, label: "Romanos 12" },
    ],
    objective:
      "Relacionar interpretação, argumentação e responsabilidade prática sem substituir a análise por uma coleção de textos-prova.",
    task: "Delimite um problema ético e compare duas razões teológicas para enfrentá-lo. Explique o uso da passagem, cite fontes com localizadores, reconstrua uma objeção e apresente uma conclusão provisória.",
  },
  {
    id: "synthesis",
    title: "Investigação e síntese final",
    phase: "Síntese",
    guide: "teologia",
    chapters: [],
    objective:
      "Integrar método, história, leitura bíblica e comparação doutrinária num argumento próprio, revisável e documentado.",
    task: "Retome a pergunta do primeiro ponto. Produza uma síntese com problema, método, análise de uma passagem, comparação de duas fontes com localizadores, objeção forte, resposta e conclusão provisória. Indique o que mudou em sua hipótese e uma lacuna para pesquisa posterior.",
  },
];

const chapters = new Map(
  [
    ...FORMATION_CHAPTERS,
    ...STUDY_GUIDES.flatMap(
      (guide) =>
        lessonForTopic({ id: `study-guide:${guide.id}`, title: guide.title })?.chapters ?? [],
    ),
    ...["topic:bibliology", "doctrine:canon", "topic:theology-proper"].flatMap(
      (id) =>
        lessonForTopic({
          id,
          title:
            id === "topic:bibliology"
              ? "Bíblia, cânon e transmissão"
              : id === "doctrine:canon"
                ? "Cânon e comunidades de recepção"
                : "Deus, criação e providência",
        })?.chapters ?? [],
    ),
  ].map((chapter) => [chapter.id, chapter]),
);

const modules = FORMATION_PLAN.map(
  (plan): CourseModule & { phase: string; studyGuideId: string; readingSearch: string } => {
    const guide = STUDY_GUIDES.find((item) => item.id === plan.guide);
    if (!guide) throw new Error(`Guia ausente na formação: ${plan.guide}`);
    const content = plan.chapters.map((id) => {
      const chapter = chapters.get(id);
      if (!chapter) throw new Error(`Capítulo ausente na formação: ${id}`);
      return chapter;
    });
    const practical = plan.practicalIndices
      ? guide.modules.filter((_, index) => plan.practicalIndices!.includes(index))
      : plan.id === "orientation"
        ? guide.modules.slice(0, 1)
        : plan.id === "synthesis"
          ? guide.modules.slice(-1)
          : plan.id === "trinity"
            ? guide.modules.slice(0, 2)
            : plan.id === "christology"
              ? guide.modules.slice(2)
              : guide.modules;
    const passages = [
      ...new Map(
        (plan.passages ?? practical.flatMap((item) => item.passages)).map((item) => [
          `${item.book}:${item.chapter}`,
          item,
        ]),
      ).values(),
    ];
    return {
      id: `formation:${plan.id}`,
      title: plan.title,
      phase: plan.phase,
      studyGuideId: plan.id === "orientation" ? "hermeneutica-metodos" : guide.id,
      readingSearch:
        (
          {
            orientation: "método",
            scripture: "cânon",
            "old-testament": "Pentateuco",
            "new-testament": "evangelhos",
            hermeneutics: "hermenêutica",
            exegesis: "exegese",
            "ancient-history": "patrística",
            traditions: "reforma",
            god: "criação",
            trinity: "trindade",
            christology: "encarnação",
            humanity: "pecado",
            salvation: "graça",
            spirit: "Espírito",
            church: "Igreja",
            hope: "ressurreição",
            ethics: "virtude",
            synthesis: "teologia",
          } as Record<string, string>
        )[plan.id] ?? plan.title,
      description: plan.objective,
      objectives: [
        plan.objective,
        "Consultar as leituras e registrar fontes com localizador.",
        "Produzir a atividade, confrontar uma objeção e revisar sua conclusão.",
      ],
      lessons: [
        ...content.map((chapter) => ({
          id: `${plan.id}:${chapter.id}`,
          title: chapter.title,
          sections: [
            {
              kind: "concept" as const,
              title: chapter.title,
              paragraphs: chapter.paragraphs,
              references: chapter.references,
            },
          ],
        })),
        {
          id: `${plan.id}:practice`,
          title: "Aplicação do método",
          sections: (practical.length
            ? practical
            : [
                {
                  title: "Do conteúdo à investigação",
                  explanation: plan.objective,
                  questions: [plan.task],
                },
              ]
          ).map((item) => ({
            kind: "discussion" as const,
            title: item.title,
            paragraphs: [item.explanation, ...item.questions],
            references: [],
          })),
        },
      ],
      passages: passages.map((item, index) => ({
        id: `${plan.id}:reading:${index}`,
        label: item.label,
        purpose: "Leia a unidade completa e registre observações antes de consultar comentários.",
        ref: { bookId: item.book, chapter: item.chapter },
      })),
      domains: [plan.phase],
      activity: {
        prompt: plan.task,
        criteria: [
          "Delimitei a questão e diferenciei observação, interpretação e aplicação.",
          "Identifiquei as fontes consultadas, edição e página ou seção.",
          "Considerei uma objeção ou alternativa e delimitei minha conclusão.",
        ],
      },
      connections: [
        {
          label: "Biblioteca e caderno",
          explanation:
            "As leituras abaixo abrem as obras e páginas realmente instaladas. A atividade fica salva neste percurso; as notas vinculadas continuam no caderno.",
        },
      ],
      videos: [],
    };
  },
);

export const THEOLOGY_FORMATION = {
  id: "course:theology-formation",
  revision: 1,
  title: "Formação em Teologia",
  description:
    "Percurso introdutório de formação geral: fundamentos, método, história, sistemática e investigação final. Avance por pontos após confirmar aulas e leituras e entregar uma atividade com critérios de revisão. Textos editoriais são distinguidos das obras consultadas. O progresso é pessoal e não equivale a certificação acadêmica.",
  prerequisites: ["Leitura em português e disposição para comparar fontes e registrar dúvidas."],
  outcomes: [
    "Investigar uma passagem em seu contexto.",
    "Comparar documentos, tradições e argumentos com critérios explícitos.",
    "Redigir uma síntese com referências e limites.",
  ],
  modules,
  references: LESSON_REFERENCES,
} satisfies StudyCourse;
