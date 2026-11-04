import type { FormationUnit } from "./unit";
import { section as s, lesson as l, reading as r, criteria } from "../helpers";
import { foundation, source } from "./sources";

/** Five separate lessons: reconstruction, illustrative case, objection, scope. */
export const FIVE_WAYS: FormationUnit = {
  id: "cinco-vias",
  phase: "Razão e fé",
  title: "As cinco vias de Tomás de Aquino",
  studyGuideId: "teologia",
  readingSearch: "Tomás Deus existência causa",
  description:
    "Reconstruir cada argumento, examinar uma objeção e delimitar o que a conclusão pretende demonstrar.",
  domains: ["theology", "hermeneutics"],
  objectives: [
    "Distinguir premissa, inferência e conclusão.",
    "Explicar ato, potência, causalidade, contingência, participação e finalidade.",
    "Evitar transformar argumentos metafísicos em testes de laboratório ou slogans apologéticos.",
  ],
  lessons: [
    l(
      "vias:movimento",
      "Primeira via — mudança, ato e potência",
      s(
        "introduction",
        "O problema da mudança",
        ["ways"],
        "A primeira via parte da mudança. Movimento, nesse vocabulário, não se limita a deslocar um objeto: envolve atualizar uma possibilidade. Ato é a realização considerada; potência é a capacidade de receber uma determinação. Dizer que algo muda é distinguir o que já é do que pode vir a ser, sob determinado aspecto.",
      ),
      s(
        "concept",
        "Reconstrução do argumento",
        ["ways"],
        "Tomás argumenta que a atualização requer algo em ato e que uma série de atualizadores dependentes precisa de um primeiro princípio não movido. O passo decisivo é a dependência do que atualiza; não basta repetir que tudo muda. O argumento não exige, por essa formulação, que Deus seja o primeiro objeto material empurrado no universo. Sua conclusão precisa ser discutida no quadro metafísico em que foi proposta.",
      ),
      s(
        "example",
        "Caso: aprender uma língua",
        [],
        "Uma pessoa capaz de aprender grego ainda não lê grego por possuir essa capacidade. Exercícios, textos, atenção e ensino participam da atualização. O caso é uma analogia editorial para distinguir capacidade e realização; não é uma prova de Deus. Liste os aspectos em que o aprendiz age e recebe, evitando imaginar uma oposição absoluta entre atividade e passividade.",
      ),
      s(
        "discussion",
        "Objeção e teste da resposta",
        [],
        "Uma objeção pergunta se há mudanças sem atualizador distinto. Outra questiona por que uma série dependente não poderia ser infinita. Reconstrua a resposta possível pela distinção entre aspectos e pela dependência causal, e depois avalie se ela convence. Chamar uma objeção de ignorância não substitui demonstrar onde seu raciocínio falha.",
      ),
      s(
        "conclusion",
        "Alcance da primeira via",
        [],
        "O resultado pretendido é um primeiro princípio da atualização, não uma exposição pronta da Trindade ou da encarnação. Escreva o argumento em quatro frases e marque qual premissa você considera mais discutível. Se a resposta depende de uma definição específica de mudança, declare essa definição.",
      ),
    ),
    l(
      "vias:causa",
      "Segunda via — causalidade eficiente",
      s(
        "introduction",
        "Causa e explicação",
        ["ways"],
        "A segunda via considera a ordem das causas eficientes: aquilo pelo qual um efeito é produzido. Uma coisa ser anterior no calendário não basta para torná-la causa. Uma notícia publicada antes de uma tempestade não produz a tempestade. É preciso estabelecer a relação de dependência relevante antes de formar uma cadeia explicativa.",
      ),
      s(
        "concept",
        "Uma causa que não recebe de outra",
        ["ways"],
        "O argumento rejeita que algo seja causa eficiente de si mesmo e que a ordem causal dependente seja explicada apenas por intermediários sem primeiro princípio. A conclusão pretendida é uma causa primeira. A tese não é simplesmente tudo tem causa, seguida de uma exceção arbitrária. Sua dificuldade está em justificar a estrutura da dependência e o limite da regressão.",
      ),
      s(
        "example",
        "Caso: um instrumento em uso",
        [],
        "Um instrumento opera numa rede de condições: construção, energia, operador e material. Escolha uma operação e desenhe sua cadeia de dependências. Depois separe explicação funcional, origem histórica e fundamento da capacidade de agir. O desenho ajuda a formular a pergunta; não autoriza deduzir Deus da mera existência de ferramentas.",
      ),
      s(
        "discussion",
        "O universo como fato bruto",
        [],
        "Uma objeção admite relações causais internas, mas pergunta por que o conjunto teria de receber explicação adicional. Outra questiona a impossibilidade da regressão. Compare a resposta de que intermediários não explicam a própria eficácia com a posição que aceita um fato sem explicação ulterior. Identifique o critério de explicação usado por cada lado, em vez de disfarçar a diferença como uma descoberta experimental.",
      ),
      s(
        "conclusion",
        "Não confundir causa e acontecimento inicial",
        [],
        "Causa primeira pode designar prioridade explicativa e não apenas um evento remoto. Delimite qual sentido está usando. A relação com cosmologias físicas exige trabalho adicional: uma teoria sobre a evolução do universo não se converte automaticamente em demonstração ou refutação de toda a metafísica tomista.",
      ),
    ),
    l(
      "vias:contingencia",
      "Terceira via — contingência e necessidade",
      s(
        "introduction",
        "O que pode deixar de existir",
        ["ways"],
        "Contingente é aquilo que pode ser de outro modo ou não existir, conforme a análise considerada. Necessário é aquilo cuja não existência é excluída no sentido argumentado. Não confunda necessidade metafísica com urgência pessoal: precisar de alimento não torna cada refeição um ser necessário.",
      ),
      s(
        "concept",
        "Da geração e corrupção à necessidade",
        ["ways"],
        "Tomás parte de coisas que surgem e desaparecem e argumenta que nem tudo pode depender desse modo. Considera também a necessidade recebida de outro e procura um fundamento cuja necessidade não seja recebida. A reconstrução precisa conservar esses passos. Saltar diretamente de sou mortal para Deus existe omite justamente a parte que requer justificação.",
      ),
      s(
        "example",
        "Caso: uma comunidade duradoura",
        [],
        "Uma instituição pode permanecer enquanto seus membros mudam. Esse caso permite distinguir duração do conjunto e duração de cada participante. Pergunte o que esse exemplo esclarece e o que não esclarece sobre a terceira via. Ele não resolve o argumento; serve para impedir a passagem irrefletida de uma propriedade de cada membro para a mesma propriedade do todo.",
      ),
      s(
        "discussion",
        "A objeção da composição",
        [],
        "O ponto mais exigente é o passo de seres que podem não existir para uma hipótese em que nada existiria. A não existência possível de cada um implica a não existência conjunta? Reconstrua a objeção e examine as condições de tempo e dependência usadas na resposta. Uma versão contemporânea do argumento pode reformular o problema, mas precisa avisar que está oferecendo uma reconstrução, não repetindo literalmente a fonte.",
      ),
      s(
        "conclusion",
        "Precisar a necessidade",
        [],
        "Registre o sentido de necessário defendido e o motivo pelo qual ele não dependeria de outro. A conclusão pretendida não identifica uma espécie de objeto muito resistente, mas um fundamento de outro estatuto. Aceitar ou rejeitar essa diferença exige examinar as premissas, não apenas o nome atribuído ao resultado.",
      ),
    ),
    l(
      "vias:graus",
      "Quarta via — graus de perfeição",
      s(
        "introduction",
        "O problema da medida",
        ["ways"],
        "A quarta via considera graus de bondade, verdade e perfeição. O vocabulário não se reduz a preferências estéticas ou a uma classificação de pessoas. Há uma metafísica da participação: seres possuem de modo limitado perfeições cujo fundamento é investigado. Antes de concordar, é necessário esclarecer o que perfeição quer dizer nesse contexto.",
      ),
      s(
        "concept",
        "Do participado ao fundamento",
        ["ways"],
        "Tomás relaciona a gradação a um máximo e esse máximo à causalidade das perfeições nos demais seres. Esses vínculos são premissas fortes, não consequências óbvias de qualquer comparação. A via precisa justificar por que as perfeições consideradas remetem a uma fonte e em que sentido essa fonte não é apenas um membro extremo da série.",
      ),
      s(
        "example",
        "Caso: comparação e limite",
        [],
        "Classificar respostas como mais ou menos precisas mostra que uma medida orienta a comparação. Mas a existência de notas diferentes não demonstra que exista um aluno infinitamente correto. Use esse contraexemplo para localizar o passo adicional da via. O exercício separa comparação comum e participação metafísica; ele não pretende tornar a nota escolar um substituto do argumento.",
      ),
      s(
        "discussion",
        "A exigência de um máximo real",
        [],
        "Uma objeção pergunta se toda escala precisa de um máximo existente. Outra questiona se verdade, bondade e ser podem ser tratados de forma paralela. Apresente a melhor versão dessas objeções e investigue o que uma defesa tomista precisaria demonstrar. Não enfraqueça o oponente para produzir uma vitória apenas verbal.",
      ),
      s(
        "conclusion",
        "Avaliar a metafísica pressuposta",
        [],
        "A quarta via é especialmente dependente de seu quadro conceitual. Sua síntese deve indicar a relação proposta entre participação, medida e causalidade. Se você rejeita essa metafísica, explique onde está a divergência; se a aceita, evite apresentar a aceitação como consenso de toda a filosofia.",
      ),
    ),
    l(
      "vias:finalidade",
      "Quinta via — ordem e finalidade",
      s(
        "introduction",
        "Agir orientado a resultados",
        ["ways"],
        "A quinta via considera a regularidade pela qual seres sem conhecimento agem em direção a resultados. Finalidade, nesse contexto, não significa que todo processo pense no que faz. A questão é se orientações naturais exigem uma inteligência que as ordene. É preciso distinguir essa pergunta de uma simples admiração diante da complexidade.",
      ),
      s(
        "concept",
        "O passo para a inteligência",
        ["ways"],
        "Tomás argumenta de uma ação regular orientada a fins para uma direção inteligente. A inferência depende do princípio segundo o qual aquilo que não conhece não se dirige por si a um fim nesse sentido. Explicar esse princípio é parte da defesa da via. A conclusão não pode ser obtida apenas identificando uma lacuna no conhecimento científico disponível.",
      ),
      s(
        "example",
        "Caso: uma função biológica",
        [],
        "Escolha uma função de um órgão e separe três questões: como opera, como surgiu e o que significa atribuir-lhe um fim. Uma explicação por mecanismos e história natural não é automaticamente uma tese sobre o fundamento último. Inversamente, falar em fundamento não fornece uma alternativa pronta à investigação desses mecanismos. O exercício impede que se misturem níveis diferentes de explicação.",
      ),
      s(
        "discussion",
        "Regularidade sem intenção?",
        [],
        "Uma objeção considera suficiente descrever leis, processos e seleção, sem postular uma inteligência ordenadora. Uma resposta tomista pode insistir na pergunta pela orientação das próprias causas naturais. Compare o que cada lado entende por explicação completa. A aula não declara que a biologia contemporânea confirmou a via nem que um exemplo isolado a refutou.",
      ),
      s(
        "conclusion",
        "Da via à investigação seguinte",
        [],
        "As cinco vias são argumentos distintos, não cinco etapas de um único experimento. Concluir uma delas não resolve automaticamente todos os atributos divinos, a revelação cristã ou o problema do mal. Ao avançar, registre o que foi estabelecido para você, o que depende de premissas aceitas e qual objeção ainda permanece.",
      ),
    ),
  ],
  passages: [
    r(
      "rm1-razao",
      "Romanos 1:18–23",
      "romans",
      1,
      18,
      23,
      "Comparar a afirmação paulina sobre conhecimento e criação com a natureza de um argumento filosófico; não tratá-la como demonstração das cinco vias.",
    ),
  ],
  connections: [
    {
      label: "Ato e potência",
      explanation:
        "Realização e capacidade consideradas sob um aspecto; base conceitual da análise de mudança.",
    },
    {
      label: "Causalidade",
      explanation: "Relação explicativa que exige mais que anterioridade temporal.",
    },
    {
      label: "Contingência e finalidade",
      explanation:
        "Possibilidade de ser de outro modo e orientação a um resultado são problemas diferentes, tratados em vias diferentes.",
    },
  ],
  foundation: foundation(
    "As cinco vias exigem reconstrução das premissas e não encerram todo o conteúdo da fé cristã.",
    "Filosofia",
    "Argumento",
    "Exposição editorial de Suma I, q.2, a.1–3. Os casos e as objeções didáticas são formulações do percurso, identificadas como exercícios.",
    [
      source(
        "ways",
        "Suma I, q.2, a.1–3; especialmente o corpo do artigo 3",
        "Apresenta as cinco vias, distinguindo evidência para nós e demonstração pelos efeitos.",
        "Não é validação experimental nem prova automática de toda a doutrina cristã. Analogias contemporâneas da aula não são exemplos literais do autor.",
      ),
    ],
    "Examine objeções à regressão, à composição, ao máximo real e à finalidade. O sistema registra estudo e argumento, não exige concordância com Tomás.",
  ),
  activity: {
    prompt:
      "Escolha uma via. Reconstrua premissas e conclusão, explique um termo técnico, desenvolva a objeção mais forte que consegue formular e avalie uma resposta. Identifique o que a conclusão não demonstra.",
    criteria,
  },
  videos: [],
};
