import type {
  ClaimKind,
  EntityType,
  EvidenceKind,
  RelationKind,
  ReviewStatus,
  SupportLevel,
} from "../domain/knowledge";
import type { ResourceType } from "../domain/library";
import type { PassageRef } from "../domain/scripture";
import { ptBR, type TranslationKey } from "./pt-BR";
export { DEFAULT_LOCALE, DOCUMENT_LANGUAGE_CODES, textDirectionForLanguage } from "./locale";

export function t(key: TranslationKey, values?: Record<string, string | number>): string {
  const message: string = ptBR[key];
  if (!values) return message;
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    message,
  );
}

const BOOK_LABELS: Record<string, string> = {
  genesis: "Gênesis",
  exodus: "Êxodo",
  leviticus: "Levítico",
  numbers: "Números",
  deuteronomy: "Deuteronômio",
  joshua: "Josué",
  judges: "Juízes",
  ruth: "Rute",
  "1-samuel": "1 Samuel",
  "2-samuel": "2 Samuel",
  "1-kings": "1 Reis",
  "2-kings": "2 Reis",
  "1-chronicles": "1 Crônicas",
  "2-chronicles": "2 Crônicas",
  ezra: "Esdras",
  nehemiah: "Neemias",
  esther: "Ester",
  job: "Jó",
  psalms: "Salmos",
  proverbs: "Provérbios",
  ecclesiastes: "Eclesiastes",
  "song-of-songs": "Cântico dos Cânticos",
  isaiah: "Isaías",
  jeremiah: "Jeremias",
  lamentations: "Lamentações",
  ezekiel: "Ezequiel",
  daniel: "Daniel",
  hosea: "Oseias",
  joel: "Joel",
  amos: "Amós",
  obadiah: "Obadias",
  jonah: "Jonas",
  micah: "Miqueias",
  nahum: "Naum",
  habakkuk: "Habacuque",
  zephaniah: "Sofonias",
  haggai: "Ageu",
  zechariah: "Zacarias",
  malachi: "Malaquias",
  matthew: "Mateus",
  mark: "Marcos",
  luke: "Lucas",
  john: "João",
  acts: "Atos",
  romans: "Romanos",
  "1-corinthians": "1 Coríntios",
  "2-corinthians": "2 Coríntios",
  galatians: "Gálatas",
  ephesians: "Efésios",
  philippians: "Filipenses",
  colossians: "Colossenses",
  "1-thessalonians": "1 Tessalonicenses",
  "2-thessalonians": "2 Tessalonicenses",
  "1-timothy": "1 Timóteo",
  "2-timothy": "2 Timóteo",
  titus: "Tito",
  philemon: "Filemom",
  james: "Tiago",
  "1-peter": "1 Pedro",
  "2-peter": "2 Pedro",
  "1-john": "1 João",
  "2-john": "2 João",
  "3-john": "3 João",
  jude: "Judas",
  hebrews: "Hebreus",
  revelation: "Apocalipse",
  tobit: "Tobias",
  judith: "Judite",
  "greek-esther": "Ester Grego",
  wisdom: "Sabedoria",
  sirach: "Eclesiástico",
  baruch: "Baruque",
  "1-maccabees": "1 Macabeus",
  "2-maccabees": "2 Macabeus",
  "1-esdras": "1 Esdras",
  "prayer-of-manasseh": "Oração de Manassés",
  "psalm-151": "Salmo 151",
  "3-maccabees": "3 Macabeus",
  "2-esdras": "2 Esdras",
  "4-maccabees": "4 Macabeus",
  "greek-daniel": "Daniel Grego",
};

export function bookLabel(bookId: string, fallback?: string): string {
  return BOOK_LABELS[bookId] ?? fallback ?? bookId;
}

export function passageLabel(ref: PassageRef): string {
  const verse = ref.verseStart
    ? `:${ref.verseStart}${ref.verseEnd && ref.verseEnd !== ref.verseStart ? `–${ref.verseEnd}` : ""}`
    : "";
  return `${bookLabel(ref.bookId)} ${ref.chapter}${verse}`;
}

export function localizePassageReference(value: string): string {
  const match = value.match(/^([A-Za-z]+)(\s+\d.*)$/);
  if (!match) return value;
  const englishBookIds: Record<string, string> = {
    Genesis: "genesis",
    Exodus: "exodus",
    Psalms: "psalms",
    Psalm: "psalms",
    Isaiah: "isaiah",
    Matthew: "matthew",
    Mark: "mark",
    Luke: "luke",
    John: "john",
    Acts: "acts",
    Romans: "romans",
    Hebrews: "hebrews",
    Revelation: "revelation",
  };
  const bookId = englishBookIds[match[1] ?? ""];
  return bookId ? `${bookLabel(bookId)}${match[2]}` : value;
}

const LANGUAGE_LABELS: Record<string, string> = {
  "pt-BR": "Português (Brasil)",
  pt: "Português",
  en: "Inglês",
  grc: "Grego antigo",
  he: "Hebraico",
  hbo: "Hebraico bíblico",
  arc: "Aramaico",
  la: "Latim",
  lat: "Latim",
};

export function languageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}

const STATUS_KEYS: Record<string, TranslationKey> = {
  available: "status.available",
  unavailable: "status.unavailable",
  ambiguous: "status.ambiguous",
  empty: "status.empty",
  "not-imported": "status.not-imported",
  "not-indexed": "status.not-indexed",
  "awaiting-source": "status.awaiting-source",
  "license-restricted": "status.license-restricted",
  "not-analyzed": "status.not-analyzed",
  "not-existing": "status.not-existing",
  demo: "status.demo",
  unsourced: "status.unsourced",
  draft: "status.draft",
  reviewed: "status.reviewed",
  verified: "status.verified",
  disputed: "status.disputed",
  imported: "status.imported",
  pending: "status.pending",
  indexed: "status.indexed",
  local: "status.local",
  remote: "status.remote",
  "not-downloaded": "status.not-downloaded",
  "public-domain": "status.public-domain",
  "open-license": "status.open-license",
  restricted: "status.restricted",
  "permission-required": "status.permission-required",
  personal: "status.personal",
  unknown: "status.unknown",
};

export function statusLabel(status: string): string {
  const key = STATUS_KEYS[status];
  return key ? t(key) : status;
}

const PROVENANCE_KEYS: Record<string, TranslationKey> = {
  bundled: "provenance.bundled",
  imported: "provenance.imported",
  "user-provided": "provenance.user-provided",
  editorial: "provenance.editorial",
  generated: "provenance.generated",
  human: "provenance.human",
  "machine-assisted": "provenance.machine-assisted",
  "ai-generated": "provenance.ai-generated",
};

export function provenanceLabel(value: string): string {
  const key = PROVENANCE_KEYS[value];
  return key ? t(key) : value;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  person: "Pessoa",
  place: "Lugar",
  event: "Evento",
  passage: "Passagem",
  work: "Obra",
  concept: "Conceito",
  word: "Palavra",
  manuscript: "Manuscrito",
  "historical-source": "Fonte histórica",
};

export function entityTypeLabel(type: EntityType): string {
  return ENTITY_LABELS[type];
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  bible: "Bíblia",
  commentary: "Comentário",
  dictionary: "Dicionário",
  lexicon: "Léxico",
  theology: "Teologia",
  history: "História",
  language: "Idioma",
  "ancient-literature": "Literatura antiga",
  article: "Artigo",
  "personal-document": "Documento pessoal",
};

export function resourceTypeLabel(type: ResourceType): string {
  return RESOURCE_LABELS[type];
}

const EVIDENCE_LABELS: Record<EvidenceKind, string> = {
  textual: "Textual",
  historical: "Histórica",
  archaeological: "Arqueológica",
  linguistic: "Linguística",
  traditional: "Tradicional",
  theological: "Teológica",
};

export function evidenceLabel(kind: EvidenceKind | string): string {
  return EVIDENCE_LABELS[kind as EvidenceKind] ?? kind;
}

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  draft: "Rascunho",
  imported: "Importado",
  "machine-linked": "Vinculado por máquina",
  "source-checked": "Fonte conferida",
  reviewed: "Revisado",
  verified: "Verificado",
  disputed: "Contestado",
};

export function reviewStatusLabel(status: ReviewStatus): string {
  return REVIEW_LABELS[status];
}

const CLAIM_KIND_LABELS: Record<ClaimKind, string> = {
  "textual-observation": "Observação textual",
  "historical-source-observation": "Observação de fonte histórica",
  "linguistic-analysis": "Análise linguística",
  "textual-critical-analysis": "Crítica textual",
  "historical-reconstruction": "Reconstrução histórica",
  "exegetical-interpretation": "Interpretação exegética",
  "theological-interpretation": "Interpretação teológica",
  "symbolic-interpretation": "Interpretação simbólica",
  "mystical-tradition": "Tradição mística",
  "philosophical-analysis": "Análise filosófica",
  "reception-history": "História da recepção",
  "academic-hypothesis": "Hipótese acadêmica",
  speculation: "Especulação",
};

export function claimKindLabel(kind: ClaimKind): string {
  return CLAIM_KIND_LABELS[kind];
}

const SUPPORT_LABELS: Record<SupportLevel, string> = {
  direct: "Direto",
  strong: "Forte",
  moderate: "Moderado",
  weak: "Fraco",
  disputed: "Contestado",
  unknown: "Desconhecido",
};

export function supportLevelLabel(level: SupportLevel): string {
  return SUPPORT_LABELS[level];
}

const RELATION_LABELS: Record<RelationKind, string> = {
  "mentioned-in": "mencionado em",
  "located-in": "localiza-se em",
  "related-to": "relaciona-se a",
  "part-of": "faz parte de",
  authored: "autoria atribuída",
  "translated-as": "traduzido como",
  "used-in": "usado em",
  "contains-occurrence-of": "contém ocorrência de",
  echoes: "ressoa",
  "attested-in": "atestado em",
};

export function relationLabel(relation: RelationKind | string): string {
  return RELATION_LABELS[relation as RelationKind] ?? relation;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatDecimal(value: number, digits = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(value: string | number | Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

const MORPHOLOGY_LABELS: Record<string, string> = {
  adjective: "adjetivo",
  adverb: "advérbio",
  interjection: "interjeição",
  neuter: "neutro",
  vocative: "vocativo",
  "adverb or adverb and particle combined": "advérbio ou advérbio combinado com partícula",
  "aramaic transliterated word": "palavra aramaica transliterada",
  "reciprocal pronoun": "pronome recíproco",
  "demonstrative pronoun": "pronome demonstrativo",
  "demonstrative pronoun+conjunction": "pronome demonstrativo + conjunção",
  "reflexive pronoun": "pronome reflexivo",
  "interrogative pronoun": "pronome interrogativo",
  "correlative pronoun": "pronome correlativo",
  "personal pronoun": "pronome pessoal",
  "relative pronoun": "pronome relativo",
  "possessive pronoun": "pronome possessivo",
  "indefinite pronoun": "pronome indefinido",
  "definite article": "artigo definido",
  "indeclinable noun of other type": "substantivo indeclinável (outro tipo)",
  "indeclinable proper noun": "substantivo próprio indeclinável",
  "particle or disjunctive": "partícula ou disjuntiva",
  "interrogative particle": "partícula interrogativa",
  "negative particle": "partícula negativa",
  "correlative or interrogative pronoun": "pronome correlativo ou interrogativo",
  "1st": "1ª pessoa",
  "2nd": "2ª pessoa",
  "3rd": "3ª pessoa",
  "1st person": "1ª pessoa",
  "2nd person": "2ª pessoa",
  "2nd plural": "2ª pessoa do plural",
  "2nd singular": "2ª pessoa do singular",
  aorist: "aoristo",
  future: "futuro",
  present: "presente",
  pluperfect: "mais-que-perfeito",
  "2nd aorist": "segundo aoristo",
  "2nd future": "segundo futuro",
  "2nd pluperfect": "segundo mais-que-perfeito",
  "2nd present": "segundo presente",
  "2nd perfect": "segundo perfeito",
  "indefinite tense": "tempo indefinido",
  middle: "média",
  passive: "passiva",
  "middle deponent": "média depoente",
  "passive deponent": "passiva depoente",
  "indefinite voice": "voz indefinida",
  "middle or passive deponent": "média ou passiva depoente",
  "middle or passive": "média ou passiva",
  "impersonal active": "ativa impessoal",
  imperative: "imperativo",
  optative: "optativo",
  subjunctive: "subjuntivo",
  infinitive: "infinitivo",
  participle: "particípio",
  Infinitive: "infinitivo",
  Participle: "particípio",
  Form: "Forma verbal",
  Extra: "Característica adicional",
  "Name type": "Tipo de nome",
  Person: "pessoa",
  Location: "local",
  Title: "título",
  Gentilic: "gentílico",
  Comparative: "comparativo",
  Superlative: "superlativo",
  Numeral: "numeral",
  noun: "substantivo",
  verb: "verbo",
  preposition: "preposição",
  article: "artigo",
  conjunction: "conjunção",
  pronoun: "pronome",
  particle: "partícula",
  nominative: "nominativo",
  accusative: "acusativo",
  dative: "dativo",
  genitive: "genitivo",
  singular: "singular",
  plural: "plural",
  masculine: "masculino",
  feminine: "feminino",
  common: "comum",
  unmapped: "não mapeado",
  imperfect: "imperfeito",
  perfect: "perfeito",
  active: "ativa",
  indicative: "indicativo",
  "3rd singular": "3ª pessoa do singular",
  "3rd masculine singular": "3ª pessoa masculina do singular",
};

export function morphologyLabel(value: string): string {
  return MORPHOLOGY_LABELS[value] ?? value;
}

const LENS_PRESENTATION: Record<string, { label: string; description: string; question: string }> =
  {
    textual: {
      label: "Crítica textual",
      description: "Compara edições, testemunhos, variantes e decisões editoriais.",
      question: "Quais testemunhos sustentam esta leitura?",
    },
    philological: {
      label: "Filologia e idioma",
      description: "Estuda gramática, sintaxe, lexemas, campo semântico e discurso.",
      question: "O que esta forma permite gramaticalmente?",
    },
    exegetical: {
      label: "Exegese",
      description: "Investiga o que a passagem comunica em seu contexto literário e histórico.",
      question: "Qual é o argumento da passagem?",
    },
    hermeneutical: {
      label: "Hermenêutica",
      description: "Explicita pressupostos e estruturas interpretativas de uma leitura.",
      question: "Qual horizonte de interpretação está sendo utilizado?",
    },
    historical: {
      label: "Investigação histórica",
      description: "Examina cronologia, cultura material, instituições e o mundo social antigo.",
      question: "O que a evidência primária permite estabelecer?",
    },
    "history-of-religions": {
      label: "História das religiões",
      description: "Compara práticas e conceitos sem pressupor um único cânon confessional.",
      question: "Quais contextos religiosos antigos são comparáveis?",
    },
    "philosophy-of-religion": {
      label: "Filosofia da religião",
      description: "Examina conceitos, argumentos, epistemologia e coerência interna.",
      question: "Qual conceito está sendo afirmado?",
    },
    metaphysical: {
      label: "Investigação metafísica",
      description: "Mapeia afirmações sobre ser, causalidade, mente, tempo e transcendência.",
      question: "Que tipo de realidade esta leitura propõe?",
    },
    scientific: {
      label: "Ciência e filosofia natural",
      description:
        "Distingue afirmações empíricas de gênero, cosmologia antiga e modelos científicos modernos.",
      question: "O texto está fazendo uma afirmação empírica?",
    },
    "reception-history": {
      label: "História da recepção",
      description:
        "Rastreia como comunidades, pensadores, artes e instituições interpretaram a passagem.",
      question: "Quem interpretou dessa forma e em qual período?",
    },
  };

export function studyLensPresentation(lens: {
  id: string;
  label: string;
  description: string;
  guidingQuestions: string[];
}) {
  return (
    LENS_PRESENTATION[lens.id] ?? {
      label: lens.label,
      description: lens.description,
      question: lens.guidingQuestions[0] ?? "",
    }
  );
}

const STUDY_ITEM_LABELS: Record<string, string> = {
  passage: "Passagem",
  word: "Palavra",
  concept: "Conceito",
  resource: "Recurso",
  note: "Nota",
  person: "Pessoa",
  place: "Lugar",
};

export function studyItemKindLabel(kind: string): string {
  return STUDY_ITEM_LABELS[kind] ?? kind;
}

const COLLECTION_LABELS: Record<string, string> = {
  all: "Todos os recursos",
  bibles: "Bíblias",
  languages: "Idiomas",
  history: "História",
  ancient: "Literatura antiga",
  personal: "Documentos pessoais",
};

export function collectionLabel(id: string, fallback: string): string {
  return COLLECTION_LABELS[id] ?? fallback;
}

const DISCOVER_LABELS: Record<string, string> = {
  "public-domain": "Domínio público",
  "open-access": "Acesso aberto",
  bibles: "Bíblias",
  "ancient-texts": "Textos antigos",
  dictionaries: "Dicionários",
  academic: "Recursos acadêmicos",
};

export function discoverCategoryLabel(id: string, fallback: string): string {
  return DISCOVER_LABELS[id] ?? fallback;
}
