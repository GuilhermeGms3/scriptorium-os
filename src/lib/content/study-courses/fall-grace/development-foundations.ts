import { foundation, source } from "./sources";
import type { StudyFoundation } from "../../../domain/study-foundation";

export const DEVELOPMENT_FOUNDATIONS: Readonly<Record<string, readonly StudyFoundation[]>> = {
  "cinco-vias": foundation(
    "As cinco vias não equivalem à demonstração imediata de todo o conteúdo da fé cristã.",
    "Filosofia",
    "Argumento",
    "A separação entre premissas, inferências, exemplos e objeções é reconstrução didática original. O recorte tomista distingue o alcance da razão e a doutrina recebida por revelação.",
    [
      source(
        "sacredDoctrine",
        "Suma I, q.1, a.1–2",
        "Distingue doutrina sagrada e investigação filosófica.",
        "É uma proposta escolástica; não constitui critério metodológico aceito por toda a filosofia.",
      ),
      source(
        "ways",
        "Suma I, q.2, a.2–3",
        "Situa demonstração pelos efeitos e cinco argumentos abreviados.",
        "As objeções e analogias desenvolvidas nas aulas são editoriais, não transcrição de Tomás.",
      ),
    ],
    "Compare argumentos reformulados e objeções às inferências; não trate uma ilustração como prova experimental.",
  ),
  adao: foundation(
    "A hipótese arquetípica precisa distinguir liberdade situada, representação e afirmação histórica.",
    "Teologia",
    "Interpretação",
    "A síntese sobre vida recebida, tarefa e limite é análise editorial de Gênesis 2, comparada à tipologia de Romanos 5; não reconstrução arqueológica.",
    [
      source(
        "freedom",
        "Suma I–II, q.13, a.1 e 6",
        "Oferece uma análise de deliberação e escolha para o problema da responsabilidade.",
        "Não formula a hipótese moderna de Adão como arquétipo e não demonstra sua historicidade.",
      ),
    ],
    "Leituras históricas e representativas podem ser combinadas de modos diferentes; declarar o modelo adotado.",
  ),
  alteridade: foundation(
    "Alteridade é uma categoria analítica aplicada às cenas de reconhecimento e acusação de Gênesis.",
    "Leitura textual",
    "Interpretação",
    "A exposição compara Gênesis 1:26–28, 2:18–25 e 3:8–19. A linguagem filosófica de alteridade não é apresentada como um termo técnico do narrador antigo.",
    [
      source(
        "irenaeus",
        "Contra as heresias III.22, §§1–4",
        "Documenta uma recepção cristã antiga de Adão, Eva e Cristo.",
        "A comparação não atribui ao autor toda a análise contemporânea sobre reconhecimento, dignidade e responsabilidade.",
      ),
    ],
    "Distinguir consequência narrada, norma defendida e aplicação ética atual, explicitando os passos entre elas.",
  ),
  queda: foundation(
    "Uma doutrina da corrupção não precisa afirmar que o humano deixou de ser humano.",
    "Teologia",
    "Interpretação",
    "Comparam-se privação, vontade e condição caída em fontes com vocabulários próprios. A relação com história natural é uma questão adicional, sem cronologia empírica inferida do texto.",
    [
      source(
        "evil",
        "Suma I, q.48, a.1 e 3–4",
        "Relaciona privação e bem do sujeito que permanece.",
        "Não fornece uma explicação científica da origem de toda morte animal.",
      ),
      source(
        "concordWill",
        "Declaração Sólida II, §§1–7",
        "Distingue estados e delimita o problema da conversão.",
        "Não é uma teoria neutra de toda ação humana ou uma concordância automática com Tomás.",
      ),
    ],
    "Compare culpa, corrupção, bens civis e orientação última sem atribuir culpa pessoal a toda pessoa que sofre.",
  ),
  cristo: [
    ...foundation(
      "Humanidade completa, unidade pessoal e distinção de vontades são articuladas no recorte calcedoniano estudado.",
      "Teologia",
      "Interpretação",
      "O percurso usa a gramática de pessoa e natureza para examinar coerência cristológica, sem apresentá-la como descrição biológica ou como linguagem uniforme de todos os cristãos.",
      [
        source(
          "incarnation",
          "Suma III, q.1, a.1–3",
          "Examina a conveniência da encarnação e a distinção de necessidade.",
          "A conveniência teológica não obriga Deus por uma carência externa.",
        ),
        source(
          "union",
          "Suma III, q.2, a.1–2",
          "Distingue natureza e pessoa na união do Verbo.",
          "Não autoriza dissolver a humanidade em divindade ou criar dois sujeitos independentes.",
        ),
        source(
          "christWills",
          "Suma III, q.18, a.1 e 5",
          "Trata da vontade humana e divina e da relação do querer humano com a paixão.",
          "Não equivale a afirmar duas pessoas nem a eliminar angústia e sofrimento.",
        ),
      ],
      "Comparar a hipótese editorial com a realidade da morte e evitar transformar coerência em mecanismo impessoal.",
    ),
    ...foundation(
      "Paixão e ressurreição precisam ser relacionadas sem apagar sofrimento, liberdade e continuidade corporal.",
      "Teologia",
      "Interpretação",
      "As analogias e os casos são originais; a análise teológica permanece distinta da investigação histórica dos testemunhos.",
      [
        source(
          "passion",
          "Suma III, q.46, a.1–3",
          "Distingue conveniência, liberdade e necessidade da paixão.",
          "Não legitima violência humana nem uma culpa coletiva atribuída a povos.",
        ),
        source(
          "passionEffect",
          "Suma III, q.48, a.1–4",
          "Articula mérito, satisfação, sacrifício e redenção.",
          "Não pode ser identificado sem mediação com todo modelo posterior de substituição penal.",
        ),
        source(
          "risenBody",
          "Suma III, q.54, a.1–3",
          "Examina a realidade do corpo ressuscitado e sua condição glorificada.",
          "É elaboração confessional, não um exame laboratorial de um evento.",
        ),
      ],
      "Modelos de salvação explicam aspectos diferentes; explicitar sua compatibilidade em vez de apenas acumular imagens.",
    ),
  ],
  sheol: foundation(
    "Estado intermediário, destino final e ressurreição são perguntas relacionadas, mas distintas.",
    "Leitura textual",
    "Interpretação",
    "O percurso compara gêneros e unidades bíblicas e desenvolve objeções aos três modelos apresentados. Não declara consenso nem oferece um mapa literal do além.",
    [
      source(
        "westminster",
        "Confissão, capítulos 32–33",
        "Apresenta estado após a morte, ressurreição e juízo numa confissão reformada.",
        "É contraponto ao condicionalismo, não sua fonte de comprovação.",
      ),
      source(
        "risenBody",
        "Suma III, q.54, a.1–3",
        "Permite distinguir ressurreição e simples persistência desencarnada.",
        "Trata do corpo de Cristo; não decide sozinho toda questão sobre consciência dos mortos.",
      ),
    ],
    "Tormento consciente, imortalidade condicional e restauração universal devem enfrentar suas passagens difíceis e limites.",
  ),
  graca: foundation(
    "Gratuidade, resposta, justificação e transformação não recebem organização idêntica em todas as tradições.",
    "Teologia",
    "Interpretação",
    "A comparação conserva as definições confessionais, distingue monergismo de inércia e evita tratar miséria moral como ausência de dignidade.",
    [
      source(
        "justification",
        "Suma I–II, q.113, a.1–3 e 6–8",
        "Relaciona graça, movimento da vontade e remissão.",
        "Não deve ser substituída pela definição de justificação de outra tradição sem indicar a diferença.",
      ),
      source(
        "dort",
        "Terceiro e Quarto Pontos, artigo 16",
        "Afirma restauração da vontade sem tratar a pessoa como objeto inerte.",
        "É uma formulação reformada específica, não consenso de todas as tradições.",
      ),
      source(
        "augsburg",
        "Artigos IV e VI",
        "Permite comparar justificação e obediência em fonte luterana.",
        "A comparação não dissolve suas diferenças com o vocabulário escolástico.",
      ),
    ],
    "Examinar a relação entre dom e resposta sem reduzir a discordância a rótulos pejorativos.",
  ),
  providencia: foundation(
    "A afirmação de providência não fornece conhecimento automático da razão de cada tragédia.",
    "Filosofia",
    "Argumento",
    "O percurso distingue conhecimento, decreto, permissão e produção; a aplicação a casos de injustiça é análise editorial, não previsão divina atribuída ao aplicativo.",
    [
      source(
        "providence",
        "Suma I, q.22, a.3–4",
        "Examina causas e contingência sob providência.",
        "Distinguir níveis de causalidade não resolve por si todo o problema do mal.",
      ),
      source(
        "predestination",
        "Suma I, q.23, a.1 e 5",
        "Relaciona predestinação e providência sem as tornar termos idênticos.",
        "É um recorte escolástico e não revela o destino de pessoas concretas.",
      ),
    ],
    "Conservar investigação das causas, responsabilidade e cuidado mesmo onde não se conhece uma razão última.",
  ),
  calvinismo: foundation(
    "Uma família soteriológica pode conter divergências concretas sobre aliança, comunidade e sinais.",
    "História",
    "Testemunho textual",
    "A comparação é documental: eleição e orientação da consciência em Dort; destinatários do batismo em Westminster e na Confissão Batista de 1689.",
    [
      source(
        "dort",
        "Primeiro Ponto, artigos 7 e 16",
        "Documenta eleição gratuita e orientação a quem teme ser reprovado.",
        "Não oferece ao leitor acesso ao decreto secreto nem descreve toda posição reformada.",
      ),
      source(
        "westminster",
        "Confissão, capítulo 28, §4",
        "Inclui filhos de pais crentes entre destinatários do batismo.",
        "O recorte sobre batismo não esgota sua teologia da aliança.",
      ),
      source(
        "baptistConfession",
        "Capítulo 29, §2",
        "Restringe destinatários aos que professam arrependimento e fé.",
        "A versão consultada é modernizada; não comprova identidade de todo o sistema com Westminster.",
      ),
    ],
    "Distinguir pontos compartilhados de soteriologia e diferenças eclesiológicas sem chamar toda igreja de uma mesma confissão.",
  ),
  luteranismo: foundation(
    "A Fórmula de Concórdia responde a controvérsias internas e distingue presciência de eleição.",
    "História",
    "Testemunho textual",
    "O documento confessional e uma autodescrição institucional são identificados separadamente; não se afirma uniformidade de todas as igrejas luteranas atuais.",
    [
      source(
        "concordWill",
        "Declaração Sólida II, §§1–7",
        "Delimita a controvérsia sobre vontade e conversão.",
        "Não equivale a negar toda ação civil nem a descrever todas as fases da vida da mesma maneira.",
      ),
      source(
        "concordElection",
        "Declaração Sólida XI, §§4–13 e 26–33",
        "Distingue presciência e eleição e orienta para a promessa revelada.",
        "Não deve ser identificado automaticamente à dupla predestinação reformada.",
      ),
      source(
        "concordHistory",
        "Parágrafos sobre controvérsias Flaciana, Osiandriana e Stancariana",
        "Documenta a autodescrição histórica da formação da Fórmula.",
        "É uma apresentação institucional LCMS, não levantamento independente de todas as correntes atuais.",
      ),
    ],
    "Comparar fundamentos, meios e frutos da fé sem fabricar uma oposição absoluta entre tradições.",
  ),
  anglicanismo: foundation(
    "Patrimônio comum e diversidade de recepção impedem reduzir o anglicanismo a um único estilo de culto.",
    "História",
    "Testemunho textual",
    "A apresentação canadense e a apresentação da Diocese de Londres são autodescrições institucionais. As perguntas comparativas sobre ênfases são síntese didática, não pesquisa sociológica de todas as províncias.",
    [
      source(
        "anglicanReception",
        "Apresentação e artigos VI, XVII, XX e XXXIV",
        "Explicita patrimônio dos artigos e limites de uma recepção uniforme na Comunhão.",
        "O estatuto institucional deve ser verificado por província, não generalizado da apresentação canadense.",
      ),
      source(
        "anglicanTraditions",
        "Parágrafo sobre diversidade de tradições no vínculo Londres–Nova York",
        "Reconhece diversidade liberal, tradicionalista, anglo-católica e evangélica nesse vínculo institucional.",
        "Não demonstra que cada corrente seja uniforme nem que explique toda a diversidade mundial.",
      ),
    ],
    "Separar doutrina, interpretação e rito; não identificar evangélico com avivamentismo ou católico anglicano com romano.",
  ),
  oracao: foundation(
    "Petição e conformação da vontade podem coexistir sem barganha ou obrigação de negar o sofrimento.",
    "Teologia",
    "Interpretação",
    "A leitura relaciona Pai-nosso, Getsêmani e lamento. Exemplos de cuidado e discernimento são aplicações editoriais, sem diagnóstico da fé de indivíduos.",
    [
      source(
        "prayer",
        "Suma II–II, q.83, a.2 e 5–6",
        "Discute petição, providência e bens temporais.",
        "Não é uma garantia de resultado particular nem uma proibição de pedir.",
      ),
      source(
        "christWills",
        "Suma III, q.18, a.1 e 5",
        "Oferece distinções para a vontade humana de Cristo e a paixão.",
        "Getsêmani não autoriza equiparar todo sofrimento imposto a uma vocação que deve ser aceita.",
      ),
    ],
    "Distinguir confiança, interpretação e alegação verificável; entrega pode acompanhar cuidado, estudo e reparação.",
  ),
};
