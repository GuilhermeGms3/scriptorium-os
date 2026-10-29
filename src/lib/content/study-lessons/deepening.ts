import { DOCTRINE_DEEPENING } from "./deepening-doctrines";
import { METHOD_DEEPENING } from "./deepening-methods";
import { DOCUMENT_DEEPENING } from "./deepening-documents";
import { TRADITION_DEEPENING } from "./deepening-traditions";
import { deepStudy as d, type DeepStudy } from "./deepening-types";

export const TOPIC_DEEPENING: Readonly<Record<string, DeepStudy>> = {
  ...DOCTRINE_DEEPENING, ...METHOD_DEEPENING, ...DOCUMENT_DEEPENING, ...TRADITION_DEEPENING,
};

/** Shared competencies are reused explicitly; no topic is filled by a title-based guess. */
const CHAPTER_TOPICS: Readonly<Record<string, string>> = {
  theology: "topic:theology-proper", "doctrine-history": "entity:historical:nicene-constantinopolitan-creed",
  "faith-reason": "school:thomism", "christ-person": "topic:christology", "trinity-persons": "doctrine:trinity",
  "salvation-language": "topic:soteriology", "grace-faith": "topic:justification", "human-person": "topic:anthropology",
  sin: "topic:hamartiology", "church-community": "topic:ecclesiology", sacraments: "topic:sacramentology",
  "spirit-scripture": "topic:pneumatology", spirit: "topic:pneumatology", "resurrection-creation": "doctrine:resurrection-dead",
  "last-things": "topic:eschatology", interpretation: "method:theological-interpretation", context: "method:historical-grammatical",
  parable: "method:form-criticism", reception: "method:reception-history", "ancient-christianity": "entity:historical:didache",
  "council-confession": "entity:historical:apostles-creed", "council-reading": "entity:historical:nicene-constantinopolitan-creed",
  "history:nicaea325": "entity:council:nicaea-325", "history:constantinople381": "entity:council:constantinople-381",
  "history:ephesus431": "entity:council:ephesus-431", "history:chalcedon451": "entity:council:chalcedon-451",
  "history:reformations": "tradition:lutheran", "history:orthodoxies": "tradition:eastern-orthodox",
};
const SPECIAL_CHAPTERS: Readonly<Record<string, DeepStudy>> = {
  "history:constantinople553": d(
    "O debate em torno de Constantinopla II envolve a recepção de Calcedônia e controvérsias associadas aos chamados Três Capítulos. Isso mostra que uma fórmula conciliar não elimina imediatamente todos os problemas de interpretação. A relação entre decisões, autores condenados e comunidades que recebem o concílio precisa ser documentada, não resumida como simples repetição de uma definição anterior.",
    "Na coleção dos concílios, identifique qual documento está sendo lido: decisão, condenação ou comentário editorial. Observe como se procura afirmar continuidade com autoridades anteriores. A seleção de uma citação antiga pode funcionar como argumento num conflito posterior; autoria da frase e função de sua nova utilização são questões distintas.",
    "Reconstrua uma questão de recepção cristológica e cite o documento usado. Separe a decisão de sua interpretação histórica. Não trate divergências de recepção como se todas fossem provocadas pelo desconhecimento do mesmo texto: vocabulário, autoridade e contexto eclesiástico também participam da controvérsia.",
  ),
  "history:constantinople680": d(
    "Constantinopla III aborda a questão das vontades e operações em Cristo. O problema é como afirmar humanidade efetiva e unidade pessoal, sem eliminar a vontade humana ou postular dois sujeitos independentes. Vontade natural e conflito moral não são expressões equivalentes; o vocabulário precisa ser compreendido no problema cristológico em que é empregado.",
    "Compare a formulação conciliar com o relato do Getsêmani em Marcos 14:32–42. O relato oferece ações e falas; a definição organiza uma afirmação doutrinária. Explique a relação proposta sem fingir que os termos técnicos do concílio já estão apresentados como um tratado dentro da narrativa evangélica.",
    "Explique por que a discussão de vontade importa para a afirmação da humanidade de Cristo. Apresente uma objeção e a resposta da fonte. Identifique claramente se está descrevendo o documento, avaliando sua coerência ou reconstruindo sua história de recepção.",
  ),
  "history:nicaea787": d(
    "Niceia II participa da controvérsia sobre imagens e sua veneração. A questão exige distinguir o objeto material, quem é representado e o tipo de honra considerado legítimo. Uma posição sobre imagens não pode ser avaliada apenas pelo uso da palavra adoração sem esclarecer o vocabulário empregado pelo documento e por seus interlocutores.",
    "Leia a formulação conciliar sobre imagens na coleção documental e compare com uma fonte contrária ao seu uso. Identifique como cada uma relaciona encarnação, representação e culto. Uma fotografia de uma prática contemporânea não substitui a reconstrução do argumento defendido por seus participantes.",
    "Apresente a distinção conceitual que sustenta uma das posições e formule uma crítica que a enfrente diretamente. Separe análise histórica e sua própria convicção sobre imagens. O objetivo é compreender a divergência, sem reduzir os envolvidos a caricaturas de idolatria ou de desprezo pela arte.",
  ),
  "history:crusades": d(
    "As fontes sobre uma convocação podem divergir porque foram produzidas em situações e momentos diferentes. Um discurso reconstituído não equivale a uma gravação de palavras exatas. A investigação das cruzadas precisa relacionar religião, poder, mobilização e violência sem tratar um único motivo como explicação suficiente para toda ação e todo participante.",
    "Compare duas versões do discurso de Clermont com uma carta preservada na coleção de fontes. Marque destinatário, justificações e ênfases. Pergunte o que as diferenças permitem observar sobre a construção da memória e o que ainda seria necessário para reconstruir o acontecimento e seus efeitos.",
    "Formule uma conclusão limitada a essas fontes e indique o que ela não permite generalizar sobre todas as cruzadas. Ao discutir justificação religiosa da violência, diferencie descrição do argumento histórico e aprovação moral. Explicar um contexto não exige desculpar os danos cometidos.",
  ),
  "history:cathars": d(
    "Conhecer um grupo principalmente por seus adversários cria um problema de assimetria documental. Uma acusação pode revelar categorias e objetivos de quem acusa, além de alguma informação sobre o acusado. A análise precisa identificar interesses, procedimentos e condições de produção, sem presumir que toda afirmação adversária seja falsa ou transparente.",
    "Compare um trecho de Bernard Gui com o testemunho ritual de Lyon disponibilizado nas fontes. Observe qual comportamento ou ensino cada documento descreve e para qual finalidade. A diferença de gênero impede usar interrogatório e rito como se fossem duas respostas à mesma pergunta moderna.",
    "Reconstrua uma afirmação com apoio documental e classifique seu grau de segurança. Identifique uma questão que a documentação disponível não resolve. Evite fabricar a voz ausente do grupo ou transformar todos os indivíduos perseguidos em representantes de uma doutrina uniforme.",
  ),
  "history:islam": d(
    "A história do surgimento do islã e das relações mediterrâneas exige distinguir texto religioso, testemunho histórico e objeto material. Uma inscrição, um relato posterior e uma interpretação teológica não respondem às mesmas perguntas. Também não se deve projetar a identidade de estados atuais sobre comunidades e conflitos da Antiguidade tardia.",
    "Na síntese do Metropolitan Museum, identifique datas, objetos e relações culturais mencionados. Escolha uma afirmação e procure qual tipo de evidência a sustenta. A apresentação de um museu é uma fonte secundária útil para orientação, mas não deve ser citada como se fosse o documento primário do século VII.",
    "Delimite uma questão sobre circulação de textos ou contatos entre comunidades e indique as fontes necessárias. Separe investigação histórica e avaliação religiosa. Uma comparação com cristianismos antigos deve reconhecer diversidade em ambos os lados, evitando tratar séculos de relações apenas como conflito homogêneo.",
  ),
  gnosis: d(
    "Gnose pode designar conhecimento salvífico em sistemas diferentes; a categoria gnosticismo não transforma todos os textos de Nag Hammadi numa religião uniforme. Códice, tratado, tradução e proposta de datação são níveis documentais distintos. Um códice que preserva uma obra não determina sozinho a data de sua primeira composição.",
    "Escolha um tratado realmente disponível e registre título, códice, idioma e edição. Compare sua abertura com uma apresentação acadêmica, separando o que o texto afirma de categorias adotadas pelo pesquisador. Não reúna frases de tratados diferentes como se pertencessem a um sistema escrito por um único autor.",
    "Apresente uma concepção de conhecimento, mundo ou salvação numa unidade delimitada. Cite o localizador e indique uma diferença em relação a outro texto. Se não houver tradução acessível, registre a lacuna em vez de afirmar que a mera presença do volume torna todo seu conteúdo compreendido.",
  ),
};
export function chapterDeepening(id: string): DeepStudy | undefined {
  return SPECIAL_CHAPTERS[id] ?? TOPIC_DEEPENING[CHAPTER_TOPICS[id] ?? ""];
}
