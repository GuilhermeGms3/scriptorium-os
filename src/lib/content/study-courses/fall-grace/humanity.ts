import { section as s, reading as r } from "../helpers";
import { unit } from "./unit";
import { foundation, source } from "./sources";

export const HUMANITY_UNITS = [
  unit({
    id: "sentido",
    phase: "Fundamentos",
    title: "Finitude, niilismo e esperança",
    studyGuideId: "teologia",
    readingSearch: "sentido sofrimento esperança",
    description:
      "Estudar a gravidade da existência sem transformar o cristianismo em promessa de sucesso ou culto ao desespero.",
    objectives: [
      "Distinguir finitude, culpa e ausência de sentido.",
      "Reconstruir uma objeção filosófica antes de respondê-la.",
      "Examinar esperança e lamento como atitudes diferentes de otimismo automático.",
    ],
    sections: [
      s(
        "introduction",
        "A pergunta pelo sentido",
        ["nietzsche"],
        "A consciência da morte torna urgente a pergunta pelo sentido, mas não determina uma única resposta. Finitude significa que nossa vida tem limites; niilismo, no recorte deste percurso, designa o problema da perda de fundamento ou valor. Uma pessoa pode reconhecer a fragilidade humana e continuar afirmando a dignidade da existência. Pode também ter conforto material e não encontrar razão para viver como vive. Essas situações não devem ser confundidas.",
        "A lente adotada aqui é cristã e dramática: criação, queda e redenção organizam uma investigação da condição humana. O drama envolve uma bondade ferida, não uma criação que já nasceu desprezível. Seu objetivo é compreender por que a graça importa, não produzir um estado emocional sombrio como sinal de profundidade.",
      ),
      s(
        "concept",
        "Crítica do ideal ascético",
        ["nietzsche", "augustine"],
        "Na Genealogia da moral III.28, Nietzsche interroga o sentido oferecido ao sofrimento pelo ideal ascético e o preço dessa interpretação. Sua crítica deve ser ouvida como crítica: dar uma explicação religiosa à dor pode ampliar a culpa e a negação da vida. Isso não o transforma em defensor da doutrina cristã da queda. A aula o apresenta como interlocutor que obriga a examinar os efeitos de uma linguagem religiosa.",
        "Uma resposta cristã precisa argumentar que arrependimento e esperança podem orientar uma vida responsável, e não apenas renomear ressentimento. A noção agostiniana de uma criação boa permite perguntar se o mal fere algo valioso. Chamar a pessoa de pecadora descreve uma condição moral em uma tradição; concluir que ela não possui qualquer dignidade seria outra tese, que exige outra justificação.",
      ),
      s(
        "example",
        "Ler o lamento sem corrigi-lo depressa",
        [],
        "Leia o Salmo 13 inteiro e divida-o pelos movimentos de queixa, pedido e confiança. Observe que a pergunta sobre abandono não é apagada pela confiança final. Em Eclesiastes 3, marque os pares de acontecimentos e a pergunta sobre o alcance do conhecimento humano. O exercício não consiste em converter cada frase em promessa de resultado favorável, mas em identificar o que cada voz permite dizer diante do limite.",
      ),
      s(
        "discussion",
        "Duas respostas insuficientes",
        [],
        "Considere estas propostas editoriais para avaliação: toda dor acontece porque a vítima falhou; nenhuma dor permite qualquer esperança. A primeira presume acesso à causa moral de cada sofrimento. A segunda transforma uma experiência real de perda em conclusão universal. Escreva quais premissas faltam a ambas. Uma teologia séria pode admitir perguntas ainda abertas e, mesmo assim, sustentar cuidado, justiça e fidelidade.",
      ),
      s(
        "conclusion",
        "Esperança como questão de estudo",
        [],
        "Ao concluir, formule uma definição provisória de esperança que não dependa de êxito imediato. Distinga sua convicção, o testemunho de um texto e o argumento que você consegue apresentar a outra pessoa. A postura acadêmica não exige eliminar a fé; exige tornar explícito o caminho entre o que foi lido e o que foi concluído.",
      ),
    ],
    passages: [
      r(
        "sl13",
        "Salmo 13:1–6",
        "psalms",
        13,
        1,
        6,
        "Examinar a passagem da queixa à confiança sem apagar a queixa.",
      ),
      r(
        "ec3",
        "Eclesiastes 3:1–15",
        "ecclesiastes",
        3,
        1,
        15,
        "Identificar limites de tempo, ação e compreensão.",
      ),
    ],
    connections: [
      {
        label: "Niilismo",
        explanation:
          "Problema filosófico sobre sentido e valor; não sinônimo de tristeza, humildade ou cristianismo.",
      },
      {
        label: "Esperança",
        explanation:
          "Confiança orientada a um bem futuro; nesta aula, sua justificação e sua relação com o sofrimento são investigadas.",
      },
    ],
    foundation: foundation(
      "Uma leitura dramática da vida pode enfrentar a crítica ao ideal ascético sem adotar o niilismo.",
      "Filosofia",
      "Interpretação",
      "Lente editorial de estudo: o confronto entre os autores é proposto aqui, não atribuído a um consenso entre eles.",
      [
        source(
          "nietzsche",
          "Genealogia da moral, III, §§1 e 28",
          "Formula uma crítica ao significado do sofrimento no ideal ascético.",
          "É uma objeção à tradição, não uma fonte favorável a toda a síntese do curso.",
        ),
        source(
          "augustine",
          "Confissões VII, capítulos 11–12",
          "Articula dependência, bondade do criado e corrupção.",
          "A resposta cristã aqui construída não é uma refutação escrita por Agostinho a Nietzsche.",
        ),
      ],
      "Considere respostas religiosas e não religiosas ao sentido. Compreender uma objeção não exige aceitá-la; responder exige mais que desqualificar seu autor.",
    ),
    prompt:
      "Compare Salmo 13 e a crítica ao ideal ascético. Apresente uma tese sobre esperança, uma objeção e uma resposta que reconheça um limite real da sua conclusão.",
  }),
  unit({
    id: "adao",
    phase: "Antropologia cristã",
    title: "Adão: personagem, tipo e arquétipo",
    studyGuideId: "hamartiologia-justificacao",
    readingSearch: "Adão imagem humanidade",
    description:
      "Investigar a leitura de Adão como representação da humanidade, distinguindo narrativa, tipologia e reconstrução histórica.",
    objectives: [
      "Definir arquétipo como hipótese de leitura, sem impor uma escola psicológica.",
      "Distinguir Adão na narrativa e a recepção paulina.",
      "Explicitar o que uma interpretação não demonstra historicamente.",
    ],
    sections: [
      s(
        "introduction",
        "Três níveis de pergunta",
        [],
        "Perguntar quem é Adão pode significar coisas distintas: qual papel ele exerce em Gênesis, como Paulo o relaciona a Cristo ou que realidade histórica corresponde ao relato. Uma resposta ao primeiro problema não resolve automaticamente os outros. A palavra arquétipo será usada aqui para uma figura que torna legível uma condição humana recorrente. Esse uso editorial não presume toda a teoria de Jung nem descarta, por definição, a historicidade do personagem.",
        "A hipótese em estudo é que Adão permite pensar o humano como criatura recebida, responsável, relacional e exposta à ruptura. Nessa lente, ler a narrativa não é apenas procurar um antepassado distante: é perguntar pela estrutura de uma vida que recebe o ser e tenta constituir-se como seu próprio fundamento.",
      ),
      s(
        "concept",
        "Tipologia e representação",
        ["irenaeus"],
        "Romanos 5:12–21 relaciona Adão e Cristo em um argumento sobre pecado, morte, dom e justificação. Em 1 Coríntios 15:45–49, o contraste se liga ao corpo e à ressurreição. A tipologia organiza uma relação entre figuras; não é, por si só, uma conclusão arqueológica nem uma autorização para apagar as diferenças entre os textos.",
        "Irineu, em Contra as heresias III.22, desenvolve a recapitulação em Cristo e insiste na realidade da humanidade assumida. Seu uso de Adão ilumina a recepção cristã antiga. Entretanto, ele não deve receber retrospectivamente a tese moderna de que Adão é apenas um símbolo sem existência histórica. Uma apropriação contemporânea pode dialogar com o autor e ainda assim discordar dele.",
      ),
      s(
        "example",
        "Um quadro de leitura de Gênesis 2",
        [],
        "Registre três elementos de Gênesis 2:7–17: formação da criatura, recebimento de uma tarefa e enunciação de um limite. Depois escreva duas colunas. Na primeira, descreva os acontecimentos narrados; na segunda, proponha sua leitura sobre dependência e responsabilidade. A separação torna visível onde começa sua interpretação. O texto não contém a palavra autonomia no sentido filosófico moderno; essa categoria será uma ferramenta de análise, não uma tradução literal.",
      ),
      s(
        "discussion",
        "O alcance da hipótese arquetípica",
        [],
        "Uma leitura representativa precisa explicar por que esses elementos correspondem ao humano em geral e como se relacionam com o argumento de Paulo. Uma leitura histórica precisa indicar que evidências seriam pertinentes à sua afirmação. Ambas podem dialogar, mas nenhuma deve fingir que a outra já foi resolvida. Tampouco a etimologia de um nome demonstra uma doutrina inteira: uma relação verbal pode sugerir uma interpretação sem prová-la.",
      ),
      s(
        "conclusion",
        "Uma tese delimitada",
        [],
        "Uma formulação defensável pode assumir esta estrutura: nesta unidade, leio Adão como figura da condição recebida da humanidade, porque determinados elementos narrativos e sua recepção permitem essa relação. Acrescente o que essa frase deixa em aberto: ancestralidade, cronologia, mecanismo de transmissão do pecado e interpretações concorrentes. O rigor está em dizer o que você sustenta e o que ainda precisa examinar.",
      ),
    ],
    passages: [
      r(
        "gn2",
        "Gênesis 2:7–17",
        "genesis",
        2,
        7,
        17,
        "Separar descrição narrativa e leitura da condição humana.",
      ),
      r(
        "rm5",
        "Romanos 5:12–21",
        "romans",
        5,
        12,
        21,
        "Examinar a relação Adão–Cristo no argumento paulino.",
      ),
    ],
    connections: [
      {
        label: "Arquétipo",
        explanation:
          "Figura representativa da condição humana, no uso delimitado deste percurso. Hipótese interpretativa, não dado histórico demonstrado.",
      },
      {
        label: "Tipologia",
        explanation:
          "Relação interpretativa entre figuras ou acontecimentos; observar como o autor constrói a comparação.",
      },
    ],
    foundation: foundation(
      "Adão pode ser investigado como figura representativa, sem equiparar essa hipótese a uma descoberta histórica.",
      "Leitura textual",
      "Interpretação",
      "Hipótese de estudo do percurso, examinada à luz de Gênesis 2, Romanos 5 e 1 Coríntios 15. A referência patrística documenta recepção, não comprovação de toda a hipótese.",
      [
        source(
          "irenaeus",
          "Contra as heresias III.22.1–3",
          "Relaciona Adão, humanidade real de Cristo e recapitulação.",
          "Irineu não formula a tese moderna de Adão exclusivamente arquetípico.",
        ),
      ],
      "Compare leitura histórico-representativa e leitura arquetípica. Explicite as premissas de cada uma, sem transformar uma preferência em consenso cristão.",
    ),
    prompt:
      "Defenda ou critique a leitura arquetípica de Adão com um elemento de Gênesis e um de Romanos 5. Diferencie o argumento textual de uma afirmação histórica e registre uma objeção à sua leitura.",
  }),
  unit({
    id: "alteridade",
    phase: "Antropologia cristã",
    title: "Adão e Eva: alteridade e comunhão",
    studyGuideId: "biblia-interpretacao",
    readingSearch: "Gênesis homem mulher comunhão",
    description:
      "Ler o encontro com o outro, o reconhecimento e a responsabilidade em Gênesis 1–3.",
    objectives: [
      "Definir alteridade sem reduzir a pessoa a instrumento.",
      "Comparar reconhecimento e acusação na narrativa.",
      "Distinguir descrição do conflito e prescrição ética.",
    ],
    sections: [
      s(
        "introduction",
        "O outro não é uma extensão do eu",
        [],
        "Alteridade é o reconhecimento de um outro que não se reduz à minha projeção, utilidade ou controle. O termo é uma categoria filosófica usada para interrogar Gênesis, não uma palavra técnica colocada pelo narrador. A pergunta desta unidade é o que acontece quando a vida humana é compreendida como relação recebida, em vez de autossuficiência isolada.",
        "Gênesis 1:26–28 associa a imagem de Deus à humanidade e menciona homem e mulher. Gênesis 2 desenvolve outra cena, com solidão, encontro e reconhecimento. Ler as unidades em sua organização própria evita usar uma frase para interromper todas as perguntas sobre a outra. Uma síntese teológica vem depois da atenção ao texto.",
      ),
      s(
        "concept",
        "Reconhecimento, limite e diferença",
        [],
        "No encontro de Gênesis 2:18–25, investigue como a diferença aparece junto do reconhecimento de uma condição comum. A leitura de alteridade proposta aqui entende que comunhão não exige absorver o outro. O vínculo pode ser pensado como acolhimento de uma existência que não foi produzida por minha vontade. Essa é uma elaboração filosófica da cena, aberta a avaliação.",
        "Em Gênesis 3, o deslocamento da responsabilidade aparece nas respostas dos personagens. A ruptura pode ser examinada na relação com Deus, com o outro e com o próprio agir. Descrever essa dinâmica é diferente de atribuir toda culpa a um sexo ou de converter dominação em ideal normativo. Para defender uma conclusão ética, identifique se o texto narra uma ferida, estabelece um mandamento ou recebe uma interpretação posterior.",
      ),
      s(
        "example",
        "Duas cenas em paralelo",
        [],
        "Leia Gênesis 2:23 e 3:12 dentro de suas unidades. Compare o modo de se referir à mulher, a presença de Deus na fala e a posição do sujeito que responde. Produza uma observação verificável antes de usar termos como alienação ou objetificação. Depois pergunte se esses termos esclarecem a mudança de relação ou acrescentam algo que precisaria ser sustentado por outro argumento.",
      ),
      s(
        "discussion",
        "Descrição não equivale a legitimação",
        [],
        "Imagine uma aula que narra a origem da violência e conclui que a violência é, por isso, uma obrigação. Há um salto entre descrever um estado e prescrever sua conservação. Aplique esse teste às interpretações de Gênesis 3. Compare ao menos duas leituras sobre diferença e autoridade, identificando o texto invocado e o princípio usado para passar dele à norma. Uma preferência moral não substitui esse trabalho; tampouco um costume ganha validade apenas por ser antigo.",
      ),
      s(
        "conclusion",
        "Da alteridade à responsabilidade",
        [],
        "A lente do percurso propõe pensar a queda também como deterioração do encontro: o outro passa a ser acusado, temido ou apropriado. Seu contraponto ético é uma responsabilidade que reconhece a dignidade alheia. Essa conclusão precisa conservar seu estatuto interpretativo. Ela não pretende encerrar os debates sobre gênero, matrimônio ou autoridade eclesial em uma única página de leitura.",
      ),
    ],
    passages: [
      r(
        "gn1-humanidade",
        "Gênesis 1:26–28",
        "genesis",
        1,
        26,
        28,
        "Identificar os sujeitos da afirmação sobre imagem e tarefa.",
      ),
      r(
        "gn2-encontro",
        "Gênesis 2:18–25",
        "genesis",
        2,
        18,
        25,
        "Examinar solidão, encontro e reconhecimento.",
      ),
      r(
        "gn3-acusacao",
        "Gênesis 3:8–19",
        "genesis",
        3,
        8,
        19,
        "Observar as mudanças de responsabilidade e relação.",
      ),
    ],
    connections: [
      {
        label: "Alteridade",
        explanation:
          "Reconhecimento do outro como sujeito, cuja existência não se esgota no meu interesse.",
      },
      {
        label: "Comunhão",
        explanation:
          "Relação que une sem eliminar a diferença; hipótese de leitura a confrontar com os textos.",
      },
    ],
    foundation: foundation(
      "A passagem do reconhecimento à acusação permite uma investigação da alteridade em Gênesis 2–3.",
      "Leitura textual",
      "Interpretação",
      "O suporte imediato são as unidades bíblicas vinculadas; a categoria alteridade pertence à análise editorial. A fonte patrística permite comparar outra recepção de Eva.",
      [
        source(
          "irenaeus",
          "Contra as heresias III.22.4",
          "Documenta uma leitura antiga de Eva em paralelo com Maria.",
          "O paralelo de Irineu não constitui uma teoria moderna de alteridade nem resolve todos os debates éticos atuais.",
        ),
      ],
      "Compare interpretações complementares e igualitárias, distinguindo descrição narrativa, norma defendida e categorias filosóficas utilizadas.",
    ),
    prompt:
      "Compare Gênesis 2:23 e 3:12. Mostre uma mudança verificável na fala, proponha uma interpretação pela alteridade e responda a uma objeção sobre o uso de uma categoria moderna.",
  }),
  unit({
    id: "queda",
    phase: "Antropologia cristã",
    title: "Queda e ruptura da condição humana",
    studyGuideId: "hamartiologia-justificacao",
    readingSearch: "pecado original natureza mal",
    description:
      "Examinar o alcance da expressão ruptura ontológica e a permanência da bondade da criação.",
    objectives: [
      "Distinguir natureza, condição, culpa e corrupção.",
      "Avaliar a tese de uma ruptura ontológica sem pressupor destruição da humanidade.",
      "Separar explicação teológica e causalidade empírica.",
    ],
    sections: [
      s(
        "introduction",
        "O que teria sido quebrado?",
        [],
        "Dizer que a queda explica a condição presente é propor uma estrutura teológica de interpretação. Para desenvolvê-la, é preciso identificar o que foi perdido, o que permaneceu e como a ruptura se transmite. A expressão quebra da ontologia humana será examinada como hipótese: ela pode significar perda de comunhão e de ordenação ao bem, mas também pode sugerir, de modo muito mais forte, que o ser humano deixou de ser humano. Essas afirmações não são equivalentes.",
        "Ontologia investiga o ser e seus modos; antropologia teológica pergunta pela criatura humana diante de Deus. Uma ferida da vontade, uma perda de justiça original e a extinção da natureza são teses diferentes. Sem essas distinções, uma frase expressiva acaba escondendo o problema que deveria esclarecer.",
      ),
      s(
        "concept",
        "Privação e bondade ferida",
        ["augustine", "evil"],
        "Agostinho, em Confissões VII.12, considera a corrupção como perda de um bem. Tomás, em Suma I, q.48, distingue mal e natureza. Nesse quadro, o mal depende de algo cuja bondade pode ser danificada; não é uma segunda substância criadora. Isso permite falar de uma condição ferida sem concluir que todo aspecto da existência seja mau ou que uma pessoa perca sua dignidade por pecar.",
        "A lente proposta interpreta a queda como desordem das relações com Deus, com o próximo e com o bem. Ela deixa aberta a discussão sobre seus mecanismos e não transforma Romanos 5 em manual de biologia. Também distingue morte corporal, alienação espiritual e condenação: reunir todos esses usos em uma única palavra morte pode criar uma explicação circular.",
      ),
      s(
        "example",
        "Uma afirmação ampla sob exame",
        [],
        "Considere a tese: a queda é a principal razão de o mundo ser como é. Divida-a em três perguntas. Ela explica teologicamente o pecado? Explica a vulnerabilidade e a morte? Afirma explicar cada evento natural particular? A terceira formulação exige uma investigação adicional. Um acidente, uma doença ou um desastre não revelam automaticamente a culpa pessoal de quem sofre. O estudo da queda não concede ao leitor conhecimento privado de cada intenção divina.",
      ),
      s(
        "discussion",
        "A criação continua reconhecível?",
        ["augsburg", "anglican"],
        "Compare as formulações confessionais sobre pecado original e observe os verbos usados para descrever a condição humana. Pergunte se a corrupção é apresentada como simples exemplo ruim, inclinação, privação, culpa ou incapacidade em determinada ordem. Não suponha que todas as tradições usem natureza e liberdade da mesma maneira. Uma comparação rigorosa primeiro reconstrói cada posição; somente depois avalia se a expressão ruptura ontológica é esclarecedora.",
      ),
      s(
        "conclusion",
        "Uma hipótese com alcance definido",
        [],
        "A síntese deste ponto é uma pergunta estruturada: em que sentido a humanidade permanece criação boa e, ao mesmo tempo, necessita de restauração? Uma resposta deve evitar dois atalhos: minimizar o mal até torná-lo irrelevante ou absolutizá-lo até eliminar todo bem. Essa tensão prepara o estudo de Cristo e da graça, que só podem ser compreendidos se soubermos o que a salvação pretende restaurar.",
      ),
    ],
    passages: [
      r(
        "gn3-queda",
        "Gênesis 3:1–24",
        "genesis",
        3,
        1,
        24,
        "Descrever rupturas e consequências na organização da narrativa.",
      ),
      r(
        "rm8",
        "Romanos 8:18–25",
        "romans",
        8,
        18,
        25,
        "Investigar criação, corrupção e esperança sem reduzir o argumento a uma causa física isolada.",
      ),
    ],
    connections: [
      {
        label: "Ontologia",
        explanation:
          "Investigação do ser; neste curso, exige distinguir natureza humana e condição histórica ou moral.",
      },
      {
        label: "Privação",
        explanation:
          "Falta de um bem devido, na tradição agostiniana e tomista; não equivale a uma substância independente.",
      },
      {
        label: "Pecado original",
        explanation:
          "Conceito cuja formulação varia entre tradições; examinar alcance, transmissão e relação com atos pessoais.",
        entityId: "doctrine:original-sin",
      },
    ],
    foundation: foundation(
      "Ruptura ontológica é uma hipótese a precisar, não uma licença para identificar natureza humana e mal.",
      "Teologia",
      "Interpretação",
      "A linguagem da ruptura pertence à lente de estudo. As fontes abaixo ajudam a testar seu alcance, inclusive quando oferecem resistência à formulação.",
      [
        source(
          "augustine",
          "Confissões VII.12",
          "Discute corrupção e bondade do que existe.",
          "Não descreve o mal como uma natureza criadora independente.",
        ),
        source(
          "evil",
          "Suma I, q.48, a.1–4",
          "Distingue privação, sujeito do mal e corrupção do bem.",
          "A metafísica da privação não comprova uma cronologia da queda.",
        ),
        source(
          "augsburg",
          "Artigo II",
          "Apresenta uma formulação luterana de pecado original.",
          "É autodescrição confessional; comparar seus termos com os de outras fontes.",
        ),
      ],
      "Compare perda de comunhão, justiça original e corrupção da vontade. Não equipare uma descrição teológica à explicação empírica de cada sofrimento.",
    ),
    prompt:
      "Defina exatamente o que você entende por ruptura ontológica. Indique o que permanece humano após a queda, use uma passagem e uma fonte primária, e examine uma objeção à sua definição.",
  }),
];
