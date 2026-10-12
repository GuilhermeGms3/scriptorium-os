import type { DocumentProfileKind } from "../domain/document-profile";

export interface DocumentProfileClassification {
  profile: DocumentProfileKind;
  confidence: number;
  signals: string[];
}

interface ProfileRule {
  profile: DocumentProfileKind;
  /** Written for normalized text: lowercase, no accents, words separated by single spaces. */
  patterns: RegExp[];
}

const PROFILE_RULES: ProfileRule[] = [
  {
    profile: "nag-hammadi-anthology",
    patterns: [/nag hammadi/u, /textos? gnosticos?/u, /codice (?:i|v|x|\d)/u],
  },
  {
    profile: "study-bible",
    patterns: [
      /biblia (?:de )?estudo/u,
      /biblia (?:shedd|genebra|comentada)/u,
      /biblia de jerusalem/u,
      /study bible/u,
    ],
  },
  { profile: "interlinear", patterns: [/interlinear/u, /texto hebraico.*traducao/u] },
  {
    profile: "lexicon",
    patterns: [/lexico/u, /lexicon/u, /strong['’]?s/u, /hebraico e aramaico/u],
  },
  {
    profile: "dictionary",
    patterns: [
      /dicionario/u,
      /dictionary/u,
      /teologia do antigo testamento.*(?:ditat|palavra|verbete)/u,
    ],
  },
  { profile: "encyclopedia", patterns: [/enciclopedia/u, /encyclop/u] },
  { profile: "catechism", patterns: [/catecismo/u, /catechism/u] },
  // "confiss" also catches file names that mangled "ã", such as "confissu-o-de-augsburgo".
  { profile: "confession", patterns: [/\bconfiss/u, /confession/u, /westminster/u] },
  {
    profile: "systematic-theology",
    patterns: [
      /teologia sistematica/u,
      /systematic theology/u,
      /\binstitutas/u,
      /\bsumm?a teologica\b/u,
      /\bsumma\b/u,
    ],
  },
  {
    profile: "biblical-theology",
    patterns: [
      // "teologiado-novo-testamento" lost the space before "do".
      /\bteologia ?(?:do )?(?:novo|antigo) testamento\b/u,
      /\bteologia (?:do )?(?:at|nt)\b/u,
      /\btheology of the (?:old|new) testament\b/u,
      /biblical theology/u,
    ],
  },
  {
    profile: "exegesis-method",
    patterns: [
      /exegese e hermeneutica/u,
      /metodo.*exeg/u,
      /exegese do/u,
      /\bexegese\b.*\b(?:manual|metodologia)\b|\b(?:manual|metodologia)\b.*\bexegese\b/u,
    ],
  },
  {
    profile: "patristic-work",
    patterns: [
      /santo agostinho/u,
      /agostinho/u,
      // Augustine's "Confissões" is not a confession of faith.
      /\bconfissoes de (?:santo )?agostinho\b/u,
      /tomas de aquino/u,
      /origenes/u,
      /pais da igreja/u,
      /patristic/u,
    ],
  },
  {
    profile: "archaeology",
    patterns: [/arqueologia/u, /archaeolog/u, /escavacao/u],
  },
  {
    profile: "church-history",
    patterns: [/historia da igreja/u, /church history/u, /cristianismo antigo/u],
  },
  {
    profile: "commentary",
    patterns: [/comentario/u, /commentary/u, /manual biblico/u, /exposicao biblica/u],
  },
  {
    profile: "ancient-primary-source",
    patterns: [/apocrif/u, /pseudepigraf/u, /evangelho de tome/u, /fonte primaria/u],
  },
];

/** Lowercase words without accents, separated by single spaces. */
function plainWords(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[\s_.–—-]+/gu, " ")
    .trim();
}

/** A UTF-8 lead byte of Latin-1 or Latin Extended-A followed by a continuation byte, in hex. */
const HEX_UTF8_LETTER = /c[345][89ab][0-9a-f]/giu;

/**
 * Title of a file as the classifier reads it: "suma-teolc3b3gica" becomes "suma teologica" and
 * "Confiss%C3%A3o_de_F%C3%A9" becomes "confissao de fe".
 */
export function normalizeProfileTitle(title: string): string {
  const decoded = title
    .replace(/(?:%[0-9a-f]{2})+/giu, (encoded) => {
      try {
        return decodeURIComponent(encoded);
      } catch {
        return encoded;
      }
    })
    .replace(HEX_UTF8_LETTER, (hex) => {
      const lead = Number.parseInt(hex.slice(0, 2), 16);
      const continuation = Number.parseInt(hex.slice(2), 16);
      return String.fromCodePoint(((lead & 0x1f) << 6) | (continuation & 0x3f));
    });
  return plainWords(decoded);
}

export function classifyDocumentProfile(
  title: string,
  sampleText = "",
): DocumentProfileClassification {
  const titleText = normalizeProfileTitle(title);
  const sample = plainWords(sampleText.slice(0, 30_000));
  let best: DocumentProfileClassification = {
    profile: "academic-monograph",
    confidence: 0.42,
    signals: [],
  };
  for (const rule of PROFILE_RULES) {
    const titleSignals = rule.patterns.filter((pattern) => pattern.test(titleText));
    const sampleSignals = rule.patterns.filter((pattern) => pattern.test(sample));
    const score = titleSignals.length * 3 + sampleSignals.length;
    if (!score) continue;
    const confidence = Math.min(
      0.98,
      0.62 + titleSignals.length * 0.16 + sampleSignals.length * 0.07,
    );
    if (confidence <= best.confidence) continue;
    best = {
      profile: rule.profile,
      confidence,
      signals: [
        ...titleSignals.map((pattern) => `título:${pattern.source}`),
        ...sampleSignals.map((pattern) => `amostra:${pattern.source}`),
      ],
    };
  }
  return best;
}
