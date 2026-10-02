export const PORTUGUESE_KNOWLEDGE_LABELS: Readonly<Record<string, string>> = {
  "entity:work:gospel-of-john": "Evangelho segundo João",
  "entity:work:epistle-diognetus": "Epístola a Diogneto",
  "entity:work:origen-commentary-john": "Comentário de Orígenes sobre o Evangelho de João",
  "entity:concept:logos": "Logos",
  "entity:concept:incarnation-language": "Linguagem da encarnação",
  "entity:concept:life-john": "Vida no prólogo de João",
  "entity:concept:light-john": "Luz no prólogo de João",
  "entity:concept:witness-john": "Testemunho no prólogo de João",
  "entity:concept:grace-truth-john": "Graça e verdade em João 1",
  "entity:person:michael-w-holmes": "Michael W. Holmes",
  "entity:historical:apostles-creed": "Credo dos Apóstolos",
  "entity:historical:nicene-constantinopolitan-creed": "Credo Niceno-Constantinopolitano",
  "entity:historical:chalcedon": "Definição de Calcedônia",
  "entity:historical:athanasian-creed": "Credo Atanasiano",
  "entity:historical:augsburg-confession": "Confissão de Augsburgo",
  "entity:historical:thirty-nine-articles": "Trinta e Nove Artigos",
  "entity:historical:westminster-confession": "Confissão de Fé de Westminster",
  "entity:historical:canons-of-dort": "Cânones de Dort",
  "entity:historical:didache": "Didaquê",
  "entity:historical:first-clement": "1 Clemente",
  "entity:historical:second-clement": "2 Clemente",
  "entity:historical:polycarp-philippians": "Policarpo aos Filipenses",
  "entity:historical:martyrdom-polycarp": "Martírio de Policarpo",
  "entity:historical:ignatius-letters": "Cartas de Inácio",
  "entity:historical:epistle-barnabas": "Epístola de Barnabé",
  "entity:historical:shepherd-hermas": "Pastor de Hermas",
  "entity:historical:epistle-diognetus": "Epístola a Diogneto",
  "entity:council:nicaea-325": "Concílio de Niceia (325)",
  "entity:council:constantinople-381": "Concílio de Constantinopla (381)",
  "entity:council:ephesus-431": "Concílio de Éfeso (431)",
  "entity:council:chalcedon-451": "Concílio de Calcedônia (451)",
  "topic:bibliology": "Bibliologia",
  "topic:theology-proper": "Teologia própria",
  "topic:christology": "Cristologia",
  "topic:pneumatology": "Pneumatologia",
  "topic:anthropology": "Antropologia teológica",
  "topic:hamartiology": "Hamartiologia",
  "topic:soteriology": "Soteriologia",
  "topic:ecclesiology": "Eclesiologia",
  "topic:sacramentology": "Sacramentologia",
  "topic:eschatology": "Escatologia",
  "topic:atonement": "Expiação",
  "topic:justification": "Justificação",
  "topic:sanctification": "Santificação",
  "doctrine:trinity": "Trindade",
  "doctrine:incarnation": "Encarnação",
  "doctrine:two-natures": "Duas naturezas de Cristo",
  "doctrine:resurrection": "Ressurreição",
  "doctrine:atonement": "Expiação",
  "doctrine:original-sin": "Pecado original",
  "doctrine:justification": "Justificação",
  "doctrine:sanctification": "Santificação",
  "doctrine:election": "Eleição / predestinação",
  "doctrine:baptism": "Batismo",
  "doctrine:eucharist": "Eucaristia / Ceia do Senhor",
  "doctrine:scriptural-inspiration": "Inspiração das Escrituras",
  "doctrine:canon": "Cânon",
  "doctrine:church-authority": "Autoridade da Igreja",
  "doctrine:resurrection-dead": "Ressurreição dos mortos",
  "doctrine:final-judgment": "Juízo final",
  "method:textual-criticism": "Crítica textual",
  "method:historical-critical": "Método histórico-crítico",
  "method:historical-grammatical": "Método histórico-gramatical",
  "method:source-criticism": "Crítica das fontes",
  "method:form-criticism": "Crítica das formas",
  "method:redaction-criticism": "Crítica da redação",
  "method:narrative-criticism": "Crítica narrativa",
  "method:canonical-criticism": "Crítica canônica",
  "method:social-scientific": "Crítica sócio-científica",
  "method:reception-history": "História da recepção",
  "method:theological-interpretation": "Interpretação teológica das Escrituras",
  "method:literary-criticism": "Crítica literária",
  "tradition:roman-catholic": "Católica romana",
  "tradition:eastern-orthodox": "Ortodoxa oriental bizantina",
  "tradition:oriental-orthodox": "Ortodoxa oriental",
  "tradition:church-of-east": "Igreja do Oriente",
  "tradition:lutheran": "Luterana",
  "tradition:reformed": "Reformada",
  "tradition:anglican": "Anglicana",
  "tradition:anabaptist": "Anabatista",
  "tradition:baptist": "Batista",
  "tradition:wesleyan-methodist": "Wesleyana / metodista",
  "tradition:pentecostal": "Pentecostal",
  "tradition:restorationist": "Restauracionista",
  "school:thomism": "Tomismo",
  "framework:covenant-theology": "Teologia da aliança",
  "position:christus-victor": "Cristo Vitorioso",
  "position:penal-substitution": "Substituição penal",
  "position:moral-influence": "Influência moral",
  "stance:confessional": "Confessional",
  "stance:non-confessional": "Não confessional",
  "stance:methodological-naturalism": "Naturalismo metodológico",
  "theory:two-source": "Hipótese das duas fontes",
  "theory:farrer": "Hipótese de Farrer",
  "theory:griesbach": "Hipótese de Griesbach",
};

export interface KnowledgeSourceLink {
  workId: string;
  label: string;
  role: string;
}

const SUMMA_I = {
  workId: "work:aquinas-summa-prima-pars",
  label: "Suma Teológica I",
  role: "tratamento escolástico",
};
const SUMMA_I_II = {
  workId: "work:aquinas-summa-prima-secundae",
  label: "Suma Teológica I–II",
  role: "tratamento escolástico",
};
const SUMMA_II_II = {
  workId: "work:aquinas-summa-secunda-secundae",
  label: "Suma Teológica II–II",
  role: "tratamento escolástico",
};
const SUMMA_III = {
  workId: "work:aquinas-summa-tertia-pars",
  label: "Suma Teológica III",
  role: "tratamento escolástico",
};
const AUGUSTINE = {
  workId: "work:augustine-confessions",
  label: "Confissões de Agostinho",
  role: "fonte patrística",
};
const DIDACHE = { workId: "work:didache", label: "Didaquê", role: "fonte cristã antiga" };
const ORIGEN = {
  workId: "work:origen-commentary-john-books-1-2",
  label: "Orígenes sobre João",
  role: "história da recepção",
};

const SOURCE_LINKS: Readonly<Record<string, readonly KnowledgeSourceLink[]>> = {
  "entity:historical:apostles-creed": [
    {
      workId: "work:apostles-creed",
      label: "Credo dos Apóstolos",
      role: "texto histórico instalado",
    },
  ],
  "entity:historical:nicene-constantinopolitan-creed": [
    {
      workId: "work:nicene-constantinopolitan-western",
      label: "Credo Niceno-Constantinopolitano",
      role: "texto histórico instalado",
    },
  ],
  "entity:historical:chalcedon": [
    {
      workId: "work:chalcedonian-definition",
      label: "Definição de Calcedônia",
      role: "texto histórico instalado",
    },
  ],
  "entity:historical:athanasian-creed": [
    {
      workId: "work:athanasian-creed",
      label: "Credo Atanasiano",
      role: "texto histórico instalado",
    },
  ],
  "entity:historical:didache": [DIDACHE],
  "entity:historical:first-clement": [
    { workId: "work:first-clement", label: "1 Clemente", role: "fonte cristã antiga" },
  ],
  "topic:theology-proper": [SUMMA_I],
  "topic:christology": [
    SUMMA_III,
    {
      workId: "work:chalcedonian-definition",
      label: "Definição de Calcedônia",
      role: "documento conciliar",
    },
  ],
  "topic:anthropology": [SUMMA_I, AUGUSTINE],
  "topic:hamartiology": [SUMMA_I_II, AUGUSTINE],
  "topic:soteriology": [SUMMA_I_II, SUMMA_II_II],
  "topic:ecclesiology": [
    DIDACHE,
    { workId: "work:first-clement", label: "1 Clemente", role: "fonte cristã antiga" },
  ],
  "topic:sacramentology": [DIDACHE, SUMMA_III],
  "topic:eschatology": [SUMMA_III],
  "topic:atonement": [SUMMA_III],
  "topic:justification": [SUMMA_I_II],
  "topic:sanctification": [SUMMA_I_II, SUMMA_II_II],
  "doctrine:trinity": [
    SUMMA_I,
    { workId: "work:nicene-creed-325", label: "Credo de Niceia", role: "documento conciliar" },
  ],
  "doctrine:incarnation": [
    SUMMA_III,
    {
      workId: "work:chalcedonian-definition",
      label: "Definição de Calcedônia",
      role: "documento conciliar",
    },
  ],
  "doctrine:two-natures": [
    SUMMA_III,
    {
      workId: "work:chalcedonian-definition",
      label: "Definição de Calcedônia",
      role: "documento conciliar",
    },
  ],
  "doctrine:original-sin": [SUMMA_I_II, AUGUSTINE],
  "doctrine:election": [SUMMA_I],
  "doctrine:baptism": [DIDACHE, SUMMA_III],
  "doctrine:eucharist": [DIDACHE, SUMMA_III],
  "doctrine:church-authority": [
    DIDACHE,
    { workId: "work:first-clement", label: "1 Clemente", role: "fonte cristã antiga" },
  ],
  "method:reception-history": [ORIGEN],
  "method:theological-interpretation": [ORIGEN, SUMMA_I],
  "tradition:roman-catholic": [AUGUSTINE, SUMMA_I, SUMMA_III],
  "school:thomism": [SUMMA_I, SUMMA_I_II, SUMMA_II_II, SUMMA_III],
};

export function knowledgeLabel(id: string, fallback: string): string {
  return PORTUGUESE_KNOWLEDGE_LABELS[id] ?? fallback;
}

export function knowledgeSourceLinks(id: string): readonly KnowledgeSourceLink[] {
  return SOURCE_LINKS[id] ?? [];
}

const ARGUMENT_LABELS: Readonly<Record<string, string>> = {
  "argument:two-source": "Modelo das duas fontes",
  "argument:farrer-alternative": "Alternativa de Farrer",
  "argument:griesbach-alternative": "Alternativa de Griesbach",
};

export function argumentLabel(id: string, fallback?: string): string {
  return ARGUMENT_LABELS[id] ?? fallback ?? id;
}
