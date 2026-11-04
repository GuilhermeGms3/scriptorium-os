import { deepStudy as d, type DeepStudy } from "./deepening-types";

export const METHOD_DEEPENING: Readonly<Record<string, DeepStudy>> = {
  "method:textual-criticism": d(
    "Uma variante é uma diferença entre testemunhos; uma emenda é uma intervenção proposta pelo editor. O texto impresso resulta de decisões, não de uma contagem simples de manuscritos. Evidência externa pergunta por testemunhos e relações; evidência interna considera hábitos de cópia e contexto. Esses critérios podem entrar em tensão e precisam ser expostos.",
    "Compare uma nota textual em Marcos 16 com a forma impressa por outra edição. Registre exatamente o intervalo, os sinais editoriais e os testemunhos informados. A existência de uma variante não decide sozinha se um episódio tem valor teológico; antes dessa discussão, identifique qual problema textual está documentado.",
    "Escolha uma variante realmente registrada na edição consultada. Apresente leituras alternativas, evidência fornecida e decisão do editor. Se não houver aparato suficiente, declare a limitação. Não invente manuscritos ou consenso a partir da diferença entre duas traduções, pois ela pode resultar apenas de escolhas linguísticas.",
  ),
  "method:historical-critical": d(
    "O método histórico-crítico reúne investigações que situam textos em processos históricos. Cada hipótese precisa indicar quais dados explica: linguagem, composição, instituições ou recepção. Reconstruir uma ocasião possível não equivale a demonstrá-la. A análise ganha rigor quando compara alternativas e explicita por que uma é considerada mais plausível.",
    "Em uma carta paulina, separe informações expressas pelo autor das circunstâncias inferidas pelo pesquisador. Uma pergunta sobre alimentos ou liderança pode pressupor conflito, mas os detalhes da vida de cada participante não estão todos disponíveis. Reconstruções amplas precisam de fontes além das poucas frases selecionadas.",
    "Apresente uma hipótese de contexto com evidências, inferências e lacunas em colunas diferentes. Compare uma alternativa e indique que dado poderia discriminar entre elas. A conclusão histórica deve ser proporcional à documentação, sem preencher cada silêncio do texto com uma narrativa convincente, porém não demonstrada.",
  ),
  "method:historical-grammatical": d(
    "A atenção gramatical examina formas, relações sintáticas e uso contextual. A origem de uma palavra não determina todos os seus sentidos posteriores, e uma lista de significados de dicionário não pode ser inserida inteira em cada ocorrência. O trabalho histórico e gramatical se apoia no uso situado, não numa tradução intuitiva de raízes.",
    "Escolha uma frase de João 1 numa tradução e consulte o interlinear disponível. Observe sujeito, verbo, complemento e conectivos. Pergunte como a análise ajuda a reconhecer relações da frase, sem supor que a ordem das palavras no português deva reproduzir mecanicamente a ordem do grego.",
    "Explique uma decisão de tradução com base em gramática e contexto. Separe a análise linguística da conclusão doutrinária que alguém pode construir a partir dela. Quando houver alternativas admissíveis, apresente seus limites em vez de usar o idioma original como argumento de autoridade sem demonstração.",
  ),
  "method:source-criticism": d(
    "A crítica das fontes procura explicar relações e materiais incorporados à composição. Semelhança não demonstra, por si, dependência direta, e diferença não demonstra independência absoluta. Uma hipótese deve explicar acordo de linguagem, ordem e conteúdo melhor do que alternativas, incluindo tradição compartilhada ou uso de uma fonte intermediária.",
    "Compare uma unidade sinótica curta em Marcos, Mateus e Lucas. Marque concordâncias verbais separadamente de semelhanças temáticas. Se estiver lendo traduções, registre que as escolhas dos tradutores afetam a comparação. Não trate qualquer palavra igual em português como prova de identidade no texto grego.",
    "Formule duas explicações para a relação entre os relatos e apresente o que cada uma explica ou deixa difícil. Distingua os textos preservados de uma fonte hipotética reconstruída. Uma hipótese de composição pode ser útil sem que sua fonte proposta tenha sido encontrada como manuscrito independente.",
  ),
  "method:form-criticism": d(
    "Identificar forma literária é reconhecer padrões de comunicação, não atribuir automaticamente uma origem oral específica. Um relato de controvérsia, um dito e uma parábola podem cumprir funções diferentes. Reconstruir a situação social de uso é uma etapa adicional, cujo grau de certeza precisa ser defendido.",
    "Em Marcos 2:1–12, observe situação, conflito, fala decisiva e desfecho. Compare essa organização com uma parábola em Marcos 4. As formas ajudam a perceber o que cada unidade faz no relato atual, mesmo quando a história anterior de transmissão permanece incerta.",
    "Descreva a forma de uma unidade com critérios observáveis. Depois, se propor uma situação de uso anterior, indique quais evidências sustentam a reconstrução e quais outras situações seriam possíveis. Evite fazer do nome do gênero uma conclusão histórica que ainda não foi argumentada.",
  ),
  "method:redaction-criticism": d(
    "A crítica da redação pergunta como a organização de materiais participa do projeto de uma obra. Se depende de uma hipótese de fontes, suas conclusões também carregam essa dependência. Dizer que um autor alterou uma expressão exige especificar qual texto se considera anterior e por que essa direção de dependência é adotada.",
    "Compare as bem-aventuranças em Mateus 5 e Lucas 6. Observe destinatários, composição e relações com os discursos onde aparecem. Não conclua a intenção autoral apenas pela presença de uma palavra; explique como a diferença funciona no conjunto literário de cada Evangelho.",
    "Apresente uma diferença editorial e duas interpretações de sua função. Declare a hipótese de relação entre as obras utilizada na análise. Sua conclusão deve mostrar como a composição orienta sentido e reconhecer que uma reconstrução da intenção não é acesso direto à mente do autor.",
  ),
  "method:narrative-criticism": d(
    "A análise narrativa distingue autor histórico, narrador e personagens. Uma fala de personagem pode expressar incompreensão ou oposição, não a posição final da obra. Também importa o que o leitor já sabe quando uma personagem ainda desconhece uma informação; esse desnível pode criar ironia, expectativa ou reconhecimento.",
    "Leia João 3:1–21 observando perguntas e mudanças de compreensão. Separe o que Nicodemos entende do que o relato oferece ao leitor. Compare com outra cena de mal-entendido em João, explicando a função narrativa do recurso sem tratar a personagem apenas como exemplo de ignorância.",
    "Reconstrua uma cena em situação inicial, conflito e mudança. Identifique quem focaliza a ação e quais informações são omitidas ou reveladas. Uma interpretação deve explicar detalhes do relato, e não usar a narrativa apenas como embalagem para uma tese que poderia ter sido escrita antes da leitura.",
  ),
  "method:canonical-criticism": d(
    "A abordagem canônica pergunta como a forma recebida de uma coleção orienta a leitura. Ela não elimina a diversidade histórica dos livros. A posição de uma unidade no cânon e as relações construídas entre obras podem acrescentar horizontes de interpretação, mas precisam ser distinguidas da reconstrução de sua primeira situação de composição.",
    "Compare a leitura isolada de um salmo com sua posição no Saltério. Observe títulos, vizinhança e temas próximos. Depois, pergunte como uma comunidade cristã o relaciona a outras Escrituras. Essas conexões pertencem a níveis distintos e não devem ser atribuídas todas ao primeiro uso histórico do poema.",
    "Escolha uma conexão entre dois livros e explique o que a leitura conjunta acrescenta. Identifique o cânon utilizado e se a relação depende de uma tradição específica. Uma leitura canônica rigorosa deve conseguir reconhecer diferenças e tensões, em vez de obrigar cada passagem a repetir a mesma afirmação.",
  ),
  "method:social-scientific": d(
    "Modelos de honra, patronagem, parentesco ou relações econômicas ajudam a formular perguntas, mas não funcionam como chaves universais do mundo antigo. Um modelo é uma ferramenta comparativa; sua adequação depende de tempo, lugar e dados. Explicar um costume conhecido não prova automaticamente que ele seja decisivo para toda passagem semelhante.",
    "Em 1 Coríntios 11:17–34, identifique as diferenças entre participantes mencionadas no próprio texto antes de consultar um modelo de refeições antigas. Separe observação, contexto documentado e inferência. O resultado deve iluminar a crítica da carta, sem transformar uma reconstrução social em certeza sobre cada pessoa da comunidade.",
    "Escolha um modelo e indique quais dados da passagem ele organiza. Apresente também um limite ou contraexemplo. Evite oposições absolutas entre uma cultura antiga totalmente coletiva e um presente totalmente individualista; tais generalizações podem esconder diferenças internas e obscurecer a evidência concreta.",
  ),
  "method:reception-history": d(
    "História da recepção investiga usos e interpretações de um texto ao longo do tempo. Comentário, sermão, liturgia, imagem e prática política são objetos diferentes. A existência de uma leitura mostra que ela circulou em determinado contexto, não que sempre tenha sido a única ou que corresponda automaticamente ao primeiro sentido do texto.",
    "Escolha uma passagem e compare um comentário antigo com uma edição de estudo atual do acervo. Registre pergunta central, vocabulário e finalidade de cada leitura. Uma homilia que procura formar a vida comunitária pode selecionar aspectos diferentes de uma nota voltada a variantes textuais.",
    "Explique uma permanência e uma mudança de interpretação, com autor, obra e localizador. Procure o que cada contexto ajuda a compreender. Evite avaliar todas as leituras antigas apenas pela concordância com uma pergunta moderna que seus autores talvez não estivessem tentando responder.",
  ),
  "method:theological-interpretation": d(
    "A interpretação teológica explicita como a leitura participa de uma compreensão de Deus e da vida de fé. Seu compromisso não elimina o dever de argumentar. É preciso mostrar como texto, cânon e tradição se relacionam e quais premissas permitem passar de observação histórica para uma afirmação normativa.",
    "Leia um salmo em seu contexto poético e compare sua utilização cristológica em uma fonte cristã. Descreva a relação construída: citação, tipologia, analogia ou aplicação. A distinção ajuda a não confundir a história de composição do salmo com todas as possibilidades de sua leitura posterior.",
    "Formule uma conclusão teológica sobre uma unidade e liste as etapas do argumento. Indique o que depende da passagem e o que depende de uma regra confessional de leitura. O leitor deve conseguir compreender a posição mesmo quando não compartilha todos os seus compromissos religiosos.",
  ),
  "method:literary-criticism": d(
    "Uma observação formal precisa explicar uma função. Repetição pode conectar cenas, intensificar uma afirmação ou criar contraste; uma estrutura simétrica proposta pelo intérprete precisa de critérios verificáveis. Se qualquer mudança na divisão do texto mantém a mesma hipótese, talvez ela explique menos do que parece.",
    "Em Gênesis 1, marque repetições e mudanças de fórmula. Depois, escreva o que elas fazem na progressão da narrativa. Compare com um poema, onde paralelismo não significa repetir duas vezes exatamente a mesma ideia: o segundo membro pode desenvolver ou contrastar o primeiro.",
    "Apresente uma estrutura de leitura e justifique os limites de cada unidade por elementos do texto. Teste uma divisão alternativa. A análise deve produzir uma compreensão do argumento ou do efeito literário, não apenas um desenho elegante acompanhado por contagens sem função interpretativa.",
  ),
  "stance:confessional": d(
    "Uma postura confessional pode assumir uma fonte como normativa e ainda investigar criticamente sua transmissão e interpretação. O rigor exige tornar visível onde essa norma participa do argumento. Há diferença entre uma conclusão válida sob premissas de uma comunidade e uma conclusão apresentada como obrigatória para qualquer interlocutor.",
    "Compare uma introdução a um comentário confessional com a análise de uma passagem nele. Identifique quando o autor descreve um dado linguístico, quando interpreta e quando apela a uma regra doutrinária. Os três movimentos podem coexistir; sua identificação permite avaliar a passagem entre eles.",
    "Reescreva um argumento informando seus compromissos e sua evidência compartilhável. Apresente uma objeção sem atacar a identidade religiosa do autor. O exercício não pede abandonar a fé, mas reconhecer quais razões precisam ser explicadas quando se dialoga fora do horizonte confessional da fonte.",
  ),
  "stance:non-confessional": d(
    "Uma postura não confessional não toma adesão religiosa como critério da pesquisa. Isso não significa ausência de pressupostos, nem obrigação de hostilidade à fé. O pesquisador ainda escolhe objetos, métodos e critérios e precisa distinguir descrição de crenças, explicação de práticas e avaliação filosófica de afirmações.",
    "Descreva uma celebração antiga a partir de uma fonte, separando o que os participantes afirmam do que a pesquisa pode documentar sobre sua prática. Não substitua automaticamente a linguagem dos participantes por uma explicação psicológica que não foi sustentada por evidências.",
    "Formule uma pergunta histórica sobre uma crença cristã sem exigir adesão ou rejeição prévia. Identifique quais documentos poderiam respondê-la e quais questões ela deixa fora de seu alcance. Limitar uma investigação é diferente de declarar que tudo que ela não examina é irrelevante ou falso.",
  ),
  "stance:methodological-naturalism": d(
    "Naturalismo metodológico delimita os tipos de causa empregados numa investigação; naturalismo metafísico faz uma afirmação sobre o que existe. Confundi-los transforma uma regra de trabalho em conclusão ontológica. Também é preciso declarar quando um procedimento não tem meios de decidir uma alegação, em vez de convertê-la automaticamente em afirmação negativa.",
    "Ao examinar um relato de cura, distinga documentação do relato, história de sua transmissão e avaliação das explicações possíveis. Uma análise histórica pode investigar testemunhos e contexto sem dispor de um teste que decida todas as teses filosóficas sobre ação divina.",
    "Descreva o alcance de um método numa pergunta delimitada e o que ele não permite concluir. Compare uma explicação histórica e uma interpretação teológica sem tratá-las como respostas necessariamente equivalentes. Se houver incompatibilidade, indique a premissa exata em disputa.",
  ),
  "theory:two-source": d(
    "A hipótese das duas fontes articula prioridade de Marcos e uma fonte de ditos comumente chamada Q para explicar material de Mateus e Lucas. Q é uma reconstrução hipotética, não um manuscrito identificado. A força da hipótese depende do conjunto de acordos e diferenças que consegue explicar, e não de sua apresentação como fato encontrado numa biblioteca antiga.",
    "Compare uma unidade compartilhada pelos três sinóticos e outra compartilhada apenas por Mateus e Lucas. Registre ordem, conteúdo e linguagem, respeitando os limites da tradução. Pergunte por que o segundo caso cria um problema adicional para uma explicação baseada somente no uso de Marcos.",
    "Reconstrua a hipótese e compare-a com Farrer numa unidade concreta. Separe o dado textual da direção de dependência postulada. Sua conclusão deve indicar o custo explicativo de cada modelo, sem usar a popularidade de uma hipótese como substituto de argumento.",
  ),
  "theory:farrer": d(
    "A hipótese de Farrer mantém a prioridade de Marcos e propõe que Lucas conheceu Mateus, dispensando Q. Ela precisa explicar por que Lucas teria reorganizado certos materiais e como se compreendem acordos e diferenças. A ausência de uma fonte hipotética não elimina todas as inferências: a própria dependência entre os Evangelhos também precisa ser argumentada.",
    "Compare a oração ensinada por Jesus em Mateus 6 e Lucas 11. Observe as diferenças e a situação narrativa. Pergunte como um modelo de uso de Mateus por Lucas as explicaria e que hipóteses adicionais são necessárias. Não trate diferença de extensão como prova automática de qual texto veio primeiro.",
    "Apresente o melhor argumento que encontrou em Goodacre e uma dificuldade reconhecível para o modelo. Compare com a explicação das duas fontes para o mesmo material. Informe se a análise foi feita no grego ou em traduções, pois isso delimita a força das observações verbais.",
  ),
  "theory:griesbach": d(
    "A hipótese de Griesbach, na tradição dos dois Evangelhos, propõe prioridade de Mateus e considera Marcos posterior a Mateus e Lucas. Isso muda a interpretação de abreviações, sequências e paralelos. O tamanho menor de Marcos não demonstra sozinho que ele abreviou os outros: essa é uma inferência dependente de outros dados.",
    "Escolha um relato presente nos três sinóticos e verifique onde Marcos concorda com Mateus, com Lucas ou com ambos. Pergunte como cada hipótese explica o padrão de acordos. A seleção precisa incluir dados difíceis para o modelo, não apenas o exemplo que mais favorece a conclusão desejada.",
    "Compare prioridade de Mateus e prioridade de Marcos em uma tabela de problemas explicados e dificuldades. Declare que direção de dependência cada linha pressupõe. Uma comparação equilibrada avalia modelos pelo mesmo conjunto de dados e pelo mesmo nível de exigência.",
  ),
  "framework:covenant-theology": d(
    "Teologia da aliança organiza a relação entre Deus e seu povo e articula continuidade e mudança entre partes da Escritura. Os pactos nomeados em formulações sistemáticas não devem ser confundidos automaticamente com expressões literalmente presentes em todas as passagens. Uma síntese precisa mostrar como suas categorias emergem da leitura e como são relacionadas.",
    "Compare Gênesis 15, Êxodo 19 e Jeremias 31:31–34, observando promessas, destinatários e responsabilidades. Depois, examine como uma confissão reformada reúne esses textos. A passagem de cada narrativa para um sistema é um argumento teológico, não apenas uma operação de copiar versículos.",
    "Explique uma continuidade e uma novidade na relação entre as unidades. Identifique a fonte sistemática consultada e uma alternativa de organização. Evite tratar teologia da aliança como simples sinônimo de predestinação: o modelo estrutura outros temas, como sacramentos, Igreja e leitura bíblica.",
  ),
  "school:thomism": d(
    "O tomismo articula questões sobre ser, causalidade, conhecimento, virtude e revelação. Uma distinção entre essência e existência ou ato e potência não é apenas um vocabulário para decorar: procura resolver problemas sobre mudança e dependência. Descrever a solução exige primeiro apresentar a pergunta e reconstruir o encadeamento do argumento.",
    "Na Suma, escolha uma questão curta e separe objeções, argumento em contrário, resposta e réplicas. A ordem importa: uma objeção pode ser forte e aparecer antes da posição defendida por Tomás. Leia a questão inteira antes de extrair uma frase para representar o autor.",
    "Reconstrua um argumento com premissas e conclusão e teste se a crítica atinge uma premissa ou a passagem entre elas. Diferencie pensamento de Tomás, desenvolvimentos tomistas e interpretações atuais. Uma tradição filosófica não se reduz a um conjunto de frases atribuídas a seu fundador.",
  ),
  "position:christus-victor": d(
    "A imagem de vitória situa a salvação diante de poderes, pecado e morte. Ela precisa explicar quem está cativo, de que modo a obra de Cristo liberta e o que muda na vida humana. Usar linguagem de batalha não autoriza transformar grupos humanos contemporâneos em inimigos que devam sofrer violência.",
    "Leia Colossenses 2:13–15 e Hebreus 2:14–18, conservando a sequência de cada argumento. Identifique como morte, perdão e libertação se relacionam. Compare com uma explicação que privilegia linguagem jurídica: pergunte o que cada leitura ilumina e o que não consegue explicar sozinha.",
    "Produza uma síntese do modelo com condição inicial, ação e resultado. Indique uma consequência ética e uma objeção. Não presuma que a adoção da imagem exclua toda linguagem sacrificial ou representativa; um autor pode articular modelos, desde que explique suas relações.",
  ),
  "position:penal-substitution": d(
    "A substituição penal relaciona a obra de Cristo a culpa, juízo e representação em favor de outros. Uma exposição responsável precisa perguntar como a ação é concebida, qual papel se atribui à unidade entre Pai e Filho e como se compreende a justiça. Não basta resumir o modelo como punição de um terceiro sem reconstruir o argumento de seus defensores.",
    "Leia Romanos 3:21–26 e 2 Coríntios 5:14–21, observando as relações entre reconciliação, representação e justiça. Depois, compare uma fonte reformada concreta com o texto. Identifique as premissas que ligam a passagem a uma teoria penal, em vez de pressupor que a teoria inteira esteja explícita em cada palavra.",
    "Apresente a melhor formulação do modelo e uma objeção sobre justiça ou responsabilidade. Responda à objeção a partir da fonte consultada, sem alegar que uma posição representa todos os protestantes. Compare um ganho e um limite de seu vocabulário em relação ao modelo de vitória.",
  ),
  "position:moral-influence": d(
    "Modelos de influência moral destacam como a obra de Cristo revela amor e transforma a resposta humana. Isso não precisa significar que a morte de Jesus seja apenas uma aula inspiradora. Pergunte por que essa revelação teria poder transformador e como a explicação enfrenta culpa, violência e libertação, além da mudança de sentimento.",
    "Leia Romanos 5:6–11 e 1 João 4:7–12, distinguindo anúncio do amor, reconciliação e resposta. A aplicação à vida é importante, mas não substitui a pergunta sobre o que as fontes afirmam que Deus realiza. Compare com uma teoria que destaca juízo ou vitória.",
    "Reconstrua uma explicação transformativa e indique o que ela considera necessário para uma nova vida. Formule uma objeção que não a reduza previamente a sentimentalismo. A comparação deve mostrar se os modelos respondem à mesma pergunta ou enfatizam dimensões complementares.",
  ),
  "entity:concept:logos": d(
    "O sentido de Logos em João deve ser investigado pelo uso no prólogo e por seus contextos linguísticos, sem reduzir o termo a uma definição de dicionário. Relações com sabedoria, criação e discurso filosófico exigem evidências específicas. A existência de vocabulário semelhante em outro autor não prova dependência direta.",
    "Leia João 1:1–5 e 1:14–18 numa sequência única. Liste o que é afirmado sobre o Logos em cada parte e como os predicados se articulam. Evite escolher um único equivalente português e supor que ele esgote toda a função do termo na narrativa.",
    "Explique o papel do Logos no argumento do prólogo e compare duas traduções. Indique o que cada escolha torna mais visível ou menos imediato ao leitor. Se propor uma relação com outro texto antigo, identifique a fonte e diga se está defendendo analogia, contexto compartilhado ou dependência.",
  ),
  "entity:concept:incarnation-language": d(
    "A linguagem de carne e habitação articula presença e condição humana. Seu sentido depende da sequência do prólogo, não apenas da decomposição de palavras. Uma afirmação teológica sobre encarnação pode recorrer à passagem, mas precisa explicar a relação entre a formulação narrativa e o vocabulário doutrinário usado depois.",
    "Em João 1:14, observe os termos relacionados a carne, habitação, glória e testemunho. Releia os versículos anteriores para identificar o sujeito da afirmação. Depois, compare uma leitura patrística com uma nota de estudo do acervo, registrando qual pergunta cada uma procura responder.",
    "Escreva uma explicação curta da frase em seu contexto. Diferencie significado linguístico, conexão com outros textos e desenvolvimento doutrinário. Não apresente uma possível ressonância de tradução como prova automática de uma teoria completa sobre a natureza de Cristo.",
  ),
  "entity:concept:life-john": d(
    "Vida no Evangelho de João se relaciona à identidade de Jesus e à resposta a ele. Sua investigação deve acompanhar ocorrências em contextos distintos, porque a mesma palavra pode participar de contrastes diferentes. Uma concordância localiza usos; a exegese explica a função de cada uso na passagem.",
    "Compare João 1:4, 5:24–29 e 20:30–31 dentro de suas unidades. Observe relações com luz, juízo, fé e finalidade da escrita. A comparação pode sustentar uma síntese temática, mas não permite apagar as diferenças entre prólogo, discurso e comentário final do narrador.",
    "Agrupe três ocorrências por função, explicando o critério de agrupamento. Proponha uma síntese sobre vida em João e indique um trecho que exija qualificação dessa síntese. Evite definir o tema apenas como vida após a morte se os argumentos selecionados têm alcance mais amplo.",
  ),
  "entity:concept:light-john": d(
    "Uma metáfora organiza relações de sentido, não uma equivalência física. A linguagem de luz e trevas pode articular revelação, resposta e ação, conforme o contexto. Ela não autoriza associar grupos humanos, aparência ou origem cultural a uma inferioridade natural. O intérprete precisa responder pelo modo como transporta a imagem para o presente.",
    "Compare João 1:4–9, 3:19–21 e 8:12 em suas cenas e argumentos. Identifique o que é iluminado, quem responde e quais ações são mencionadas. Pergunte como os diferentes contextos desenvolvem a imagem, em vez de substituir todas as ocorrências por uma definição única.",
    "Explique um uso da metáfora e uma diferença em outro trecho. Separe a observação textual da aplicação moral proposta. Ao usar uma fonte, registre se ela investiga a composição da imagem, seu contexto religioso ou seu emprego numa tradição posterior de leitura.",
  ),
  "entity:concept:witness-john": d(
    "Testemunho envolve sujeito, conteúdo, destinatário e finalidade. A repetição do tema em João participa da apresentação de Jesus, mas não é uma lista de declarações independentes. Pergunte como cada testemunho funciona na narrativa e como o leitor é convidado a avaliar o que foi dito.",
    "Leia João 1:6–8 e 1:19–34 observando a diferença entre voz do narrador e falas de João Batista. Compare o anúncio inicial com o desenvolvimento da cena. O fato de uma personagem negar ser determinada figura também participa da maneira como sua função é delimitada.",
    "Reconstrua uma cadeia de testemunho: quem afirma o quê, com base em qual experiência ou autoridade e para quem? Diferencie análise literária e avaliação histórica. Uma narrativa pode ser estudada por sua estrutura de testemunho sem que esse estudo resolva automaticamente toda a confiabilidade histórica de suas afirmações.",
  ),
  "entity:concept:grace-truth-john": d(
    "A relação entre graça, verdade e Moisés no prólogo não deve ser convertida automaticamente numa oposição entre um judaísmo sem graça e um cristianismo sem lei. É necessário acompanhar a construção literária e as relações internas com as Escrituras de Israel. Um contraste de apresentação pode ser mais específico que uma rejeição de todo o horizonte anterior.",
    "Leia João 1:14–18 junto de Êxodo 33–34. Identifique as relações propostas por comentários e separe correspondência verbal de aproximação temática. Pergunte o que a comparação ilumina, conservando a diferença entre a cena do Êxodo e a composição do prólogo joanino.",
    "Explique uma relação entre os textos com referências precisas. Indique se a conexão é observação linguística ou interpretação de recepção. Revise sua redação para que não transforme uma hipótese sobre o prólogo em estereótipo sobre o povo judeu ou sua tradição de leitura.",
  ),
};
