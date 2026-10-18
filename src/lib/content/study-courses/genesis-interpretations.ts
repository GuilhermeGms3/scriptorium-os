import type { CourseModule } from "../../domain/study-course";
import { section as s, lesson as l, reading as r, criteria } from "./helpers";

export const GENESIS_INTERPRETATIONS: CourseModule = {
  id: "interpretacoes",
  title: "Comparar interpretações",
  description:
    "Reconstruir argumentos, reconhecer perspectivas e distinguir exegese de formulação doutrinária.",
  objectives: [
    "Apresentar duas interpretações sem caricatura.",
    "Distinguir análise de uma passagem e síntese confessional.",
    "Explicar uma conexão canônica sem apagar a diferença entre textos.",
  ],
  domains: ["theology", "tradition", "reception-history", "exegesis"],
  passages: [
    r(
      "genesis-comparison",
      "Gênesis 1:1–5",
      "genesis",
      1,
      1,
      5,
      "Retomar a passagem depois do estudo de linguagem e contexto.",
    ),
    r(
      "john-prologue",
      "João 1:1–5",
      "john",
      1,
      1,
      5,
      "Examinar a retomada da linguagem de início, criação, vida e luz em outro contexto literário.",
    ),
  ],
  lessons: [
    l(
      "perspectivas",
      "Da passagem à tradição de leitura",
      s(
        "introduction",
        "Por que leituras diferentes precisam ser identificadas?",
        [],
        "Gênesis 1 participa de tradições judaicas e cristãs e de debates acadêmicos que não partem de uma adesão religiosa. Mesmo dentro de uma tradição há diferenças de época, gênero e finalidade. Um comentário medieval, uma confissão do século XVII e um comentário gramatical recente não são três respostas intercambiáveis à mesma pergunta. A comparação começa identificando o que cada documento procura fazer.",
      ),
      s(
        "concept",
        "Quatro operações na história da interpretação",
        [],
        "Uma explicação pode investigar o sentido de uma expressão na frase; relacionar a passagem a outros textos; organizar uma doutrina; ou aplicar uma leitura à vida de uma comunidade. Essas operações podem aparecer no mesmo livro. O trabalho acadêmico distingue suas passagens e pergunta que argumento permite ir de uma para outra.",
        "Recepção é a história das leituras, usos e reelaborações de um texto. Um autor antigo oferece evidência importante de como a passagem foi compreendida em seu contexto. Sua antiguidade não elimina a necessidade de avaliar o argumento nem prova que sua terminologia pertença ao autor bíblico. Uma leitura pode ser decisiva para uma tradição e continuar sendo uma etapa de recepção.",
      ),
      s(
        "example",
        "Autores situados e questões distintas",
        ["rashi", "augustine"],
        "Rashi, ao comentar a abertura de Gênesis, relaciona a leitura da passagem às perguntas da tradição judaica em que escreve. Seu comentário reúne atenção à expressão e modos de interpretação transmitidos. Ele deve ser estudado como um autor e um documento determinados; não como uma reprodução automática de todas as interpretações judaicas.",
        "No livro XI das Confissões, Agostinho examina criação, eternidade e tempo. A pergunta sobre o que significaria um “antes” da criação se articula à sua reflexão sobre a própria condição temporal. A contribuição desse texto não se reduz a uma definição de Bereshit. Trata-se de um desenvolvimento filosófico e teológico que precisa conservar seu contexto argumentativo.",
      ),
      s(
        "discussion",
        "Uma doutrina pode ser mais ampla que um versículo",
        ["catechism", "westminster"],
        "O Catecismo da Igreja Católica e a Confissão de Westminster apresentam a criação dentro de sistemas confessionais. Eles afirmam a relação entre Deus e tudo o que existe e integram a passagem a outras referências. Esse tipo de elaboração deve ser distinguido de uma demonstração restrita à sintaxe de Gênesis 1:1. Conhecer a formulação é uma tarefa; reconstruir todas as razões de sua defesa é outra.",
        "Quando dois documentos compartilham uma afirmação, isso não torna suas tradições idênticas. Quando diferem, é preciso verificar a questão exata e o gênero de cada texto. A comparação melhora quando conserva as palavras técnicas, identifica o contexto e explica as consequências de cada argumento. Rótulos confessionais ajudam a situar, mas não dispensam a leitura do documento.",
      ),
      s(
        "conclusion",
        "Comparar é representar antes de avaliar",
        [],
        "Uma boa comparação permite que o leitor reconheça a posição do autor mesmo quando discorda dela. A avaliação vem acompanhada das razões dessa representação. Sua atividade deve distinguir convergências, diferenças reais e questões que os documentos não pretendem resolver. O sistema registra sua investigação sem eleger uma confissão como resposta correta.",
      ),
    ),
    l(
      "intertextualidade",
      "Gênesis e João: conexão sem equivalência",
      s(
        "introduction",
        "Uma abertura que conversa com outra",
        [],
        "O prólogo de João utiliza linguagem de princípio, criação, vida e luz. Isso torna a aproximação com Gênesis uma investigação relevante. O leitor não precisa escolher entre negar qualquer conexão e transformar o prólogo em uma simples tradução de Gênesis. O problema é explicar quais relações o texto posterior constrói e que diferenças de contexto permanecem.",
      ),
      s(
        "concept",
        "Alusão, retomada e interpretação canônica",
        [],
        "Uma alusão depende de indícios textuais e de uma relação argumentada entre obras. Uma retomada pode selecionar, ampliar ou reorganizar aspectos de uma passagem anterior. Leitura canônica é a interpretação de textos em relação dentro de uma coleção recebida. Essas categorias não autorizam atribuir ao texto anterior toda a terminologia desenvolvida no posterior.",
        "A comparação deve começar por ocorrências verificáveis: expressões de abertura, atribuição de ação criadora, presença de luz e vida e sua função em cada sequência. Em João, esses termos participam de uma apresentação do Logos e de sua relação com Deus e com a condição humana. Em Gênesis, participam da narrativa de criação e de suas distinções. A conexão se torna mais interessante quando a diferença é preservada.",
      ),
      s(
        "example",
        "Uma ligação com papel declarado",
        [],
        "Uma nota do seu caderno pode ligar Gênesis 1:1–5 a João 1:1–5 e declarar o papel da conexão: “comparação literária da linguagem de início e luz”. Outra nota pode investigar uma interpretação trinitária dessa relação. A segunda depende de um argumento teológico adicional; não é a mesma afirmação que a primeira.",
        "No acervo privado, um comentário pode citar várias passagens em uma única unidade. O destino principal, as menções secundárias e as comparações precisam manter seus papéis. Isso evita publicar a mesma nota como se seu autor tivesse escrito um comentário exegético independente para cada referência mencionada.",
      ),
      s(
        "discussion",
        "O que uma conexão permite concluir?",
        [],
        "Conectar textos organiza uma investigação; não garante sua conclusão. Uma mesma aproximação pode ser utilizada por argumentos diferentes. O caderno e o Rastro devem conservar a explicação do vínculo, a fonte e o estado de revisão. Assim, uma síntese pessoal continua distinguível de uma relação registrada em um comentário ou de uma associação proposta pelo pipeline.",
        "A discussão também pode ficar aberta. Você pode considerar a retomada literária forte e discordar de uma aplicação doutrinária particular. Registrar essa distinção é um resultado intelectual útil. Ele permite revisar uma parte da investigação sem apagar todas as observações que a sustentaram.",
      ),
      s(
        "conclusion",
        "Uma rede com razões",
        [],
        "O objetivo das conexões é tornar navegável o caminho de uma pergunta entre textos e fontes. Cada relação deve poder responder “por que estes materiais estão juntos?”. Uma rede pequena e explicada é mais útil para o estudo que muitas ligações cuja origem e função não podem ser reconstruídas.",
      ),
    ),
  ],
  activity: {
    prompt:
      "Compare duas fontes identificadas sobre Gênesis 1. Apresente a questão de cada uma, uma convergência e uma diferença. Explique se a diferença é gramatical, literária, histórica ou teológica. Inclua uma conexão bíblica e declare seu papel no argumento.",
    criteria,
  },
  connections: [
    {
      label: "História da recepção",
      entityId: "method:reception-history",
      explanation:
        "A leitura de um autor é evidência da recepção da passagem em um contexto determinado.",
    },
    {
      label: "João 1:1–5",
      ref: { bookId: "john", chapter: 1, verseStart: 1, verseEnd: 5 },
      explanation:
        "Comparação literária e canônica; a retomada não transforma as obras em textos equivalentes.",
    },
    {
      label: "Teologia própria",
      entityId: "topic:theology-proper",
      explanation:
        "Doutrina da criação e análise de uma oração participam de níveis diferentes da investigação.",
    },
  ],
  videos: [],
};

export const GENESIS_SYNTHESIS: CourseModule = {
  id: "sintese",
  title: "Construir e revisar a síntese",
  description:
    "Produzir uma investigação pessoal com tese, evidências, alternativas e bibliografia.",
  objectives: [
    "Organizar uma conclusão sustentada por fontes.",
    "Reconhecer o que permanece incerto.",
    "Conectar o trabalho final às notas e às leituras utilizadas.",
  ],
  domains: ["exegesis", "hermeneutics", "theology"],
  passages: [
    r(
      "genesis-final",
      "Gênesis 1:1–31",
      "genesis",
      1,
      1,
      31,
      "Conferir a conclusão no conjunto da passagem, sem escolher somente frases favoráveis.",
    ),
    r(
      "genesis-final-rest",
      "Gênesis 2:1–3",
      "genesis",
      2,
      1,
      3,
      "Incluir o encerramento na síntese final da unidade.",
    ),
  ],
  lessons: [
    l(
      "argumento",
      "Da coleção de notas a um argumento",
      s(
        "introduction",
        "A síntese assume uma responsabilidade",
        [],
        "Uma pesquisa não termina quando há muitas notas. Notas preservam observações e referências; uma síntese escolhe uma pergunta, organiza evidências e assume uma conclusão proporcional ao que foi demonstrado. O resultado pode continuar provisório. O rigor não depende de eliminar toda incerteza, mas de distinguir aquilo que a pesquisa sustenta daquilo que ainda exige investigação.",
      ),
      s(
        "concept",
        "Tese, razões, evidências e objeção",
        [],
        "A tese responde à pergunta delimitada. As razões explicam por que ela deve ser considerada. As evidências são passagens, documentos e dados identificáveis. Uma objeção apresenta uma dificuldade real para o argumento, em vez de uma posição fraca escolhida apenas para ser refutada. A resposta à objeção pode fortalecer a tese, restringi-la ou mostrar que outra conclusão é necessária.",
        "A estrutura da redação deve acompanhar esse percurso. A introdução apresenta o problema e o recorte; o desenvolvimento expõe os dados e compara explicações; a conclusão responde à pergunta e registra limites. Não é necessário repetir toda a história da teologia numa investigação sobre uma construção de Gênesis. A profundidade vem do tratamento da questão escolhida.",
      ),
      s(
        "example",
        "Um modelo de encadeamento",
        [],
        "Uma síntese sobre a organização do relato poderia propor que fala, distinção e avaliação articulam a apresentação de um mundo ordenado. Ela precisaria mostrar ocorrências e variações desses elementos, explicar sua relação com o encerramento da unidade e enfrentar um caso que não se encaixe perfeitamente no esquema. O modelo deixa de ser apenas uma impressão quando essa cadeia de razões se torna visível.",
        "Se a síntese acrescentar uma conclusão sobre criação e tempo, deverá identificar a passagem entre descrição literária e reflexão teológica. Uma fonte como Agostinho pode participar dessa reflexão com seu localizador. Ela não deve ser apresentada como se uma discussão filosófica posterior fosse uma glosa lexical incorporada à primeira palavra hebraica.",
      ),
      s(
        "discussion",
        "Revisão e desacordo responsável",
        [],
        "Revisar inclui conferir se a conclusão é mais forte que as razões, se as citações correspondem às fontes e se uma alternativa foi descrita corretamente. Também inclui retirar materiais interessantes que não cumprem função no argumento. Uma redação mais longa pode continuar superficial quando acumula assuntos sem explicitar sua relação com a pergunta.",
        "Uma leitura futura pode alterar sua posição. O caderno deve permitir registrar essa mudança e manter as fontes anteriores. Concluir este percurso indica que você realizou suas atividades e conferiu seus próprios critérios. Não atribui um título acadêmico, não certifica a verdade de uma interpretação e não substitui a leitura crítica de outra pessoa.",
      ),
      s(
        "conclusion",
        "O resultado do percurso",
        [],
        "Você percorreu delimitação, composição, linguagem, contexto, comparação e síntese. O trabalho final deve mostrar como essas dimensões se relacionam numa pergunta concreta. Ele não precisa utilizar todas com a mesma intensidade: precisa justificar as escolhas, conservar as fontes e reconhecer os limites. Esse procedimento poderá ser aplicado a novos temas sem reduzir cada estudo à mesma lista genérica de perguntas.",
      ),
    ),
    l(
      "revisao-final",
      "Conferir fontes e preparar a próxima investigação",
      s(
        "introduction",
        "Uma conclusão que possa ser reaberta",
        [],
        "A última leitura do trabalho não é apenas uma correção de estilo. É uma conferência de responsabilidade intelectual. Para cada afirmação relevante, o leitor precisa reconhecer se ela descreve a passagem, apresenta uma posição de um autor ou formula sua própria interpretação. Quanto mais clara essa distinção, mais fácil será discutir e aperfeiçoar o resultado.",
      ),
      s(
        "concept",
        "Referência completa e vínculo navegável",
        [],
        "Uma referência útil permite reencontrar a obra e o trecho. O título deve corresponder à edição usada; a página física do PDF pode diferir da paginação impressa e essa diferença deve ser reconhecida. Unidades que atravessam páginas precisam conservar seus spans, em vez de apresentar uma única página como se contivesse todo o argumento.",
        "O vínculo navegável acrescenta praticidade à referência: abre a passagem bíblica ou a unidade do livro e permite conferir o contexto. Ele não substitui a identificação bibliográfica. Um endereço eletrônico pode mudar, e um código interno só faz sentido dentro do sistema. O ideal é combinar identidade, localizador e acesso ao material disponível.",
      ),
      s(
        "example",
        "Uma conclusão e uma questão aberta",
        [],
        "Você pode concluir que uma interpretação explica bem o ritmo da narrativa e deixar aberta uma questão sobre sua relação com outra tradição antiga. Registrar essa questão com a evidência que falta é mais produtivo que preencher a lacuna com uma relação inventada. O próximo estudo começa com um problema real, e não com a obrigação de parecer completo em todos os campos.",
      ),
      s(
        "discussion",
        "A biblioteca continua sendo um espaço de pesquisa",
        [],
        "O percurso oferece uma sequência orientada, mas suas fontes continuam disponíveis para consulta e comparação. A liberação de módulos organiza a experiência de aprendizagem; ela não transforma os livros em material inacessível fora do curso. O conhecimento pessoal cresce quando a pesquisa dirigida e a investigação livre conseguem conversar.",
        "A atividade final pode ser guardada no caderno com vínculos para o curso, o módulo e as passagens. A partir dela, outras notas podem desenvolver objeções, comparar autores ou preparar um novo percurso. As ligações pessoais não se confundem com o grafo acadêmico nem com as relações publicadas pelo pipeline.",
      ),
      s(
        "conclusion",
        "Encerramento com continuidade",
        [],
        "Uma formação consistente combina objetivos definidos e abertura à revisão. Ao finalizar este primeiro percurso, o resultado esperado é um trabalho que possa ser lido, discutido e retomado com suas fontes. Esse é o ponto de partida para aprofundar outros assuntos preservando método, conteúdo e identidade visual do Scriptorium.",
      ),
    ),
  ],
  activity: {
    prompt:
      "Escreva a síntese final de sua investigação sobre Gênesis 1:1–2:3. Inclua pergunta, tese, observações textuais, duas fontes identificadas, uma alternativa relevante, sua conclusão e uma questão que permaneceu aberta. Guarde o trabalho no caderno para poder revisá-lo.",
    criteria,
  },
  connections: [
    {
      label: "Retomar a investigação",
      explanation:
        "A síntese final liga as atividades realizadas, as fontes consultadas e as questões ainda abertas.",
    },
  ],
  videos: [],
};
