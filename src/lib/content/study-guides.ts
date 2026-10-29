import type { Study } from "../domain/study";
import { STUDY_PATHS, type StudyPathResource } from "./study-paths";
import { STUDY_JOURNEYS, type StudyMapNode } from "./study-learning-map";

export interface GuidePassage {
  book: string;
  chapter: number;
  label: string;
}
export interface StudyGuideModule {
  title: string;
  explanation: string;
  questions: readonly string[];
  passages: readonly GuidePassage[];
}
export interface StudyGuide {
  id: string;
  title: string;
  introduction: string;
  keywords: readonly string[];
  modules: readonly StudyGuideModule[];
  resources: readonly StudyPathResource[];
  relatedIds: readonly string[];
}

const passage = (book: string, chapter: number, label: string): GuidePassage => ({
  book,
  chapter,
  label,
});
const module = (
  title: string,
  explanation: string,
  question: string,
  passages: GuidePassage[],
): StudyGuideModule => ({ title, explanation, questions: [question], passages });

/** Original editorial study prompts, not quotations or automatically verified doctrinal conclusions. */
const CURRICULA: Record<string, { keywords: string[]; modules: StudyGuideModule[] }> = {
  "exegese-recepcao": {
    keywords: ["exegese", "contexto", "exegesis"],
    modules: [
      module(
        "Delimitar a passagem e observar o texto",
        "Leia a unidade literária antes de isolar um versículo. Registre repetições, conectivos, personagens e mudanças de assunto. Compare traduções e consulte o original sem deduzir o sentido de uma palavra apenas de sua raiz.",
        "Que observações consigo demonstrar no texto, antes de consultar um comentário?",
        [passage("mark", 4, "Marcos 4")],
      ),
      module(
        "Reconstruir contexto e argumento",
        "Distinga o que a passagem informa daquilo que uma reconstrução histórica propõe. Identifique gênero, destinatários e função do trecho no livro. Para cada hipótese de contexto, anote a fonte, a data e os limites da evidência.",
        "Como o parágrafo anterior e o seguinte limitam a minha interpretação?",
        [passage("romans", 3, "Romanos 3")],
      ),
      module(
        "Comparar a história da recepção",
        "Leia um intérprete antigo e um comentário moderno. Separe a leitura do autor, sua tradição e o método empregado. Uma interpretação antiga é evidência de recepção, mas não determina sozinha o sentido original.",
        "Quais diferenças vêm do texto e quais vêm dos pressupostos dos intérpretes?",
        [passage("john", 1, "João 1")],
      ),
    ],
  },
  "hermeneutica-metodos": {
    keywords: ["hermenêutica", "interpretação", "hermeneutics"],
    modules: [
      module(
        "Texto, leitor e pressupostos",
        "Separe observação, interpretação e aplicação. Explicite o que você pressupõe sobre autoria, inspiração, história e linguagem. Pressupostos confessionais e não confessionais devem ser identificados, não escondidos como neutralidade automática.",
        "Que pressuposto meu muda a pergunta que faço ao texto?",
        [passage("luke", 10, "Lucas 10")],
      ),
      module(
        "Experimentar métodos distintos",
        "Compare uma análise histórico-gramatical, uma histórico-crítica e uma narrativa da mesma unidade. Cada método delimita perguntas e evidências diferentes. Não trate método, tradição e postura epistemológica como categorias equivalentes.",
        "O que cada método permite concluir e o que deixa em aberto?",
        [passage("genesis", 1, "Gênesis 1")],
      ),
      module(
        "Aplicação responsável e revisão",
        "Escreva uma interpretação com suas razões e uma alternativa plausível. Só depois proponha aplicação, indicando a distância cultural entre o texto e o presente. Revise sua leitura quando uma evidência contrariar a hipótese inicial.",
        "Minha aplicação depende de uma conclusão que o texto não sustenta?",
        [passage("james", 2, "Tiago 2")],
      ),
    ],
  },
  "trindade-cristologia": {
    keywords: ["trindade", "cristologia", "encarnação"],
    modules: [
      module(
        "Linguagem bíblica sobre Deus e Cristo",
        "Observe títulos, ações e relações atribuídos a Deus, a Jesus e ao Espírito em seus contextos literários. Uma formulação doutrinária posterior e uma observação gramatical são objetos distintos, mesmo quando relacionados.",
        "Quais são os dados textuais e quais são minhas conclusões doutrinárias?",
        [passage("john", 1, "João 1"), passage("philippians", 2, "Filipenses 2")],
      ),
      module(
        "Credos e controvérsias",
        "Compare os documentos de Niceia e Calcedônia disponíveis no acervo. Identifique o problema que cada formulação procura responder, o vocabulário empregado e aquilo que o documento não resolve. Registre diferenças históricas sem caricaturar as posições.",
        "Que problema cada expressão do credo pretende delimitar?",
        [],
      ),
      module(
        "Construir um argumento comparativo",
        "Organize uma conclusão sobre pessoa e obra de Cristo com premissas, evidências e objeções. Consulte a Suma como uma organização específica de questões, não como representante automática de todas as tradições.",
        "Qual objeção mais forte exigiria que eu revisasse o argumento?",
        [passage("colossians", 1, "Colossenses 1")],
      ),
    ],
  },
  "etica-soteriologia": {
    keywords: ["salvação", "expiação", "soteriologia"],
    modules: [
      module(
        "O problema da salvação",
        "Mapeie como os textos descrevem pecado, reconciliação, libertação, redenção e vida. Essas imagens podem coexistir; não as reduza previamente a um único mecanismo. Separe o vocabulário da passagem da classificação de uma tradição.",
        "De que problema o autor diz que as pessoas precisam ser salvas?",
        [passage("romans", 5, "Romanos 5"), passage("ephesians", 2, "Efésios 2")],
      ),
      module(
        "Modelos de expiação e graça",
        "Compare as perguntas de modelos como Christus Victor, satisfação, substituição penal e influência moral. Para atribuir um modelo a um autor ou tradição, procure uma fonte específica e seu período. Registre convergências e divergências sem declarar um vencedor automático.",
        "Que premissas diferenciam os modelos e que textos cada argumento mobiliza?",
        [passage("hebrews", 9, "Hebreus 9")],
      ),
      module(
        "Virtudes, ação humana e vida ética",
        "Relacione graça, liberdade, hábitos, virtudes e ação comunitária. Ao consultar a Segunda Parte da Suma, distinga a pergunta, as objeções, a resposta e as réplicas. Produza uma síntese própria com referências de página ou seção.",
        "Como o argumento conecta salvação e transformação da vida sem confundi-las?",
        [passage("galatians", 5, "Gálatas 5")],
      ),
    ],
  },
  patristica: {
    keywords: ["patrística", "Agostinho", "Clemente"],
    modules: [
      module(
        "Ler fontes antigas como documentos",
        "Comece por autoria atribuída, datação proposta, gênero e transmissão. Diferencie a época do autor da época do manuscrito e da tradução que você lê. Evite tratar a literatura patrística como uma única voz.",
        "O que sei sobre a origem desta obra e com qual evidência?",
        [],
      ),
      module(
        "Comunidade, ensino e conflito",
        "Compare Didaquê e 1 Clemente quanto a instrução, autoridade e convivência. Registre o que cada documento afirma, o que pressupõe e o que permanece desconhecido sobre sua comunidade.",
        "Quais práticas aparecem em cada documento e onde há diferenças?",
        [passage("1-corinthians", 12, "1 Coríntios 12")],
      ),
      module(
        "Memória, experiência e recepção",
        "Leia as Confissões de Agostinho distinguindo narrativa autobiográfica, oração e reflexão. Compare um tema com outra fonte antiga e registre a transformação das perguntas ao longo do tempo.",
        "Como o gênero da obra influencia a maneira de apresentar sua experiência?",
        [passage("psalms", 51, "Salmo 51")],
      ),
    ],
  },
  "eclesiologia-liturgia": {
    keywords: ["eclesiologia", "liturgia", "igreja"],
    modules: [
      module(
        "Imagens e organização comunitária",
        "Compare imagens de corpo, assembleia e povo com textos sobre ministérios e autoridade. Não projete automaticamente estruturas atuais sobre documentos antigos. Anote a escala da afirmação: comunidade local, autor ou tradição.",
        "O texto descreve uma prática local ou estabelece uma norma?",
        [passage("1-corinthians", 12, "1 Coríntios 12")],
      ),
      module(
        "Práticas litúrgicas e fontes",
        "Leia as instruções da Didaquê sobre práticas comunitárias em sua própria sequência. Compare oração, batismo e refeição ritual com os textos bíblicos, indicando diferenças de gênero e de contexto.",
        "Que evidência seria necessária para generalizar uma prática a outras comunidades?",
        [passage("1-corinthians", 11, "1 Coríntios 11")],
      ),
      module(
        "Identidade, disciplina e sociedade",
        "Use Diogneto e Policarpo para investigar identidade e relações sociais. Construa uma comparação citável, distinguindo descrição histórica, ideal normativo e interpretação contemporânea.",
        "Onde a fonte descreve uma realidade e onde procura moldar o comportamento?",
        [passage("1-peter", 2, "1 Pedro 2")],
      ),
    ],
  },
  gnosticismo: {
    keywords: ["Nag Hammadi", "gnosticismo", "Tomé"],
    modules: [
      module(
        "Coleção, códice e tratado",
        "Organize a identificação em coleção, códice, tratado e unidade textual. Nag Hammadi não é um único livro. Separe a data do testemunho material das hipóteses sobre composição e não confunda catálogo bibliográfico com texto disponível.",
        "Qual testemunho, edição e idioma estou realmente consultando?",
        [],
      ),
      module(
        "Ler Tomé com controle de tradução",
        "O testemunho copta disponível pode servir à consulta documental. Uma tradução portuguesa ausente não deve ser substituída por uma tradução imaginada. Ao comparar ditos com evangelhos, registre a edição e o local exato de cada paralelo.",
        "O paralelo envolve palavras, tema ou estrutura? O que ele não demonstra?",
        [passage("matthew", 13, "Mateus 13")],
      ),
      module(
        "Categorias e hipóteses históricas",
        "Investigue o uso do rótulo gnosticismo e as diferenças entre obras assim classificadas. Formule hipóteses sobre relações literárias como hipóteses concorrentes, não como fatos deduzidos da semelhança de um dito.",
        "Que alternativa histórica também explicaria essa semelhança?",
        [],
      ),
    ],
  },
  escatologia: {
    keywords: ["escatologia", "ressurreição", "apocalíptica"],
    modules: [
      module(
        "Esperança, morte e ressurreição",
        "Compare os contextos de esperança e ressurreição sem reunir previamente todas as passagens em um único cronograma. Registre o problema pastoral, narrativo ou argumentativo de cada unidade.",
        "O que cada passagem procura responder aos seus destinatários?",
        [passage("1-corinthians", 15, "1 Coríntios 15"), passage("daniel", 12, "Daniel 12")],
      ),
      module(
        "Profecia e linguagem apocalíptica",
        "Observe símbolos, alusões, visões e repetições. Antes de associar uma imagem a um evento, investigue seu uso no próprio livro e nas fontes anteriores. Diferencie relação textual verificável e reconstrução histórica.",
        "Que elementos do gênero impedem uma leitura apenas literalista?",
        [passage("revelation", 21, "Apocalipse 21")],
      ),
      module(
        "Sistemas interpretativos em comparação",
        "Compare leituras preteristas, historicistas, futuristas e idealistas por suas premissas e tratamento das passagens. Um sistema interpretativo não equivale à identidade confessional de todo leitor.",
        "Que passagem desafia cada sistema e como ele responde?",
        [passage("matthew", 24, "Mateus 24")],
      ),
    ],
  },
  pneumatologia: {
    keywords: ["Espírito Santo", "pneumatologia", "dons"],
    modules: [
      module(
        "Vocabulário e contextos do Espírito",
        "Observe cada ocorrência em seu contexto antes de aplicar uma formulação sistemática. Distinga uso lexical, imagem literária e afirmação doutrinária; a variedade de usos de uma palavra não decide sozinha o sentido de uma passagem.",
        "Quais ações e relações são atribuídas ao Espírito neste contexto?",
        [passage("ezekiel", 37, "Ezequiel 37"), passage("john", 14, "João 14")],
      ),
      module(
        "Comunidade, dons e discernimento",
        "Leia a sequência do argumento sobre dons, corpo e amor. Compare narrativas de experiência com instruções comunitárias sem pressupor que um gênero estabelece todas as regras do outro.",
        "Como o autor relaciona dons e responsabilidade comunitária?",
        [passage("acts", 2, "Atos 2"), passage("1-corinthians", 12, "1 Coríntios 12")],
      ),
      module(
        "Santificação e posições confessionais",
        "Separe as perguntas sobre experiência, ética e formulação doutrinária. Compare posições apenas com documentos identificáveis e registre onde a evidência não basta para atribuir uma posição a uma tradição inteira.",
        "Que afirmação depende da fonte confessional e qual depende da leitura do texto?",
        [passage("romans", 8, "Romanos 8")],
      ),
    ],
  },
  "hamartiologia-justificacao": {
    keywords: ["pecado", "justificação", "graça"],
    modules: [
      module(
        "Pecado, responsabilidade e condição humana",
        "Compare narrativas, poemas e argumentos sobre transgressão e responsabilidade. Não confunda descrição do comportamento, condição humana e uma doutrina posterior sobre a origem do pecado.",
        "Que aspecto do problema humano esta passagem aborda?",
        [passage("genesis", 3, "Gênesis 3"), passage("psalms", 51, "Salmo 51")],
      ),
      module(
        "Justificação em seu argumento",
        "Leia Romanos e Gálatas em unidades argumentativas. Identifique quem fala, a quem responde e como usa lei, fé e obras. Compare Tiago sem presumir antecipadamente identidade ou incompatibilidade de vocabulário.",
        "Fé e obras respondem à mesma pergunta nos textos comparados?",
        [passage("romans", 3, "Romanos 3"), passage("james", 2, "Tiago 2")],
      ),
      module(
        "Comparar formulações com fontes",
        "Organize as diferenças sobre culpa, graça e justificação em proposições específicas. Para cada atribuição histórica, guarde o documento e seu período. Não reduza uma tradição a uma frase fora do contexto.",
        "Que evidência permitiria corrigir minha descrição da posição alheia?",
        [passage("galatians", 2, "Gálatas 2")],
      ),
    ],
  },
  "sacramentos-santificacao": {
    keywords: ["sacramento", "batismo", "santificação"],
    modules: [
      module(
        "Rito, sinal e interpretação",
        "Observe os textos sobre batismo e refeição comunitária distinguindo ação, linguagem e interpretação. O termo sacramento pertence a uma história conceitual que precisa ser explicitada ao comparar tradições.",
        "Quais sentidos são afirmados pela passagem e quais são desenvolvimentos doutrinários?",
        [passage("romans", 6, "Romanos 6"), passage("1-corinthians", 11, "1 Coríntios 11")],
      ),
      module(
        "Documentar práticas e divergências",
        "Compare a Didaquê com uma fonte confessional do acervo. Registre participantes, elementos, finalidade e contexto de cada prática. Uma diferença de prática não implica automaticamente uma diferença em todas as doutrinas.",
        "O que muda entre as fontes e que explicação cada uma oferece?",
        [],
      ),
      module(
        "Vida ética e transformação",
        "Estude santificação em conexão com comunidade, hábitos e responsabilidade. Distinga a descrição de um processo, um imperativo moral e uma teoria sobre como ocorre a transformação.",
        "Como a passagem articula iniciativa divina e ação humana?",
        [
          passage("1-thessalonians", 4, "1 Tessalonicenses 4"),
          passage("galatians", 5, "Gálatas 5"),
        ],
      ),
    ],
  },
};

export const JOURNEY_GUIDE_IDS = {
  biblia: "biblia-interpretacao",
  teologia: "teologia-sistematica",
  historia: "historia-tradicoes",
  literatura: "literatura-fontes",
} as const;

function resourcesFor(ids: readonly string[]): StudyPathResource[] {
  return [
    ...new Map(
      STUDY_PATHS.filter((path) => ids.includes(path.id))
        .flatMap((path) => path.resources)
        .map((resource) => [resource.workId, resource]),
    ).values(),
  ];
}

const pathGuides: StudyGuide[] = STUDY_PATHS.map((path) => {
  const curriculum = CURRICULA[path.id];
  if (!curriculum) throw new Error(`Missing study curriculum: ${path.id}`);
  return {
    id: path.id,
    title: path.title,
    introduction: path.description,
    ...curriculum,
    resources: path.resources,
    relatedIds: STUDY_PATHS.filter(
      (other) => other.branch === path.branch && other.id !== path.id,
    ).map((other) => other.id),
  };
});

const journeyGuides: StudyGuide[] = STUDY_JOURNEYS.map((journey) => {
  const paths = pathGuides.filter(
    (guide) => STUDY_PATHS.find((path) => path.id === guide.id)?.branch === journey.branch,
  );
  return {
    id: JOURNEY_GUIDE_IDS[journey.id],
    title: journey.id === "teologia" ? "Teologia sistemática" : journey.title,
    introduction: journey.description,
    keywords: paths.flatMap((guide) => guide.keywords.slice(0, 1)).slice(0, 3),
    modules: paths.map((guide) =>
      module(guide.title, guide.modules[0]!.explanation, guide.modules[0]!.questions[0]!, [
        ...guide.modules[0]!.passages,
      ]),
    ),
    resources: resourcesFor(paths.map((guide) => guide.id)),
    relatedIds: paths.map((guide) => guide.id),
  };
});

export const STUDY_GUIDES: readonly StudyGuide[] = [
  {
    id: "teologia",
    title: "Teologia",
    introduction:
      "Um percurso panorâmico para estudar textos, doutrinas, história e métodos. Comece pelas perguntas fundamentais, escolha uma área e desenvolva uma investigação apoiada em fontes. Este roteiro não pressupõe adesão a uma tradição religiosa.",
    keywords: ["teologia", "doutrina", "theology"],
    modules: [
      module(
        "Fundamentos: o que significa estudar teologia?",
        "Diferencie teologia bíblica, sistemática, histórica, prática e filosofia da religião. Defina sua pergunta e explicite método e postura epistemológica. Uma descrição histórica, uma defesa confessional e uma avaliação filosófica não são a mesma tarefa.",
        "Qual pergunta desejo investigar e que tipo de resposta seria adequada?",
        [],
      ),
      module(
        "Bibliologia e interpretação",
        "Investigue transmissão, edição, cânon, tradução e gêneros literários. Aprenda a citar a edição e a distinguir texto, variante e interpretação. Use os guias de exegese e hermenêutica para praticar com uma passagem delimitada.",
        "Como a escolha de edição e método interfere na investigação?",
        [passage("luke", 1, "Lucas 1")],
      ),
      module(
        "Deus, criação e condição humana",
        "Organize as perguntas sobre atributos divinos, criação, providência, humanidade e mal. Distinga argumento filosófico e leitura de uma passagem. Compare hipóteses teístas e não confessionais pelas razões apresentadas, não por rótulos.",
        "Que premissas sustentam a posição e que objeções continuam abertas?",
        [passage("genesis", 1, "Gênesis 1"), passage("job", 38, "Jó 38")],
      ),
      ...pathGuides.map((guide) =>
        module(guide.title, guide.modules[0]!.explanation, guide.modules[0]!.questions[0]!, [
          ...guide.modules[0]!.passages,
        ]),
      ),
      module(
        "História, geografia e cultura material",
        "Relacione a passagem a lugares, práticas sociais e testemunhos materiais apenas quando houver fontes identificáveis. Um achado arqueológico, sua datação e a interpretação que o conecta ao texto precisam ser registrados separadamente.",
        "O que a fonte material demonstra e qual conexão com o texto permanece hipotética?",
        [passage("acts", 17, "Atos 17")],
      ),
      module(
        "Síntese e investigação própria",
        "Escolha uma questão, reúna passagens e fontes com localizadores, formule premissas e conclusão e procure uma objeção séria. Registre sua síntese como provisória e diferencie sua redação de citações das obras consultadas.",
        "O que aprendi, com quais fontes e que lacunas ainda preciso investigar?",
        [],
      ),
    ],
    resources: resourcesFor(STUDY_PATHS.map((path) => path.id)),
    relatedIds: journeyGuides.map((guide) => guide.id),
  },
  ...journeyGuides,
  ...pathGuides,
];

export function studyGuideById(id: string): StudyGuide | undefined {
  return STUDY_GUIDES.find((guide) => guide.id === id);
}
export function guideIdForNode(node: StudyMapNode): string {
  if (node.pathId) return node.pathId;
  if (node.journeyId) return JOURNEY_GUIDE_IDS[node.journeyId];
  return "teologia";
}
export function studyForGuide(guide: StudyGuide, studies: readonly Study[]): Study | undefined {
  return (
    studies.find((study) => study.items.some((item) => item.refId === `study-guide:${guide.id}`)) ??
    studies.find(
      (study) =>
        study.title.trim().toLocaleLowerCase("pt-BR") === guide.title.toLocaleLowerCase("pt-BR"),
    )
  );
}
