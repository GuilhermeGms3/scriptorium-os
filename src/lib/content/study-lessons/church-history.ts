import { chapter } from "./types";

/** Original study synthesis, not invented minutes of conciliar speeches. */
export const COUNCIL_STUDY_CHAPTERS = [
  chapter(
    "council-reading",
    "Como ler um concílio: decisões, atas e recepção",
    [
      "Um concílio não é uma conversa única preservada palavra por palavra. É preciso distinguir credo, definição de fé, cânones disciplinares, cartas, atas e relatos posteriores. Nem todos esses gêneros sobrevivem para cada reunião. Uma tradução moderna também não é o original grego ou latino.",
      "A qualificação ecumênico depende da recepção eclesial. A ortodoxia bizantina recebe os sete concílios aqui apresentados; a Igreja Católica reconhece outros posteriores. Igrejas ortodoxas orientais e a Igreja do Oriente possuem histórias de recepção distintas. Não se deve transformar a lista de uma comunhão em classificação religiosa universal.",
      "Para estudar um documento, registre data, gênero, edição e a comunidade que o recebe. Compare o texto com a controvérsia a que responde. Os links de documentos nas referências levam às fontes externas; isso não significa que atas completas estejam instaladas no acervo offline. Os credos já instalados continuam disponíveis na Biblioteca.",
    ],
    ["councils", "oca-councils"],
  ),
  ...(
    [
      [
        "nicaea325",
        "Niceia I — 325",
        "Relação entre Pai e Filho; vocabulário da consubstancialidade. Não confundir o texto de 325 com a forma litúrgica posterior do credo.",
      ],
      [
        "constantinople381",
        "Constantinopla I — 381",
        "Doutrina trinitária e afirmação acerca do Espírito Santo. Compare a formulação recebida do credo com a de Niceia.",
      ],
      [
        "ephesus431",
        "Éfeso — 431",
        "Unidade pessoal de Cristo e a controvérsia associada ao título Theotokos. Leia os termos cristológicos antes de reduzi-los a uma disputa sobre Maria.",
      ],
      [
        "chalcedon451",
        "Calcedônia — 451",
        "Uma pessoa em duas naturezas. A história da recepção exige distinguir a ortodoxia bizantina das igrejas ortodoxas orientais não calcedonianas.",
      ],
      [
        "constantinople553",
        "Constantinopla II — 553",
        "Controvérsia dos Três Capítulos e interpretação da herança cristológica. Investigue como textos e autores anteriores foram recebidos.",
      ],
      [
        "constantinople680",
        "Constantinopla III — 680–681",
        "Duas vontades e operações em Cristo; distinguir vontade, natureza e pessoa na controvérsia monotelita.",
      ],
      [
        "nicaea787",
        "Niceia II — 787",
        "Uso e veneração de imagens no contexto da iconoclastia. A argumentação conciliar distingue veneração e adoração.",
      ],
    ] as const
  ).map(([id, title, description]) =>
    chapter(
      `history:${id}`,
      title,
      [
        description,
        "Prática documental: consulte a seção deste concílio na coleção The Seven Ecumenical Councils indicada abaixo. Separe definição, cânones e comentário do editor. Anote qual afirmação é do documento e qual é interpretação posterior; a seleção da tradição não muda o que a fonte efetivamente diz.",
      ],
      ["councils", "oca-councils"],
    ),
  ),
];

export const CONFESSIONAL_STUDY_CHAPTERS = [
  chapter(
    "history:reformations",
    "Luteranos e reformados: comparar sem confundir",
    [
      "A Confissão de Augsburgo de 1530 apresenta uma defesa pública da fé das comunidades que a subscrevem. Seu artigo IV trata da justificação; leia-o junto ao artigo VI, sobre a nova obediência, para não confundir a exclusão de mérito na justificação com indiferença à vida ética. Essa é uma exposição luterana situada, não uma definição neutra do cristianismo inteiro.",
      "Nas Institutas, Calvino organiza a justificação no livro III, capítulo 11. A distinção entre justificação e renovação não implica que ele as apresente como experiências sem relação. A comparação deve acompanhar a pergunta e o argumento de cada autor, em vez de procurar uma palavra isolada que prove concordância total ou oposição total.",
      "No acervo português instalado, o volume 1 das Institutas não contém automaticamente o livro III inteiro. Leia a seção realmente disponível indicada em Leituras; para o tratamento da justificação, a referência externa abaixo abre o capítulo correspondente. Não atribua ao arquivo local capítulos que ele não contém.",
    ],
    ["augsburg", "calvin-justification"],
  ),
  chapter(
    "history:orthodoxies",
    "Ortodoxia, conciliaridade e diferenças de recepção",
    [
      "Ortodoxia bizantina e ortodoxia oriental não são nomes intercambiáveis. O modo como Calcedônia é recebido ajuda a compreender a diferença, mas não esgota séculos de história, linguagem litúrgica e vida comunitária. O termo cismático ou herético em uma fonte deve ser identificado como julgamento daquele autor ou comunidade.",
      "Compare uma autodescrição ortodoxa com os documentos conciliares e uma fonte de outra comunhão. Diferencie o que cada comunidade considera normativo daquilo que está sendo reconstruído pelo historiador. O estudo das divergências não exige decidir antecipadamente que uma delas é a voz do sistema.",
    ],
    ["oca", "coptic", "councils"],
  ),
];

export const MEDIEVAL_STUDY_CHAPTERS = [
  chapter(
    "history:crusades",
    "Cruzadas: convocação, memória e violência",
    [
      "O chamado de Urbano II em Clermont, em 1095, é transmitido por relatos diferentes. A coleção documental indicada reúne versões e uma carta; não se deve apresentá-las como gravação literal de um discurso único. Compare destinatários, promessas, inimigos descritos e objetivo narrativo de cada testemunho.",
      "As cruzadas não podem ser explicadas apenas por uma doutrina abstraída de seu contexto político e social. A investigação precisa distinguir a justificativa religiosa dos agentes, a organização de campanhas e as experiências das populações atingidas. Uma fonte de mobilização não descreve de modo neutro os grupos contra os quais mobiliza.",
      "Exercício: registre duas diferenças entre as versões de Clermont e indique o que elas permitem afirmar sobre a memória do acontecimento. Não associe automaticamente esse episódio como contexto histórico original de um versículo escrito séculos antes: trata-se de história da recepção e do uso religioso dos textos.",
    ],
    ["clermont-sources"],
  ),
  chapter(
    "history:cathars",
    "Cátaros: fontes adversárias e testemunhos rituais",
    [
      "A descrição de grupos chamados cátaros ou albigenses passa, em parte, por fontes produzidas por seus perseguidores. Bernard Gui escreve como inquisidor: suas acusações são evidência sobre classificação, polêmica e interrogatório, não uma entrevista neutra que autorize falar por todos os dissidentes.",
      "Compare esse relato com o ritual de Lyon indicado nas referências. Observe quem fala, que práticas descreve e como emprega textos bíblicos. As diferenças de gênero e posição do autor ajudam a evitar tanto a repetição acrítica das acusações quanto uma reconstrução idealizada sem evidência.",
      "O tema precisa ainda de uma exposição documental mais extensa das campanhas albigenses e de suas cronologias. Este capítulo introduz a crítica das fontes; não promete um curso completo da guerra nem identifica os dissidentes medievais automaticamente com os escritos de Nag Hammadi.",
    ],
    ["gui-cathars", "cathar-ritual"],
  ),
  chapter(
    "history:islam",
    "Surgimento do islã e o Mediterrâneo tardo-antigo",
    [
      "O islã surge na Arábia no século VII. A hégira, de Meca para Medina em 622, é uma referência central da cronologia islâmica. Estudar esse processo requer distinguir a tradição muçulmana sobre a revelação, a formação da comunidade e a investigação histórica de seus testemunhos.",
      "A expansão política e as transformações culturais não equivalem a uma conversão uniforme e imediata de todas as populações. Textos, inscrições, objetos e edifícios são tipos diferentes de evidência. Compare o material do Metropolitan Museum com fontes escritas, identificando época, lugar e função de cada testemunho.",
      "Esse conteúdo pertence à história religiosa posterior aos escritos bíblicos. Quando relacionado às Escrituras, deve aparecer como comparação ou recepção, não como causa histórica original de passagens muito anteriores. O capítulo não apresenta crenças muçulmanas como caricatura nem como posição assumida pelo Scriptorium.",
    ],
    ["met-islam"],
  ),
];
