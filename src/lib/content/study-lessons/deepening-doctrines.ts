import { deepStudy as d, type DeepStudy } from "./deepening-types";

const atonement = d(
  "Uma explicação da expiação precisa ligar um problema a uma ação e a um resultado. Se o problema é cativeiro, a linguagem de libertação ilumina o resultado; se é alienação, a reconciliação ganha destaque. Pergunte o que cada imagem explica e quais premissas são acrescentadas para transformá-la em um modelo teológico. Uma palavra bíblica não contém sozinha todo um sistema posterior.",
  "Compare Romanos 3:21–26 e Colossenses 2:13–15. No primeiro trecho, acompanhe justiça, fé e redenção; no segundo, perdão e triunfo. Observe os agentes e a sequência dos argumentos. Não conclua que os textos se contradizem porque empregam imagens diferentes, nem que as imagens podem ser trocadas sem perda de sentido.",
  "Escolha uma imagem e reconstrua seu argumento: condição humana, ação de Cristo, efeito e resposta esperada. Em seguida, formule uma dificuldade que a imagem deixa aberta. Compare sua resposta com uma fonte identificada, distinguindo a explicação do autor e sua própria tentativa de integrá-la a outras passagens.",
);
const justification = d(
  "A distinção entre fundamento, meio e consequência evita boa parte da confusão sobre justificação. Uma tradição pode negar que obras sejam o fundamento da aceitação divina e afirmar que elas são fruto necessário da fé. Outra pode integrar transformação e justiça numa explicação diferente. A comparação exige reconstruir essas relações, e não apenas contar quantas vezes aparece a palavra fé.",
  "Leia Romanos 4:1–12 e Tiago 2:14–26. Identifique o interlocutor e a tese criticada em cada unidade. Pergunte como Abraão participa de cada argumento. Antes de declarar concordância ou contradição, examine se os autores estão enfrentando a mesma pergunta e usando obras e fé com o mesmo alcance.",
  "Faça um quadro de duas posições confessionais com fundamento da justificação, papel da fé, lugar das obras e possibilidade de crescimento. Cite o artigo ou a seção de cada fonte. Sua conclusão deve explicar uma divergência real sem reduzir uma das posições à caricatura de salvação comprada por boas ações.",
);
const sanctification = d(
  "Santificação envolve direção da vida e formação de hábitos, não apenas momentos de intensidade religiosa. Diferencie consagração, crescimento moral e consumação: podem ser articulados, mas respondem a perguntas diferentes. A linguagem de santidade também é comunitária; relações injustas não deixam de importar porque alguém descreve uma experiência interior de proximidade com Deus.",
  "Em Romanos 6:1–14, acompanhe a objeção inicial e a relação entre união com Cristo e ação concreta. Compare Gálatas 5:13–26, observando liberdade, serviço e fruto do Espírito. Não transforme uma lista de virtudes em instrumento para diagnosticar a vida espiritual de outras pessoas sem conhecer seu contexto.",
  "Explique uma relação entre graça e prática usando as duas unidades. Distinga o que o texto afirma da disciplina pessoal que você propõe adotar. Ao consultar uma fonte wesleyana ou luterana, registre como ela relaciona justificação e santificação e qual problema a distinção procura resolver.",
);

export const DOCTRINE_DEEPENING: Readonly<Record<string, DeepStudy>> = {
  "topic:bibliology": d(
    "Transmissão, reconhecimento e autoridade pertencem a planos distintos. A história de um manuscrito investiga como uma forma textual chegou até nós; a história do cânon investiga como escritos foram recebidos em coleções; uma doutrina de inspiração pergunta pela relação entre Deus e esses escritos. Usar a resposta de um plano como prova automática de outro produz um salto no argumento.",
    "Leia Lucas 1:1–4: o autor menciona relatos anteriores, testemunhas, investigação e finalidade. Descreva como essas ações humanas aparecem no próprio texto. Depois, compare a apresentação de uma edição da Bíblia instalada: quais escolhas de tradução, texto-base e notas são informadas? Esses dados ajudam a avaliar o material sem decidir por si mesmos sua autoridade religiosa.",
    "Escolha um livro e registre gênero, edição, texto-base quando informado e posição em uma coleção. Separe uma pergunta histórica e uma pergunta confessional. A síntese deve mostrar que reconhecer diversidade literária não equivale a negar valor religioso, e que afirmar inspiração não dispensa investigar transmissão e interpretação.",
  ),
  "topic:theology-proper": d(
    "A doutrina de Deus relaciona atributos para evitar contradições internas. Dizer que Deus é bom não significa simplesmente aumentar a bondade humana até o infinito. Na linguagem analógica, há uma relação de sentido e uma diferença no modo de possuir a perfeição. A linguagem negativa também tem função: negar limitações não fornece, por si, uma descrição completa de Deus.",
    "Compare Êxodo 3:7–15 e Isaías 40:12–31. Um relato articula identidade, presença e missão; o discurso profético mobiliza perguntas e imagens sobre poder e incomparabilidade. Explique o que cada gênero permite afirmar. A passagem de uma imagem corporal para uma tese sobre a natureza divina precisa ser argumentada.",
    "Escolha bondade, eternidade ou poder. Defina a pergunta envolvida, identifique um uso bíblico e formule uma objeção conceitual. Ao ler Tomás, diferencie a tese que ele defende das objeções que apresenta antes da resposta. Não atribua ao autor uma frase apenas porque ela está impressa na questão.",
  ),
  "topic:christology": d(
    "A cristologia relaciona identidade e ação: quem é aquele que ensina, sofre e salva? A distinção entre pessoa e natureza procura responder a esse problema sem apresentar dois sujeitos independentes ou uma humanidade aparente. O vocabulário dos concílios delimita afirmações; não pretende funcionar como descrição física de duas partes misturadas dentro de Jesus.",
    "Compare Marcos 8:27–35 e Filipenses 2:5–11. Observe pergunta, anúncio e discipulado no primeiro; exortação comunitária e trajetória de humilhação e exaltação no segundo. Uma formulação doutrinária pode relacionar os trechos, mas precisa conservar a função que cada unidade exerce no livro onde aparece.",
    "Explique por que a identidade de Jesus importa para a interpretação de sua obra. Depois, escolha uma expressão de Calcedônia e indique qual tipo de afirmação ela tenta excluir. Registre a perspectiva da fonte e uma dificuldade de tradução ou de vocabulário que permaneça aberta.",
  ),
  "topic:pneumatology": d(
    "Distinguir dom, fruto e ministério permite examinar experiências sem confundir visibilidade com maturidade. Um dom se relaciona à edificação; fruto descreve a forma de vida; ministério envolve serviço e responsabilidade. Também é preciso distinguir a ação atribuída ao Espírito de uma definição sobre sua identidade na doutrina trinitária.",
    "Leia 1 Coríntios 12:4–27 e 14:1–19. Observe diversidade, corpo e inteligibilidade. Compare Gálatas 5:13–26 para reconhecer uma discussão de caráter ético. Não use um relato particular de Atos como regra universal sem explicar por que a sequência narrada deveria ser normativa em toda comunidade.",
    "Escolha uma prática ou experiência mencionada por uma tradição cristã. Registre seu critério de discernimento, as passagens utilizadas e a finalidade comunitária. Sua análise deve reconhecer tanto a importância da experiência para a comunidade quanto a necessidade de avaliar suas interpretações e consequências.",
  ),
  "topic:anthropology": d(
    "A imagem de Deus pode ser investigada como capacidade, relação, função e vocação. Essas propostas não são necessariamente excludentes, mas cada uma enfrenta dificuldades próprias. Se a dignidade depender exclusivamente do desempenho de uma faculdade, será preciso explicar a dignidade de crianças ou de pessoas com limitações cognitivas. O problema mostra por que definição e consequência ética devem ser examinadas juntas.",
    "Leia Gênesis 1:26–31 e 2:4–25 como unidades literárias diferentes antes de reuni-las. Observe humanidade, relação com o mundo, trabalho e companhia. Pergunte o que o texto explicita e o que uma teoria posterior acrescenta sobre alma, consciência e liberdade. Nem toda questão filosófica recebe uma resposta técnica nessas narrativas.",
    "Reconstrua uma interpretação da imagem de Deus e teste suas consequências para dignidade, cuidado e responsabilidade. Cite a passagem e a fonte interpretativa. Indique pelo menos uma questão que depende de discussão filosófica adicional, sem apresentar a teologia como substituta de evidência biológica ou social.",
  ),
  "topic:hamartiology": d(
    "Pecado pode designar ato, disposição e condição de relações rompidas. Culpa, consequência, tentação e sofrimento também precisam ser distinguidos. Nem todo sofrimento demonstra culpa individual, e reconhecer condicionamentos não elimina automaticamente responsabilidade. Um argumento responsável explica o tipo de vínculo que está afirmando, em vez de deduzir a condição moral de alguém a partir de sua dor.",
    "Compare Gênesis 3:1–24, Romanos 7:14–25 e João 9:1–3. Observe narrativa, conflito argumentado e pergunta sobre sofrimento. Não transforme as três unidades em um diagnóstico psicológico único. Pergunte o que cada uma apresenta sobre desejo, responsabilidade e explicações apressadas da condição humana.",
    "Escolha uma afirmação sobre pecado e classifique se trata de ação, disposição ou condição. Explique a evidência textual e uma consequência ética de sua interpretação. Inclua um cuidado necessário para não culpar vítimas nem reduzir problemas sociais a falhas individuais de devoção.",
  ),
  "topic:soteriology": d(
    "Uma exposição da salvação precisa esclarecer origem, conteúdo e finalidade. Pergunte de que condição se fala, como a obra de Cristo é compreendida e que forma de vida é anunciada. A ordem desses temas varia entre tradições; reunir palavras de sistemas diferentes não produz automaticamente uma síntese coerente.",
    "Leia Efésios 2:1–22 em duas partes e depois como um todo. A passagem da condição anterior à vida recebida se conecta à formação de uma comunidade e à superação de separações. Observe como uma leitura restrita ao destino individual após a morte deixa de explicar parte da unidade.",
    "Desenhe o argumento de uma tradição sobre salvação: iniciativa divina, resposta humana, comunidade e esperança. Compare com outra fonte em uma questão delimitada. A conclusão deve identificar a premissa em que divergem e não apenas repetir que ambas valorizam graça e fé.",
  ),
  "topic:ecclesiology": d(
    "Igreja pode ser estudada como comunidade concreta, instituição histórica e realidade confessada. Uma afirmação normativa sobre o que ela deve ser não equivale a uma descrição de todas as suas práticas. A distinção permite investigar conflito e fracasso sem confundir a autodescrição de uma comunidade com um retrato completo de sua história.",
    "Em 1 Coríntios 12:12–27, examine como unidade e diversidade funcionam na imagem do corpo. Compare Atos 15:1–29 quanto a controvérsia, testemunho e decisão. Não projete automaticamente um sistema moderno de governo sobre os episódios: primeiro descreva os procedimentos e as responsabilidades apresentados.",
    "Compare uma fonte episcopal e uma congregacional ou presbiteral sobre autoridade. Identifique quem decide, com quais limites e por quais razões. Em vez de procurar qual estrutura tem um nome mais antigo, explique como cada argumento relaciona Escritura, continuidade e responsabilidade comunitária.",
  ),
  "topic:sacramentology": d(
    "Sinal, promessa, participação e eficácia organizam perguntas diferentes sobre os sacramentos. A oposição entre símbolo e realidade é insuficiente: um sinal pode ter função constitutiva numa relação. O debate exige explicar quem age, o que é prometido, como a fé se relaciona ao rito e qual diferença se atribui à sua celebração.",
    "Compare Romanos 6:1–14 e 1 Coríntios 11:17–34. Observe união com Cristo no primeiro e conduta comunitária na ceia no segundo. O contexto de desigualdade importa para interpretar o rito. Não separe a discussão sobre presença e eficácia das relações entre as pessoas que celebram.",
    "Escolha batismo ou ceia e compare duas exposições confessionais. Registre elementos, palavras, sujeitos, promessa e relação com a fé. Conclua identificando uma divergência conceitual e uma convergência prática, sem presumir equivalência entre todos os usos da palavra sacramento.",
  ),
  "topic:eschatology": d(
    "Esperança final, expectativa de acontecimentos e linguagem apocalíptica não são a mesma tarefa. A escatologia também pergunta pelo sentido da morte, do juízo e da renovação da criação. Uma interpretação ganha força quando explica imagens dentro da obra e sua função para os destinatários, em vez de depender de semelhanças vagas com notícias recentes.",
    "Leia 1 Coríntios 15:12–28 e Apocalipse 21:1–8. Identifique argumento numa unidade e visão na outra. Compare o que cada texto permite dizer sobre vida, morte e esperança. A diferença de gênero impede tratar todos os detalhes como peças de um calendário técnico.",
    "Formule uma tese sobre esperança cristã com uma evidência de cada unidade. Identifique qual parte é interpretação simbólica e qual é implicação ética. Registre uma questão sobre a qual as tradições divergem e deixe explícita a fonte de sua própria apresentação.",
  ),
  "topic:atonement": atonement, "doctrine:atonement": atonement,
  "topic:justification": justification, "doctrine:justification": justification,
  "topic:sanctification": sanctification, "doctrine:sanctification": sanctification,
  "doctrine:trinity": d(
    "A doutrina trinitária relaciona unidade de Deus, distinção entre Pai, Filho e Espírito e atribuição de divindade. Não se trata de somar três exemplares de uma espécie. Pessoa, nesse vocabulário, não pode ser simplesmente igualada à noção moderna de indivíduo independente. Analogias de água, família ou partes de um objeto esclarecem um aspecto e podem distorcer outros.",
    "Compare Mateus 28:16–20 e 2 Coríntios 13:11–13, reconhecendo comissão e bênção. Identifique os termos do texto antes de apresentar uma formulação posterior. Depois, observe no credo niceno a distinção entre afirmações sobre o Pai, o Filho e o Espírito. Relacionar as fontes exige um argumento de recepção.",
    "Explique o problema que uma analogia trinitária tenta resolver e onde ela falha. Reescreva sua explicação sem depender da analogia. Diferencie confessar a doutrina, reconstruir sua história e avaliar sua coerência filosófica; uma investigação pode relacionar essas tarefas sem fingir que são idênticas.",
  ),
  "doctrine:incarnation": d(
    "A encarnação afirma algo sobre a identidade do sujeito e sua humanidade, não apenas a presença de uma mensagem divina num ser humano. O problema cristológico é preservar humanidade efetiva e unidade de Cristo. Pergunte por isso quem nasce e sofre e como tais ações são atribuídas, em vez de imaginar uma mistura física de substâncias.",
    "Leia João 1:1–18 e Hebreus 2:14–18. No prólogo, acompanhe Palavra, criação e carne; em Hebreus, participação na condição humana e auxílio. A comparação mostra por que o tema envolve revelação e salvação, sem tornar equivalentes as estratégias literárias dos dois textos.",
    "Apresente uma relação entre encarnação e salvação, citando as duas unidades. Identifique se sua explicação vem do texto, de Atanásio ou de uma formulação posterior. Uma referência primária deve ser acompanhada pela seção usada, evitando atribuir toda uma teoria a uma frase destacada.",
  ),
  "doctrine:two-natures": d(
    "A linguagem das duas naturezas procura afirmar a humanidade e a divindade de um mesmo Cristo. Natureza responde pelo que se atribui; pessoa identifica o sujeito. Essa distinção não divide a biografia em ações de dois personagens, nem autoriza chamar a humanidade de aparência. O vocabulário serve a delimitações precisas, não a uma descrição anatômica.",
    "Compare a fórmula de Calcedônia com Marcos 14:32–42 e João 1:14. Registre o que a narrativa apresenta sobre sofrimento e vontade, sem transformar a cena em ilustração mecânica de termos posteriores. Pergunte qual afirmação sobre Jesus seria perdida se uma dimensão fosse anulada.",
    "Reconstrua a finalidade de uma das negações de Calcedônia e indique sua perspectiva histórica. Compare a autodescrição de uma igreja ortodoxa oriental antes de classificá-la apenas pelo rótulo usado por adversários. Sem conhecer o sentido dos termos, duas fórmulas podem parecer mais próximas ou distantes do que são.",
  ),
  "doctrine:resurrection": d(
    "Ressurreição de Cristo, ressurreição geral e sobrevivência da alma não são afirmações intercambiáveis. A primeira se refere à identidade e ao destino de Jesus; a segunda, à esperança dos mortos; a terceira pertence a outras discussões antropológicas. Uma comparação responsável identifica qual delas está sendo defendida e em que tipo de fonte.",
    "Leia 1 Coríntios 15:1–19: acompanhe tradição recebida, testemunhas e argumento condicional. Compare João 20:19–29 quanto a reconhecimento e testemunho. Os textos podem integrar uma mesma investigação sem que uma lista de testemunhas e uma narrativa de encontro sejam tratados como gêneros equivalentes.",
    "Explique por que Paulo considera a ressurreição estrutural para seu anúncio. Separe as afirmações da fonte, a avaliação histórica dos testemunhos e sua posição pessoal. O estudo pode registrar compreensão do argumento sem exigir que o leitor simule uma conclusão religiosa que ainda não assumiu.",
  ),
  "doctrine:original-sin": d(
    "O debate envolve solidariedade humana, mortalidade, inclinação e culpa, com organizações distintas entre tradições. Não se deve supor que toda menção ao pecado de Adão já ofereça uma teoria completa de transmissão de culpa. Também é preciso distinguir uma tese sobre condição humana de uma acusação moral contra uma criança ou uma pessoa que sofre.",
    "Leia Romanos 5:12–21 acompanhando o paralelo entre Adão e Cristo. Pergunte como as duas figuras funcionam no argumento e quais questões de tradução ou interpretação afetam a leitura. Compare com Gênesis 3 sem apagar a distância entre narrativa de origem e argumentação de uma carta.",
    "Compare duas fontes sobre o que se transmite ou se compartilha na condição humana. Identifique sua concepção de liberdade e graça. Sua síntese deve mostrar uma divergência específica e reconhecer o que a passagem bíblica não detalha sobre mecanismos de transmissão.",
  ),
  "doctrine:election": d(
    "Eleição envolve a iniciativa de Deus e a relação entre povo, pessoa, finalidade e resposta. Uma tese sobre o destino de indivíduos não deve ser automaticamente inserida em toda passagem sobre a escolha de uma comunidade. O debate também requer distinguir conhecer antecipadamente, querer, permitir e causar: esses verbos não resolvem sozinhos a questão.",
    "Em Efésios 1:3–14, observe a linguagem coletiva, a relação com Cristo e as finalidades apresentadas. Leia Romanos 9–11 como uma discussão extensa antes de selecionar um exemplo isolado. Uma conclusão sobre eleição precisa explicar qual problema o autor enfrenta e o alcance de sua resposta.",
    "Compare Dort e uma exposição wesleyana em uma pergunta: como se relacionam iniciativa divina e resposta humana? Registre os argumentos de cada fonte. Reconstrua uma objeção que seus defensores reconheceriam como séria, evitando traduzir a divergência simplesmente como uma tradição crê na graça e outra não.",
  ),
  "doctrine:baptism": d(
    "O estudo do batismo precisa distinguir destinatário, forma, promessa, vínculo comunitário e eficácia. A discordância sobre batismo infantil não resume todas as diferenças. Duas comunidades podem praticar a imersão e interpretá-la de maneiras diferentes, ou afirmar a ação da graça usando explicações distintas sobre a relação entre rito e fé.",
    "Compare Mateus 28:16–20, Atos 2:37–42 e Romanos 6:1–14. Observe comissão, resposta comunitária e participação em morte e vida. Não infira uma regra universal para cada detalhe apenas porque aparece num relato particular. A Didaquê permite comparar instrução ritual antiga com exposição teológica.",
    "Descreva uma prática de batismo com base numa fonte da própria tradição. Em seguida, identifique quais passagens ela emprega e como passa de descrição a norma. Sua conclusão deve distinguir evidência textual e argumento confessional sem ridicularizar a prática de outra comunidade.",
  ),
  "doctrine:eucharist": d(
    "Presença, memória, participação e sacrifício são perguntas conectadas, mas não sinônimas. Ao comparar tradições, pergunte o que cada uma entende que Cristo faz e o que a comunidade recebe e realiza. A classificação de uma posição como simbólica é insuficiente se não esclarecer a função atribuída ao sinal.",
    "Leia 1 Coríntios 10:14–22 e 11:17–34. Relacione participação e conduta comunitária. A preocupação com divisões e desigualdade impede reduzir a carta a um debate abstrato sobre os elementos. Compare depois uma instrução litúrgica antiga, conservando a diferença entre gêneros.",
    "Organize duas fontes por presença, finalidade, participantes e exigências comunitárias. Cite a seção, não apenas o nome da tradição. Identifique qual divergência é conceitual e qual é prática; não suponha que ritos parecidos expressem sempre a mesma compreensão teológica.",
  ),
  "doctrine:scriptural-inspiration": d(
    "Inspiração, inerrância, infalibilidade e interpretação pertencem a perguntas relacionadas, mas distintas. Uma afirmação sobre origem divina não especifica automaticamente gênero, método de composição ou tipo de precisão. Modelos de ditado, cooperação autoral e testemunho precisam ser descritos pelos documentos que os defendem, em vez de presumidos a partir de um único adjetivo.",
    "Leia 2 Timóteo 3:14–17 observando o argumento sobre ensino e formação. Compare Lucas 1:1–4, que apresenta investigação e finalidade autoral. A comparação permite formular a pergunta sobre ação divina e trabalho humano sem exigir que os dois trechos forneçam o mesmo tipo de explicação.",
    "Escolha uma declaração confessional sobre inspiração e explique seu alcance: quais escritos, quais finalidades e quais exigências de interpretação? Diferencie o que ela afirma explicitamente daquilo que você deduz. Uma crítica ou defesa deve enfrentar a formulação concreta, não uma versão simplificada criada pelo intérprete.",
  ),
  "doctrine:canon": d(
    "Lista de livros, uso litúrgico, circulação de manuscritos e autoridade reconhecida são evidências diferentes. O processo de recepção não foi idêntico para todos os escritos e comunidades. A presença de um texto num códice prova sua transmissão naquele objeto; não demonstra, sem mais evidência, que todos os leitores lhe atribuíssem o mesmo estatuto.",
    "Compare os sumários de duas edições instaladas, observando ordem, nomes e livros incluídos. Um deuterocanônico não se torna uma obra inexistente porque outra tradição não o recebe no cânon. O estudo deve distinguir a existência documental do escrito, sua circulação e a autoridade que comunidades lhe atribuem.",
    "Escolha Judite, 1 Macabeus ou outro livro e registre título, coleção e edição. Formule uma pergunta sobre recepção histórica e outra sobre autoridade confessional. Evite narrativas de uma única votação que teria resolvido de uma vez toda a composição da Bíblia cristã.",
  ),
  "doctrine:church-authority": d(
    "Autoridade pode envolver ensino, jurisdição, testemunho e serviço, com formas diferentes de legitimação. A questão não é apenas quem ocupa o cargo, mas quais são seus limites, procedimentos de correção e relações com a comunidade. Alegar continuidade histórica e demonstrar uma competência específica são tarefas distintas.",
    "Leia Atos 15:1–29 e 1 Clemente 42–44 como documentos de gêneros e situações diferentes. Observe conflito, argumentos e modos de intervenção. Não projete automaticamente toda uma organização atual sobre um testemunho antigo, nem conclua que a ausência de um termo moderno prove ausência de toda responsabilidade institucional.",
    "Reconstrua o argumento de uma tradição para uma forma concreta de autoridade. Indique fonte, alcance e possibilidade de revisão. Compare com outra formulação em uma questão delimitada, como quem decide uma controvérsia doutrinária ou como um ministro responde por sua conduta.",
  ),
  "doctrine:resurrection-dead": d(
    "A ressurreição dos mortos levanta questões sobre continuidade pessoal, corpo e transformação. Não é simplesmente voltar à mesma vida mortal, nem exige conceber identidade como permanência de todas as partículas materiais. Diferentes modelos antropológicos explicam essa continuidade de maneiras próprias; a distinção entre metáfora e afirmação também precisa respeitar o argumento da fonte.",
    "Em 1 Coríntios 15:35–58, acompanhe perguntas, analogias e contrastes. A imagem da semente deve ser interpretada pela função que exerce, não transformada numa descrição científica do processo. Compare Romanos 8:18–25 quanto à amplitude da esperança e à relação com a criação.",
    "Explique uma continuidade e uma transformação apresentadas por Paulo, indicando os versículos. Formule a dificuldade de preservar a identidade pessoal sem reduzir ressurreição a mera sobrevivência de uma parte do ser humano. Registre o que é argumento do texto e o que depende de um modelo filosófico adicional.",
  ),
  "doctrine:final-judgment": d(
    "Juízo envolve verdade, responsabilidade e justiça; não se reduz a curiosidade sobre a condenação de outras pessoas. Sua relação com misericórdia precisa ser reconstruída em fontes concretas. Também convém distinguir anúncio de esperança para vítimas, advertência moral e representação simbólica de uma cena judicial.",
    "Leia Mateus 25:31–46 observando a construção da cena e os critérios apresentados. Compare Romanos 2:1–16 quanto à crítica a quem julga e à responsabilidade. Não transforme as passagens em autorização para o leitor antecipar a sentença definitiva sobre indivíduos.",
    "Apresente como uma fonte relaciona juízo e misericórdia. Indique qual problema procura responder e uma tensão que permanece. Ao propor uma aplicação, examine se ela promove responsabilidade e cuidado ou apenas medo e vigilância sobre a vida dos outros.",
  ),
};
