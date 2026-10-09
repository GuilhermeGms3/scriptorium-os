import type { DocumentProfileKind } from "../domain/document-profile";

export interface DocumentProfileClassification {
  profile: DocumentProfileKind;
  confidence: number;
  signals: string[];
}

interface ProfileRule {
  profile: DocumentProfileKind;
  patterns: RegExp[];
}

const PROFILE_RULES: ProfileRule[] = [
  {
    profile: "nag-hammadi-anthology",
    patterns: [/nag\s+hammadi/iu, /textos?\s+gn[oó]sticos?/iu, /c[oó]dice\s+(?:i|v|x|\d)/iu],
  },
  {
    profile: "study-bible",
    patterns: [/b[ií]blia\s+(?:de\s+)?estudo/iu, /b[ií]blia\s+(?:shedd|genebra|comentada)/iu],
  },
  { profile: "interlinear", patterns: [/interlinear/iu, /texto\s+hebraico.*tradu[cç][aã]o/iu] },
  {
    profile: "lexicon",
    patterns: [/l[eé]xico/iu, /lexicon/iu, /strong['’]?s/iu, /hebraico\s+e\s+aramaico/iu],
  },
  {
    profile: "dictionary",
    patterns: [
      /dicion[aá]rio/iu,
      /dictionary/iu,
      /teologia\s+do\s+antigo\s+testamento.*(?:ditat|palavra|verbete)/iu,
    ],
  },
  { profile: "encyclopedia", patterns: [/enciclop[eé]dia/iu, /encyclop/iu] },
  { profile: "catechism", patterns: [/catecismo/iu, /catechism/iu] },
  { profile: "confession", patterns: [/confiss[aã]o/iu, /confession/iu, /westminster/iu] },
  {
    profile: "systematic-theology",
    patterns: [/teologia\s+sistem[aá]tica/iu, /systematic\s+theology/iu],
  },
  {
    profile: "biblical-theology",
    patterns: [/teologia\s+(?:do\s+)?(?:novo|antigo)\s+testamento/iu, /biblical\s+theology/iu],
  },
  {
    profile: "exegesis-method",
    patterns: [/exegese\s+e\s+hermen[eê]utica/iu, /m[eé]todo.*exeg/iu, /exegese\s+do/iu],
  },
  {
    profile: "patristic-work",
    patterns: [
      /santo\s+agostinho/iu,
      /agostinho/iu,
      /tom[aá]s\s+de\s+aquino/iu,
      /or[ií]genes/iu,
      /pais\s+da\s+igreja/iu,
      /patr[ií]stic/iu,
    ],
  },
  {
    profile: "archaeology",
    patterns: [/arqueologia/iu, /archaeolog/iu, /escava[cç][aã]o/iu],
  },
  {
    profile: "church-history",
    patterns: [/hist[oó]ria\s+da\s+igreja/iu, /church\s+history/iu, /cristianismo\s+antigo/iu],
  },
  {
    profile: "commentary",
    patterns: [
      /coment[aá]rio/iu,
      /commentary/iu,
      /manual\s+b[ií]blico/iu,
      /exposi[cç][aã]o\s+b[ií]blica/iu,
    ],
  },
  {
    profile: "ancient-primary-source",
    patterns: [
      /ap[oó]crif/iu,
      /pseudep[ií]graf/iu,
      /evangelho\s+de\s+tom[eé]/iu,
      /fonte\s+prim[aá]ria/iu,
    ],
  },
];

export function classifyDocumentProfile(
  title: string,
  sampleText = "",
): DocumentProfileClassification {
  const titleText = title.normalize("NFC");
  const sample = sampleText.normalize("NFC").slice(0, 30_000);
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
