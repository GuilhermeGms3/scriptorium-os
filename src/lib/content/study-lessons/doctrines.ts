import type { TopicPrimer } from "./types";

const primer = (family: string, references: string[], ...paragraphs: string[]): TopicPrimer => ({
  family,
  references,
  paragraphs,
});
const justification = primer(
  "salvation",
  ["augsburg", "wesley", "westminster"],
  "Justificação é a linguagem da relação entre justiça, pecado e acolhimento por Deus. Em Paulo, ela aparece em argumentos sobre fé, Lei, promessa e pertencimento ao povo de Deus. A palavra não deve ser lida apenas como uma descrição de melhora moral: o debate também envolve reconhecimento, perdão e a condição de quem é aceito como justo.",
  "As tradições cristãs divergem na maneira de relacionar declaração de justiça, transformação interior e participação na vida de Cristo. A Confissão de Augsburgo enfatiza a aceitação por causa de Cristo mediante a fé; a tradição metodista distingue justificação e santificação sem romper sua relação. A discussão sobre obras depende dessa diferença de enquadramento: obras como origem do merecimento, como expressão da fé e como dimensão de uma vida transformada não são a mesma afirmação.",
);
const sanctification = primer(
  "salvation",
  ["wesley", "augsburg"],
  "Santificação é a linguagem da consagração e da transformação da vida em relação a Deus. Ela envolve tanto pertencimento quanto formação de disposições, ações e relações. Nos textos cristãos, o tema aparece associado ao Espírito, à comunhão e à prática do amor, e não apenas a um aperfeiçoamento individual isolado.",
  "Há tradições que distinguem uma santificação inicial de um desenvolvimento ao longo da vida. A herança wesleyana enfatiza a graça santificadora e o amor a Deus e ao próximo; outras tradições organizam a discussão de modo diferente. Essa diversidade ajuda a compreender por que termos como perfeição, crescimento e santidade precisam ser explicados em seu contexto, em vez de serem tratados como sinônimos de ausência de limitações humanas.",
);
const atonement = primer(
  "salvation",
  ["augsburg", "dort", "mennonite"],
  "Expiação trata de como a obra de Cristo é relacionada ao pecado e à reconciliação com Deus. A linguagem pode reunir sacrifício, resgate, vitória, representação e perdão. Cada imagem traz um campo de relações: dívida e libertação não são exatamente o mesmo problema que culpa e juízo, embora uma tradição possa articulá-los.",
  "Os modelos de expiação não são simplesmente nomes de denominações. Um mesmo autor pode combinar elementos de vitória sobre a morte, ação em favor de outros e transformação da vida. A interpretação de uma passagem sacrificial também depende do contexto de culto e aliança; a mera presença de sangue ou sacrifício não identifica automaticamente uma teoria penal completa.",
);

export const DOCTRINE_PRIMERS: Readonly<Record<string, TopicPrimer>> = {
  "topic:bibliology": primer(
    "reading",
    ["dei-verbum", "catechism-scripture"],
    "Bibliologia é o estudo da Bíblia enquanto coleção de escritos recebidos como Escritura. Ela inclui composição, transmissão, cânon, inspiração, tradução e interpretação. Essas perguntas se relacionam, mas exigem evidências diferentes: comparar manuscritos não equivale a estabelecer uma doutrina de inspiração, e descrever um cânon não resolve automaticamente como cada livro deve ser lido.",
    "A Bíblia cristã reúne livros de gêneros e períodos diversos. O reconhecimento desses livros aconteceu em comunidades e não se reduz a uma decisão única tomada de uma vez por todas. A extensão do Antigo Testamento varia entre tradições cristãs. Edição, tradução e cânon também não são a mesma coisa: uma edição pode apresentar escolhas textuais diferentes sem adotar outro conjunto de livros.",
  ),
  "topic:theology-proper": primer(
    "theology",
    ["summa", "catechism-god"],
    "Teologia própria é o campo que trata especificamente de Deus: existência, atributos, unidade, conhecimento, vontade, providência e relação com a criação. O nome distingue esse conjunto de perguntas de outros ramos, como cristologia e eclesiologia. Ele não indica que os demais campos deixem de ser teológicos.",
    "A reflexão clássica discute como aplicar linguagem humana a Deus. Quando um atributo é chamado de analógico, a afirmação procura evitar tanto a identidade simples com uma qualidade humana quanto a ausência completa de significado. Onipotência, por exemplo, exige discutir o que conta como possibilidade; eternidade envolve a relação com o tempo. São problemas conceituais, não apenas uma lista de adjetivos.",
  ),
  "topic:christology": primer(
    "christology",
    ["councils", "oca"],
    "Cristologia investiga quem é Jesus Cristo e como sua identidade se relaciona com sua obra. Os títulos Messias, Filho de Deus, Senhor e Filho do Homem participam de contextos literários diferentes. Uma narrativa sobre cura, uma confissão de fé e uma definição sobre natureza divina não usam o mesmo gênero de linguagem.",
    "O desenvolvimento cristológico discute humanidade, divindade, unidade pessoal, vontade e sofrimento. O vocabulário conciliar procura resguardar tanto a humanidade efetiva de Cristo quanto a identidade do sujeito confessado como divino. A história dessas formulações inclui controvérsias e recepções distintas entre igrejas; ela não deve ser resumida como evolução linear de ignorância para uma solução aceita por todos.",
  ),
  "topic:pneumatology": primer(
    "spirit",
    ["oca", "pentecostal"],
    "Pneumatologia é a reflexão sobre o Espírito Santo. Ela reúne o estudo da linguagem bíblica de sopro e espírito, da formulação trinitária e das afirmações sobre inspiração, dons e santificação. Esses níveis se relacionam sem serem idênticos: um relato de experiência religiosa não é, por si só, uma definição sobre a relação do Espírito com o Pai e o Filho.",
    "A ação do Espírito é interpretada em relação à vida da comunidade e ao testemunho de Cristo. O debate sobre carismas envolve continuidade, diversidade e critérios de discernimento. Tradições pentecostais dão destaque particular a certas experiências, mas não esgotam toda a pneumatologia cristã.",
  ),
  "topic:anthropology": primer(
    "humanity",
    ["summa", "catechism-god"],
    "Antropologia teológica pergunta o que significa ser humano à luz de criação, imagem de Deus, liberdade, pecado e destino. Ela não é uma substituta da biologia ou da antropologia social: trabalha uma interpretação da condição humana em relação a Deus e a uma compreensão de dignidade e responsabilidade.",
    "A unidade entre corpo e vida pessoal ocupa lugar central. Modelos sobre alma, racionalidade e relação não são equivalentes; cada um destaca aspectos do que constitui a pessoa. A linguagem da imagem de Deus também pode indicar uma vocação e uma relação, e não apenas a posse de uma capacidade que alguns indivíduos teriam em grau maior que outros.",
  ),
  "topic:hamartiology": primer(
    "humanity",
    ["catechism-god", "augsburg"],
    "Hamartiologia é o estudo do pecado. O termo organiza perguntas sobre ações erradas, disposições, relações rompidas e a condição humana. Nos textos bíblicos, imagens de desvio, dívida, escravidão e morte mostram que o tema não cabe inteiramente em uma única categoria jurídica ou psicológica.",
    "A relação entre pecado individual e condição coletiva é uma dificuldade central. Uma teoria pode enfatizar culpa, outra corrupção e mortalidade, e outra hábitos e estruturas que condicionam a ação. É preciso reconhecer qual dessas questões está em jogo antes de comparar respostas. A doutrina do pecado original é uma formulação específica dentro desse campo mais amplo.",
  ),
  "topic:soteriology": primer(
    "salvation",
    ["augsburg", "mennonite", "wesley"],
    "Soteriologia é o estudo da salvação: de que condição o ser humano é salvo, por quem e para qual forma de vida. Reconciliação, libertação, perdão, cura e participação na vida divina são imagens relacionadas, mas destacam dimensões diferentes. Uma exposição que trate salvação apenas como destino após a morte perde parte desse vocabulário.",
    "O campo envolve a obra de Cristo, a graça, a fé, a liberdade, a Igreja e a transformação da vida. As tradições diferem na organização dessas relações. O debate sobre a iniciativa divina, por exemplo, não é resolvido apenas afirmando que uma comunidade valoriza a graça: a questão é como ela entende essa iniciativa e sua relação com a resposta humana.",
  ),
  "topic:ecclesiology": primer(
    "church",
    ["oca", "clement", "baptist"],
    "Eclesiologia é o campo que estuda a Igreja: sua identidade, unidade, autoridade, organização e missão. O termo assembleia aponta para uma comunidade convocada; imagens como corpo e templo articulam pertencimento e diversidade. A descrição de uma instituição atual não pode ser projetada sem argumento sobre todos os escritos antigos.",
    "Episcopal, presbiteral e congregacional designam maneiras de organizar autoridade e responsabilidade, com variações internas. A discussão também envolve a relação entre comunidade local e comunhão mais ampla. Uma divergência de governo não implica automaticamente divergência em toda doutrina, assim como um nome institucional comum não garante identidade completa de práticas.",
  ),
  "topic:sacramentology": primer(
    "church",
    ["didache", "augsburg", "anglican"],
    "Sacramentologia é o estudo dos sacramentos e de sua relação com fé, graça e vida comunitária. Os ritos são feitos de elementos materiais, palavras e gestos situados em uma tradição de prática e interpretação. Sua compreensão envolve o que é celebrado, quem participa e como o sinal se relaciona com a realidade que anuncia.",
    "As comunidades cristãs não classificam todos os ritos da mesma maneira. Também divergem quanto à presença de Cristo, à eficácia e à relação entre rito e fé. Reconhecer essa diversidade evita reduzir o debate à oposição entre algo meramente simbólico e algo real: diferentes tradições atribuem funções fortes aos símbolos sem usar a mesma explicação teológica.",
  ),
  "topic:eschatology": primer(
    "hope",
    ["oca", "pentecostal"],
    "Escatologia é a reflexão sobre a esperança e a realização final: morte, ressurreição, juízo e renovação da criação. Ela relaciona futuro e presente, porque uma compreensão do destino humano também organiza expectativas, responsabilidade e ação. Não é apenas uma cronologia de acontecimentos futuros.",
    "As interpretações de textos apocalípticos precisam considerar símbolos e gêneros. Um número ou uma visão não funciona necessariamente como previsão técnica que possa ser transferida diretamente para um calendário contemporâneo. Há diferenças entre explicar a imagem no contexto do texto e aplicá-la a uma situação posterior.",
  ),
  "topic:atonement": atonement,
  "doctrine:atonement": atonement,
  "topic:justification": justification,
  "doctrine:justification": justification,
  "topic:sanctification": sanctification,
  "doctrine:sanctification": sanctification,
  "doctrine:trinity": primer(
    "christology",
    ["trinity", "oca", "catechism-god"],
    "Trindade é a doutrina que articula a unidade de Deus com a distinção entre Pai, Filho e Espírito Santo. Na formulação nicena clássica, a unidade não é uma associação de três deuses, e a distinção não é uma simples troca de papéis de um único personagem. O desafio está em explicar como a identidade divina é compartilhada sem apagar as relações.",
    "Pessoa e essência são termos técnicos nesse debate. Pessoa não corresponde diretamente à ideia cotidiana de três indivíduos independentes; essência não é uma matéria dividida em partes. Essas distinções explicam por que analogias populares podem ajudar em um aspecto e falhar em outro. A história da doutrina também envolve diferenças entre linguagem litúrgica, interpretação bíblica e elaboração filosófica.",
  ),
  "doctrine:incarnation": primer(
    "christology",
    ["councils", "oca"],
    "Encarnação é a afirmação cristã de que o Filho ou Logos assumiu a humanidade em Jesus Cristo. O termo não significa apenas aparecer em forma humana. A formulação clássica procura afirmar uma vida humana efetiva — nascimento, ação, sofrimento e morte — sem abandonar a identidade divina de Cristo.",
    "A expressão de João 1 sobre o Logos que se faz carne participa de uma narrativa sobre revelação e presença. Os debates posteriores empregam outro vocabulário para explicar essa relação. Distinguir esses níveis permite compreender o desenvolvimento doutrinário sem atribuir ao evangelista todas as categorias de um concílio posterior.",
  ),
  "doctrine:two-natures": primer(
    "christology",
    ["councils", "coptic"],
    "A doutrina das duas naturezas afirma, no vocabulário de Calcedônia, a integridade da humanidade e da divindade de Cristo em uma única pessoa. A distinção de naturezas não pretende criar dois Cristos; a unidade pessoal não pretende misturar humanidade e divindade em uma terceira natureza.",
    "A controvérsia envolve o sentido de termos que foram usados de modos diferentes. As igrejas ortodoxas orientais não devem ser descritas automaticamente como se negassem a humanidade de Cristo. Sua linguagem da unidade exige leitura em seu próprio contexto. O desacordo histórico não se explica corretamente apenas pela contagem das palavras uma e duas.",
  ),
  "doctrine:resurrection": primer(
    "hope",
    ["oca", "augsburg"],
    "A ressurreição de Cristo é uma afirmação central da fé cristã sobre a superação da morte e a identidade do crucificado como vivo. Ela não é apenas uma metáfora da continuidade de uma lembrança. Os textos que a narram e confessam, porém, apresentam gêneros, ênfases e problemas interpretativos diferentes.",
    "O estudo pode distinguir a confissão religiosa, a análise das narrativas e a investigação histórica sobre os testemunhos. Essas tarefas não possuem exatamente os mesmos critérios. Uma explicação da crença não resolve sozinha a avaliação histórica de cada relato, e a comparação entre relatos não elimina a necessidade de compreender o significado teológico atribuído ao acontecimento.",
  ),
  "doctrine:original-sin": primer(
    "humanity",
    ["catechism-god", "augsburg", "oca"],
    "Pecado original é uma formulação sobre a condição humana que antecede escolhas individuais. Ela procura explicar a universalidade do pecado e da necessidade de graça, relacionando a humanidade à narrativa de Adão. Não é simplesmente outro nome para a primeira ação errada de cada pessoa.",
    "As tradições diferem na relação entre culpa, corrupção, mortalidade e transmissão dessa condição. A formulação latina de culpa herdada não pode ser atribuída sem distinções ao cristianismo oriental. Também há diferença entre uma narrativa teológica de origem e uma teoria biológica: o conteúdo de uma não deve ser convertido automaticamente nas categorias da outra.",
  ),
  "doctrine:election": primer(
    "salvation",
    ["dort", "westminster", "wesley"],
    "Eleição é a linguagem da escolha divina; predestinação trata da relação entre essa escolha e o destino humano. Os debates discutem a iniciativa de Deus, a fé, a liberdade e a perseverança. A doutrina não pode ser reduzida à ideia cotidiana de que tudo acontece por acaso ou de que cada ação humana é irrelevante.",
    "Na tradição reformada, os Cânones de Dort articulam a eleição em uma controvérsia específica com posições remonstrantes. Tradições wesleyanas organizam de outra maneira a relação entre graça e resposta. O sentido de uma afirmação depende também de a eleição ser tratada individualmente, comunitariamente ou em relação à vocação histórica de um povo.",
  ),
  "doctrine:baptism": primer(
    "church",
    ["didache", "baptist", "augsburg"],
    "Batismo é um rito cristão de iniciação associado à água e à linguagem de purificação, morte e vida nova, pertencimento e recepção da fé. Os debates tratam tanto de quem pode ser batizado quanto de como o rito se relaciona com fé e graça. O tema não se resume à quantidade de água utilizada.",
    "A Didaquê preserva instruções antigas sobre formas de realizar o rito. Igrejas que batizam crianças e igrejas que o reservam a professantes apresentam argumentos diferentes sobre aliança, comunidade e fé. Algumas o descrevem como sacramento e outras como ordenança; os termos exigem explicação, porque não indicam automaticamente ausência ou presença de significado espiritual.",
  ),
  "doctrine:eucharist": primer(
    "church",
    ["didache", "augsburg", "anglican"],
    "Eucaristia e Ceia do Senhor designam a celebração cristã que relaciona pão e vinho à memória de Cristo, à ação de graças e à comunhão. A prática envolve a comunidade, sua compreensão da presença de Cristo e a relação entre celebração e vida ética.",
    "As tradições divergem sobre como explicar essa presença e a eficácia do rito. Transubstanciação, presença sacramental, participação espiritual e memorial são formulações que não podem ser tratadas como simples variações de uma palavra. O fato de uma tradição enfatizar memória também não permite concluir, sem examinar suas fontes, que ela considere a celebração irrelevante ou inteiramente vazia de participação.",
  ),
  "doctrine:scriptural-inspiration": primer(
    "reading",
    ["dei-verbum", "baptist", "catechism-scripture"],
    "Inspiração é uma afirmação teológica sobre a relação entre Deus, autores humanos e Escritura. Ela não é o mesmo que ditado mecânico nem se confunde com o reconhecimento do cânon. As tradições discutem como relacionar ação divina, linguagem humana, gêneros e circunstâncias históricas.",
    "Inspiração, inerrância, autoridade e interpretação são conceitos relacionados, mas distintos. Uma posição sobre inspiração ainda precisa explicar como uma passagem deve ser lida. Reconhecer linguagem figurada, por exemplo, não significa necessariamente negar autoridade ao texto; pode ser precisamente uma exigência de respeitar o tipo de comunicação que ele realiza.",
  ),
  "doctrine:canon": primer(
    "reading",
    ["catechism-scripture", "anglican", "westminster"],
    "Cânon é o conjunto de escritos reconhecidos como normativos por uma comunidade. A história do cânon envolve circulação, uso litúrgico, ensino, controvérsias e listas de livros. Essa história é diferente da crítica textual, que compara as formas transmitidas de um escrito já identificado.",
    "Há diferenças entre cânones cristãos, especialmente na extensão do Antigo Testamento. A existência de um texto antigo não significa que ele tenha tido o mesmo status em todas as comunidades. Também é incorreto supor que o Concílio de Niceia simplesmente tenha escolhido toda a Bíblia em uma votação única: a formação e a recepção dos conjuntos de livros pertencem a uma história mais ampla.",
  ),
  "doctrine:church-authority": primer(
    "church",
    ["dei-verbum", "oca", "baptist"],
    "Autoridade da Igreja diz respeito a como uma comunidade reconhece e transmite ensino, toma decisões e exerce responsabilidade. A pergunta envolve Escritura, tradição, liderança e participação dos fiéis. Autoridade de um ofício e autoridade de um argumento não são exatamente a mesma coisa.",
    "O catolicismo formula a relação entre Escritura, tradição e magistério; a ortodoxia destaca a continuidade de vida e fé da Igreja; tradições congregacionais enfatizam a responsabilidade da comunidade local sob a Escritura. Esses panoramas não eliminam a diversidade interna. Uma comparação precisa distinguir a descrição de um ideal confessional da investigação sobre seu exercício histórico.",
  ),
  "doctrine:resurrection-dead": primer(
    "hope",
    ["oca", "anglican"],
    "Ressurreição dos mortos é a esperança de que a morte não tenha a última palavra sobre a pessoa. Na formulação cristã clássica, ela envolve a renovação da vida e não apenas a permanência de uma lembrança ou a sobrevivência de uma parte imaterial.",
    "A relação entre continuidade e transformação é central: como afirmar que é a mesma pessoa e, ao mesmo tempo, uma existência transformada? As imagens bíblicas sobre corpo, semente e vida futura participam dessa discussão. Elas não oferecem necessariamente uma descrição física detalhada do futuro, e suas interpretações precisam respeitar o gênero e o argumento de cada passagem.",
  ),
  "doctrine:final-judgment": primer(
    "hope",
    ["oca", "pentecostal"],
    "Juízo final é a linguagem da responsabilidade humana diante de Deus e da realização de justiça. Ela relaciona a história de cada pessoa a uma perspectiva que não se esgota no reconhecimento social imediato. Nos textos cristãos, o tema aparece associado a verdade, obras, misericórdia e esperança.",
    "As representações de tribunal, separação e revelação utilizam imagens para expressar essas relações. As tradições discutem como relacionar juízo, graça e destino último. Uma imagem de condenação em um texto não resolve, sozinha, todos os problemas sobre alcance, duração e natureza do juízo; essas conclusões dependem de uma argumentação mais ampla.",
  ),
};
