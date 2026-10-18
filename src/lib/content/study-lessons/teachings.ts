import { chapter, type LessonChapter } from "./types";

export const TEACHING_CHAPTERS: Readonly<Record<string, readonly LessonChapter[]>> = {
  christology: [
    chapter(
      "christ-person",
      "Quem é Cristo? Pessoa e natureza",
      [
        "Cristologia é o estudo da identidade e da obra de Jesus Cristo. Os evangelhos o apresentam por ações, títulos, relações e narrativas; os documentos conciliares desenvolvem vocabulário técnico para dizer como sua humanidade e sua divindade se relacionam. A leitura cristológica acompanha essa passagem entre linguagem narrativa e formulação conceitual, sem tratar todos os textos como se fossem respostas à mesma pergunta.",
        "Na formulação de Calcedônia, de 451, Cristo é confessado como uma pessoa em duas naturezas. Pessoa responde à questão de quem age e sofre; natureza indica o que caracteriza a humanidade e a divindade. A definição procura afirmar a integridade de ambas e a unidade de Cristo. Ela rejeita tanto uma mistura que produza um terceiro tipo de ser quanto uma divisão que transforme Cristo em dois sujeitos independentes.",
        "Essa linguagem não elimina toda a dificuldade. Como relacionar vontade, conhecimento, sofrimento e ação divina permanece objeto de argumentação posterior. Também não é adequado descrever todas as igrejas não calcedonianas como defensoras de uma humanidade absorvida pela divindade. Comunidades ortodoxas orientais articulam a unidade de Cristo com vocabulário e história próprios.",
      ],
      ["councils", "coptic"],
    ),
    chapter(
      "trinity-persons",
      "Trindade: unidade sem apagar as distinções",
      [
        "Os textos do Novo Testamento relacionam Pai, Filho e Espírito em formas diferentes. Mateus 28 apresenta uma fórmula batismal; as cartas paulinas reúnem linguagem sobre graça, amor e comunhão; João articula envio, testemunho e relação entre Jesus e o Pai. A doutrina trinitária nasce da leitura conjunta desses testemunhos no interior da fé em um só Deus. A fórmula técnica posterior não aparece pronta em um único versículo.",
        "Niceia, em 325, responde especialmente à controvérsia sobre o Filho. O termo homoousios, geralmente traduzido como consubstancial, procura excluir a classificação do Filho como criatura. A confissão recebida em associação com Constantinopla, em 381, desenvolve a linguagem sobre o Espírito, sua ação vivificante e sua glorificação com o Pai e o Filho. Há, portanto, um processo de precisão conceitual, e não apenas a repetição de uma lista de personagens.",
        "Uma distinção teológica posterior diferencia a Trindade econômica, que considera a ação divina na criação e na salvação, da Trindade imanente, que considera as relações em Deus. Essa distinção ajuda a evitar que cada missão seja convertida em uma desigualdade de natureza. No vocabulário niceno, o envio do Filho não significa que ele seja uma divindade menor; relação e essência não respondem à mesma pergunta.",
        "A história do debate inclui diferenças de terminologia e de interpretação entre autores e tradições. Por isso, a exposição de uma posição deve ser distinguida de sua defesa filosófica. É possível explicar o que o credo afirma, examinar a coerência de uma formulação e comparar leituras bíblicas sem pressupor que uma dessas tarefas resolva automaticamente as outras.",
      ],
      ["trinity", "catechism-god", "oca"],
    ),
  ],
  salvation: [
    chapter(
      "salvation-language",
      "Salvação: reconciliação, libertação e vida",
      [
        "Soteriologia estuda o problema da salvação. O vocabulário cristão não usa uma única imagem: redenção sugere libertação; reconciliação trata de uma relação rompida; justificação fala de justiça e aceitação; regeneração indica novo nascimento; santificação descreve transformação. Essas imagens se relacionam, mas não são sinônimos perfeitos.",
        "A expiação trata especialmente da relação entre a obra de Cristo e a superação do pecado. Modelos diferentes destacam problemas distintos. Christus Victor enfatiza a derrota de poderes como pecado e morte. A satisfação considera uma ordem moral ou honra violada. A substituição penal enfatiza juízo e representação. A influência moral destaca o efeito do amor manifestado por Cristo sobre a vida humana. Esses modelos podem coexistir em um autor, em vez de funcionar como opções sempre excludentes.",
        "O sentido de um modelo depende de suas premissas sobre Deus, justiça, liberdade e pecado. Dizer que Cristo age em favor de outros não basta para identificar uma teoria específica de substituição penal. É preciso saber como o argumento relaciona essa ação ao juízo, à culpa e ao perdão.",
      ],
      ["atonement", "augsburg", "dort"],
    ),
    chapter(
      "grace-faith",
      "Graça, fé, justificação e transformação",
      [
        "Graça designa a iniciativa e o dom de Deus, não apenas uma recompensa por realizações humanas. As tradições cristãs discutem como essa iniciativa se relaciona com fé, liberdade, obras e vida comunitária. A divergência não pode ser resumida corretamente pela oposição entre pessoas que valorizam graça e pessoas que não a valorizam.",
        "Na linguagem luterana da Confissão de Augsburgo, a justificação é apresentada como acolhimento por causa de Cristo mediante a fé, e não como conquista por mérito próprio. A tradição reformada também enfatiza a iniciativa divina e desenvolve discussões próprias sobre eleição e perseverança. Na apresentação wesleyana, graça preveniente, justificadora e santificadora descrevem dimensões da ação de Deus que antecede, acolhe e transforma a pessoa.",
        "Justificação e santificação são relacionadas de maneiras diferentes. A primeira pode enfatizar perdão, aceitação ou justiça; a segunda trata da transformação da vida. Confundir os termos impede perceber a questão real: como uma nova relação com Deus se relaciona com mudança de hábitos, amor ao próximo e ação ética. A distinção organiza o debate sem afirmar que essas dimensões sejam separáveis na experiência.",
      ],
      ["augsburg", "wesley", "dort"],
    ),
  ],
  humanity: [
    chapter(
      "human-person",
      "Humanidade, criação e responsabilidade",
      [
        "Antropologia teológica examina o ser humano em relação a Deus, aos outros e ao mundo. A linguagem de imagem de Deus, em Gênesis, recebe interpretações que enfatizam dignidade, vocação, relação e responsabilidade. Ela não se reduz necessariamente à identificação de uma característica física ou de uma faculdade isolada.",
        "Os debates sobre corpo e alma procuram explicar a unidade da pessoa e sua continuidade. Há modelos filosóficos diferentes para essa relação. No pensamento de Tomás de Aquino, por exemplo, a alma é tratada como forma do corpo: não simplesmente como um passageiro que usa uma máquina. A descrição de um modelo não significa que ele seja a única interpretação cristã possível.",
        "A reflexão sobre liberdade e responsabilidade distingue ter vontade, poder realizar o que se quer e ser moralmente responsável por uma ação. Condicionamentos sociais, hábitos e disposições afetam as escolhas. A discussão teológica acrescenta perguntas sobre criação, graça e pecado, sem transformar todos esses problemas em uma disputa abstrata sobre a existência ou não do livre-arbítrio.",
      ],
      ["summa", "catechism-god"],
    ),
    chapter(
      "sin",
      "Pecado: ação, condição e relações rompidas",
      [
        "Hamartiologia é o estudo do pecado. Nos textos e tradições cristãs, pecado pode nomear ações concretas, uma orientação da vontade, uma condição humana e poderes que afetam relações. A linguagem de culpa não esgota a questão: aparecem também corrupção, escravidão, desordem e morte.",
        "Pecado original não significa apenas o primeiro erro em uma cronologia. O conceito procura explicar uma condição que antecede as decisões individuais e afeta a humanidade. As tradições divergem quanto à transmissão dessa condição, à culpa e à relação entre mortalidade, inclinação e responsabilidade. Uma formulação latina sobre culpa herdada não deve ser atribuída sem distinções a toda a tradição cristã oriental.",
        "A discussão sobre pecado está ligada à graça e à cura da vida humana. Uma descrição teológica da condição humana também precisa ser diferenciada de um diagnóstico médico ou psicológico. Termos religiosos explicam uma interpretação moral e espiritual; não substituem as categorias próprias de outras áreas de conhecimento.",
      ],
      ["catechism-god", "augsburg", "oca"],
    ),
  ],
  church: [
    chapter(
      "church-community",
      "Igreja: comunidade, autoridade e missão",
      [
        "Eclesiologia é a reflexão sobre a Igreja. O Novo Testamento utiliza imagens como corpo, povo, assembleia e templo. Cada imagem destaca relações: diversidade de membros, pertencimento, convocação e presença divina. Nenhuma delas, isoladamente, especifica todos os detalhes de uma organização eclesiástica posterior.",
        "A história cristã inclui modelos diferentes de autoridade: estruturas episcopais, governo por presbíteros e formas congregacionais, entre outras. A divergência envolve como se reconhecem continuidade apostólica, responsabilidade e participação da comunidade. Também há diferenças entre autoridade de um ofício, autoridade de um texto e autoridade de uma interpretação.",
        "Documentos antigos, como 1 Clemente e a Didaquê, mostram preocupações com ensino, convivência, culto e liderança. Eles ajudam a compreender comunidades concretas; não funcionam como fotografia única e completa de todo o cristianismo antigo. Na comparação histórica, semelhanças de função não provam identidade entre instituições de épocas distintas.",
      ],
      ["clement", "didache", "oca"],
    ),
    chapter(
      "sacraments",
      "Sacramentos, sinais e participação",
      [
        "Sacramentologia estuda práticas nas quais comunidades cristãs reconhecem uma relação entre sinal visível e ação divina. Água, pão, vinho, palavras e gestos não são apenas objetos isolados: recebem sentido no contexto do rito, da comunidade e de sua compreensão teológica.",
        "O batismo articula linguagem de purificação, morte e vida, iniciação e pertencimento. A Ceia ou Eucaristia relaciona memória de Cristo, ação de graças e comunhão. As tradições diferem sobre presença, eficácia, participantes e relação entre fé e rito. A oposição simplista entre símbolo e realidade é insuficiente: há diferentes maneiras de entender como um símbolo pode participar de uma realidade.",
        "A Didaquê oferece instruções antigas sobre batismo e ação de graças; a elaboração escolástica organiza outras perguntas sobre sinal e causalidade. O deslocamento entre esses documentos mostra desenvolvimento de vocabulário e de problemas, e não uma comparação entre textos que necessariamente respondem às mesmas questões.",
      ],
      ["didache", "augsburg", "anglican"],
    ),
  ],
  spirit: [
    chapter(
      "spirit-scripture",
      "Pentecostes, dons e vida em comunidade",
      [
        "Atos 2 situa Pentecostes em Jerusalém e apresenta a vinda do Espírito por imagens de vento, fogo e fala. A variedade de línguas liga o acontecimento à comunicação pública do anúncio. Pedro o interpreta à luz da profecia de Joel e da exaltação de Jesus. Dentro da narrativa de Atos, o Espírito não é apenas uma experiência interior: sua ação acompanha o testemunho e a expansão da comunidade.",
        "Em 1 Coríntios 12, Paulo trata dos dons em uma comunidade marcada por distinções e conflitos. A diversidade de capacidades não deveria produzir uma escala de valor entre as pessoas. A imagem do corpo relaciona diferença e interdependência: uma parte não se torna o corpo inteiro, e uma parte aparentemente frágil não é dispensável. O argumento desloca a atenção do prestígio individual para o bem comum.",
        "O capítulo 13 insere o amor nessa discussão, e o capítulo 14 relaciona o uso dos dons à edificação e à inteligibilidade. Assim, dom, fruto e serviço são categorias relacionadas, mas não idênticas. Em Gálatas 5, o fruto do Espírito descreve qualidades de uma vida transformada. Uma manifestação extraordinária, por si só, não substitui o discernimento ético nem prova maturidade espiritual.",
        "As igrejas diferem quanto à continuidade de determinados dons e à relação entre batismo, confirmação e experiência do Espírito. Pentecostais clássicos costumam distinguir o batismo no Espírito como capacitação; tradições sacramentais o relacionam a outros modos de iniciação e vida eclesial. Essas formulações são interpretações confessionais de conjuntos de textos, e precisam ser distinguidas do enredo de uma passagem específica.",
      ],
      ["oca-spirit", "pentecostal"],
    ),
    chapter(
      "spirit",
      "O Espírito: presença, ação e relação",
      [
        "Pneumatologia é o estudo do Espírito Santo. Nos escritos cristãos, o Espírito é relacionado a vida, inspiração, santificação, testemunho e constituição da comunidade. As imagens de vento, sopro, água e fogo ressaltam aspectos distintos dessa ação e não devem ser confundidas com definições físicas de sua natureza.",
        "A formulação trinitária situa o Espírito em relação ao Pai e ao Filho e o distingue de uma força impessoal. O credo associado a Constantinopla desenvolve a confissão do Espírito em uma linguagem que articula vida, adoração e ação na história. Debates posteriores sobre a procedência do Espírito envolvem vocabulário teológico e relações entre igrejas orientais e ocidentais.",
        "A discussão sobre dons espirituais não é idêntica à doutrina trinitária do Espírito. Dons, frutos e experiências são interpretados de maneiras diferentes em comunidades cristãs. Uma descrição da experiência de uma comunidade não estabelece, sozinha, uma norma para todas as outras.",
      ],
      ["oca", "pentecostal", "councils"],
    ),
  ],
  hope: [
    chapter(
      "resurrection-creation",
      "Ressurreição e nova criação: o que os textos afirmam",
      [
        "Em 1 Coríntios 15, Paulo responde à negação da ressurreição dos mortos relacionando-a à ressurreição de Cristo. O argumento não se limita à continuidade de uma memória: se os mortos não ressuscitam, a própria proclamação sobre Cristo perde seu fundamento. A imagem das primícias apresenta a ressurreição de Cristo como início de uma realização que alcança outros.",
        "A comparação com a semente articula continuidade e transformação. O corpo semeado e o corpo ressuscitado não são descritos como duas pessoas sem relação, mas também não são simplesmente um organismo devolvido às condições anteriores. A expressão corpo espiritual não precisa significar um ser feito de uma substância imaterial; no argumento paulino, a oposição envolve corrupção e incorruptibilidade, fraqueza e poder, a vida presente e a vida transformada.",
        "Apocalipse 21–22 apresenta novo céu, nova terra e a cidade em que Deus habita com os seres humanos. Imagens como ausência de morte, luz e rio da vida comunicam restauração e comunhão. Elas não compõem uma descrição técnica de arquitetura ou astronomia. O uso de imagens do Éden e dos profetas conecta a esperança futura à história mais ampla da criação e da aliança.",
        "Juízo e esperança aparecem juntos porque a superação do mal envolve a responsabilidade por ele. Há controvérsias cristãs sobre a condição entre morte e ressurreição, a extensão da salvação e a interpretação de imagens de punição. O núcleo comum de uma esperança em Deus não elimina essas diferenças, nem autoriza atribuir a todas as igrejas um único calendário dos acontecimentos finais.",
      ],
      ["oca-judgment", "anglican"],
    ),
    chapter(
      "last-things",
      "Esperança cristã e linguagem do futuro",
      [
        "Escatologia trata do destino da humanidade, do mundo e da realização das promessas de Deus. Ela inclui ressurreição, juízo, vida futura e renovação da criação. Não se resume à construção de calendários do fim: também pergunta como a esperança futura transforma a compreensão do presente.",
        "A literatura apocalíptica utiliza visões, símbolos e contrastes intensos para interpretar a história. Números, animais e imagens cósmicas participam dessa linguagem. Identificá-los diretamente com acontecimentos atuais, sem explicar os critérios dessa correspondência, transforma uma interpretação em uma afirmação que o texto não demonstra por si mesmo.",
        "Ressurreição não é simplesmente outro nome para sobrevivência da alma. A esperança cristã clássica envolve a pessoa e a superação da morte. Juízo final, por sua vez, articula responsabilidade e justiça. As tradições discutem a natureza dessa realização e a relação entre imagens bíblicas e formulações conceituais.",
      ],
      ["oca", "pentecostal", "anglican"],
    ),
  ],
  history: [
    chapter(
      "ancient-christianity",
      "O cristianismo antigo e seus documentos",
      [
        "O cristianismo antigo se desenvolveu em línguas, regiões e situações sociais diversas. Cartas, homilias, apologias, narrativas de martírio e instruções comunitárias preservam aspectos diferentes dessa experiência. A expressão Pais Apostólicos reúne uma coleção de escritos antigos; não afirma que todos tenham sido redigidos pelos apóstolos nem que representem uma única escola.",
        "Uma carta preserva uma relação entre remetente e destinatários. Uma homilia desenvolve exortação para ouvintes. Uma apologia procura apresentar e defender uma comunidade diante de objeções. O gênero ajuda a explicar por que um documento enfatiza certos assuntos e deixa outros de lado. O silêncio sobre uma prática não comprova automaticamente sua inexistência.",
        "Autoria atribuída, data de composição e testemunhos manuscritos são questões distintas. Um título tradicional pode ter sido recebido posteriormente; uma tradução histórica pode facilitar o acesso, mas não reproduz todas as decisões de uma edição crítica. A pesquisa atual trabalha com esses diferentes níveis de evidência.",
      ],
      ["clement", "didache", "diognetus", "holmes"],
    ),
    chapter(
      "council-confession",
      "Concílios, credos e confissões",
      [
        "Um concílio é uma assembleia eclesiástica; um credo é uma formulação de fé; uma confissão pode reunir um conjunto mais amplo de ensinamentos. Esses objetos se relacionam, mas não são equivalentes. A data de uma assembleia não permite atribuir a ela qualquer texto que mais tarde tenha circulado sob seu nome.",
        "Niceia, Constantinopla, Éfeso e Calcedônia participam de controvérsias diferentes. A autoridade atribuída a cada concílio também varia entre igrejas. Na Reforma, documentos como a Confissão de Augsburgo e os Trinta e Nove Artigos articularam identidade e ensino em outros contextos políticos e eclesiais.",
        "As fontes confessionais explicam como uma comunidade formula sua fé. Elas não são descrições neutras de todas as outras comunidades. Um panorama comparativo precisa conservar essa localização: o que o texto afirma sobre si, o que ele atribui a seus adversários e o que uma investigação histórica pode estabelecer são níveis diferentes.",
      ],
      ["councils", "augsburg", "anglican", "westminster"],
    ),
  ],
  gnosticism: [
    chapter(
      "gnosis",
      "Gnose, diversidade e Nag Hammadi",
      [
        "Gnose significa conhecimento; na pesquisa sobre religiões antigas, o termo pode designar formas de conhecimento religioso relacionadas à identidade humana, à origem do mundo e à salvação. Gnosticismo é uma categoria moderna de classificação, cujo alcance é discutido. Ela não deve transformar textos diferentes em uma religião única e perfeitamente uniforme.",
        "A coleção de Nag Hammadi reúne escritos de gêneros e posições distintos, preservados em códices em copta. O fato de dois textos terem sido encontrados na mesma coleção não prova que compartilhem autor, escola ou sistema doutrinário. Tampouco torna toda a literatura ali preservada uma explicação alternativa única do cristianismo.",
        "O Evangelho de Tomé é uma coleção de ditos atribuídos a Jesus, e não uma narrativa contínua como os evangelhos canônicos. Comparar um dito com um paralelo exige considerar redação, contexto e transmissão. A proximidade verbal não resolve sozinha a direção da dependência nem a datação de uma tradição.",
      ],
      ["coptic-texts", "hermeneutics"],
    ),
  ],
};
