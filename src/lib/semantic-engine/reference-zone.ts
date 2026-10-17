import type { SemanticUnit } from "../domain/document-knowledge";
import type { NegativeReferenceZone, ReferenceZone } from "../domain/semantic-content";
import { isBookNameLine, parseBiblicalReferences } from "./biblical-reference-parser";

export interface ReferenceZoneInput {
  /** Text of the span or unit whose references are being parsed. */
  text: string;
  /** Title of the section the span belongs to, until the next heading. */
  sectionTitle?: string;
  unitKind?: SemanticUnit["kind"];
  /** Zone of the whole page from `detectPageZone`, computed once per page. */
  pageZone?: NegativeReferenceZone | null;
  /** Whole page, when the page zone was not computed beforehand. */
  pageText?: string;
  /** Document language, for the book names of a canon list. */
  language?: string;
}

type LineShape = "canon" | "toc" | "index" | "other";

function plainTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[\s:.–—-]+$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

const BIBLIOGRAPHY_TITLE =
  /^(?:bibliografia|referencias bibliograficas|referencias|bibliography|references|obras citadas|works cited)(?: (?:selecionadas?|geral|consultadas?|comentada|complementar|recomendada|basica|adicional|selected|select|further|recommended|additional))?$/u;

/** The single list of bibliography headings, shared by the page and document analyzers. */
export function isBibliographyTitle(title: string): boolean {
  return BIBLIOGRAPHY_TITLE.test(plainTitle(title));
}

const LISTING_TITLES: readonly (readonly [RegExp, "toc" | "index"])[] = [
  [/^(?:indice remissivo|indice de passagens|indice biblico|index)$/u, "index"],
  [/^(?:sumario|indice|indice geral|conteudo|contents|table of contents)$/u, "toc"],
];

/** Zone announced by a section title, or null for an ordinary title. */
export function titleZone(title: string): NegativeReferenceZone | null {
  if (isBibliographyTitle(title)) return "bibliography";
  const plain = plainTitle(title);
  for (const [pattern, zone] of LISTING_TITLES) if (pattern.test(plain)) return zone;
  return null;
}

const ROMAN_NUMERAL =
  /^(?=[ivxlcdm])m{0,3}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/iu;
/** "Capítulo 1 ......... 12" or "Introdução … 7". */
const DOTTED_PAGE_LINE =
  /^(?=.*\p{L}).+?(?:\s*(?:\.\s?){2,}\s*|\s*…+\s*)(\d{1,4}|[ivxlcdm]{1,7})$/iu;
/** "Capítulo 2 O êxodo 45"; never "João 3:16". */
const SPACED_PAGE_LINE = /^(?=.*\p{L})(.+?)\s+(\d{1,4}|[ivxlcdm]{1,7})$/iu;
/** "BRUCE, 1987" or "CARSON, 2010, p. 12" end with a cited number, not a page of the book. */
const CITED_NUMBER_BEFORE = /(?:[,;]|(?<![\p{L}])(?:p|pp|v|vv|cap|caps|vol|vols|n|nº|ed)\.)$/iu;
/** "Graça, 12, 45, 78" or "Lei, 22–24, 31". */
const INDEX_LINE =
  /^[^\d\n]{2,}?,\s*\d{1,4}(?:\s*[–-]\s*\d{1,4})?(?:\s*,\s*\d{1,4}(?:\s*[–-]\s*\d{1,4})?)*\.?$/u;
const YEAR = /^(?:1[5-9]\d\d|20\d\d)$/u;

function validPageNumber(value: string): boolean {
  return /^\d+$/u.test(value) || ROMAN_NUMERAL.test(value);
}

function isPageNumberLine(line: string): boolean {
  const dotted = DOTTED_PAGE_LINE.exec(line);
  if (dotted) return validPageNumber(dotted[1]!);
  const spaced = SPACED_PAGE_LINE.exec(line);
  return Boolean(
    spaced && validPageNumber(spaced[2]!) && !CITED_NUMBER_BEFORE.test(spaced[1]!.trimEnd()),
  );
}

function isIndexLine(line: string): boolean {
  if (!INDEX_LINE.test(line)) return false;
  const numbers = line.match(/\d{1,4}/gu) ?? [];
  // "BRUCE, 1987" is an author-year citation, not a term with its pages.
  return !(numbers.length === 1 && YEAR.test(numbers[0]!));
}

function linesOf(text: string): string[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function lineShape(line: string, language?: string): LineShape {
  if (isBookNameLine(line, language)) return "canon";
  if (isIndexLine(line)) return "index";
  if (!isPageNumberLine(line)) return "other";
  // An index of passages starts with the reference: "Jo 3:16 ........ 45".
  return parseBiblicalReferences(line, language ? { language } : {})[0]?.startOffset === 0
    ? "index"
    : "toc";
}

function longestCanonRun(shapes: readonly LineShape[]): number {
  let run = 0;
  let longest = 0;
  for (const shape of shapes) {
    run = shape === "canon" ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

function listingZone(shapes: readonly LineShape[]): "toc" | "index" | null {
  const toc = shapes.filter((shape) => shape === "toc").length;
  const index = shapes.filter((shape) => shape === "index").length;
  // Prose can end a line with a number now and then; a listing does it on most lines.
  if (toc + index < 3 || (toc + index) * 2 < shapes.length) return null;
  return index > toc ? "index" : "toc";
}

function fitsZone(shapes: readonly LineShape[], zone: NegativeReferenceZone): boolean {
  if (!shapes.length) return false;
  return zone === "canon-list"
    ? shapes.every((shape) => shape === "canon")
    : zone === "toc" || zone === "index"
      ? shapes.every((shape) => shape === "toc" || shape === "index")
      : false;
}

/** A finished sentence of some length: the listing announced by a title has ended. */
function isProse(text: string, shapes: readonly LineShape[]): boolean {
  const trimmed = text.trim();
  return (
    shapes.every((shape) => shape === "other") &&
    trimmed.length >= 80 &&
    /[.!?…]["”»)]?$/u.test(trimmed)
  );
}

/** Zone of a whole page (a page of a table of contents or of a canon list), or null. */
export function detectPageZone(pageText: string, language?: string): NegativeReferenceZone | null {
  const shapes = linesOf(pageText).map((line) => lineShape(line, language));
  return longestCanonRun(shapes) >= 3 ? "canon-list" : listingZone(shapes);
}

/**
 * Where a span sits in the book: prose ("body"), or a structure whose references only locate
 * passages — a table of contents, an index, a bibliography or a list of the canonical books.
 */
export function detectReferenceZone(input: ReferenceZoneInput): ReferenceZone {
  if (input.unitKind === "bibliography-entry") return "bibliography";
  const lines = linesOf(input.text);
  const shapes = lines.map((line) => lineShape(line, input.language));
  const announced = input.sectionTitle ? titleZone(input.sectionTitle) : null;
  // A table of contents or an index ends at the first prose paragraph, even when the heading that
  // follows it was not recognized; a bibliography keeps its title until the next heading.
  if (announced && !(announced !== "bibliography" && isProse(input.text, shapes))) return announced;
  // A canon list may carry a caption ("DO ANTIGO TESTAMENTO:"), but no line with numbers: those
  // would be references that the list zone would weaken.
  if (
    longestCanonRun(shapes) >= 3 &&
    lines.every((line, index) => shapes[index] === "canon" || !/\d/u.test(line))
  )
    return "canon-list";
  const listing = listingZone(shapes);
  if (listing) return listing;
  const page =
    input.pageZone !== undefined
      ? input.pageZone
      : input.pageText
        ? detectPageZone(input.pageText, input.language)
        : null;
  return page && fitsZone(shapes, page) ? page : "body";
}
