import { section as s, reading as r } from "../helpers";
import { unit } from "./unit";
import { foundation, source } from "./sources";

export const GRACE_PROVIDENCE_UNITS = [
  unit({
    id: "graca",
    phase: "Salvação",
    title: "Graça: dom, dependência e restauração",
    studyGuideId: "etica-soteriologia",
    readingSearch: "graça justificação natureza salvação",
    description:
      "Examinar a prioridade do dom divino sem confundir dependência com ausência de dignidade ou de responsabilidade.",
    objectives: [
      "Definir graça em relação a dom, cura e salvação.",
      "Distinguir incapacidade salvífica e inexistência de todo bem humano.",
      "Separar justificação e santificação antes de compará-las.",
    ],
    sections: [
      s(
        "introduction",
        "Deus não é uma carência a ser preenchida",
        [],
        "A afirmação de que Deus não precisa de nós expressa, no quadro do teísmo clássico, sua independência em relação à criatura. Não significa que a vida humana seja descartável. Atos 17:24–28 permite estudar o contraste entre um Deus que recebe suprimento e um Deus apresentado como fonte da vida. Se a relação começa por um dom, a escolha divina não é salário por suprir uma deficiência em Deus.",
        "A linguagem de miséria humana pretende nomear dependência, pecado e impossibilidade de garantir a própria salvação. Precisa ser delimitada: não autoriza negar que a criatura tenha valor, que suas feridas importem ou que o próximo deva ser cuidado. A severidade teológica perde seu objeto quando confunde arrependimento com desprezo indiscriminado pela pessoa.",
      ),
      s(
        "concept",
        "Natureza, graça e resposta",
        ["grace", "augsburg"],
        "Em Suma I–II, q.109, Tomás distingue bens naturais particulares e a necessidade de auxílio divino para cura e bem sobrenatural. A natureza ferida não é descrita simplesmente como ausência de toda capacidade. Na Confissão de Augsburgo IV, a justificação é confessada como dom por causa de Cristo, recebido pela fé, e não como aquisição por mérito próprio. As formulações se aproximam na recusa da autossalvação, mas não devem ser tratadas como sistemas idênticos.",
        "Justificação pergunta pela condição de justiça diante de Deus; santificação trata da transformação da vida. A relação entre ambas é discutida de modos diferentes. Antes de escolher uma posição, reconstrua o que cada fonte entende por fé, obra, mérito e dom. Um mesmo termo pode mudar de função dentro de outro argumento.",
      ),
      s(
        "example",
        "Efésios 2 antes e depois do versículo conhecido",
        [],
        "Leia Efésios 2:1–10 como unidade. Marque as descrições da condição anterior, os verbos da ação divina e a referência final às boas obras. Observe a relação entre recebimento e modo de viver. O exercício evita dois atalhos: usar a atividade humana para comprar a graça ou usar a graça para declarar a atividade humana irrelevante.",
      ),
      s(
        "discussion",
        "Escolha não é licença para superioridade",
        [],
        "Se a salvação é recebida como dom, a conclusão de que o beneficiário possui superioridade natural sobre os outros não se segue automaticamente. Examine esse salto. Também pergunte se a ausência de mérito anterior elimina toda resposta posterior. Diferentes doutrinas da cooperação e da ação divina precisam ser comparadas por seus argumentos, não caricaturadas como versões de orgulho ou passividade.",
      ),
      s(
        "conclusion",
        "Uma humildade intelectualmente responsável",
        [],
        "A síntese proposta é que dependência pode fundamentar gratidão, responsabilidade e cuidado, sem apagar a necessidade de restauração. Redija sua posição distinguindo aquilo que a pessoa não pode produzir por si e aquilo a que ela é chamada a responder. Inclua uma fonte e um limite. O sistema avalia o registro dessa elaboração; não mede a autenticidade da fé nem concede uma sentença de salvação.",
      ),
    ],
    passages: [
      r(
        "at17",
        "Atos 17:24–28",
        "acts",
        17,
        24,
        28,
        "Examinar independência divina e dependência da vida criada.",
      ),
      r(
        "ef2",
        "Efésios 2:1–10",
        "ephesians",
        2,
        1,
        10,
        "Acompanhar a relação entre condição humana, dom e boas obras.",
      ),
    ],
    connections: [
      {
        label: "Graça",
        explanation:
          "Dom divino que não se reduz a pagamento por uma prestação humana; examinar as formulações de cura, favor e transformação.",
      },
      {
        label: "Justificação",
        explanation:
          "Questão da justiça diante de Deus; seu vocabulário e relação com transformação variam nas tradições.",
        entityId: "doctrine:justification",
      },
      {
        label: "Santificação",
        explanation:
          "Transformação e ordenação da vida ao bem; distinguir causa, fruto e condição ao comparar sistemas.",
      },
    ],
    foundation: foundation(
      "A prioridade da graça não equivale à negação de toda bondade criada ou de toda responsabilidade.",
      "Teologia",
      "Argumento",
      "Comparação de duas formulações cristãs, sem reduzir suas diferenças a uma síntese indiferenciada.",
      [
        source(
          "grace",
          "Suma I–II, q.109, a.2–3",
          "Distingue natureza ferida, bens particulares e auxílio para cura e elevação.",
          "Não equivale automaticamente à doutrina luterana da justificação.",
        ),
        source(
          "augsburg",
          "Artigos IV e VI",
          "Relaciona justificação gratuita e nova obediência.",
          "Não transforma boas obras em aquisição do favor divino.",
        ),
      ],
      "Compare graça, mérito, fé e cooperação em cada autor. A afirmação de dependência não decide sozinha todas as diferenças soteriológicas.",
    ),
    prompt:
      "Explique como Deus não depender da criatura pode ser compatível com a dignidade humana. Use Atos 17, Efésios 2 e uma fonte primária; diferencie dom, resposta e pretensão de mérito.",
  }),
  unit({
    id: "providencia",
    phase: "Governo e liberdade",
    title: "Providência, causas e responsabilidade",
    studyGuideId: "teologia-sistematica",
    readingSearch: "providência vontade liberdade causas",
    description:
      "Estudar o governo divino sem transformá-lo em fatalismo ou explicação privada de cada acontecimento.",
    objectives: [
      "Distinguir providência, governo, fatalismo e previsão.",
      "Explicar causas primeiras e segundas no argumento tomista.",
      "Examinar a responsabilidade moral diante de um acontecimento permitido.",
    ],
    sections: [
      s(
        "introduction",
        "Providência e limites da previsão",
        [],
        "Providência designa, neste estudo, a ordenação divina da criação a seus fins; governo considera sua realização. A formulação precisa ser comparada com outras tradições, mas já impede tratar providência como técnica para adivinhar o próximo evento. Conhecer uma doutrina geral não concede acesso a todas as intenções particulares de Deus.",
        "Destino também pode ter sentidos distintos: desfecho, sequência causal ou necessidade inevitável. Por isso, desejar uma vida conforme a providência exige perguntar o que conformidade significa. Pode significar orientar vontade e ação ao bem conhecido; não precisa significar passividade diante de tudo o que acontece.",
      ),
      s(
        "concept",
        "Causas e contingência",
        ["providence", "calvin"],
        "Tomás, em Suma I, q.22, distingue o ordenamento da providência e a ação das causas criadas, incluindo causas contingentes. A ação da criatura não é eliminada por receber seu poder de agir. Calvino, em Institutas I.17, combate a conclusão de que providência dispense deliberação e uso dos meios. Os autores possuem quadros diferentes; a comparação identifica uma questão compartilhada, não uma equivalência completa.",
        "A distinção editorial entre permissão, comando e aprovação moral é decisiva para o exercício seguinte. Um acontecimento ocorrer não é suficiente para concluir que ele constitui uma obrigação a imitar. Se alguém defende uma tese mais forte sobre decreto, precisa explicitar como ela se relaciona com responsabilidade e mal.",
      ),
      s(
        "example",
        "O caso de José e a duplicidade de intenção",
        [],
        "Leia Gênesis 50:15–21. Observe quem teme, quem responde e como intenções humanas e interpretação providencial são colocadas em relação. O relato não transforma a violência anterior em dever moral. A distinção entre intenção do agente e interpretação de um desfecho permite investigar o problema sem inocentar automaticamente quem fez o mal.",
      ),
      s(
        "discussion",
        "Confiar e agir",
        [],
        "Considere um caso didático: diante de uma injustiça evitável, alguém declara que não deve fazer nada porque tudo pertence à providência. A conclusão exige uma premissa adicional: ações humanas não teriam função ou obrigação. Examine essa premissa à luz das fontes. No caso oposto, alguém tenta controlar todos os resultados e chama qualquer fracasso de abandono divino. Pergunte que promessa de controle foi presumida e onde estaria fundamentada.",
      ),
      s(
        "conclusion",
        "Uma regra de discernimento",
        [],
        "A posição a elaborar distingue limites de previsão e deveres conhecidos. É possível reconhecer que não se controla o resultado e ainda deliberar, reparar e proteger. Registre o bem que você consegue identificar, os meios de ação disponíveis e a conclusão que permanece incerta. A providência será retomada na oração, entendida como relação e petição, não como mecanismo de coerção divina.",
      ),
    ],
    passages: [
      r(
        "gn50",
        "Gênesis 50:15–21",
        "genesis",
        50,
        15,
        21,
        "Distinguir intenções, responsabilidade e interpretação providencial.",
      ),
      r(
        "rm8-bem",
        "Romanos 8:26–30",
        "romans",
        8,
        26,
        30,
        "Ler oração, propósito e conformidade com Cristo na unidade argumentativa.",
      ),
    ],
    connections: [
      {
        label: "Providência",
        explanation:
          "Ordenação divina da criação e de seus fins; não previsão pessoal de cada evento.",
      },
      {
        label: "Causas segundas",
        explanation: "Causas criadas com atuação própria no quadro de uma causalidade recebida.",
      },
      {
        label: "Fatalismo",
        explanation:
          "Tese de inevitabilidade que pode tornar a deliberação irrelevante; não presumir sua equivalência com toda doutrina de providência.",
      },
    ],
    foundation: foundation(
      "Providência pode ser articulada com causalidade criada e deliberação humana.",
      "Teologia",
      "Argumento",
      "Comparação filosófico-teológica; não atribuição de uma intenção divina específica a cada sofrimento.",
      [
        source(
          "providence",
          "Suma I, q.22, a.1, 3–4",
          "Distingue ordenamento, causas criadas e contingência.",
          "Não elimina as diferenças entre o tomismo e as tradições reformadas.",
        ),
        source(
          "calvin",
          "Institutas I.17, especialmente §§3–5",
          "Relaciona a doutrina ao uso de meios, à deliberação e à responsabilidade.",
          "A posição de Calvino precisa ser estudada em seus próprios termos, inclusive onde diverge de outras tradições.",
        ),
      ],
      "Compare permissão, determinação, vontade moral e causalidade. Conhecer o resultado de um evento não basta para reconstruir todo o propósito divino.",
    ),
    prompt:
      "Reconstrua a relação entre providência e responsabilidade em Gênesis 50. Compare uma formulação de Tomás ou Calvino e responda à tese de que confiar em Deus torna toda ação desnecessária.",
  }),
];

export const PRAYER_UNIT = unit({
  id: "oracao",
  phase: "Vida cristã",
  title: "Oração: petição, entrega e vontade",
  studyGuideId: "sacramentos-santificacao",
  readingSearch: "oração vontade providência",
  description:
    "Passar da linguagem de barganha ao exame dos desejos, da petição e da conformidade com o bem.",
  objectives: [
    "Distinguir pedir, exigir e negociar um pagamento religioso.",
    "Relacionar oração e providência sem eliminar a petição.",
    "Interpretar entrega como disposição ativa e responsável.",
  ],
  sections: [
    s(
      "introduction",
      "Petição e controle do resultado",
      [],
      "A crítica à oração entendida como investimento para obter vantagens não exige abolir todo pedido. Uma petição reconhece necessidade; uma barganha presume que um rito ou desempenho coloca o outro em dívida. O problema estudado é a passagem de relação com Deus a técnica de garantia de resultados. A mesma palavra fé pode ser usada em ambos os discursos e precisa ser examinada pelo argumento que sustenta.",
      "A formulação ore para que seu destino esteja de acordo com a providência será precisada: pedir que vontade, discernimento e ação se ordenem ao bem, sem supor que o orante conheça todos os desfechos. Isso não torna sofrimento desejável por si mesmo nem impede pedir alívio.",
    ),
    s(
      "concept",
      "A oração dentro da providência",
      ["prayer"],
      "Em Suma II–II, q.83, a.2, Tomás investiga a utilidade da oração diante da providência. Sua resposta não a apresenta como informação nova oferecida a Deus nem como alteração de um plano por pressão externa. A oração pode ser compreendida como parte da ordem dos meios. Nos artigos seguintes, a análise considera os bens pedidos e o modo de pedir. A reflexão preserva a petição e interroga seu objeto.",
      "Essa formulação exige um cuidado: nem toda preferência pessoal se torna bem devido apenas porque foi expressa numa oração. A pergunta pelo objeto do desejo torna-se parte da vida espiritual. Pedir pão, perdão, justiça e sabedoria não é o mesmo que exigir superioridade sobre o próximo.",
    ),
    s(
      "example",
      "O Pai-nosso e o Getsêmani",
      [],
      "Leia Mateus 6:5–13 e marque a sequência dos pedidos. Compare com Mateus 26:36–46: desejo de afastamento do sofrimento e entrega aparecem na mesma cena. O exercício é observar como petição e conformidade podem coexistir. Eliminar o pedido para tornar a entrega mais pura empobrece o texto; eliminar a entrega para garantir satisfação imediata também.",
    ),
    s(
      "discussion",
      "Quando o resultado não vem",
      [],
      "Considere uma pessoa que orou por um resultado e não o recebeu. Concluir que ela teve pouca fé exige uma regra que precisa ser demonstrada, não presumida. Outra conclusão precipitada seria que toda oração é inútil. A avaliação do percurso distingue resultado material, transformação do desejo, compromisso e mistério reconhecido. Nenhum desses termos deve ser usado para negar a realidade da frustração ou silenciar um lamento legítimo.",
    ),
    s(
      "conclusion",
      "Uma prática que pode ser examinada",
      [],
      "Redija uma petição com quatro elementos: uma necessidade nomeada, o bem que orienta o pedido, uma entrega quanto ao resultado e uma responsabilidade que você assume. Trata-se de um exercício de compreensão da linguagem, não de uma fórmula para obter respostas. O aplicativo não atribui eficácia espiritual à quantidade de palavras nem transforma a conclusão da aula em mérito diante de Deus.",
    ),
  ],
  passages: [
    r(
      "mt6",
      "Mateus 6:5–13",
      "matthew",
      6,
      5,
      13,
      "Observar finalidade, ordem e objetos dos pedidos.",
    ),
    r(
      "mt26",
      "Mateus 26:36–46",
      "matthew",
      26,
      36,
      46,
      "Examinar petição e entrega sem eliminar nenhum dos dois movimentos.",
    ),
  ],
  connections: [
    {
      label: "Petição",
      explanation:
        "Pedido que reconhece necessidade; não obrigação imposta a Deus por uma prestação religiosa.",
    },
    {
      label: "Conformidade da vontade",
      explanation:
        "Disposição de orientar desejo e ação ao bem; não indiferença diante do sofrimento.",
    },
  ],
  foundation: foundation(
    "Oração de entrega pode incluir petição sem se reduzir a barganha por resultados.",
    "Teologia",
    "Argumento",
    "Leitura de Mateus 6 e 26 em diálogo com a análise tomista da oração.",
    [
      source(
        "prayer",
        "Suma II–II, q.83, a.2 e 5–6",
        "Investiga oração, providência e os bens que se podem pedir.",
        "Não sustenta a proibição geral de pedir bens concretos nem uma garantia automática de êxito.",
      ),
    ],
    "Compare interpretações de oração contemplativa, intercessória e de petição. A crítica à barganha não representa uma condenação indiscriminada de todas as práticas protestantes.",
  ),
  prompt:
    "Compare o Pai-nosso com o Getsêmani e formule uma oração de petição e entrega. Explique por que ela não é barganha nem fatalismo, cite uma fonte e enfrente uma objeção à sua posição.",
});

export const SYNTHESIS_UNIT = unit({
  id: "sintese",
  phase: "Síntese",
  title: "Uma posição fundamentada sobre a vida cristã",
  studyGuideId: "teologia",
  readingSearch: "graça providência caridade vida cristã",
  description:
    "Articular os conceitos estudados, distinguir convicção e argumento e registrar um percurso de investigação próprio.",
  objectives: [
    "Relacionar criação, queda, Cristo, graça e responsabilidade.",
    "Identificar convergências e diferenças confessionais sem produzir uma tradição fictícia.",
    "Registrar uma posição revisável com fonte, objeção e resposta.",
  ],
  sections: [
    s(
      "introduction",
      "Coerência entre os conceitos",
      [],
      "O percurso começou com a finitude e chegou à oração. O trabalho final é verificar se os conceitos usados ao longo do caminho são compatíveis. Se a criação é boa, a queda não pode ser definida apressadamente como prova de que tudo criado é desprezível. Se Cristo assume a humanidade, a vitória sobre a morte não deve apagar essa humanidade. Se graça é dom, a prática cristã não pode ser explicada apenas como compra de favor.",
      "Essas relações não fornecem uma resposta pronta a cada controvérsia. Elas estabelecem perguntas de coerência para uma posição assumida conscientemente. Uma convicção pessoal pode orientar a pesquisa, desde que permaneça distinguida do que uma fonte efetivamente afirma.",
    ),
    s(
      "concept",
      "Um vocabulário que mantém as distinções",
      [],
      "Retome sete pares: natureza e condição; pecado e finitude; morte corporal e domínio da morte; graça e mérito; justificação e santificação; providência e fatalismo; petição e barganha. Em cada par, explique por que os termos não são sinônimos e como podem se relacionar. Se uma palavra mudou de sentido durante seu argumento, sinalize a mudança em vez de usá-la como se a conclusão já estivesse demonstrada.",
      "Ao comparar tradições, use autodescrições antes de críticas externas. Não forme uma doutrina composta apenas escolhendo frases de autores que discordam sobre seus fundamentos. É possível construir uma síntese pessoal, mas ela precisa identificar seus empréstimos, suas tensões e suas razões para preferir determinada formulação.",
    ),
    s(
      "example",
      "Um mapa de argumento no caderno",
      [],
      "Escolha uma tese estudada e organize uma nota em cinco blocos: formulação, passagem bíblica, fonte com localizador, objeção e resposta provisória. Acrescente links para outras notas quando depender de conceitos como graça ou natureza. Vincular notas torna explícitas as dependências; não aumenta por si só a qualidade do argumento. Abra a fonte antes de atribuir ao autor uma conclusão que encontrou apenas na explicação editorial.",
    ),
    s(
      "discussion",
      "Severidade e caridade",
      [],
      "Uma formação cristã pode falar seriamente de pecado, juízo e dependência sem usar o conhecimento para humilhar o próximo. Em 1 Coríntios 13:1–7, investigue como capacidades extraordinárias são avaliadas em relação ao amor. Pergunte se sua linguagem sobre a miséria humana conduz a responsabilidade e cuidado ou a uma pretensão de superioridade. Essa pergunta é ética e teológica; não exige abandonar o rigor das distinções.",
    ),
    s(
      "conclusion",
      "Conclusão que abre investigação",
      [],
      "Conclua com uma tese que você consegue sustentar, uma questão que permanece aberta e uma leitura posterior identificada. A conclusão do aplicativo registra um trabalho realizado. Não equivale a certificação acadêmica, adesão obrigatória a uma confissão ou medida do amor a Deus. Revisar uma posição depois de encontrar melhores razões é parte do estudo, não fracasso do percurso.",
    ),
  ],
  passages: [
    r(
      "1co13",
      "1 Coríntios 13:1–7",
      "1-corinthians",
      13,
      1,
      7,
      "Examinar conhecimento, dons e amor no argumento paulino.",
    ),
  ],
  connections: [
    {
      label: "Convicção e argumento",
      explanation:
        "Convicção é uma posição assumida; argumento explicita razões que podem ser avaliadas e contestadas.",
    },
    {
      label: "Regra de revisão",
      explanation:
        "Registrar o que faria você reconsiderar a tese e qual fonte precisa consultar a seguir.",
    },
  ],
  foundation: foundation(
    "A síntese pessoal precisa identificar convergências, divergências e limites de atribuição.",
    "Teologia",
    "Interpretação",
    "Orientação metodológica editorial. As fontes são comparadas como autodescrições, não reunidas em uma doutrina supostamente unânime.",
    [
      source(
        "augsburg",
        "Artigos IV e VI",
        "Permite conferir uma formulação luterana da relação entre justificação e obediência.",
        "Não representa todas as diferenças do luteranismo nem todas as tradições cristãs.",
      ),
      source(
        "anglican",
        "Artigos XI–XII e XVII",
        "Permite comparar justificação, obras e eleição no formulário histórico.",
        "A síntese do estudante permanece distinta do texto confessional.",
      ),
    ],
    "A concordância com o percurso não é condição de conclusão. Exigem-se leitura registrada, elaboração argumentativa e revisão dos critérios.",
  ),
  prompt:
    "Escreva uma síntese de criação, queda, Cristo, graça e providência. Defenda uma posição própria, contraste duas fontes com localizadores, formule uma objeção séria e indique uma questão que permanece aberta. Guarde uma nota vinculada para sua investigação posterior.",
});
