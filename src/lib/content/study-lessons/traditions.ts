import type { TopicPrimer } from "./types";
const p = (references: string[], ...paragraphs: string[]): TopicPrimer => ({
  family: "history",
  references,
  paragraphs,
});

export const TRADITION_PRIMERS: Readonly<Record<string, TopicPrimer>> = {
  "tradition:roman-catholic": p(
    ["dei-verbum", "catechism-scripture"],
    "A tradição católica romana articula sua identidade pela comunhão com o bispo de Roma, pela vida sacramental e pela relação entre Escritura, tradição e magistério. O termo romana não descreve toda a diversidade ritual do catolicismo: há igrejas católicas orientais com patrimônios próprios.",
    "Na Dei Verbum, Escritura e tradição são apresentadas como relacionadas à transmissão da revelação, e o magistério é descrito como seu serviço de interpretação, não como uma fonte independente acima da palavra de Deus. Essa é uma formulação confessional católica. Seu estudo histórico inclui também como essas relações foram compreendidas e exercidas em contextos diferentes.",
  ),
  "tradition:eastern-orthodox": p(
    ["oca"],
    "A ortodoxia oriental bizantina reúne igrejas que compartilham uma tradição litúrgica e doutrinária ligada à recepção dos concílios ecumênicos e à continuidade da vida da Igreja. Não é uma organização mundial governada de maneira idêntica ao modelo papal católico.",
    "Escritura, liturgia, concílios e tradição patrística são compreendidos em sua relação com a fé vivida da comunidade. A exposição da Orthodox Church in America é uma porta de entrada para essa autocompreensão, não uma descrição exaustiva de toda diferença histórica ou administrativa entre igrejas ortodoxas.",
  ),
  "tradition:oriental-orthodox": p(
    ["coptic", "councils"],
    "As igrejas ortodoxas orientais, entre elas a copta, pertencem a uma família histórica distinta da ortodoxia bizantina. A diferença de nomes em português pode esconder essa distinção. A recepção de Calcedônia ocupa lugar importante na história de sua separação e de seus diálogos posteriores.",
    "Sua cristologia enfatiza a unidade de Cristo e não deve ser apresentada automaticamente como negação de sua humanidade. A interpretação de termos como natureza exige atenção ao vocabulário utilizado por cada tradição. Uma classificação produzida por adversários de uma controvérsia não substitui a leitura das fontes da própria comunidade.",
  ),
  "tradition:church-of-east": p(
    ["east", "councils"],
    "A Igreja do Oriente se desenvolveu no cristianismo de língua siríaca oriental, em uma história que não pode ser resumida aos limites do antigo Império Romano. Sua vida litúrgica, transmissão textual e expansão missionária constituem um patrimônio próprio.",
    "O nome nestoriana é historicamente usado para classificá-la, mas pode reduzir sua autocompreensão a uma controvérsia e a um autor. A tradição precisa ser estudada por suas fontes e sua linguagem. Sua centralidade da Eucaristia, chamada Qurbana Qadisha, mostra também a importância do culto para compreender sua identidade.",
  ),
  "tradition:lutheran": p(
    ["augsburg"],
    "A tradição luterana se vincula à Reforma do século XVI e à recepção de suas confissões, entre elas a Confissão de Augsburgo. A justificação por causa de Cristo mediante a fé ocupa lugar estruturante, relacionada à pregação, aos sacramentos e à compreensão da vida cristã.",
    "Isso não significa que as obras sejam consideradas sem importância. O debate distingue o fundamento da aceitação por Deus e os frutos da fé na vida. Também há diversidade histórica e institucional entre igrejas luteranas. Para compreender uma posição concreta, o documento confessional é um ponto de partida mais preciso que um estereótipo sobre toda a Reforma.",
  ),
  "tradition:reformed": p(
    ["westminster", "dort"],
    "A tradição reformada reúne correntes da Reforma que desenvolveram exposições sobre soberania divina, aliança, graça, Igreja e culto. Confissões como Westminster e os Cânones de Dort documentam partes importantes desse patrimônio, mas não esgotam toda a diversidade reformada.",
    "A discussão sobre eleição costuma receber destaque, embora seja apenas uma parte do conjunto. A teologia da aliança organiza relações entre textos e períodos bíblicos, enquanto diferentes formas de governo eclesiástico tratam da vida comunitária. Uma apresentação restrita a cinco pontos perde a amplitude histórica e teológica dessa tradição.",
  ),
  "tradition:anglican": p(
    ["anglican"],
    "A tradição anglicana se desenvolveu a partir da Reforma inglesa e de sua continuidade litúrgica e institucional. O Livro de Oração Comum e os Trinta e Nove Artigos são testemunhos importantes de sua organização de culto e ensino.",
    "O anglicanismo contém correntes que enfatizam aspectos evangélicos, católicos e outros modos de articulação da tradição. A expressão via média não explica sozinha essa diversidade. O peso normativo de um documento histórico e a prática de uma comunidade atual precisam ser investigados de forma situada.",
  ),
  "tradition:anabaptist": p(
    ["mennonite"],
    "Anabatismo designa correntes da Reforma que deram destaque à profissão pessoal de fé, ao discipulado e à comunidade de crentes. O nome se relaciona a controvérsias sobre o batismo de pessoas anteriormente batizadas quando crianças.",
    "Tradições menonitas preservam parte desse patrimônio, com ênfases como seguimento de Jesus, vida comunitária e não violência. Não se deve supor que todas as correntes anabatistas, históricas ou atuais, compartilhem exatamente as mesmas posições. Uma confissão menonita é uma fonte localizada, não uma descrição automática de todo o movimento.",
  ),
  "tradition:baptist": p(
    ["baptist"],
    "Tradições batistas destacam o batismo ligado à profissão de fé e a responsabilidade da comunidade local. Sua história inclui diferentes associações e confissões, e não uma autoridade mundial única que formule a posição de todos os batistas.",
    "Há diferenças importantes entre batistas quanto a eleição, formas de cooperação e diversas questões de prática e teologia. A Baptist Faith and Message é um documento da Convenção Batista do Sul dos Estados Unidos. Ela fornece conteúdo concreto para estudar essa vertente, mas não deve ser apresentada como se representasse todos os batistas do mundo.",
  ),
  "tradition:wesleyan-methodist": p(
    ["wesley"],
    "A tradição wesleyana e metodista associa sua formação a John Wesley e a movimentos de renovação da vida cristã. Sua compreensão da graça relaciona iniciativa divina, resposta da fé e transformação em amor a Deus e ao próximo.",
    "Graça preveniente, justificadora e santificadora descrevem dimensões dessa ação. A ênfase em santidade não deve ser reduzida a uma perfeição sem qualquer limite humano. Na apresentação metodista, ela trata da formação de uma vida orientada pelo amor, em relações pessoais e comunitárias.",
  ),
  "tradition:pentecostal": p(
    ["pentecostal"],
    "O pentecostalismo é um conjunto diverso de movimentos cristãos que enfatizam a ação do Espírito, os dons e a experiência religiosa. Não é uma denominação única. Diferentes comunidades organizam de modos distintos batismo no Espírito, glossolalia, cura, missão e santificação.",
    "A declaração de verdades fundamentais das Assembleias de Deus dos Estados Unidos apresenta uma formulação concreta de parte desse universo. Ela não representa automaticamente todo grupo pentecostal, nem autoriza atribuir a todos as mesmas posições sobre Trindade, organização eclesiástica e doutrinas escatológicas.",
  ),
  "tradition:restorationist": p(
    ["restoration"],
    "Restauracionismo designa projetos que propõem recuperar uma forma de cristianismo considerada originária. A expressão pode ser aplicada a movimentos diferentes e não identifica uma doutrina única. No movimento associado a Stone e Campbell, a busca de unidade cristã e o apelo ao Novo Testamento tiveram papel importante.",
    "Os resultados históricos incluem comunidades com práticas e posições distintas. A afirmação de restaurar a Igreja inicial é uma proposta de interpretação da história, não uma demonstração de identidade direta entre uma instituição atual e todas as comunidades do primeiro século. A comparação exige examinar quais elementos são considerados normativos e por quê.",
  ),
};
