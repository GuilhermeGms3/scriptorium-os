import type { CourseModule } from "../../domain/study-course";
import { section as s, lesson as l, reading as r, criteria } from "./helpers";

export const GENESIS_ORIENTATION: CourseModule = {
  id: "orientacao",
  title: "Aprender a investigar",
  description: "Objeto, método e fontes: preparar uma leitura fundamentada de Gênesis 1.",
  objectives: [
    "Delimitar a unidade Gênesis 1:1–2:3.",
    "Distinguir texto, tradução, comentário e interpretação.",
    "Formular uma pergunta que possa ser discutida com fontes.",
  ],
  domains: ["exegesis", "hermeneutics"],
  passages: [
    r(
      "genesis-opening",
      "Gênesis 1:1–5",
      "genesis",
      1,
      1,
      5,
      "Identificar quem age, o que acontece e como a narrativa organiza sua abertura.",
    ),
    r(
      "genesis-rest",
      "Gênesis 2:1–3",
      "genesis",
      2,
      1,
      3,
      "Reconhecer o encerramento do ciclo de criação, além da divisão moderna de capítulos.",
    ),
  ],
  lessons: [
    l(
      "objeto",
      "Um texto antigo, perguntas diferentes",
      s(
        "introduction",
        "Por que começar pelo objeto da investigação?",
        [],
        "Gênesis 1 é lido em igrejas, sinagogas, universidades e debates sobre ciência. Essas situações nem sempre fazem a mesma pergunta. Uma comunidade pode procurar uma confissão sobre Deus e o mundo; um linguista examina uma construção hebraica; um historiador investiga relações entre escritos antigos. O fato de todos citarem a mesma passagem não torna suas tarefas idênticas. Um estudo acadêmico começa quando o problema e o tipo de evidência se tornam reconhecíveis.",
        "Neste percurso, o objeto principal é Gênesis 1:1–2:3 como unidade literária recebida. A pergunta central é como o texto apresenta criação, ordem e vida, e como suas palavras e sua organização sustentam interpretações diferentes. A investigação não exige uma profissão de fé nem exige abandonar uma. Ela exige distinguir a descrição de uma posição das razões oferecidas para defendê-la.",
      ),
      s(
        "concept",
        "Texto, edição, tradução e comentário",
        [],
        "Texto é o que uma edição apresenta como a passagem bíblica. Edição é uma forma concreta de estabelecer e publicar esse texto, com decisões e critérios próprios. Tradução é uma representação em outra língua; ela torna certas relações explícitas e pode deixar outras menos visíveis. Comentário é uma explicação produzida por um intérprete. Uma nota de rodapé que explica uma palavra não passa a fazer parte da fala do narrador.",
        "A distinção é prática. Quando uma Bíblia de estudo afirma que uma expressão inclui determinado acontecimento, temos a interpretação de seus comentaristas. Para atribuir essa conclusão ao próprio texto, é necessário mostrar o argumento. Da mesma maneira, comparar três traduções pode revelar um problema, mas não resolve esse problema por votação. As versões devem ser relacionadas às decisões gramaticais e literárias que representam.",
      ),
      s(
        "example",
        "Uma pergunta que pode ser respondida",
        ["net"],
        "A pergunta “o que Gênesis ensina sobre tudo?” é ampla demais para organizar uma aula. Uma pergunta mais delimitada seria: “como a relação entre os versículos 1, 2 e 3 afeta a tradução da abertura?”. Ela permite observar a sequência das frases, comparar traduções e consultar um comentário gramatical. O resultado pode continuar discutível, mas suas razões poderão ser examinadas.",
        "Outra pergunta produtiva é por que o relato retorna a expressões sobre fala, separação, nomeação e avaliação. Aqui, a evidência inicial é a repetição no próprio texto. Uma hipótese sobre o efeito dessa repetição deve explicar vários casos, não apenas um exemplo escolhido porque favorece a conclusão. O estudo passa da impressão geral a uma descrição que outra pessoa pode conferir.",
      ),
      s(
        "discussion",
        "Convicção e método não se confundem",
        [],
        "Uma leitura confessional interpreta o texto dentro de uma comunidade e de compromissos teológicos. Uma leitura histórica pode suspender a decisão sobre a verdade desses compromissos para investigar composição, linguagem e recepção. Nenhuma dessas posições dispensa critérios. A existência de um pressuposto não torna um argumento automaticamente inválido; esconder esse pressuposto pode tornar a discussão menos clara.",
        "É possível discordar de uma conclusão e representar corretamente o argumento que a sustenta. Isso é especialmente importante quando se comparam tradições. A expressão “literal” pode designar atenção ao funcionamento de um gênero ou uma reconstrução particular de acontecimentos. Antes de classificar uma leitura, é necessário compreender como seu autor usa seus próprios termos.",
      ),
      s(
        "conclusion",
        "O produto desta primeira etapa",
        [],
        "O primeiro resultado não é uma solução total para as origens do universo. É um problema delimitado, uma passagem reconhecida e a capacidade de dizer quando estamos lendo Bíblia, tradução ou explicação. Esses instrumentos acompanharão as próximas aulas. Eles permitem acrescentar profundidade sem confundir o que está sendo explicado com o tipo de fonte usado para explicá-lo.",
      ),
    ),
    l(
      "fontes",
      "Como uma fonte sustenta uma afirmação",
      s(
        "introduction",
        "Da biblioteca à leitura escolhida",
        [],
        "Uma biblioteca extensa não se transforma sozinha em um curso. Um livro pode mencionar Gênesis em um índice, reproduzir o versículo numa discussão sobre outro assunto ou comentar diretamente sua construção. Esses três resultados não têm a mesma utilidade. A leitura escolhida para uma aula precisa responder a uma questão de aprendizagem e conservar o lugar exato em que o autor a desenvolve.",
      ),
      s(
        "concept",
        "Localizador, evidência e argumento",
        [],
        "Uma referência bibliográfica identifica a obra e a edição. O localizador indica página, capítulo, seção, parágrafo ou unidade textual. A evidência é o material efetivamente usado; o argumento explica por que ele sustenta uma conclusão. Registrar somente o nome de um livro deixa uma distância entre a afirmação e o que o leitor pode verificar.",
        "Também existe diferença entre uma citação e uma paráfrase. Na citação, as palavras são preservadas e sua autoria fica explícita. Na paráfrase, a redação muda, mas a ideia continua atribuída à fonte. A síntese própria organiza relações entre fontes e assume responsabilidade por essa organização. Misturar as três operações faz uma interpretação parecer uma transcrição ou atribui ao autor algo que ele não escreveu.",
      ),
      s(
        "example",
        "Um comentário ligado à passagem",
        [],
        "Nas leituras deste módulo, cada unidade do acervo mantém documento, páginas físicas e situação de revisão. O vínculo com uma passagem é um ponto de partida: não demonstra que o autor tenha explicado todos os versículos abrangidos. Uma introdução a Gênesis pode ser importante para o livro inteiro e, ainda assim, não ser um comentário específico sobre a primeira palavra.",
        "Uma nota que compara Gênesis 1 com João 1 pode usar a segunda passagem como apoio teológico. Nesse caso, João é uma conexão intertextual, e não necessariamente o destino principal da nota. A precisão desse papel evita multiplicar artificialmente comentários e ajuda a escolher a leitura correta para cada aula.",
      ),
      s(
        "discussion",
        "Autoridade e pertinência",
        [],
        "Uma fonte importante em uma tradição não responde automaticamente a toda pergunta. Um catecismo é apropriado para conhecer uma formulação confessional; um léxico descreve usos de palavras; uma edição de um documento antigo permite examinar o testemunho primário. Usar cada obra na tarefa que ela pode cumprir é mais rigoroso que reunir uma lista de nomes prestigiosos.",
        "Fontes também podem discordar porque adotam recortes distintos. Um autor investiga a sintaxe de uma frase, enquanto outro relaciona vários livros dentro de uma teologia da criação. Antes de procurar contradição, devemos identificar o que cada um efetivamente afirma. Quando há desacordo real, ele pode ser reconstruído em termos de premissas, evidências e inferências.",
      ),
      s(
        "conclusion",
        "Uma nota que permite voltar à fonte",
        [],
        "Uma boa nota pessoal separa a observação, o que foi aprendido na fonte e a conclusão provisória. Ela mantém a referência à passagem e ao trecho consultado. Seu valor cresce quando pode ser revisitada: outra leitura pode corrigir a conclusão sem apagar o caminho percorrido. O caderno deste percurso foi pensado para conservar justamente essas relações.",
      ),
    ),
  ],
  activity: {
    prompt:
      "Formule uma pergunta delimitada sobre Gênesis 1:1–5. Registre uma observação verificável no texto e explique qual tipo de fonte seria necessário para aprofundá-la. Diferencie sua interpretação daquilo que foi diretamente observado.",
    criteria,
  },
  connections: [
    {
      label: "Exegese e hermenêutica",
      entityId: "method:historical-grammatical",
      explanation:
        "A pergunta sobre uma passagem e a reflexão sobre os critérios de interpretação são relacionadas, mas não equivalentes.",
    },
  ],
  videos: [],
};

export const GENESIS_TEXT: CourseModule = {
  id: "texto",
  title: "Ler a composição",
  description: "Acompanhar o argumento e a organização de Gênesis 1:1–2:3.",
  objectives: [
    "Descrever as principais repetições e contrastes.",
    "Explicar por que a unidade inclui Gênesis 2:1–3.",
    "Relacionar a organização do relato às interpretações propostas.",
  ],
  domains: ["exegesis", "hermeneutics"],
  passages: [
    r(
      "genesis-days",
      "Gênesis 1:1–31",
      "genesis",
      1,
      1,
      31,
      "Ler a sequência completa antes de selecionar um detalhe.",
    ),
    r(
      "genesis-finish",
      "Gênesis 2:1–3",
      "genesis",
      2,
      1,
      3,
      "Examinar o encerramento e a mudança de ritmo do sétimo dia.",
    ),
  ],
  lessons: [
    l(
      "composicao",
      "Uma narrativa organizada por fala e distinções",
      s(
        "introduction",
        "A unidade é maior que um número de capítulo",
        [],
        "A numeração de capítulos facilita a navegação, mas não constitui um argumento sobre os limites de uma unidade. O relato dos seis dias não termina simplesmente quando surge o número 2. A conclusão sobre a realização da obra, o sétimo dia e sua bênção pertence à leitura da sequência. Delimitar a passagem significa acompanhar esse movimento, em vez de usar uma fronteira editorial como se fosse parte da composição original.",
      ),
      s(
        "concept",
        "Repetição como organização",
        [],
        "A fala divina introduz acontecimentos; expressões sobre realização, avaliação e sucessão de dias retomam o que ocorreu. A repetição oferece ritmo e permite comparar cenas. Quando o padrão muda, essa mudança chama atenção: nem todo dia possui exatamente o mesmo número de falas, ações ou avaliações. Ler a composição exige reconhecer o padrão e suas variações.",
        "Separar luz e trevas, águas e águas, terra e mares participa da construção de um mundo distinguível e habitável. A nomeação torna essas distinções reconhecíveis dentro da narrativa. Descrever esse funcionamento não depende de decidir previamente se o texto deve ser relacionado a um modelo científico. Primeiro, acompanha-se o que o relato faz com sua própria linguagem.",
      ),
      s(
        "example",
        "Relacionar os dias sem forçar um esquema",
        [],
        "Uma observação frequente relaciona a apresentação de domínios nos primeiros dias e a presença de habitantes ou luminares nos seguintes. A associação entre luz e luminares, águas e criaturas aquáticas, terra e seres terrestres ajuda a perceber relações. Mas um esquema útil não deve apagar os detalhes que não se ajustam perfeitamente a ele.",
        "O quarto dia, por exemplo, atribui funções aos luminares: sinais, tempos, dias e anos. A ênfase funcional pertence à passagem e precisa ser considerada junto da sequência. Um leitor pode investigar por que o narrador descreve essas funções antes de decidir o que elas permitem concluir sobre outros textos ou sobre os conhecimentos de seu tempo.",
      ),
      s(
        "discussion",
        "O que uma organização literária demonstra?",
        [],
        "Reconhecer organização literária não prova que o autor tenha desejado excluir qualquer referência a acontecimentos. Textos podem narrar acontecimentos por meio de formas cuidadosamente elaboradas. Inversamente, afirmar uma relação com acontecimentos não resolve o funcionamento de metáforas, repetições ou sequências. Forma e referência precisam ser discutidas, sem transformar uma delas em resposta automática à outra.",
      ),
      s(
        "conclusion",
        "Do detalhe à composição",
        [],
        "O argumento de uma interpretação deve explicar como uma expressão funciona no conjunto. Um detalhe importante não autoriza ignorar o restante do relato. Ao terminar esta aula, você já dispõe de uma descrição inicial da progressão: distinções, funções, vida, humanidade e o encerramento da obra. Essa descrição será o controle para as discussões de palavras e contexto.",
      ),
    ),
    l(
      "humanidade",
      "Humanidade, bênção e descanso",
      s(
        "introduction",
        "O lugar da humanidade no relato",
        [],
        "A apresentação dos seres humanos ocorre depois de uma sequência sobre ambientes e criaturas. Ela utiliza linguagem de imagem, semelhança, bênção e responsabilidade. A investigação não deve isolar uma dessas palavras como se o restante fosse um cenário dispensável. A relação entre humanidade e criação faz parte da forma como o relato apresenta a condição humana.",
      ),
      s(
        "concept",
        "Imagem e responsabilidade",
        [],
        "Gênesis 1:26–28 relaciona a humanidade à imagem de Deus e a uma tarefa no mundo. A expressão reúne problemas de identidade e função. Intérpretes discutem se sua ênfase deve ser descrita em termos de representação, capacidade, relação ou uma combinação desses aspectos. O texto oferece elementos para o debate, mas não apresenta uma lista filosófica de atributos humanos.",
        "A formulação que menciona homem e mulher impede restringir a condição de imagem a uma única figura masculina. O texto também não utiliza a linguagem de imagem apenas para uma elite política. Uma comparação com outras práticas de representação no mundo antigo pode ser esclarecedora, desde que a evidência externa seja identificada e sua diferença em relação à passagem seja mantida.",
      ),
      s(
        "example",
        "Uma tarefa e seus limites interpretativos",
        [],
        "Os verbos associados ao domínio humano podem ser lidos como legitimação de exploração ilimitada ou como responsabilidade derivada de Deus. Nenhuma dessas aplicações deve ser atribuída ao texto sem mostrar o percurso do argumento. A bênção dos seres vivos, a provisão de alimento e a avaliação da criação compõem o contexto em que a tarefa humana aparece.",
        "Ao comparar Gênesis 1 com o Salmo 8, o leitor encontra outra apresentação da relação entre dignidade humana e o mundo. O paralelo pode iluminar uma discussão canônica. Ele não apaga o gênero poético do salmo nem torna suas frases equivalentes a uma tradução de Gênesis. Conexão não significa identidade textual.",
      ),
      s(
        "discussion",
        "O sétimo dia como encerramento",
        [],
        "Gênesis 2:1–3 apresenta conclusão, descanso, bênção e santificação. Descansar, nesse contexto, não precisa ser entendido como recuperação de uma exaustão física. A ação é relacionada à obra concluída. Textos posteriores retomam essa sequência em discussões sobre o sábado, e sua interpretação precisa distinguir a narrativa inicial de cada retomada.",
        "O sétimo dia recebe um tratamento diferente do padrão anterior. Essa diferença permite investigar sua função como culminação. Fazer disso uma teoria completa de tempo, culto ou templo exige argumentos adicionais. É possível reconhecer a relevância do descanso sem atribuir ao relato toda elaboração posterior que utiliza sua linguagem.",
      ),
      s(
        "conclusion",
        "Uma primeira síntese do texto",
        [],
        "A unidade combina ordem, vida, responsabilidade humana e conclusão da obra. Uma síntese fundamentada menciona essa articulação e mostra quais expressões a sustentam. Ela não depende de resolver imediatamente todos os debates sobre cronologia ou gênero. O próximo módulo aprofunda a linguagem da abertura, mantendo essa composição maior como horizonte.",
      ),
    ),
  ],
  activity: {
    prompt:
      "Descreva três relações ou repetições de Gênesis 1:1–2:3 e explique o efeito de uma delas. Inclua uma observação sobre a humanidade ou o sétimo dia. Mostre também um limite do esquema que você propôs.",
    criteria,
  },
  connections: [
    {
      label: "Salmo 8:3–8",
      ref: { bookId: "psalms", chapter: 8, verseStart: 3, verseEnd: 8 },
      explanation: "Outro gênero literário para comparar humanidade, dignidade e responsabilidade.",
    },
    {
      label: "Antropologia teológica",
      entityId: "topic:anthropology",
      explanation:
        "A discussão sobre imagem e responsabilidade alimenta perguntas sobre a condição humana.",
    },
  ],
  videos: [
    {
      title: "Genesis 1 — Visual Commentary",
      author: "BibleProject",
      url: "https://bibleproject.com/videos/genesis-1/",
      perspective:
        "Exposição cristã com ênfase literária; conteúdo em inglês, legendas conforme o provedor.",
      purpose:
        "Comparar uma apresentação visual da composição com as observações registradas na aula.",
    },
  ],
};
