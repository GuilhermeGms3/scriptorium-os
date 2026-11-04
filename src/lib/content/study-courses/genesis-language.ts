import type { CourseModule } from "../../domain/study-course";
import { section as s, lesson as l, reading as r, criteria } from "./helpers";

export const GENESIS_LANGUAGE: CourseModule = {
  id: "linguagem",
  title: "Bereshit e a linguagem",
  description: "Estudar uma palavra em sua frase: morfologia, usos e decisões de tradução.",
  objectives: [
    "Distinguir forma escrita, lema e raiz.",
    "Reconstruir duas possibilidades de análise da abertura.",
    "Avaliar o alcance de uma definição lexical.",
  ],
  domains: ["linguistics", "exegesis", "textual-criticism"],
  passages: [
    r(
      "genesis-syntax",
      "Gênesis 1:1–3",
      "genesis",
      1,
      1,
      3,
      "Examinar como a primeira expressão se relaciona com a sequência de orações.",
    ),
    r(
      "jeremiah-beginning",
      "Jeremias 26:1",
      "jeremiah",
      26,
      1,
      1,
      "Comparar uma expressão de início em um contexto de reinado; comparação de uso, não equivalência de interpretação.",
    ),
  ],
  lessons: [
    l(
      "palavra",
      "A palavra não carrega sozinha toda a interpretação",
      s(
        "introduction",
        "O que pesquisamos ao procurar Bereshit?",
        ["oshb"],
        "Bereshit é uma maneira de transliterar a expressão hebraica que abre Gênesis. A transliteração facilita a leitura em outro alfabeto; não é uma segunda palavra original nem uma tradução. Sistemas diferentes podem representar vogais e consoantes de modos distintos. Por isso, uma pesquisa precisa reconhecer variantes de escrita e conservar a forma hebraica como referência.",
        "Na análise habitual, a expressão reúne um prefixo preposicional e um substantivo relacionado a início ou primeira parte. Essa identificação é apenas o começo. Ainda precisamos investigar como a expressão participa da oração, que relação temporal constrói e qual leitura o contexto favorece. Uma análise morfológica pode ser correta e continuar insuficiente para decidir a interpretação da frase inteira.",
      ),
      s(
        "concept",
        "Forma, lema, raiz e sentido no contexto",
        ["oshb"],
        "Forma é a realização concreta da palavra numa passagem. Lema é uma identidade de consulta usada para reunir formas relacionadas em dicionários e índices. Raiz é uma categoria morfológica que pode relacionar palavras; não funciona como uma definição universal de todas elas. O sentido em contexto depende do uso na frase e de suas relações literárias.",
        "Um código de referência lexical, como os identificadores associados ao corpus OSHB, permite localizar uma análise ou um verbete. Ele não é o próprio significado. Quando um índice reúne várias ocorrências, sua contagem precisa indicar o corpus e a identidade consultada. Contar todas as palavras de uma raiz como se fossem ocorrências de um mesmo sentido produz uma generalização que a pesquisa ainda não demonstrou.",
      ),
      s(
        "example",
        "Comparar sem transferir todos os sentidos",
        [],
        "Uma expressão de início pode aparecer em uma referência a um reinado, como na abertura de Jeremias 26. Essa ocorrência ajuda a examinar construções e usos de linguagem temporal. Ela não prova que Gênesis esteja descrevendo um reinado nem que toda expressão com o mesmo substantivo tenha a mesma função sintática. O contexto da comparação precisa permanecer visível.",
        "A operação correta é perguntar o que a ocorrência comparável torna possível ou provável. Se duas passagens usam construções semelhantes, isso pode sustentar uma possibilidade gramatical. Para concluir que a mesma possibilidade é a melhor leitura de Gênesis, é preciso voltar à relação entre os versículos 1, 2 e 3. A concordância amplia a evidência; não substitui a exegese.",
      ),
      s(
        "discussion",
        "O risco da soma de definições",
        [],
        "Um verbete costuma reunir sentidos usados em passagens diferentes. Ler todos esses sentidos simultaneamente numa ocorrência cria uma sobrecarga semântica. A presença de uma palavra num texto também não incorpora automaticamente todos os debates teológicos de outras passagens em que ela aparece. A relação entre textos precisa ser argumentada.",
        "O mesmo cuidado vale para interpretações baseadas no desenho das letras. Uma tradição de leitura simbólica pode ser estudada como tradição, com autoria e contexto. Isso não autoriza apresentá-la como se fosse o significado lexical demonstrado do hebraico bíblico. A distinção não impede estudar a recepção; evita confundir seus critérios com os da análise linguística.",
      ),
      s(
        "conclusion",
        "O que o estudo lexical oferece",
        [],
        "Ao final de uma pesquisa de palavra, o resultado adequado inclui forma, identidade lexical, usos pertinentes e os limites da conclusão. Uma boa explicação mostra por que determinado sentido foi escolhido naquela passagem. No Rastro, essas camadas ficam relacionadas à ocorrência concreta, para que uma definição não apareça desligada da frase que estamos estudando.",
      ),
    ),
    l(
      "abertura",
      "A relação entre Gênesis 1:1, 1:2 e 1:3",
      s(
        "introduction",
        "Uma decisão de tradução é uma decisão de leitura",
        ["net"],
        "A tradução tradicional “no princípio” costuma apresentar o primeiro versículo como uma oração principal. Outras traduções representam a abertura como uma construção temporal dependente, frequentemente expressa por “quando”. O desacordo não se resolve pela aparência de uma palavra portuguesa. Ele envolve a maneira de analisar a expressão inicial e sua relação com as orações seguintes.",
      ),
      s(
        "concept",
        "Oração principal e enquadramento temporal",
        ["net"],
        "Na leitura como oração principal, a abertura pode ser entendida como um acontecimento inicial ou como uma apresentação resumida do que será narrado. Essas duas possibilidades não são idênticas, mesmo quando compartilham uma tradução semelhante. Na leitura como enquadramento temporal, o primeiro versículo se relaciona de outra maneira com o estado descrito no segundo e com a fala divina no terceiro.",
        "A análise envolve forma nominal, relação entre nomes e verbos e encadeamento narrativo. Uma tradução procura representar o resultado dessa análise para seu público. Consultar o original é importante, mas não cria uma leitura sem mediação: o leitor também utiliza uma gramática, um léxico, uma edição e critérios de interpretação. O argumento precisa tornar essas mediações examináveis.",
      ),
      s(
        "example",
        "Separar conclusão gramatical e conclusão teológica",
        [],
        "Suponha que uma análise conclua que a primeira frase introduz temporalmente a narrativa. Essa conclusão, por si só, não decide todas as perguntas sobre a origem da matéria. Uma doutrina da criação pode recorrer a outros textos e argumentos. Inversamente, afirmar uma doutrina não dispensa explicar a sintaxe de uma frase particular.",
        "A comparação útil coloca lado a lado a tradução proposta, a análise da construção e a consequência que o intérprete pretende extrair. Um desacordo pode estar no primeiro nível, no segundo ou no terceiro. Quando os níveis são misturados, um debate gramatical vira uma disputa sobre fidelidade religiosa, e uma convicção teológica parece ser demonstrada apenas por uma opção de tradução.",
      ),
      s(
        "discussion",
        "O que fazer quando especialistas discordam?",
        [],
        "Uma discordância não exige abandonar a investigação nem escolher um autor apenas por proximidade confessional. É possível reconstruir os argumentos: qual fenômeno cada análise explica melhor, quais paralelos utiliza e que dificuldades reconhece. Uma posição pode ser defendida como mais plausível sem que suas alternativas sejam caricaturadas.",
        "O nível de formação também importa. Quem ainda não lê hebraico pode comparar traduções e acompanhar uma explicação gramatical identificada, registrando a dependência de fontes secundárias. Isso é diferente de fingir uma análise independente. O rigor está na transparência das razões e das limitações, e não na quantidade de palavras técnicas empregadas.",
      ),
      s(
        "conclusion",
        "Uma conclusão proporcional à evidência",
        [],
        "A síntese desta aula deve indicar qual análise você considera melhor sustentada e por quê, além de uma dificuldade que permanece. O objetivo é compreender o problema e avaliar argumentos, não transformar uma interpretação em resposta automática do sistema. O percurso registra a atividade realizada; a avaliação acadêmica continua aberta à discussão das fontes.",
      ),
    ),
  ],
  activity: {
    prompt:
      "Escolha duas maneiras de traduzir a abertura de Gênesis 1. Explique qual decisão de leitura cada uma representa. Use uma observação linguística e uma referência identificada; distinga a conclusão gramatical de uma possível conclusão teológica.",
    criteria,
  },
  connections: [
    {
      label: "Bereshit em Gênesis 1:1",
      ref: { bookId: "genesis", chapter: 1, verseStart: 1, verseEnd: 1 },
      explanation:
        "A ocorrência concreta permite consultar forma, análise, concordância e fontes no Rastro.",
    },
    {
      label: "Crítica textual e análise linguística",
      entityId: "method:textual-criticism",
      explanation:
        "Estabelecer uma leitura textual e interpretar a sintaxe são tarefas distintas, embora relacionadas.",
    },
  ],
  videos: [],
};
