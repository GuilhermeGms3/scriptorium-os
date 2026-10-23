import type { TopicPrimer } from "./types";
const p = (references: string[], ...paragraphs: string[]): TopicPrimer => ({
  family: "history",
  references,
  paragraphs,
});
const chalcedon = p(
  ["councils", "coptic"],
  "A Definição de Calcedônia, de 451, apresenta uma formulação sobre a identidade de Cristo: uma pessoa em duas naturezas, divina e humana. Seu vocabulário procura preservar tanto a unidade pessoal quanto a integridade da humanidade e da divindade.",
  "O texto pertence a uma controvérsia histórica e não pode ser lido como se cada termo tivesse um único sentido evidente para todas as partes. Sua recepção dividiu igrejas, e as tradições ortodoxas orientais desenvolveram respostas próprias. Confessar a unidade de Cristo não significa necessariamente afirmar uma absorção de sua humanidade pela divindade.",
);

export const DOCUMENT_PRIMERS: Readonly<Record<string, TopicPrimer>> = {
  "entity:historical:apostles-creed": p(
    ["fathers", "anglican"],
    "O Credo dos Apóstolos é uma formulação de fé organizada em torno de Pai, Filho e Espírito, com referências à Igreja, ao perdão e à esperança. Seu nome expressa uma relação com a fé apostólica recebida; não é prova de uma redação coletiva feita diretamente pelos doze apóstolos.",
    "Sua função catequética e batismal ajuda a explicar a concisão e a sequência de afirmações. Ele não pretende desenvolver todas as justificativas de cada doutrina. A comparação com outros credos revela diferenças de contexto e de ênfase, não apenas versões mais curtas e mais longas de um texto idêntico.",
  ),
  "entity:historical:nicene-constantinopolitan-creed": p(
    ["councils", "oca"],
    "O Credo Niceno-Constantinopolitano é a formulação recebida na tradição cristã em associação com Niceia e Constantinopla. Ele desenvolve a confissão sobre Pai, Filho e Espírito e inclui Igreja, batismo, ressurreição e vida futura.",
    "As versões litúrgicas não são todas textualmente idênticas. A recensão ocidental com a expressão Filioque participa de uma história posterior de controvérsia sobre a procedência do Espírito. É importante distinguir o documento antigo, sua transmissão e o texto efetivamente usado por uma comunidade.",
  ),
  "entity:historical:chalcedon": chalcedon,
  "entity:council:chalcedon-451": chalcedon,
  "entity:historical:athanasian-creed": p(
    ["fathers", "anglican", "trinity"],
    "O Credo Atanasiano é uma formulação ocidental que articula ensinamentos trinitários e cristológicos. Apesar de seu nome tradicional, sua autoria não deve ser atribuída simplesmente a Atanásio de Alexandria. A atribuição recebida e a história de composição são problemas diferentes.",
    "Sua linguagem trabalha distinções e paralelos para preservar unidade divina, distinção das pessoas e identidade de Cristo. Esse modo de exposição difere da estrutura narrativa de um evangelho. O texto é melhor compreendido como formulação doutrinária e litúrgica, e não como resumo de uma única passagem bíblica.",
  ),
  "entity:historical:augsburg-confession": p(
    ["augsburg"],
    "A Confissão de Augsburgo foi apresentada em 1530 no contexto dos conflitos religiosos e políticos da Reforma. Ela reúne artigos de ensino e questões de prática eclesiástica, procurando explicar a posição de seus signatários em relação à fé cristã recebida.",
    "Justificação, Igreja, ministério, sacramentos e vida cristã aparecem em uma organização argumentativa específica. A leitura do documento mostra por que uma descrição da Reforma como simples rejeição de toda a tradição é insuficiente. Há afirmações de continuidade e críticas a práticas que o texto considera inadequadas.",
  ),
  "entity:historical:thirty-nine-articles": p(
    ["anglican"],
    "Os Trinta e Nove Artigos são uma exposição histórica de ensino da Igreja da Inglaterra, relacionada às controvérsias da Reforma inglesa. Tratam de Escritura, credos, pecado, justificação, Igreja e sacramentos, entre outros temas.",
    "O texto deve ser situado em sua linguagem e nos conflitos que procura responder. Sua recepção na Comunhão Anglicana não autoriza supor uma uniformidade completa de prática ou interpretação. O estatuto de um documento confessional e a diversidade de uma tradição atual são dimensões relacionadas, mas distintas.",
  ),
  "entity:historical:westminster-confession": p(
    ["westminster"],
    "A Confissão de Westminster organiza uma exposição reformada sobre Escritura, Deus, criação, aliança, salvação, Igreja e vida cristã. Sua estrutura procura relacionar os temas em um sistema de ensino e não apenas reunir afirmações independentes.",
    "A linguagem de aliança e a distinção entre justificação e santificação ajudam a compreender a lógica do documento. Existem recensões adotadas por igrejas distintas, inclusive com revisões. A edição publicada pela Orthodox Presbyterian Church documenta uma recepção concreta, que precisa ser identificada ao citar seu conteúdo.",
  ),
  "entity:historical:canons-of-dort": p(
    ["dort"],
    "Os Cânones de Dort resultam da controvérsia reformada com posições remonstrantes, no início do século XVII. Seu foco é a salvação, com discussões sobre eleição, obra de Cristo, condição humana, conversão e perseverança.",
    "O documento não pretende ser uma exposição de toda a teologia reformada. Sua estrutura responde a questões específicas e inclui afirmações e rejeições. Reduzi-lo a um acrônimo posterior pode apagar o contexto e os cuidados argumentativos de seu texto.",
  ),
  "entity:historical:didache": p(
    ["didache"],
    "A Didaquê, ou Ensino dos Doze Apóstolos, é um documento cristão antigo que reúne instrução moral, práticas de batismo e ação de graças, orientação sobre ministros e expectativa escatológica. O título vincula o ensino à tradição apostólica, mas não demonstra autoria direta dos doze.",
    "A seção dos dois caminhos contrasta modos de vida e prepara uma formação prática. As instruções litúrgicas e comunitárias mostram preocupações de uma comunidade, não um manual completo de todo o cristianismo de sua época. O documento permite perceber como ensino, rito e convivência se relacionavam em uma fonte concreta.",
  ),
  "entity:historical:first-clement": p(
    ["clement"],
    "1 Clemente é uma carta da comunidade de Roma à comunidade de Corinto, tradicionalmente associada a Clemente de Roma. Seu contexto é um conflito comunitário relacionado à liderança. O texto articula exortações à concórdia, exemplos bíblicos e argumentos sobre ordem e responsabilidade.",
    "A carta é importante para estudar relações entre comunidades e concepções antigas de ministério. Contudo, a presença de um argumento sobre autoridade não demonstra automaticamente todos os detalhes de uma estrutura eclesiástica posterior. É preciso acompanhar o que o texto afirma e o alcance efetivo de suas intervenções.",
  ),
  "entity:historical:second-clement": p(
    ["fathers"],
    "2 Clemente é tradicionalmente transmitido sob esse nome, mas é geralmente tratado como uma homilia cristã antiga, e não como uma segunda carta escrita pelo autor de 1 Clemente. O título recebido e o gênero do texto não são informações equivalentes.",
    "A obra enfatiza arrependimento, vida moral e a relação entre ouvir a mensagem e praticá-la. Sua forma de exortação oferece um testemunho importante de pregação e formação cristã. A comparação com uma carta exige reconhecer que destinatários, organização e intenção comunicativa podem ser diferentes.",
  ),
  "entity:historical:polycarp-philippians": p(
    ["fathers"],
    "A Epístola de Policarpo aos Filipenses articula aconselhamento moral e pastoral, com linguagem próxima de escritos cristãos recebidos pela comunidade. Ela documenta relações entre igrejas e preocupações com perseverança, liderança e conduta.",
    "O texto também é estudado por suas alusões e citações. Reconhecer uma aproximação verbal com outro escrito não resolve automaticamente como esse escrito era classificado canonicamente. Uso, conhecimento e reconhecimento de autoridade são questões relacionadas que precisam ser examinadas separadamente.",
  ),
  "entity:historical:martyrdom-polycarp": p(
    ["fathers"],
    "O Martírio de Policarpo é uma narrativa cristã sobre testemunho, sofrimento e memória comunitária. A morte do personagem é apresentada em uma linguagem religiosa que organiza o significado do acontecimento para seus leitores.",
    "Relato de martírio não é uma transcrição neutra de procedimentos judiciais. Gênero, transmissão e intenção comemorativa fazem parte de sua análise. O texto pode informar sobre ideais e práticas de uma comunidade mesmo quando questões sobre detalhes narrativos exigem investigação histórica adicional.",
  ),
  "entity:historical:ignatius-letters": p(
    ["fathers"],
    "As cartas de Inácio de Antioquia são fontes importantes sobre unidade comunitária, liderança, Eucaristia e compreensão de Cristo no cristianismo antigo. São dirigidas a comunidades e a um interlocutor concreto em uma situação de deslocamento e expectativa de martírio.",
    "A transmissão das cartas inclui questões de recensões e autenticidade. Por isso, uma citação precisa identificar qual conjunto e edição utiliza. O destaque dado ao bispo em determinadas passagens é um dado relevante, mas não autoriza transformar todas as comunidades cristãs do período em cópias de uma mesma organização.",
  ),
  "entity:historical:epistle-barnabas": p(
    ["fathers"],
    "A Epístola de Barnabé é um escrito cristão antigo que interpreta as Escrituras e apresenta instrução moral. O nome tradicional não estabelece, por si só, que seu autor seja o Barnabé associado a Paulo no Novo Testamento.",
    "O texto utiliza leituras tipológicas e alegóricas e expressa controvérsias sobre identidade e apropriação das Escrituras. Suas afirmações polêmicas sobre outros grupos devem ser reconhecidas como parte do discurso de um autor, e não reproduzidas automaticamente como descrição histórica imparcial dessas comunidades.",
  ),
  "entity:historical:shepherd-hermas": p(
    ["fathers"],
    "O Pastor de Hermas reúne visões, mandamentos e parábolas em uma obra centrada em arrependimento e vida comunitária. A diversidade de formas literárias faz parte de sua comunicação: imagens e personagens não funcionam como uma exposição doutrinária inteiramente abstrata.",
    "A circulação e a estima da obra em ambientes cristãos antigos mostram a variedade de usos de textos religiosos. Ser lido e valorizado por uma comunidade não equivale automaticamente a ocupar o mesmo estatuto canônico em todas as igrejas. O estudo da recepção precisa conservar essa diferença.",
  ),
  "entity:historical:epistle-diognetus": p(
    ["diognetus"],
    "A Epístola a Diogneto apresenta e defende a vida cristã diante de perguntas sobre religião, convivência e identidade. Sua autoria não é estabelecida simplesmente pelo nome Mathetes, uma designação tradicional que significa discípulo.",
    "A obra descreve a presença dos cristãos na sociedade por contrastes: pertencem a lugares e costumes concretos, mas interpretam sua vida por outra referência. Essa apresentação é uma construção apologética. Ela informa como o autor deseja representar os cristãos, o que não dispensa comparar suas afirmações com outras evidências históricas.",
  ),
  "entity:council:nicaea-325": p(
    ["councils", "trinity"],
    "O Concílio de Niceia, de 325, enfrentou controvérsias sobre o Filho e sua relação com o Pai, além de questões de vida e organização eclesiástica. Sua formulação de fé ocupa lugar decisivo na história da doutrina trinitária.",
    "O vocabulário de consubstancialidade procurou delimitar uma afirmação sobre a identidade divina do Filho. A recepção dessa linguagem envolveu debates posteriores, e o concílio não encerrou imediatamente todas as disputas. Também não foi uma assembleia que simplesmente escolheu, em uma única votação, todos os livros da Bíblia.",
  ),
  "entity:council:constantinople-381": p(
    ["councils", "oca"],
    "O concílio de Constantinopla, de 381, participa da consolidação da fé nicena e de controvérsias relativas ao Espírito Santo. O credo tradicionalmente associado a ele tem papel importante na liturgia e na identidade de numerosas igrejas.",
    "O estudo distingue a assembleia histórica, os documentos e a recepção posterior de sua autoridade. A circulação de versões do credo e a introdução ocidental do Filioque pertencem a uma história que não pode ser reduzida ao momento de uma única reunião.",
  ),
  "entity:council:ephesus-431": p(
    ["councils", "coptic"],
    "O Concílio de Éfeso, de 431, está ligado a controvérsias sobre a unidade de Cristo e sobre o uso do título Theotokos para Maria. A questão do título envolve a identidade daquele que nasce, e não apenas uma disputa isolada sobre devoção mariana.",
    "Os debates cristológicos usam termos cuja compreensão variou entre autores e línguas. Uma síntese adequada precisa reconhecer essas diferenças e evitar apresentar a posição de um adversário exclusivamente pelo modo como foi retratada em uma condenação.",
  ),
  "entity:work:gospel-of-john": {
    family: "reading",
    references: ["fathers"],
    paragraphs: [
      "O Evangelho segundo João apresenta a identidade de Jesus por narrativas, sinais, diálogos e discursos. Seu prólogo organiza temas que atravessam a obra: Logos, vida, luz, testemunho, recepção e revelação. A comparação com os evangelhos sinóticos mostra escolhas literárias e ênfases próprias.",
      "O narrador frequentemente oferece ao leitor informações que as personagens ainda não compreendem. Mal-entendidos e contrastes participam do desenvolvimento do relato. Uma leitura atenta acompanha essas relações antes de transformar cada frase em uma definição doutrinária independente.",
    ],
  },
  "entity:work:epistle-diognetus": p(
    ["diognetus"],
    "A Epístola a Diogneto é uma obra apologética cristã antiga: procura tornar compreensível e defender uma maneira de viver e crer diante de um interlocutor. Identidade, sociedade e ação divina participam de sua argumentação.",
    "Sua descrição da vida dos cristãos é um discurso de apresentação da comunidade. Ela não deve ser confundida com um levantamento estatístico de práticas de todos os grupos cristãos. O interesse da obra está também em como constrói a relação entre pertencimento social e identidade religiosa.",
  ),
  "entity:work:origen-commentary-john": {
    family: "reading",
    references: ["fathers"],
    paragraphs: [
      "O Comentário de Orígenes sobre João é uma fonte da recepção antiga do evangelho. Ele desenvolve explicações sobre palavras, relações entre passagens e problemas teológicos, permitindo acompanhar como um intérprete antigo articula texto e reflexão.",
      "A obra não é uma janela transparente para o sentido original do evangelista: tem perguntas, critérios e contexto próprios. Sua leitura é valiosa tanto para compreender argumentos sobre João quanto para estudar a atividade interpretativa de Orígenes. No acervo instalado, a disponibilidade de livros ou seções deve ser conferida na edição apresentada.",
    ],
  },
  "entity:person:michael-w-holmes": p(
    ["holmes", "intf"],
    "Michael W. Holmes é um pesquisador associado aos estudos do Novo Testamento, à crítica textual e aos Pais Apostólicos. Edições de textos antigos ligadas a seu trabalho são utilizadas para distinguir o documento transmitido das decisões de estabelecimento e tradução de uma edição moderna.",
    "Uma edição crítica não é um manuscrito: ela reúne testemunhas, apresenta decisões e pode registrar alternativas. O editor também não se torna autor das afirmações antigas que publica. Essa diferença entre autor, editor, tradutor e testemunha textual é importante para citar corretamente o material e avaliar a função de cada contribuição.",
  ),
};
