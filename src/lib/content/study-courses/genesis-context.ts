import type { CourseModule } from "../../domain/study-course";
import { section as s, lesson as l, reading as r, criteria } from "./helpers";

export const GENESIS_CONTEXT: CourseModule = {
  id: "contexto",
  title: "História, cultura e evidência",
  description:
    "Relacionar a passagem ao mundo antigo sem transformar aproximações em provas automáticas.",
  objectives: [
    "Distinguir artefato, documento antigo e reconstrução histórica.",
    "Avaliar uma comparação cultural por seus limites.",
    "Separar cosmologia antiga e perguntas contemporâneas.",
  ],
  domains: ["historical-context", "archaeology", "geography", "religious-currents"],
  passages: [
    r(
      "genesis-context",
      "Gênesis 1:6–19",
      "genesis",
      1,
      6,
      19,
      "Examinar as imagens de águas, espaços e luminares antes de buscar comparações culturais.",
    ),
    r(
      "genesis-human-context",
      "Gênesis 1:26–28",
      "genesis",
      1,
      26,
      28,
      "Retomar a apresentação da humanidade no conjunto da criação.",
    ),
  ],
  lessons: [
    l(
      "evidencia-material",
      "O que uma descoberta pode demonstrar",
      s(
        "introduction",
        "A diferença entre o objeto e a explicação",
        ["museum"],
        "Um tablete inscrito é um testemunho material. Sua inscrição preserva um texto; o local de descoberta, o suporte e a escrita participam de sua contextualização. Um catálogo de museu descreve e classifica o objeto. Uma tradução estabelece uma leitura da inscrição. Um estudo histórico propõe relações entre esse testemunho e outros materiais. Esses níveis se apoiam, mas não são equivalentes.",
      ),
      s(
        "concept",
        "Datação, proveniência e comparação",
        [],
        "A data de uma cópia de um texto antigo não é necessariamente a data de composição da obra copiada. A proveniência arqueológica pode oferecer informações sobre circulação e uso, mas seu alcance depende das condições da descoberta e do registro. Objetos sem contexto conhecido apresentam limitações que não desaparecem porque uma interpretação parece interessante.",
        "Uma comparação entre uma passagem bíblica e um documento mesopotâmico precisa indicar qual testemunho está sendo comparado, qual tradução foi consultada e qual aspecto aproxima os textos. Tema comum, estrutura semelhante e dependência literária são afirmações de força diferente. Uma semelhança temática não estabelece, sozinha, uma relação direta entre autores.",
      ),
      s(
        "example",
        "Um registro material sobre uma tradição de criação",
        ["museum"],
        "O catálogo do British Museum identifica um tablete com material de Enūma Eliš II e uma oração a Marduk. Esse registro permite localizar um testemunho concreto de tradições mesopotâmicas. Ele não funciona como uma confirmação arqueológica de cada frase de Gênesis, nem basta para demonstrar que o autor bíblico copiou aquele exemplar.",
        "Para avançar, seria necessário consultar a edição do texto, compreender o conjunto narrativo e delimitar a comparação. Perguntas possíveis incluem o papel de divindades, humanidade, conflito e organização do mundo. Cada aproximação deve conservar diferenças. A explicação histórica perde precisão quando descreve todo documento antigo sobre origens como uma versão da mesma história.",
      ),
      s(
        "discussion",
        "Arqueologia não é um selo automático de verdade",
        [],
        "Uma fonte material pode sustentar a existência de uma prática, de uma inscrição ou de um ambiente cultural. A passagem desse dado para uma interpretação teológica exige outro argumento. O inverso também vale: a ausência de um objeto não demonstra automaticamente que uma prática jamais existiu. A qualidade da inferência depende da evidência que seria razoável esperar e das condições de preservação.",
        "O Rastro deve tornar essa cadeia visível. Uma afirmação sobre um artefato aponta para seu registro; uma reconstrução histórica aponta para o estudo que a defende; uma conexão com a passagem explica seu motivo. Quando a evidência não existe no acervo, a lacuna deve permanecer identificada. Preencher uma categoria com uma associação especulativa produziria aparência de profundidade sem sustentação.",
      ),
      s(
        "conclusion",
        "Uma comparação que pode ser conferida",
        [],
        "O produto desta aula é uma comparação delimitada: objeto ou documento, aspecto comparado, semelhança, diferença e limite. Essa estrutura permite discutir contexto cultural sem transformar a aula numa lista de curiosidades. Ela também prepara o uso crítico de mapas, cronologias e imagens que poderão ser acrescentados quando houver fontes identificadas.",
      ),
    ),
    l(
      "cosmologia",
      "Ler imagens antigas e formular perguntas atuais",
      s(
        "introduction",
        "O horizonte das imagens do relato",
        [],
        "Gênesis apresenta águas, terra, céu, luminares e seres vivos em uma sequência organizada. Essas imagens pertencem à experiência e à linguagem de seus leitores antigos. Uma investigação histórica procura compreender esse horizonte. Traduzir cada imagem diretamente para uma categoria da física contemporânea pode produzir correspondências atraentes, mas precisa justificar o caminho entre vocabulários e problemas muito diferentes.",
      ),
      s(
        "concept",
        "Descrição, função e interpretação",
        [],
        "O texto atribui funções aos luminares e distingue ambientes de vida. A descrição dessas funções não é equivalente a uma teoria científica moderna sobre a formação do sistema solar. Também não impede que leitores religiosos relacionem o texto à criação do mundo real. A questão acadêmica é identificar o tipo de afirmação que está sendo feito e a evidência usada para sustentá-lo.",
        "A palavra cosmologia pode designar maneiras de compreender a organização do mundo. Em um texto antigo, ela envolve imagens, práticas e relações religiosas. É preciso evitar tanto tratar o autor como um cientista contemporâneo disfarçado quanto imaginar que uma descrição antiga não possa ter elaboração intelectual. A diferença histórica exige interpretação, não desprezo.",
      ),
      s(
        "example",
        "Tempo, calendário e vida social",
        [],
        "A referência a sinais, tempos, dias e anos em Gênesis 1:14 abre uma investigação sobre a relação entre observação do céu e organização da vida. O texto permite reconhecer essa ligação funcional. Para descrever um calendário específico ou reconstruir um ritual determinado, seriam necessários outros testemunhos. Uma expressão geral não identifica automaticamente todas as práticas de uma comunidade.",
        "A repetição dos dias e a apresentação do sétimo permitem outra pergunta: como a narrativa relaciona trabalho, conclusão e tempo distinto? Textos posteriores sobre o sábado oferecem material para uma leitura canônica. A reconstrução da história de práticas sabáticas exige, adicionalmente, considerar datação, gênero e relação entre os documentos. A conexão entre passagens não resolve sozinha a história social.",
      ),
      s(
        "discussion",
        "Ciência, exegese e teologia em diálogo",
        [],
        "Uma questão científica investiga processos e relações por métodos próprios. Uma questão exegética pergunta como uma passagem comunica em sua forma e contexto. Uma questão teológica pode discutir a dependência do mundo em relação a Deus. Esses trabalhos podem entrar em diálogo, mas não são intercambiáveis. Uma conclusão sobre a sintaxe de Gênesis não substitui uma investigação empírica, e uma medida física não explica automaticamente a função de um gênero literário.",
        "Interpretações contemporâneas variam também na maneira de organizar esse diálogo. Uma exposição justa identifica seus critérios e evita apresentar um rótulo como se fosse um argumento. A aula não precisa declarar uma tradição vencedora para ensinar a reconstruir posições, avaliar razões e reconhecer questões ainda abertas.",
      ),
      s(
        "conclusion",
        "Contextualizar é precisar a pergunta",
        [],
        "O contexto histórico-cultural amplia a leitura quando esclarece possibilidades e limites. Ele não serve para substituir o texto por uma narrativa externa escolhida previamente. Ao concluir o módulo, você deve conseguir explicar que evidência sustentaria sua comparação e qual conclusão excederia o que essa evidência permite afirmar.",
      ),
    ),
  ],
  activity: {
    prompt:
      "Escolha uma imagem ou função descrita em Gênesis 1. Relacione-a a uma fonte histórica identificável, incluindo ao menos uma diferença e um limite da comparação. Se a fonte externa não estiver disponível, descreva precisamente a evidência que falta, sem inventá-la.",
    criteria,
  },
  connections: [
    {
      label: "Arqueologia e proveniência",
      explanation:
        "Objeto material, registro do catálogo, tradução e interpretação histórica devem conservar origens distintas.",
    },
    {
      label: "Gênesis 2:1–3",
      ref: { bookId: "genesis", chapter: 2, verseStart: 1, verseEnd: 3 },
      explanation:
        "O encerramento da obra permite investigar tempo e descanso sem deduzir uma cronologia histórica apenas da estrutura.",
    },
  ],
  videos: [
    {
      title: "Heaven and Earth — curso complementar",
      author: "BibleProject Classroom",
      url: "https://bibleproject.com/classroom/heaven-and-earth/",
      perspective:
        "Curso cristão com leitura literária e teológica; acesso e idioma conforme o provedor.",
      purpose:
        "Comparar a organização de um curso sobre contexto bíblico com as categorias de evidência discutidas aqui.",
    },
  ],
};
