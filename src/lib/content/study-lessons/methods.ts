import type { TopicPrimer } from "./types";

const p = (references: string[], ...paragraphs: string[]): TopicPrimer => ({
  family: "reading",
  references,
  paragraphs,
});
export const METHOD_PRIMERS: Readonly<Record<string, TopicPrimer>> = {
  "method:textual-criticism": p(
    ["intf"],
    "Crítica textual é o estudo das formas transmitidas de um texto. Manuscritos, traduções antigas e citações podem preservar leituras diferentes. O trabalho compara essas testemunhas e procura explicar a história das variantes. Uma variante pode envolver grafia, ordem de palavras, omissão, acréscimo ou uma diferença de sentido.",
    "A quantidade de manuscritos não resolve o problema por simples votação: cópias podem depender de um mesmo ancestral. Também entram em análise idade, distribuição, relações de transmissão e explicações plausíveis para o surgimento de uma leitura. Texto crítico, tradução e manuscrito são objetos diferentes. Uma nota de aparato registra uma decisão e suas alternativas; não é uma prova automática de corrupção intencional.",
  ),
  "method:historical-critical": p(
    ["composition", "hermeneutics"],
    "Método histórico-crítico é uma designação ampla para abordagens que investigam os escritos em seus contextos históricos e em sua formação. Perguntas sobre autoria, destinatários, fontes, formas e redação participam desse campo. A palavra crítica indica exame e avaliação, não necessariamente hostilidade religiosa.",
    "O método procura distinguir aquilo que o texto afirma da reconstrução proposta pelo pesquisador. Uma hipótese de composição pode explicar repetições e tensões, mas precisa ser avaliada pelas evidências e por alternativas. Empregar esse tipo de análise não determina, sozinho, a adesão ou a ausência de fé do intérprete.",
  ),
  "method:historical-grammatical": p(
    ["hermeneutics", "dei-verbum"],
    "A abordagem histórico-gramatical procura compreender o texto por sua linguagem e por seu contexto de comunicação. Gramática inclui relações entre palavras e frases; história inclui a situação em que elas foram usadas. O objetivo não é substituir a interpretação por uma tradução palavra por palavra, mas explicar como o enunciado funciona no conjunto.",
    "O método precisa reconhecer gêneros, linguagem figurada e organização do argumento. O sentido literal de uma metáfora não é necessariamente uma descrição física: é aquilo que a expressão comunica como metáfora. Uma leitura que abandona o gênero para defender a literalidade pode deixar de respeitar a própria comunicação do texto.",
  ),
  "method:source-criticism": p(
    ["composition", "synoptic"],
    "Crítica das fontes investiga materiais anteriores que podem ter participado da composição de uma obra. Semelhanças verbais, sequências compartilhadas e diferenças de estilo podem fundamentar hipóteses de dependência. Nos evangelhos sinóticos, a relação entre Mateus, Marcos e Lucas é um caso importante desse tipo de problema.",
    "Uma fonte reconstruída não é o mesmo que um manuscrito preservado. A hipótese de Q, por exemplo, propõe um documento para explicar material compartilhado por Mateus e Lucas que não aparece em Marcos; não há um exemplar de Q disponível para conferência. Outras hipóteses explicam os dados sem esse documento. A avaliação compara poder explicativo e dificuldades, em vez de converter a reconstrução em um objeto já encontrado.",
  ),
  "method:form-criticism": p(
    ["composition", "hermeneutics"],
    "Crítica das formas examina unidades como parábolas, ditos, relatos de milagre, lamentos e confissões, perguntando por suas convenções e possíveis situações de uso. Ela observa que um texto pode conservar materiais que circularam antes de sua organização em uma obra maior.",
    "O reconhecimento de uma forma é uma observação literária; a reconstrução de sua situação de origem é uma hipótese histórica adicional. Uma narrativa parecida com outras não prova, sozinha, que todas surgiram no mesmo ambiente. A passagem entre forma e contexto precisa de razões, e não apenas de uma classificação.",
  ),
  "method:redaction-criticism": p(
    ["composition", "synoptic"],
    "Crítica da redação estuda como a organização e a reelaboração de materiais produzem as ênfases de uma obra. Quando há relações de dependência entre textos, escolhas de inclusão, omissão, ordem e formulação podem mostrar a atividade do redator.",
    "Uma diferença entre dois evangelhos não revela automaticamente a intenção psicológica do autor. A explicação depende também da hipótese adotada sobre suas fontes e de padrões observáveis no conjunto da obra. Por isso, conclusões redacionais precisam ser distinguidas dos dados de comparação que as sustentam.",
  ),
  "method:narrative-criticism": p(
    ["hermeneutics"],
    "Crítica narrativa analisa a maneira como uma história é contada: narrador, personagens, enredo, ponto de vista, tempo e informações oferecidas ao leitor. Uma personagem pode não saber algo que o narrador já revelou; essa diferença pode produzir ironia ou tensão.",
    "A abordagem se concentra na forma narrativa recebida, sem precisar começar pela reconstrução de fontes. Isso não implica negar a história: delimita outra pergunta. Em vez de perguntar primeiro como um episódio foi composto, ela investiga o papel que esse episódio desempenha na experiência de leitura da obra.",
  ),
  "method:canonical-criticism": p(
    ["dei-verbum", "hermeneutics"],
    "Crítica canônica considera o texto em sua forma recebida e em sua relação com uma coleção reconhecida como Escritura. A localização de um livro e as relações entre escritos participam da compreensão de seu uso comunitário.",
    "A abordagem não exige apagar diferenças entre autores. Ler dois textos em conjunto é uma operação interpretativa que precisa respeitar o argumento de cada um. Também importa reconhecer qual cânon está em questão: comunidades distintas podem receber conjuntos e ordenações diferentes.",
  ),
  "method:social-scientific": p(
    ["social"],
    "Crítica sócio-científica utiliza modelos das ciências sociais para analisar dimensões sociais e culturais dos textos. Parentesco, honra, patronagem, relações econômicas e pertencimento podem esclarecer práticas que um autor pressupõe sem explicar.",
    "Um modelo é uma ferramenta de comparação, não uma descrição infalível de todo o mundo antigo. Uma categoria formulada para uma sociedade não deve ser transferida automaticamente para outra. A utilidade do modelo depende de evidências locais e da capacidade de explicar diferenças, além de semelhanças.",
  ),
  "method:reception-history": p(
    ["hermeneutics", "fathers"],
    "História da recepção investiga como textos foram lidos, traduzidos, representados e usados em momentos posteriores. Um sermão, um comentário, uma pintura ou um debate podem documentar a atuação de uma passagem na vida de uma comunidade.",
    "O objeto não é apenas decidir se uma leitura posterior reproduz a intenção original. Uma interpretação pode ser historicamente importante por mostrar como um texto foi mobilizado para responder a um problema novo. Essa importância não a transforma automaticamente em prova do sentido que a primeira audiência lhe atribuiu.",
  ),
  "method:theological-interpretation": p(
    ["dei-verbum", "oca"],
    "Interpretação teológica lê os textos em relação a perguntas sobre Deus, fé e vida comunitária. Ela pode considerar cânon, tradição e práticas de leitura como parte de seu horizonte. Isso a distingue de uma análise que delimita apenas a reconstrução histórica de uma passagem.",
    "A abordagem não torna desnecessária a atenção à linguagem e ao contexto. Uma conclusão teológica precisa explicar como se relaciona com o texto e quais premissas adicionais utiliza. O reconhecimento dessas premissas permite distinguir uma exposição confessional de uma afirmação apresentada como consenso histórico.",
  ),
  "method:literary-criticism": p(
    ["hermeneutics", "composition"],
    "Crítica literária estuda composição, linguagem, gênero e efeitos de uma obra. Nos estudos bíblicos, o termo pode designar usos diferentes: em alguns contextos, investiga camadas de composição; em outros, concentra-se no funcionamento do texto como literatura.",
    "Paralelismo, repetição, contraste, metáfora e estrutura são recursos que produzem sentido. Identificar um padrão é o início da análise, não sua conclusão. É preciso explicar a função desse padrão no argumento ou na narrativa, em vez de apenas contar ocorrências e atribuir significado a qualquer repetição.",
  ),
  "stance:confessional": p(
    ["dei-verbum", "augsburg"],
    "Uma postura confessional assume compromissos de fé de maneira explícita. A interpretação pode tratar certos textos, credos ou tradições como normativos. Essa localização organiza perguntas e critérios, mas não elimina a possibilidade de argumentação histórica e exame crítico.",
    "A identificação de uma postura confessional não serve como rótulo para descartar uma explicação. Ela permite saber quais premissas são compartilhadas dentro de uma comunidade e quais exigem argumentação adicional em um diálogo mais amplo. Descrever uma posição e concordar com ela continuam sendo atividades distintas.",
  ),
  "stance:non-confessional": p(
    ["hermeneutics"],
    "Uma postura não confessional não exige adesão religiosa como condição para investigar textos e tradições. Ela pode descrever práticas, reconstruir debates e avaliar argumentos sem tomar uma confissão de fé como norma da pesquisa.",
    "Não confessional não significa ausência completa de pressupostos, nem é sinônimo automático de oposição à religião. O pesquisador ainda trabalha com critérios de evidência, teorias e escolhas de perguntas. A transparência desses critérios é mais esclarecedora que a simples afirmação de neutralidade.",
  ),
  "stance:methodological-naturalism": p(
    ["hermeneutics"],
    "Naturalismo metodológico é a delimitação de uma investigação a explicações formuladas em termos de processos e causas acessíveis ao método adotado. A expressão metodológico é decisiva: ela indica uma regra de trabalho e não, necessariamente, uma conclusão metafísica sobre tudo o que existe.",
    "Uma pesquisa histórica pode suspender a afirmação de uma causa sobrenatural por não dispor de um procedimento compartilhado para testá-la. Isso difere da afirmação filosófica de que nenhuma realidade sobrenatural existe. Confundir os dois níveis cria desacordos que não correspondem à pergunta efetivamente investigada.",
  ),
  "theory:two-source": p(
    ["synoptic"],
    "A hipótese das duas fontes procura explicar relações entre Mateus, Marcos e Lucas. Sua forma clássica combina a prioridade de Marcos com uma fonte hipotética de material compartilhado por Mateus e Lucas, chamada Q. Assim, Mateus e Lucas teriam utilizado Marcos e esse outro material sem depender diretamente um do outro.",
    "Q é uma reconstrução proposta para explicar os dados, não um manuscrito encontrado. A hipótese é discutida a partir de acordos verbais, ordem, diferenças de contexto e dificuldade de explicar determinados paralelos. Sua avaliação precisa ser comparativa: alternativas como Farrer organizam os mesmos dados de outra maneira.",
  ),
  "theory:farrer": p(
    ["synoptic"],
    "A hipótese de Farrer conserva a prioridade de Marcos, mas propõe que Lucas conheceu e utilizou também Mateus. Ela dispensa Q como documento separado: parte do material comum aos dois evangelhos é explicada por dependência direta.",
    "Seu ponto de disputa com a hipótese das duas fontes é a relação entre Mateus e Lucas, e não a existência de semelhanças entre eles. A questão envolve se as mudanças de ordem e contexto são plausíveis como escolhas de Lucas. A proposta tem defensores e objeções; o fato de usar menos fontes hipotéticas não resolve sozinho toda a comparação.",
  ),
  "theory:griesbach": p(
    ["synoptic"],
    "A hipótese de Griesbach, também relacionada à hipótese dos dois evangelhos, atribui prioridade a Mateus, coloca Lucas em dependência de Mateus e explica Marcos como posterior a ambos. Nesse modelo, Marcos teria combinado e condensado materiais dos dois escritos.",
    "Ela difere de Farrer e das duas fontes no papel atribuído a Marcos. Os debates examinam ordem, extensão e padrões de concordância. Um modelo de dependência é uma explicação histórica para relações literárias; não constitui uma avaliação de valor religioso ou de confiabilidade de um evangelho em comparação com outro.",
  ),
  "framework:covenant-theology": {
    family: "salvation",
    references: ["westminster", "dort"],
    paragraphs: [
      "Teologia da aliança é um quadro interpretativo que organiza a relação entre Deus e a humanidade por meio da linguagem de pacto ou aliança. Na tradição reformada, ele articula criação, promessa, Cristo e comunidade, procurando explicar continuidade e diferenças ao longo da história bíblica.",
      "É um sistema de relações entre temas, não apenas a observação de que a palavra aliança aparece na Bíblia. As formulações variam, inclusive na relação entre obras, graça, sinais e administração histórica. A hipótese de um quadro organizador precisa ser distinguida da exegese de cada passagem que ele procura integrar.",
    ],
  },
  "school:thomism": {
    family: "theology",
    references: ["summa"],
    paragraphs: [
      "Tomismo é uma tradição de pensamento ligada a Tomás de Aquino e à recepção de sua obra. Ela relaciona investigação filosófica e teológica, com atenção a conceitos como ato e potência, causalidade, natureza, finalidade e virtude. Não é simplesmente outro nome para toda a teologia católica.",
      "A Suma Teológica é organizada por questões e artigos que apresentam objeções, uma resposta e réplicas. Ler apenas uma objeção como se fosse a posição final de Tomás inverte o argumento. O desenvolvimento posterior do tomismo inclui debates internos; citar o nome da escola não substitui identificar a tese, a passagem e o contexto de um autor.",
    ],
  },
  "position:christus-victor": {
    family: "salvation",
    references: ["atonement", "oca"],
    paragraphs: [
      "Christus Victor, ou Cristo Vitorioso, destaca a obra de Cristo como vitória sobre poderes como pecado e morte. A imagem desloca o foco de uma transação isolada para uma libertação que envolve a humanidade e a criação.",
      "O modelo pode conviver com linguagem de sacrifício e reconciliação. Ele não se reduz necessariamente à ideia de um pagamento feito ao diabo. A análise de um autor precisa reconhecer a estrutura efetiva de seu argumento, em vez de atribuir uma teoria completa a qualquer ocorrência do vocabulário de vitória.",
    ],
  },
  "position:penal-substitution": {
    family: "salvation",
    references: ["dort", "westminster"],
    paragraphs: [
      "Substituição penal interpreta a obra de Cristo em relação a juízo, culpa e ação em favor de outros. O componente penal envolve a justiça e as consequências do pecado; o substitutivo trata da relação entre Cristo e aqueles em favor dos quais age.",
      "A formulação não pode ser identificada apenas pela presença da palavra sacrifício ou da ideia de representação. Ela depende de premissas sobre justiça divina, união com Cristo e perdão. Seus defensores e críticos discutem como essas relações devem ser entendidas, inclusive para evitar uma separação inadequada entre a ação do Pai e a do Filho.",
    ],
  },
  "position:moral-influence": {
    family: "salvation",
    references: ["atonement"],
    paragraphs: [
      "Influência moral é uma interpretação da expiação que destaca como a manifestação do amor de Deus em Cristo transforma a compreensão e a disposição humana. O efeito envolve conversão, confiança, amor e mudança de vida.",
      "O modelo pergunta como a obra de Cristo atua na relação do ser humano com Deus, e não apenas qual mudança ocorre em uma condição jurídica. Ele pode ser combinado com outras linguagens de salvação. Dizer que um autor enfatiza o exemplo de amor de Cristo não demonstra que ele negue todas as demais dimensões da expiação.",
    ],
  },
  "entity:concept:logos": p(
    ["fathers", "hermeneutics"],
    "Logos é um termo grego que pode participar de campos de sentido como palavra, discurso e razão. No prólogo de João, seu uso se relaciona à criação, à vida, à luz e à afirmação de que o Logos se fez carne. O contexto da passagem é decisivo: uma definição de dicionário ou uma associação filosófica isolada não esgota seu funcionamento.",
    "Leitores antigos como Orígenes desenvolveram interpretações teológicas desse vocabulário. Sua obra documenta a recepção do evangelho e permite acompanhar como linguagem bíblica e reflexão filosófica foram articuladas. Essa recepção não deve ser confundida automaticamente com uma explicação lexical única do texto de João.",
  ),
  "entity:concept:incarnation-language": p(
    ["fathers", "councils"],
    "A linguagem da encarnação no prólogo de João afirma a aproximação do Logos à condição humana. Carne tem função concreta na expressão: a presença divina é relacionada à existência humana, e não apenas a uma aparência externa.",
    "O vocabulário do prólogo e as definições cristológicas posteriores pertencem a momentos diferentes. Eles podem ser relacionados na história da interpretação, mas a passagem entre um e outro exige reconhecer mudanças de linguagem e de problema. Essa distinção torna visível o desenvolvimento da doutrina, sem atribuir toda sua terminologia técnica ao texto inicial.",
  ),
  "entity:concept:life-john": p(
    ["fathers"],
    "Vida, no prólogo de João, não funciona apenas como referência à existência biológica. O termo participa da relação entre criação, Logos e luz dos seres humanos. Ao longo do evangelho, a linguagem de vida também é associada à relação com Deus e com Cristo.",
    "O sentido deve ser acompanhado nas relações construídas pelo texto. Uma mesma palavra pode desenvolver ênfases diferentes em discursos e narrativas. A interpretação não precisa escolher entre um significado isolado e uma soma indiscriminada de todos os sentidos possíveis: ela explica quais relações estão ativas em cada passagem.",
  ),
  "entity:concept:light-john": p(
    ["fathers"],
    "Luz no prólogo de João é uma imagem relacionada à vida, à revelação e ao reconhecimento. O contraste com as trevas participa do modo como o texto apresenta a presença do Logos e sua recepção no mundo.",
    "Uma metáfora não perde seu significado por não ser uma descrição física. Ela organiza relações e produz um efeito de compreensão. A leitura precisa explicar essas relações no argumento da passagem, sem converter cada ocorrência de luz em um código religioso que teria sempre o mesmo sentido em qualquer livro.",
  ),
  "entity:concept:witness-john": p(
    ["fathers"],
    "Testemunho é uma categoria importante na apresentação de João Batista no prólogo de João. O texto distingue aquele que testemunha daquilo sobre o qual testemunha: João não é apresentado como a luz, mas como quem aponta para ela.",
    "Essa distinção ajuda a compreender o papel narrativo do personagem e a relação entre reconhecimento, anúncio e fé. Testemunho pode ter dimensões pessoais, públicas e argumentativas. Seu uso literário não dispensa a investigação histórica, mas oferece uma pergunta própria sobre como a obra constrói a credibilidade do que anuncia.",
  ),
  "entity:concept:grace-truth-john": p(
    ["fathers", "dei-verbum"],
    "Graça e verdade, no prólogo de João, aparecem em relação à revelação por meio de Jesus Cristo. A passagem também relaciona essa apresentação à linguagem sobre Moisés e a Lei. O contraste precisa ser lido no movimento do prólogo, sem transformá-lo automaticamente em uma condenação de tudo o que o texto associa à tradição de Israel.",
    "A interpretação de uma relação entre figuras pode envolver continuidade, cumprimento, contraste e novidade. Essas possibilidades não são equivalentes. Uma explicação precisa mostrar como a estrutura e o vocabulário da passagem sustentam sua conclusão, em vez de acrescentar uma oposição rígida que não foi demonstrada.",
  ),
};
