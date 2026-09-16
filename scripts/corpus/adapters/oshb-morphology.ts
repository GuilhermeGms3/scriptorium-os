import type { Morphology } from "../../../src/lib/domain/scripture";

const PARTS: Record<string, string> = {
  A: "adjective",
  C: "conjunction",
  D: "adverb",
  N: "noun",
  P: "pronoun",
  R: "preposition",
  S: "suffix",
  T: "particle",
  V: "verb",
};
const GENDERS: Record<string, string> = { b: "both", c: "common", f: "feminine", m: "masculine" };
const NUMBERS: Record<string, string> = { d: "dual", p: "plural", s: "singular" };
const STATES: Record<string, string> = { a: "absolute", c: "construct", d: "determined" };
const PERSONS: Record<string, string> = { "1": "first", "2": "second", "3": "third" };
const STEMS_HEBREW: Record<string, string> = {
  q: "qal", N: "niphal", p: "piel", P: "pual", h: "hiphil", H: "hophal", t: "hithpael",
  o: "polel", O: "polal", r: "hithpolel", m: "poel", M: "poal", k: "palel", K: "pulal",
  Q: "qal-passive", l: "pilpel", L: "polpal", f: "hithpalpel", D: "nithpael", j: "pealal",
  i: "pilel", u: "hothpaal", c: "tiphil", v: "hishtaphel", w: "nithpalel", y: "nithpoel",
  z: "hithpoel",
};
const STEMS_ARAMAIC: Record<string, string> = {
  q: "peal", Q: "peil", u: "hithpeel", p: "pael", P: "ithpaal", M: "hithpaal",
  a: "aphel", h: "haphel", s: "saphel", e: "shaphel", H: "hophal", i: "ithpeel",
  t: "hishtaphel", v: "ishtaphel", w: "hithaphel", o: "polel", z: "ithpoel", r: "hithpolel",
  f: "hithpalpel", b: "hephal", c: "tiphel", m: "poel", l: "palpel", L: "ithpalpel",
  O: "ithpolel", G: "ittaphal",
};
const ASPECTS: Record<string, string> = {
  p: "perfect", q: "sequential-perfect", i: "imperfect", w: "sequential-imperfect",
  h: "cohortative", j: "jussive", v: "imperative", r: "participle-active",
  s: "participle-passive", a: "infinitive-absolute", c: "infinitive-construct",
};
const PREFIXES: Record<string, string> = {
  C: "conjunction", R: "preposition", D: "adverb", T: "particle", P: "pronoun",
};
const NOUN_TYPES: Record<string, string> = { c: "common", p: "proper", g: "gentilic" };
const ADJECTIVE_TYPES: Record<string, string> = { a: "adjective", c: "cardinal-number", g: "gentilic", o: "ordinal-number" };
const PRONOUN_TYPES: Record<string, string> = { d: "demonstrative", f: "indefinite", i: "interrogative", p: "personal", r: "relative" };
const PARTICLE_TYPES: Record<string, string> = {
  a: "affirmation", d: "definite-article", e: "exhortation", i: "interrogative",
  j: "interjection", m: "demonstrative", n: "negative", o: "direct-object-marker", r: "relative",
};

function nominalFeatures(result: Morphology, segment: string, offset: number): void {
  const gender = GENDERS[segment[offset] ?? ""];
  const number = NUMBERS[segment[offset + 1] ?? ""];
  const state = STATES[segment[offset + 2] ?? ""];
  if (gender) result.gender = gender;
  if (number) result.number = number;
  if (state) result.state = state;
}

function decodeSegment(segment: string, language: "Hebrew" | "Aramaic"): Morphology {
  const part = segment[0] ?? "";
  const result: Morphology = { partOfSpeech: PARTS[part] ?? "unmapped", code: segment, language };
  if (part === "N") {
    const subtype = NOUN_TYPES[segment[1] ?? ""] ?? segment[1];
    if (subtype) result.subtype = subtype;
    nominalFeatures(result, segment, 2);
  } else if (part === "A") {
    const subtype = ADJECTIVE_TYPES[segment[1] ?? ""] ?? segment[1];
    if (subtype) result.subtype = subtype;
    nominalFeatures(result, segment, 2);
  } else if (part === "P") {
    const subtype = PRONOUN_TYPES[segment[1] ?? ""] ?? segment[1];
    if (subtype) result.subtype = subtype;
    const person = PERSONS[segment[2] ?? ""];
    if (person) result.person = person;
    const gender = GENDERS[segment[person ? 3 : 2] ?? ""];
    const number = NUMBERS[segment[person ? 4 : 3] ?? ""];
    if (gender) result.gender = gender;
    if (number) result.number = number;
  } else if (part === "T") {
    const subtype = PARTICLE_TYPES[segment[1] ?? ""] ?? segment[1];
    if (subtype) result.subtype = subtype;
  } else if (part === "V") {
    const stem = (language === "Hebrew" ? STEMS_HEBREW : STEMS_ARAMAIC)[segment[1] ?? ""] ?? segment[1];
    const aspect = ASPECTS[segment[2] ?? ""] ?? segment[2];
    if (stem) result.stem = stem;
    if (aspect) result.aspect = aspect;
    if (["p", "q", "i", "w", "h", "j", "v"].includes(segment[2] ?? "")) {
      const person = PERSONS[segment[3] ?? ""];
      const gender = GENDERS[segment[4] ?? ""];
      const number = NUMBERS[segment[5] ?? ""];
      if (person) result.person = person;
      if (gender) result.gender = gender;
      if (number) result.number = number;
    } else if (["r", "s"].includes(segment[2] ?? "")) {
      nominalFeatures(result, segment, 3);
    }
  } else if (part === "S") {
    const subtype = segment[1] === "p" ? "pronominal" : segment[1] === "d" ? "directional-he" : segment[1];
    if (subtype) result.subtype = subtype;
    const person = PERSONS[segment[2] ?? ""];
    if (person) result.person = person;
    const gender = GENDERS[segment[person ? 3 : 2] ?? ""];
    const number = NUMBERS[segment[person ? 4 : 3] ?? ""];
    if (gender) result.gender = gender;
    if (number) result.number = number;
  }
  return result;
}

/** Decodes OSHB codes using the source project's documented positional grammar. */
export function decodeOshbMorphology(code: string): Morphology {
  const languageCode = code[0];
  const language = languageCode === "A" ? "Aramaic" : "Hebrew";
  const rawSegments = code.slice(1).split("/").filter(Boolean);
  const decoded = rawSegments.map((segment) => decodeSegment(segment, language));
  const lexical = decoded.find((item) => !["conjunction", "preposition", "suffix"].includes(item.partOfSpeech)) ?? decoded[0];
  if (!lexical) return { partOfSpeech: "unmapped", code, language, status: "unmapped" };
  const prefixes = decoded.filter((item) => PREFIXES[item.code?.[0] ?? ""] && item !== lexical).map((item) => PREFIXES[item.code?.[0] ?? ""]!);
  const suffix = decoded.find((item) => item.partOfSpeech === "suffix");
  return {
    ...lexical,
    code,
    language,
    ...(prefixes.length ? { prefixes: prefixes.join(", ") } : {}),
    ...(suffix ? { suffixDescription: [suffix.subtype, suffix.person, suffix.gender, suffix.number].filter(Boolean).join(" ") } : {}),
    status: lexical.partOfSpeech === "unmapped" ? "unmapped" : "parsed",
  };
}
