import { section as s, reading as r } from "../helpers";
import { unit } from "./unit";
import { foundation, source } from "./sources";

export const CHRIST_DEATH_UNITS = [
  unit({
    id: "cristo",
    phase: "Cristologia",
    title: "Cristo: morte real e vitória da vida",
    studyGuideId: "trindade-cristologia",
    readingSearch: "Cristo morte ressurreição encarnação",
    description:
      "Examinar a hipótese da incompatibilidade com a morte em diálogo com a humanidade real de Cristo e sua ressurreição.",
    objectives: [
      "Distinguir morte corporal, pecado, corrupção e separação de Deus.",
      "Comparar a hipótese proposta com Atanásio e Tomás.",
      "Explicar por que vitória sobre a morte não equivale a aparência de morte.",
    ],
    sections: [
      s(
        "introduction",
        "Uma tese que precisa de definições",
        [],
        "A formulação investigada neste módulo é que Cristo ressuscita porque a morte não pode detê-lo: ele não está submetido a todas as mortes da condição caída. Essa é uma hipótese teológica a desenvolver, não uma frase atribuída automaticamente a um autor antigo. Para examiná-la, defina quais sentidos de morte estão em jogo: falecimento corporal, domínio do pecado, alienação ou destino final. O uso de uma única palavra não torna esses sentidos idênticos.",
        "Se incompatibilidade ontológica significasse incapacidade de morrer corporalmente, a tese entraria em tensão com a confissão da paixão, morte e sepultamento reais. Se significar que a morte não pode exercer domínio definitivo sobre o Verbo encarnado, sua relação com as fontes será outra. O trabalho está em formular precisamente essa segunda possibilidade e testar seus fundamentos.",
      ),
      s(
        "concept",
        "Humanidade assumida e união com o Verbo",
        ["athanasius", "death", "resurrection"],
        "Atanásio, em Sobre a encarnação §20, relaciona a vitória sobre a corrupção com o Verbo que assume um corpo mortal. A morte é enfrentada, não simplesmente evitada. Tomás, em Suma III, q.50, distingue a morte humana da separação da divindade: a união com o Verbo não é tratada como desfeita pela morte. Em III, q.53, a causalidade da ressurreição é examinada nessa distinção entre poder divino e natureza criada.",
        "Essas fontes oferecem aproximações à pergunta proposta, mas não autorizam dizer que Jesus possuía uma humanidade incompleta ou que só parecia sofrer. Sua ausência de pecado não equivale à ausência de corpo, vulnerabilidade ou sofrimento. Tampouco o aplicativo transforma a ressurreição em consequência biológica previsível: trata-se de uma afirmação cristológica, com premissas religiosas identificadas.",
      ),
      s(
        "example",
        "Atos 2 e Hebreus 2",
        [],
        "Leia Atos 2:22–32 observando quem age na ressurreição e como o discurso interpreta o Salmo citado. Depois leia Hebreus 2:14–18 e marque a relação entre participação na carne e no sangue, morte e libertação. Pergunte como cada unidade associa vitória e participação efetiva na condição humana. Uma leitura que elimina a participação precisa explicar por que o argumento a destaca.",
      ),
      s(
        "discussion",
        "Uma reformulação examinável",
        [],
        "Teste esta redação editorial: Cristo assume a morte humana sem ser reduzido ao domínio definitivo da morte; sua ressurreição é compreendida em relação à identidade do Verbo encarnado. A frase preserva melhor a morte real, mas ainda requer argumentos sobre identidade, liberdade e ação divina. Compare-a com a formulação inicial e identifique o que mudou. Discordar de uma formulação não exige abandonar toda a intuição que a motivou.",
      ),
      s(
        "conclusion",
        "O que a hipótese explica e o que não explica",
        [],
        "Sua síntese deve distinguir quatro afirmações: Jesus morreu; sua morte não é interpretada como vitória final do pecado; Deus o ressuscita; a tradição articula isso com sua divindade. Reconstruir essa relação é um trabalho teológico. Ela não é evidência arqueológica da ressurreição e não dispensa o exame histórico dos testemunhos. A próxima unidade investigará os termos usados para falar da condição dos mortos.",
      ),
    ],
    passages: [
      r(
        "at2",
        "Atos 2:22–32",
        "acts",
        2,
        22,
        32,
        "Examinar o discurso sobre a morte que não retém Cristo.",
      ),
      r(
        "hb2",
        "Hebreus 2:14–18",
        "hebrews",
        2,
        14,
        18,
        "Confrontar participação na condição humana e libertação pela morte.",
      ),
    ],
    connections: [
      {
        label: "Encarnação",
        explanation:
          "Afirmação cristã de que o Verbo assume humanidade real; não disfarce corporal.",
        entityId: "doctrine:incarnation",
      },
      {
        label: "União hipostática",
        explanation:
          "Linguagem cristológica sobre unidade pessoal e distinção de naturezas; não mistura que dissolve a humanidade.",
      },
      {
        label: "Incompatibilidade ontológica com a morte",
        explanation:
          "Hipótese deste percurso: precisar se significa impossibilidade de morrer ou impossibilidade de domínio definitivo da morte. As duas leituras têm consequências distintas.",
      },
    ],
    foundation: foundation(
      "A hipótese de Cristo não ser retido pela morte deve preservar a realidade de sua morte humana.",
      "Teologia",
      "Interpretação",
      "Hipótese de estudo do percurso. Atos 2 e Hebreus 2 são unidades de análise; os autores abaixo permitem examinar a coerência cristológica, sem serem apresentados como autores da frase moderna.",
      [
        source(
          "athanasius",
          "Sobre a encarnação, §20",
          "Relaciona corpo mortal, Verbo e vitória sobre a corrupção.",
          "Não ensina uma simples incapacidade corporal de morrer.",
        ),
        source(
          "death",
          "Suma III, q.50, a.1–3",
          "Distingue morte real e permanência da união da divindade com corpo e alma.",
          "A distinção escolástica não equivale a uma explicação biológica.",
        ),
        source(
          "resurrection",
          "Suma III, q.53, a.4",
          "Examina a ressurreição segundo poder divino e natureza criada.",
          "A hipótese editorial precisa ser comparada, não atribuída literalmente a Tomás.",
        ),
      ],
      "Compare linguagens de vitória, recapitulação e satisfação. Preserve a diferença entre testemunho, interpretação e avaliação histórica.",
    ),
    prompt:
      "Defina os sentidos de morte na hipótese de incompatibilidade ontológica. Confronte-a com Hebreus 2 e uma fonte primária. Apresente uma formulação que preserve a morte real e responda à objeção de uma humanidade incompleta.",
  }),
  unit({
    id: "sheol",
    phase: "Escatologia",
    title: "Sheol, Hades, juízo e destino dos mortos",
    studyGuideId: "escatologia",
    readingSearch: "Sheol mortos juízo inferno",
    description:
      "Distinguir vocabulário bíblico e modelos escatológicos antes de formular uma posição sobre a morte e o juízo.",
    objectives: [
      "Separar morada dos mortos, juízo e destino final.",
      "Comparar passagens sem uniformizar gêneros e épocas.",
      "Avaliar a hipótese de ausência de tormento consciente sem usar o léxico como prova suficiente.",
    ],
    sections: [
      s(
        "introduction",
        "Uma palavra traduzida, vários problemas",
        [],
        "A palavra portuguesa inferno pode aparecer em debates que tratam de problemas diferentes. Sheol, Hades, Geena e lago de fogo não devem ser fundidos numa definição única sem observar cada passagem. Sheol pertence ao vocabulário hebraico; Hades aparece no grego; Geena e as imagens do Apocalipse exigem seus próprios contextos. Tradução, interpretação de uma imagem e doutrina do destino final são tarefas relacionadas, mas diferentes.",
        "A proposta de que não existe tormento consciente eterno terá espaço como posição a examinar. Ela não se demonstra apenas substituindo inferno por Sheol. Também precisa explicar juízo, ressurreição, destruição e vida nos textos relevantes, além de dialogar com leituras que chegam a outras conclusões.",
      ),
      s(
        "concept",
        "Condição dos mortos e condenação",
        ["sheol", "westminster", "augsburg"],
        "O Catecismo católico, nos §§632–637, distingue a mansão dos mortos do inferno de condenação e inclui na primeira justos e injustos anteriores ao Redentor. Essa é uma autodescrição católica, não uma definição neutra que todas as tradições aceitam. Ela já mostra por que identificar Sheol exclusivamente com pessoas más é uma conclusão adicional, e não uma simples equivalência lexical.",
        "Compare três famílias de interpretação sobre o destino final: continuidade consciente de punição, imortalidade condicional com destruição final, e propostas de restauração universal. Cada uma possui variações e enfrenta passagens difíceis. Westminster 32–33 e Augsburgo XVII documentam posições confessionais que não devem ser apresentadas como defesa automática da hipótese preferida neste percurso.",
      ),
      s(
        "example",
        "Ler sem apagar as diferenças",
        [],
        "No Salmo 16:8–11, observe a voz que fala de não ser abandonada à morte. Em Lucas 16:19–31, examine personagens, diálogo, reversão e finalidade da narrativa. Em Apocalipse 20:11–15, marque o lugar da morte e do Hades na cena de juízo. Depois pergunte se a própria narrativa identifica morte, Hades e destino final como a mesma realidade. Não transforme um detalhe isolado em mapa completo da vida futura.",
      ),
      s(
        "discussion",
        "Antes e depois de Cristo",
        [],
        "A hipótese de destinos diferentes conforme a pessoa tenha vivido antes ou depois de Cristo precisa definir seu critério: cronologia, conhecimento recebido, resposta à graça ou confissão explícita. Esses critérios não são intercambiáveis. Pergunte como a tese trata quem viveu depois de Cristo sem conhecer sua pregação e quais passagens justificam sua resposta. O aplicativo não classifica pessoas concretas como salvas ou condenadas e não apresenta essa periodização como consenso.",
      ),
      s(
        "conclusion",
        "Construir uma posição escatológica",
        [],
        "Para defender a ausência de tormento consciente eterno, formule uma tese positiva e enfrente uma passagem usada por seus críticos. Diferencie o que você conclui sobre estado intermediário e sobre juízo final. Uma convicção amadurece quando consegue reconhecer sua dificuldade mais séria e explicar por que ainda considera sua interpretação preferível. O significado de uma palavra é começo da investigação, não seu encerramento.",
      ),
    ],
    passages: [
      r(
        "sl16",
        "Salmo 16:8–11",
        "psalms",
        16,
        8,
        11,
        "Ler confiança e morte no contexto do salmo.",
      ),
      r(
        "lc16",
        "Lucas 16:19–31",
        "luke",
        16,
        19,
        31,
        "Examinar função narrativa e linguagem sobre os mortos.",
      ),
      r(
        "ap20",
        "Apocalipse 20:11–15",
        "revelation",
        20,
        11,
        15,
        "Distinguir morte, Hades e a cena do juízo.",
      ),
    ],
    connections: [
      {
        label: "Sheol e Hades",
        explanation:
          "Vocábulos ligados à condição dos mortos; verificar o uso em cada unidade, sem identificá-los automaticamente com condenação final.",
      },
      {
        label: "Estado intermediário",
        explanation:
          "Questão sobre os mortos antes da consumação final; não equivale à doutrina inteira do juízo.",
      },
      {
        label: "Imortalidade condicional",
        explanation:
          "Família de posições em que a vida imortal depende do dom divino; distinguir suas variantes e os argumentos sobre destruição final.",
      },
    ],
    foundation: foundation(
      "Identificar Sheol com condenação exclusiva ou negar tormento consciente exige mais que uma equivalência de tradução.",
      "Teologia",
      "Interpretação",
      "A hipótese de estudo é comparada com unidades bíblicas e autodescrições confessionais. O texto não afirma resolver todo o debate escatológico pelo léxico.",
      [
        source(
          "sheol",
          "Catecismo §§632–637, especialmente §633",
          "Distingue mansão dos mortos e condenação e explicita a posição católica sobre justos e injustos.",
          "Não é consenso interconfessional nem defesa da inexistência de juízo final.",
        ),
        source(
          "westminster",
          "Capítulos 32–33",
          "Documenta uma posição reformada sobre estado após a morte e juízo.",
          "É fonte de contraponto, não uma defesa do aniquilacionismo.",
        ),
        source(
          "augsburg",
          "Artigo XVII",
          "Documenta a formulação luterana sobre retorno de Cristo e juízo.",
          "Não deve ser confundida com a hipótese escatológica do percurso.",
        ),
      ],
      "Compare punição consciente, destruição final e restauração universal. Diferencie estado intermediário, imagens de juízo e destino final; indique o que cada interpretação ainda precisa explicar.",
    ),
    prompt:
      "Formule sua posição sobre Sheol e destino final. Use duas passagens de gêneros diferentes, enfrente uma objeção à sua posição e diferencie o critério de juízo do simples fato de viver antes ou depois de Cristo.",
  }),
];
