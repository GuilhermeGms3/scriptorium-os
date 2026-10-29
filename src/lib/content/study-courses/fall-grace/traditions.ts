import { section as s, reading as r } from "../helpers";
import { unit } from "./unit";
import { foundation, source } from "./sources";

export const TRADITION_UNITS = [
  unit({
    id: "calvinismo",
    phase: "Tradições em diálogo",
    title: "Calvinismo: soberania, eleição e aliança",
    studyGuideId: "historia-tradicoes",
    readingSearch: "Calvino eleição providência graça",
    description:
      "Estudar uma formulação reformada a partir de suas fontes, distinguindo soberania, responsabilidade e especulação sobre o destino alheio.",
    objectives: [
      "Reconstruir a prioridade da iniciativa divina numa formulação reformada.",
      "Distinguir corrupção abrangente e maldade máxima em cada ato.",
      "Examinar decreto e responsabilidade sem atribuir ao ser humano acesso aos decretos secretos.",
    ],
    sections: [
      s(
        "introduction",
        "Ler uma tradição por seus problemas",
        ["calvin", "westminster"],
        "Calvinismo será estudado aqui por uma seleção de problemas reformados: soberania divina, eleição, providência e resposta da criatura. A aula não reduz toda essa tradição a uma sigla e não identifica uma confissão posterior com cada frase de Calvino. As Institutas e a Confissão de Westminster pertencem a momentos e formas de exposição diferentes. Compará-las exige conservar essa diferença.",
        "A questão central é como a iniciativa divina pode fundamentar a salvação e, ao mesmo tempo, manter a seriedade do agir humano. Uma apresentação por caricaturas escolheria de antemão entre Deus faz tudo e o ser humano não importa. O estudo exige entender o sentido de causa, vontade e responsabilidade no argumento efetivamente usado.",
      ),
      s(
        "concept",
        "Eleição, corrupção e meios",
        ["westminster", "calvin"],
        "Westminster 3 apresenta o decreto divino e recusa que isso transforme Deus em autor do pecado ou suprima a vontade criada. O capítulo 5 articula providência e causas segundas. A força dessas afirmações precisa ser examinada em conjunto com a questão de como elas se compatibilizam; repeti-las não resolve a dificuldade filosófica.",
        "A expressão corrupção total, usada no debate reformado, deve ser definida pelo alcance da ferida, e não confundida automaticamente com a tese de que cada ato é tão mau quanto poderia ser. Ao estudar eleição, diferencie prioridade da graça, fundamento da escolha e conhecimento humano de quem é eleito. A convicção de ser recebido gratuitamente não autoriza emitir listas privadas de condenação ou considerar o próximo naturalmente inferior.",
      ),
      s(
        "example",
        "Romanos 9 dentro de uma pergunta maior",
        [],
        "Leia Romanos 9:6–24 e anote quem formula as objeções e como o argumento responde. Depois situe a unidade na discussão sobre Israel e as promessas. A tarefa é reconstruir o problema do autor antes de usar a passagem para resolver todos os debates posteriores. Uma interpretação de eleição individual, corporativa ou de vocação histórica precisa mostrar seu caminho textual, não apenas escolher uma frase isolada.",
      ),
      s(
        "discussion",
        "A objeção da responsabilidade",
        ["calvin"],
        "Formule a objeção mais forte que consegue à combinação entre decreto e culpa. Em seguida, examine a resposta que distingue intenção do agente, mandamento conhecido e governo providencial. Calvino I.17 recusa o abandono dos meios e dos deveres sob pretexto de providência. Avalie se essa resposta resolve sua objeção ou se depende de uma concepção de liberdade que você ainda precisa investigar.",
      ),
      s(
        "conclusion",
        "Consolo e limite de inferência",
        [],
        "Uma apropriação responsável dessa tradição pode investigar a segurança fundada no dom sem converter a doutrina em instrumento de arrogância. Ao concluir, diga qual formulação reformada você compreendeu, em que concorda e qual dificuldade permanece. A conclusão da aula depende da elaboração, não de adesão ao calvinismo. Sua investigação pode reconhecer uma contribuição sem aceitar todas as suas premissas.",
      ),
    ],
    passages: [
      r(
        "rm9",
        "Romanos 9:6–24",
        "romans",
        9,
        6,
        24,
        "Examinar promessa, eleição e objeções no argumento paulino.",
      ),
      r(
        "ef1",
        "Efésios 1:3–14",
        "ephesians",
        1,
        3,
        14,
        "Ler eleição e adoção no conjunto da bênção cristológica.",
      ),
    ],
    connections: [
      {
        label: "Eleição",
        explanation:
          "Escolha divina cuja finalidade e relação com fé e graça precisam ser definidas em cada tradição.",
        entityId: "doctrine:election",
      },
      {
        label: "Soberania",
        explanation:
          "Governo e autoridade divinos; não equivale a acesso humano a todos os propósitos particulares.",
      },
      {
        label: "Tradição reformada",
        explanation:
          "Ler documentos e autores em seus contextos, sem reduzir toda a tradição a um rótulo.",
        entityId: "tradition:reformed",
      },
    ],
    foundation: foundation(
      "Soberania, eleição e responsabilidade devem ser reconstruídas no sistema de cada fonte reformada.",
      "Teologia",
      "Argumento",
      "Recorte confessional e histórico explícito. As objeções da aula são tarefas de análise, não prova de consenso entre todas as escolas.",
      [
        source(
          "westminster",
          "Capítulos 3 e 5",
          "Articula decreto, providência, vontade criada e causas segundas.",
          "É uma recensão confessional posterior a Calvino; não representa automaticamente toda posição reformada.",
        ),
        source(
          "calvin",
          "Institutas I.17, §§3–5 e 9",
          "Recusa a inferência de que providência elimine meios e deveres.",
          "Reconstruir essa resposta não implica ter resolvido toda a controvérsia sobre liberdade.",
        ),
      ],
      "Compare concepções compatibilistas e outras formulações de liberdade. Analise a passagem, a premissa e a consequência moral antes de avaliar a posição.",
    ),
    prompt:
      "Reconstrua uma formulação reformada sobre eleição ou providência. Use uma passagem e um localizador confessional, apresente a objeção da responsabilidade e avalie a resposta sem atribuir a Deus a aprovação moral de todo acontecimento.",
  }),
  unit({
    id: "luteranismo",
    phase: "Tradições em diálogo",
    title: "Luteranismo: promessa, justificação e vocação",
    studyGuideId: "historia-tradicoes",
    readingSearch: "Lutero justificação fé obras",
    description:
      "Examinar o recebimento da promessa e a relação entre fé, liberdade e vida concreta.",
    objectives: [
      "Distinguir recebimento da graça e aquisição por mérito.",
      "Comparar justificação e nova obediência em Augsburgo.",
      "Examinar a diferença entre liberdade civil e justiça espiritual.",
    ],
    sections: [
      s(
        "introduction",
        "O recorte confessional de Augsburgo",
        ["augsburg"],
        "A aula toma a Confissão de Augsburgo como ponto de entrada no luteranismo. Não a apresenta como texto escrito integralmente por Lutero nem como retrato de cada comunidade luterana atual. O procedimento é identificar uma formulação pública da tradição e examinar suas relações internas. Assim, a comparação não depende apenas do que seus adversários dizem sobre ela.",
        "O problema escolhido é a consciência diante da promessa: a pessoa busca uma certeza fundada em Cristo ou tenta estabelecer seu valor religioso pela soma de realizações? Essa pergunta não elimina a ética. Obriga a distinguir o fundamento da aceitação e o modo de viver que decorre dela.",
      ),
      s(
        "concept",
        "Justificação, obediência e liberdade",
        ["augsburg"],
        "O artigo IV apresenta justificação gratuita por causa de Cristo, recebida pela fé. O artigo VI relaciona fé e boas obras como nova obediência, sem transformá-las no preço da justificação. O artigo XVIII distingue capacidades em assuntos civis e a justiça espiritual dependente do Espírito. Juntos, esses textos impedem resumir a posição como qualquer ato humano é impossível ou nenhuma ação importa.",
        "Lei e evangelho serão usados como categorias para investigar exigência e promessa, não como rótulos automáticos para Antigo e Novo Testamento. Uma mesma leitura pode confrontar uma pretensão de autossuficiência e anunciar um dom. Para sustentar essa análise, mostre qual função a passagem exerce, em vez de decidir apenas por seu lugar na Bíblia.",
      ),
      s(
        "example",
        "Romanos 3 e a exclusão da vanglória",
        [],
        "Leia Romanos 3:21–31 e marque justiça, fé, graça, obra e vanglória. Reconstrua a relação entre os termos no argumento de Paulo. Depois compare com a formulação de Augsburgo IV. A distinção de documentos importa: interpretar Paulo por uma confissão é uma leitura de recepção que precisa ser justificada, não a identidade material entre os dois textos.",
      ),
      s(
        "discussion",
        "A objeção da passividade",
        [],
        "Uma crítica frequente supõe que a gratuidade dispense qualquer responsabilidade. Teste essa conclusão diante do artigo VI. No sentido oposto, avalie a tentativa de fazer das boas obras uma prova infalível que permite medir a eleição de outra pessoa. A atividade busca perceber quando uma vida de resposta é transformada de novo em mecanismo de controle, superioridade ou garantia por desempenho.",
      ),
      s(
        "conclusion",
        "Vocação no cotidiano",
        [],
        "A aplicação editorial desta unidade entende vocação como investigação da responsabilidade concreta no trabalho, nas relações e no cuidado. Ela não promete que toda tarefa será agradável ou socialmente reconhecida. A questão é como a gratuidade pode deslocar a busca de mérito para o serviço ao próximo. Conclua distinguindo essa aplicação da formulação confessional estrita que você consultou.",
      ),
    ],
    passages: [
      r(
        "rm3",
        "Romanos 3:21–31",
        "romans",
        3,
        21,
        31,
        "Relacionar justiça, graça e vanglória no argumento paulino.",
      ),
      r(
        "gl5",
        "Gálatas 5:1–6",
        "galatians",
        5,
        1,
        6,
        "Examinar liberdade, fé e amor sem separar a frase de seu debate.",
      ),
    ],
    connections: [
      {
        label: "Lei e evangelho",
        explanation:
          "Categorias para investigar exigência e promessa; não divisão simplista entre os dois Testamentos.",
      },
      {
        label: "Vocação",
        explanation:
          "Responsabilidade concreta na vida comum, na aplicação proposta pelo percurso.",
      },
      {
        label: "Tradição luterana",
        explanation: "Nesta unidade, estudada por uma seleção explícita da Confissão de Augsburgo.",
        entityId: "tradition:lutheran",
      },
    ],
    foundation: foundation(
      "Na formulação de Augsburgo, justificação gratuita e nova obediência têm funções distintas.",
      "Teologia",
      "Argumento",
      "Estudo da autodescrição confessional, comparada a Romanos 3 e Gálatas 5; não atribuição automática de toda a aula a Lutero.",
      [
        source(
          "augsburg",
          "Artigos IV, VI e XVIII",
          "Distingue justificação, obras e liberdade em ordens diferentes.",
          "As aplicações sobre vocação e controle religioso são reflexões editoriais; a confissão não representa cada comunidade contemporânea.",
        ),
      ],
      "Compare leituras católicas e reformadas sobre fé, obras e justiça. Primeiro defina os termos utilizados por cada fonte.",
    ),
    prompt:
      "Explique por que justificação gratuita não equivale, em Augsburgo IV e VI, à irrelevância das obras. Compare com Romanos 3 e desenvolva uma objeção sobre responsabilidade ou certeza religiosa.",
  }),
  unit({
    id: "anglicanismo",
    phase: "Tradições em diálogo",
    title: "Anglicanismo: Escritura, liturgia e vida comum",
    studyGuideId: "historia-tradicoes",
    readingSearch: "anglicanismo artigos graça liturgia",
    description:
      "Estudar o formulário histórico anglicano e o papel da oração comum na formação dos desejos.",
    objectives: [
      "Ler artigos históricos com localizadores e contexto.",
      "Examinar graça, justificação, obras e eleição no formulário.",
      "Distinguir autoridade, costume e uniformidade total.",
    ],
    sections: [
      s(
        "introduction",
        "Um patrimônio histórico em interpretação",
        ["anglican"],
        "O anglicanismo será abordado por seus Trinta e Nove Artigos como formulário histórico. O documento não deve ser tratado como descrição sociológica de todos os anglicanos atuais. A aula distingue aquilo que o texto afirma, a maneira como é recebido e a aplicação que o estudante propõe. O interesse aqui é uma formação em que Escritura, doutrina e oração pública possam ser examinadas em conjunto.",
        "Liturgia significa uma forma de ação e oração comunitária. Na hipótese pedagógica desta unidade, repetir uma forma pode educar a atenção e o desejo; também pode tornar-se automatismo. A qualidade de uma prática não é demonstrada apenas por sua antiguidade, por sua beleza ou pela intensidade emocional que provoca.",
      ),
      s(
        "concept",
        "O encadeamento dos artigos",
        ["anglican"],
        "Os artigos IX–XII relacionam pecado original, auxílio da graça, justificação e boas obras. O XVII apresenta eleição como tema de consolo e também adverte contra um uso especulativo que produza desespero ou descuido. A combinação é relevante para este percurso: severidade e confiança precisam ser lidas no argumento, sem reduzir a doutrina a uma frase que humilha ou a uma garantia que dispensa responsabilidade.",
        "O artigo VI estabelece o lugar da Escritura na afirmação do necessário à salvação. O XX trata da autoridade da Igreja e seu limite diante da Palavra escrita. O XXXIV distingue diversidade de tradições e exigências da ordem comum. Esses pontos permitem perguntar como uma comunidade recebe formas sem considerar todo costume uma obrigação divina universal.",
      ),
      s(
        "example",
        "Uma oração pública sob análise",
        [],
        "Leia Atos 2:42–47 e observe ensino, comunhão, partilha e oração. Em seguida, escolha uma oração pública que você conhece e anote seus sujeitos e pedidos. Ela forma uma vontade de serviço, reconhecimento e entrega ou transforma a comunidade em plateia de um desempenho individual? Esta é uma pergunta de análise da prática; a passagem não decide sozinha a forma litúrgica de todas as épocas.",
      ),
      s(
        "discussion",
        "Forma e liberdade",
        [],
        "Compare duas objeções: uma forma estável sufoca a oração; uma forma espontânea é sempre superficial. Ambas generalizam a partir de características insuficientes. Uma resposta melhor investiga o conteúdo, o uso, a participação e o tipo de relação cultivado. O mesmo exame pode ser aplicado à linguagem contemporânea de avivamento sem transformar todos os protestantes ou toda expressão emocional numa caricatura única.",
      ),
      s(
        "conclusion",
        "Ordenar a vida comum",
        [],
        "A contribuição estudada é uma pergunta sobre formação comunitária: que palavras e práticas tornam a relação com Deus menos centrada em vantagem individual? Uma resposta pode valorizar sobriedade, oração comum e memória sem afirmar que só uma tradição possui acesso a esses bens. Ao concluir, indique qual artigo foi consultado e diferencie sua proposta de aplicação da afirmação histórica do documento.",
      ),
    ],
    passages: [
      r(
        "at2-comunidade",
        "Atos 2:42–47",
        "acts",
        2,
        42,
        47,
        "Investigar as práticas da comunidade e os limites de uma aplicação litúrgica direta.",
      ),
      r(
        "rm12",
        "Romanos 12:1–8",
        "romans",
        12,
        1,
        8,
        "Relacionar culto, renovação do entendimento e diversidade de serviços.",
      ),
    ],
    connections: [
      {
        label: "Liturgia",
        explanation:
          "Forma comunitária de ação e oração; investigar conteúdo, participação e efeitos de formação.",
      },
      {
        label: "Tradição e costume",
        explanation: "Distinguir herança recebida, norma defendida e prática que pode variar.",
      },
      {
        label: "Tradição anglicana",
        explanation: "Estudada aqui por um formulário histórico com recepções diversas.",
        entityId: "tradition:anglican",
      },
    ],
    foundation: foundation(
      "O formulário anglicano permite estudar graça, eleição e ordem comunitária sem supor uniformidade de toda prática cristã.",
      "Teologia",
      "Interpretação",
      "Leitura de documento histórico publicado pelo Anglican Communion Office. A avaliação das práticas é um exercício editorial.",
      [
        source(
          "anglican",
          "Artigos VI, IX–XII, XVII, XX e XXXIV; PDF, pp.1–3 e 5",
          "Documenta Escritura, graça, justificação, eleição, autoridade e diversidade de tradições.",
          "O documento não é pesquisa sociológica de todas as províncias; sua publicação não prova toda a aplicação pedagógica da aula.",
        ),
      ],
      "Compare o lugar de Escritura, comunidade e forma de oração em outras tradições. Evite identificar sobriedade com ausência de afeto ou espontaneidade com ausência de reflexão.",
    ),
    prompt:
      "Escolha dois artigos históricos anglicanos e explique como poderiam orientar uma oração comum centrada em graça e providência. Compare com Atos 2 ou Romanos 12, enfrente uma objeção e delimite a aplicação.",
  }),
];
