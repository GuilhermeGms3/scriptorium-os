import { deepStudy as d, type DeepStudy } from "./deepening-types";

const chalcedon = d(
  "Calcedônia deve ser estudada como uma formulação situada em disputas sobre a identidade de Cristo. Sua definição delimita afirmações, enquanto seus procedimentos e sua recepção pertencem a outros problemas históricos. A aprovação numa assembleia não significa aceitação imediata e uniforme por todas as igrejas; a análise precisa conservar essa distância.",
  "Leia a definição identificando o sujeito das afirmações e o que é preservado ao distinguir humanidade e divindade. Compare sua linguagem com a de uma exposição ortodoxa oriental. Pergunte se os mesmos termos estão sendo empregados com o mesmo significado antes de concluir que toda diferença verbal expressa uma oposição idêntica.",
  "Produza uma síntese com questão enfrentada, vocabulário, finalidade e recepção. Separe o que o documento afirma da interpretação de seus apoiadores e de seus adversários. A conclusão deve reconhecer uma divergência histórica sem transformar as comunidades envolvidas em caricaturas de uma única tese.",
);
const diognetus = d(
  "Uma apologia procura apresentar e defender um modo de vida diante de um interlocutor. Isso torna suas estratégias parte do objeto: comparações, contrastes e imagens informam como o autor deseja ser compreendido. Não devem ser tomadas automaticamente como levantamento estatístico das práticas de todos os cristãos do período.",
  "Leia os capítulos 5–6 da Epístola a Diogneto identificando hábitos comuns, diferenças atribuídas aos cristãos e a imagem empregada para sua presença no mundo. Compare a autodescrição com um documento de instrução comunitária, como a Didaquê. Os gêneros revelam preocupações diferentes.",
  "Explique uma tese da apologia e os recursos usados para torná-la plausível ao destinatário. Indique qual informação histórica ela oferece e o que exigiria confirmação por outra fonte. Diferencie autor, destinatário e nome tradicional atribuído ao escrito.",
);

export const DOCUMENT_DEEPENING: Readonly<Record<string, DeepStudy>> = {
  "entity:historical:apostles-creed": d(
    "A estrutura do credo organiza a confissão em torno de Pai, Filho e Espírito e reúne acontecimentos e compromissos. Seu funcionamento litúrgico é diferente do de uma investigação histórica ou de uma demonstração filosófica. O nome tradicional não autoriza atribuir uma cláusula a cada apóstolo como se houvesse um registro documental desse procedimento.",
    "Separe as afirmações sobre Deus, a narrativa referente a Jesus e as afirmações sobre comunidade e esperança. Pergunte quais temas recebem desenvolvimento e quais não são abordados em detalhe. Compare a forma do credo com a de um relato evangélico para reconhecer o que se ganha e o que se perde numa síntese confessional.",
    "Escolha uma cláusula e explique sua função dentro do conjunto. Relacione-a a uma unidade bíblica sem fingir que o credo é uma citação contínua da Escritura. Identifique a versão consultada e uma diferença de tradução que possa afetar o entendimento de um leitor atual.",
  ),
  "entity:historical:nicene-constantinopolitan-creed": d(
    "É necessário distinguir a forma de Niceia de 325 da forma tradicionalmente ligada a Constantinopla de 381 e de suas recepções litúrgicas. Formulação, circulação e adoção não são um único acontecimento. Uma tradução moderna também carrega decisões sobre termos que participaram de debates antigos.",
    "Compare duas versões identificadas do credo e observe o que dizem sobre o Filho e o Espírito. Caso uma inclua o Filioque, registre a diferença sem atribuí-la automaticamente ao texto de 381. A história da cláusula ocidental pertence à recepção do documento.",
    "Apresente uma afirmação do credo, o problema que procura delimitar e uma consequência para o debate posterior. Cite a versão usada. Evite empregar a expressão credo de Niceia como se todas as formas e todas as comunidades tivessem usado sempre um texto idêntico.",
  ),
  "entity:historical:chalcedon": chalcedon,
  "entity:council:chalcedon-451": chalcedon,
  "entity:historical:athanasian-creed": d(
    "A composição por paralelos e negações orienta a leitura do chamado Credo Atanasiano. O documento pretende guardar relações precisas entre unidade, distinção e identidade de Cristo. Ele não é uma explicação psicológica da Trindade e não deve ser tratado como produção comprovada de Atanásio apenas por sua denominação tradicional.",
    "Separe as partes trinitária e cristológica. Em cada uma, anote uma afirmação positiva e a interpretação que sua negação correspondente procura evitar. Compare essa forma com a síntese narrativa do Credo dos Apóstolos, sem avaliar os documentos como se ambos respondessem exatamente às mesmas controvérsias.",
    "Reescreva um trecho em linguagem acessível, preservando as distinções. Identifique onde sua paráfrase corre o risco de reduzir pessoa a indivíduo independente ou natureza a uma parte material. A atividade deve explicar a função da linguagem, sem apresentar a paráfrase como tradução oficial.",
  ),
  "entity:historical:augsburg-confession": d(
    "A organização da Confissão de Augsburgo combina exposição de ensino e discussão de práticas. A relação entre os artigos importa: uma afirmação sobre fé precisa ser lida junto da explicação sobre obediência. O documento procura apresentar uma identidade confessional diante de interlocutores concretos, não uma descrição neutra de toda a Reforma.",
    "Compare os artigos IV e VI: identifique o fundamento da justificação e o lugar atribuído às boas obras. Observe como se pode distinguir a origem da aceitação e a consequência da fé. A leitura conjunta impede atribuir ao documento a tese simplificada de que a conduta seria irrelevante.",
    "Escolha uma controvérsia tratada na confissão e reconstrua argumento, interlocutor e finalidade. Indique a edição consultada e compare com uma fonte de outra tradição. Não transforme a posição de um documento luterano em retrato completo de todo cristão ligado à Reforma.",
  ),
  "entity:historical:thirty-nine-articles": d(
    "Os artigos precisam ser lidos como formulações ligadas a disputas de uma tradição histórica. Seu vocabulário normativo não descreve automaticamente a diversidade de comunidades anglicanas atuais. Também é necessário distinguir a existência de uma afirmação documental e a maneira como uma igreja a recebe em sua vida institucional e litúrgica.",
    "Leia os artigos sobre Escritura, Igreja e sacramentos como unidades articuladas. Identifique critérios, limites e objetos de controvérsia. Compare uma afirmação com a de outra confissão da Reforma, evitando supor que um termo compartilhado tenha em todos os casos exatamente o mesmo alcance.",
    "Apresente uma relação entre autoridade bíblica e vida eclesiástica no documento. Registre a fonte e uma questão que dependeria da história de sua recepção. A conclusão deve evitar explicar todo o anglicanismo por uma expressão isolada, como se ela eliminasse diferenças internas.",
  ),
  "entity:historical:westminster-confession": d(
    "A forma sistemática de Westminster relaciona Escritura, Deus, aliança e salvação. Para compreender um capítulo, observe suas dependências conceituais. A existência de recensões também importa: a edição de uma igreja pode conter alterações, de modo que citar somente o título da confissão não identifica sempre o texto efetivamente consultado.",
    "Compare os capítulos sobre justificação e santificação. Registre o que cada um afirma sobre fundamento, transformação e obras. A análise deve explicar por que a distinção organiza a exposição, sem concluir que as duas dimensões sejam apresentadas como experiências sem relação.",
    "Escolha uma afirmação e identifique sua posição no conjunto, suas referências e a recensão usada. Confronte uma objeção sem reduzir o documento a uma tese sobre predestinação. A síntese deve demonstrar leitura de seu argumento e não apenas reconhecimento de palavras características.",
  ),
  "entity:historical:canons-of-dort": d(
    "Os Cânones de Dort respondem a controvérsias delimitadas; não são uma enciclopédia de todas as crenças reformadas. A leitura das afirmações junto às rejeições permite identificar o interlocutor visado. Um resumo por acrônimo posterior pode ajudar a lembrar temas, mas não substitui o argumento nem a organização do documento.",
    "Escolha um ponto sobre graça ou perseverança e separe a tese afirmada da posição rejeitada. Compare a descrição do adversário com uma fonte que represente esse interlocutor. Essa comparação ajuda a avaliar se o debate atual está repetindo a mesma questão ou apenas reutilizando seus nomes.",
    "Reconstrua uma divergência com premissas e consequências. Cite a parte e o artigo efetivamente usados. Não deduza o pensamento de uma pessoa contemporânea apenas porque ela se identifica como reformada; a relação entre documento histórico e adesão atual precisa ser demonstrada.",
  ),
  "entity:historical:didache": d(
    "A Didaquê articula formação moral, celebração e discernimento comunitário. Essa organização permite perguntar como práticas e instrução se apoiam. O documento testemunha uma forma de vida, mas não deve ser convertido num manual uniforme seguido por todos os cristãos antigos.",
    "Compare a seção dos dois caminhos com as orientações sobre batismo no capítulo 7 e sobre ministros nos capítulos finais. Observe como o texto combina instruções e adaptações práticas. Uma disposição ritual informa uma prática documentada, sem demonstrar sozinha a formulação doutrinária completa que uma tradição posterior associa ao rito.",
    "Escolha uma instrução e registre ação, destinatário, finalidade e condições previstas. Compare com uma carta do Novo Testamento ou com outra fonte antiga, conservando as diferenças de gênero. Sua conclusão deve delimitar o que é observado no documento e o que continua sendo reconstrução histórica.",
  ),
  "entity:historical:first-clement": d(
    "Uma intervenção num conflito comunitário precisa ser lida por seus motivos e recursos argumentativos. A carta recorre a exemplos, memória e ordem para promover concórdia. Isso permite investigar concepções de ministério, sem atribuir ao escrito todos os detalhes de estruturas institucionais desenvolvidas em séculos posteriores.",
    "Leia 1 Clemente 42–44 e observe como a argumentação sobre ministério se relaciona ao conflito. Depois, compare as exortações à concórdia com o problema inicial. A análise deve ligar doutrina e ocasião, em vez de tratar frases sobre liderança como proposições sem contexto.",
    "Descreva quem intervém, em qual situação e com quais razões. Distinga autoria tradicional, voz da comunidade remetente e recepção do escrito. Se formular uma conclusão sobre autoridade entre igrejas, indique exatamente até onde a evidência da carta permite avançar.",
  ),
  "entity:historical:second-clement": d(
    "O gênero homilético organiza uma relação de exortação com ouvintes. O nome 2 Clemente e a transmissão junto a outros escritos não demonstram autoria pelo remetente de 1 Clemente. Autoria, título recebido e classificação literária são questões que precisam ser investigadas separadamente.",
    "Na abertura de 2 Clemente, observe a maneira como o ouvinte é chamado a considerar Cristo e a responder na vida. Compare uma exortação com o desenvolvimento de uma carta antiga. Pergunte como destinatário presumido e finalidade influenciam seleção de imagens e organização do argumento.",
    "Reconstrua a tese de um trecho e a ação que ele procura despertar. Indique a seção e diferencie a afirmação do pregador de uma descrição de como todos os ouvintes viviam. Um sermão revela um projeto de formação, não uma fotografia transparente da comunidade.",
  ),
  "entity:historical:polycarp-philippians": d(
    "Uma carta pastoral combina memória, orientação e referência a tradições recebidas. A leitura deve acompanhar seus destinatários e problemas, em vez de usar o texto somente como reservatório de frases antigas. Alusões bíblicas podem indicar circulação de linguagem e tradições, mas não provam por si a existência de um cânon já fixado em todos os detalhes.",
    "Escolha uma exortação da carta de Policarpo aos Filipenses e compare sua linguagem com uma passagem neotestamentária indicada pela edição. Observe o contexto em ambos os escritos. Semelhança temática, citação reconhecível e dependência textual precisa não são níveis idênticos de relação.",
    "Registre uma preocupação comunitária e como o autor mobiliza autoridade para enfrentá-la. Ao propor uma relação intertextual, indique a evidência e seus limites. A síntese deve mostrar o que a carta informa sobre formação cristã sem inventar todos os detalhes de seu ambiente.",
  ),
  "entity:historical:martyrdom-polycarp": d(
    "Um relato de martírio seleciona acontecimentos e imagens para formar memória e identidade. Isso não o torna inútil como fonte histórica, mas exige estudar sua finalidade, transmissão e linguagem. A descrição de coragem pertence também à maneira como uma comunidade apresenta o testemunho que deseja preservar.",
    "Escolha uma cena do Martírio de Policarpo e identifique narrador, falas, imagens e juízos de valor. Compare a descrição do acontecimento com o comentário sobre seu significado. Pergunte quais informações poderiam ser confrontadas com outras fontes e quais pertencem à interpretação do relato.",
    "Explique a relação entre memória do mártir e formação dos leitores. Distinga admiração pelo testemunho e legitimação de violência. Não transforme a valorização do mártir em recomendação de procurar sofrimento ou em autorização para exigir de outras pessoas uma exposição ao perigo.",
  ),
  "entity:historical:ignatius-letters": d(
    "As cartas atribuídas a Inácio precisam ser estudadas com atenção à transmissão e à situação epistolar. O vocabulário sobre unidade, liderança e celebração responde a preocupações concretas. A mesma expressão pode funcionar como exortação numa carta e como peça de uma doutrina institucional numa recepção posterior.",
    "Compare uma exortação à unidade numa carta de Inácio com o contexto em que ela aparece. Identifique destinatário, conflito pressuposto e relação com a celebração comunitária. Evite construir uma história de toda a organização cristã antiga a partir de uma única frase sobre um ministro.",
    "Apresente a forma textual consultada e uma questão de transmissão informada pela edição. Reconstrua um argumento de unidade e seus limites históricos. A síntese deve distinguir o testemunho específico da carta, sua recepção posterior e a posição que o leitor deseja defender hoje.",
  ),
  "entity:historical:epistle-barnabas": d(
    "A Epístola de Barnabé oferece um exemplo de interpretação cristã antiga que lê instruções e imagens de modo tipológico ou alegórico. Estudar o procedimento é diferente de adotá-lo como regra universal. É necessário reconhecer também as implicações de suas formulações para a maneira como representa outros leitores das Escrituras.",
    "Na discussão de preceitos alimentares, observe como o escrito desloca a atenção para condutas e disposições humanas. Compare esse procedimento com o contexto de uma instrução no Pentateuco. Pergunte que relações sustentam a nova leitura e quais pressupostos permitem ir além da referência inicial.",
    "Reconstrua um movimento interpretativo com texto de partida, relação construída e conclusão. Indique um ganho e um limite da leitura. A apresentação histórica não deve reproduzir sem crítica uma desqualificação de toda a tradição judaica de interpretação.",
  ),
  "entity:historical:shepherd-hermas": d(
    "O Pastor de Hermas emprega visões, mandamentos e comparações para tratar de arrependimento e vida comunitária. A forma visionária não deve ser confundida automaticamente com registro de um acontecimento externo verificável por outros meios. Ao mesmo tempo, as imagens podem revelar preocupações morais e eclesiais que merecem investigação.",
    "Escolha uma imagem numa visão ou comparação e acompanhe a explicação fornecida pelo próprio escrito. Não atribua significado a todos os detalhes apenas por associação livre. Observe como a imagem se liga à orientação moral ou comunitária, separando descrição, interpretação interna e sua leitura posterior.",
    "Produza uma síntese de um problema abordado pelo escrito e da resposta proposta. Identifique a divisão da obra e a edição consultada. Ao discutir sua recepção, diferencie popularidade, presença em manuscritos e reconhecimento canônico, evitando transformar um dado em prova automática dos outros.",
  ),
  "entity:historical:epistle-diognetus": diognetus,
  "entity:work:epistle-diognetus": diognetus,
  "entity:council:nicaea-325": d(
    "O debate niceno envolve como afirmar a identidade do Filho e sua relação com o Pai. A linguagem adotada procura delimitar uma posição sobre essa relação, não produzir um cânon bíblico por votação. A história posterior mostra que definição conciliar e estabilização de seu entendimento não são um único momento.",
    "Leia a formulação de fé de 325 numa edição identificada. Separe as afirmações sobre o Filho das rejeições que delimitam o alvo do documento. Compare depois uma forma posterior do credo para reconhecer continuidades e mudanças de formulação, sem tratá-las como textos intercambiáveis.",
    "Explique a função de um termo ou de uma negação na controvérsia. Registre o documento e sua data, distinguindo a assembleia, a formulação e a recepção. Sua síntese deve responder a um problema cristológico concreto, não repetir uma narrativa genérica de imperadores que teriam inventado toda a fé cristã.",
  ),
  "entity:council:constantinople-381": d(
    "O estudo de Constantinopla requer distinguir contexto histórico, afirmações doutrinais e reconhecimento posterior. A relação entre a assembleia e a forma recebida do credo faz parte de uma história documental. Não se deve tratar a presença do texto numa liturgia moderna como evidência suficiente de todos os detalhes de sua primeira circulação.",
    "Leia a parte do credo referente ao Espírito e compare com uma exposição doutrinária de uma igreja que o recebe. Identifique o que pertence à formulação e o que pertence ao comentário posterior. Depois, relacione esse problema à discussão mais ampla sobre unidade e distinção na doutrina de Deus.",
    "Apresente uma questão sobre o Espírito que a formulação permite estudar e uma questão de recepção que exige outras fontes. Cite a versão utilizada. Ao discutir o Filioque, evite atribuir ao ano de 381 uma redação ocidental posterior sem identificar o processo histórico envolvido.",
  ),
  "entity:council:ephesus-431": d(
    "O título Theotokos envolve uma questão sobre o sujeito confessado como Cristo. Discuti-lo apenas como devoção mariana perde a estrutura do conflito cristológico. Também é necessário distinguir as posições reconstruídas pelos pesquisadores da maneira como adversários foram descritos durante as disputas.",
    "Leia um documento da controvérsia disponível na coleção conciliar e identifique quem é o sujeito das afirmações sobre nascimento e sofrimento. Compare vocabulário e finalidade com a definição posterior de Calcedônia. A relação entre os documentos não elimina suas situações e estratégias próprias.",
    "Explique por que uma pergunta sobre Maria pode ser também uma pergunta sobre a identidade de Jesus. Registre as fontes de duas posições com seus próprios termos, sem atribuir a um autor apenas uma frase de condenação escrita por seus adversários.",
  ),
  "entity:work:gospel-of-john": d(
    "O projeto literário de João articula sinais, diálogos e comentários do narrador. A finalidade anunciada em 20:30–31 ajuda a formular perguntas, mas não elimina a necessidade de examinar como cada cena funciona. As personagens podem compreender parcialmente o que o leitor já recebeu como informação na abertura.",
    "Compare o prólogo com o episódio da samaritana em João 4. Observe conhecimento, testemunho e mudança no desenvolvimento da conversa. Pergunte como a cena amplia temas apresentados antes, sem pressupor que cada detalhe seja uma cifra alegórica com equivalente fixo.",
    "Escolha um tema recorrente e siga três unidades, registrando a função em cada uma. Produza uma síntese que conserve diferenças de situação e gênero. Ao relacionar João aos sinóticos, explique se compara cronologia, composição ou interpretação teológica, pois essas tarefas não são equivalentes.",
  ),
  "entity:work:origen-commentary-john": d(
    "Um comentário antigo pode articular filologia, teologia e níveis de sentido de maneira diferente de uma nota moderna. Em Orígenes, a leitura de João pertence a um projeto de investigação e formação cristã. Compreender esse projeto exige acompanhar perguntas e argumentos, em vez de classificar qualquer interpretação não literal como simples fantasia.",
    "Escolha um trecho do comentário em que se discuta o prólogo e registre a passagem bíblica de partida. Identifique quais problemas o autor introduz e como os relaciona ao conjunto de sua reflexão. Compare a interpretação com a unidade bíblica completa e com uma nota atual que responda a outra pergunta.",
    "Reconstrua um argumento de Orígenes com localizador e distinga observação textual e desenvolvimento especulativo. Indique o que seria necessário para avaliar a proposta. Não apresente a posição do comentarista como descrição automática de todas as comunidades cristãs de sua época.",
  ),
  "entity:person:michael-w-holmes": d(
    "O estudo de um pesquisador deve partir de trabalhos e responsabilidades editoriais identificados, não da autoridade de seu nome. Edição crítica, tradução e introdução histórica são contribuições distintas. Um perfil institucional ajuda a localizar áreas de pesquisa, mas não substitui a leitura de uma publicação concreta nem prova todas as opiniões atribuídas ao autor.",
    "Escolha uma obra ou edição associada a Holmes que você consiga identificar bibliograficamente. Registre título, edição e função exercida. Compare uma decisão editorial ou de tradução com a informação fornecida no prefácio ou aparato, sem deduzir sua motivação apenas por concordar ou discordar do resultado.",
    "Formule uma pergunta sobre edição dos Padres Apostólicos ou crítica textual e identifique qual trabalho pode ajudá-la. Se o texto não estiver disponível, registre a lacuna em vez de inventar uma posição do pesquisador. Reconhecimento acadêmico orienta a busca, mas não encerra a avaliação dos argumentos.",
  ),
};
