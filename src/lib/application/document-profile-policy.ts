import type { KnowledgeProposal, ReferenceRole, SemanticUnit } from "../domain/document-knowledge";
import type { DocumentProfileKind } from "../domain/document-profile";
import {
  leadingPassageHeader,
  parseBiblicalReferences,
} from "../semantic-engine/biblical-reference-parser";

/** Profiles whose pages carry the biblical text itself, next to notes and marginal references. */
const BIBLE_TEXT_PROFILES = new Set<DocumentProfileKind>(["study-bible", "interlinear"]);

/** A dictionary or a lexicon mentions a verse under a word; an ancient text echoes it. */
const ROLE_BY_PROFILE: Partial<Record<DocumentProfileKind, ReferenceRole>> = {
  dictionary: "lexical-mention",
  lexicon: "lexical-mention",
  encyclopedia: "lexical-mention",
  "nag-hammadi-anthology": "intertextual",
  "ancient-primary-source": "intertextual",
};

const PROOF_TEXT_PROFILES = new Set<DocumentProfileKind>(["confession", "catechism"]);
const PROOF_TEXT_CONFIDENCE = 0.95;

/**
 * A primary source is read on its own terms: a paragraph without an explicit reference is not
 * forced onto a verse by the inference step.
 */
export function profileAllowsVerseInference(profile: DocumentProfileKind): boolean {
  return ROLE_BY_PROFILE[profile] !== "intertextual";
}

/** A verse number (1–176) opening the text, followed by its words: "16 Porque Deus…", "16 οὕτως". */
const VERSE_NUMBER_START = /^\s*(?:[1-9]\d?|1[0-7]\d)(?![.,:]\s*\d)\s?(?=[\p{L}"“«‘(])/u;

function nextVerseFollows(text: string, verse: number): boolean {
  return new RegExp(`(?:^|[.;:!?”"»·]\\s*)${verse + 1}\\s?(?=\\p{L})`, "u").test(text);
}

/**
 * Whether a unit is the biblical text itself rather than a note about it: it opens with a verse
 * number, maybe after the running header of the page ("JOÃO 3 16 Porque…"), or a header with a
 * verse is followed by the next verse ("João 3,16 Porque… 17 Pois…"). A note ("3,16 Cf. Rm 5,8")
 * or a line of marginal references ("Rm 5,8; 1Jo 4,9") is not.
 */
export function isBiblicalTextUnit(text: string, language?: string): boolean {
  const header = leadingPassageHeader(text, language);
  if (!header) return VERSE_NUMBER_START.test(text);
  if (header.chapter === undefined) return false;
  const rest = text.slice(header.length);
  if (VERSE_NUMBER_START.test(rest)) return true;
  return header.verse !== undefined && nextVerseFollows(rest, header.verse);
}

/** "a. Rm 2.14-15; 1.19-20" or "Sl 19.1-3; cf. Jo 1.1": a note made only of references. */
function isReferenceList(text: string, language?: string): boolean {
  const found = parseBiblicalReferences(text, language ? { language } : {});
  if (!found.length) return false;
  let rest = text;
  for (const reference of [...found].sort((left, right) => right.startOffset - left.startOffset))
    rest =
      rest.slice(0, reference.startOffset) +
      " " +
      rest.slice(reference.startOffset + reference.rawReference.length);
  return (
    rest
      .replace(/^\s*(?:[a-z]|\d{1,3})[.)]\s+/iu, "")
      .replace(/(?<![\p{L}])(?:e|cf|ver|veja|see)(?![\p{L}])\.?/giu, "")
      .replace(/[\s,;.:()[\]–—-]+/gu, "") === ""
  );
}

/** Inside parentheses or brackets after the statement it proves: "(Rm 2.14-15; Sl 19.1-3)". */
function isParenthesized(text: string, rawReference: string): boolean {
  const start = text.indexOf(rawReference);
  if (start < 0) return false;
  const before = text.slice(0, start);
  const open = Math.max(before.lastIndexOf("("), before.lastIndexOf("["));
  return open >= 0 && !/[)\]]/u.test(before.slice(open));
}

function isProofText(unit: SemanticUnit, rawReference: string, language?: string): boolean {
  return (
    unit.kind === "footnote" ||
    isParenthesized(unit.text, rawReference) ||
    isReferenceList(unit.text, language)
  );
}

/**
 * Applies what the document profile says about its references to the proposals of an analysis,
 * whatever analyzer produced them. Study Bibles and interlinears do not link their own biblical
 * text; reference works only mention verses; primary sources echo them; confessions and
 * catechisms prove their articles with them. Proposal ids are kept, so a review made under one
 * profile stays attached when the researcher corrects it.
 */
export function applyDocumentProfilePolicy(
  profile: DocumentProfileKind,
  units: readonly SemanticUnit[],
  proposals: readonly KnowledgeProposal[],
  language?: string,
): KnowledgeProposal[] {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const biblicalText = new Map<string, boolean>();
  const role = ROLE_BY_PROFILE[profile];
  return proposals.flatMap((proposal) => {
    if (proposal.payload.kind !== "passage-relation") return [proposal];
    const unit = unitsById.get(proposal.semanticUnitId);
    if (!unit) return [proposal];
    if (BIBLE_TEXT_PROFILES.has(profile)) {
      let isText = biblicalText.get(unit.id);
      if (isText === undefined) {
        isText = isBiblicalTextUnit(unit.text, language);
        biblicalText.set(unit.id, isText);
      }
      return isText ? [] : [proposal];
    }
    if (role) return [{ ...proposal, payload: { ...proposal.payload, referenceRole: role } }];
    if (
      PROOF_TEXT_PROFILES.has(profile) &&
      isProofText(unit, proposal.payload.rawReference, language)
    )
      return [
        {
          ...proposal,
          confidence: Math.max(proposal.confidence, PROOF_TEXT_CONFIDENCE),
          payload: { ...proposal.payload, referenceRole: "proof-text" },
        },
      ];
    return [proposal];
  });
}
