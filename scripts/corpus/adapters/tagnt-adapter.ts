import { TAGNT_BOOKS } from "../../../src/lib/corpus-config/tagnt";
import {
  greekCell,
  matchingGreek,
  type AlignmentStatus,
  type MorphologicalAnalysis,
} from "../../../src/lib/domain/linguistic";
import type { TokenOccurrence } from "../../../src/lib/domain/scripture";

export interface ParsedTagntRecord {
  locator: string;
  line: number;
  bookId: string;
  chapter: number;
  verse: number;
  order: number;
  greek: string;
  lexicalGrammar: string;
  lemma: string;
  editions: string;
  spelling: string;
  strongInstance: string;
}
export function hasSblMembership(editions: string): boolean {
  return /(?:^|[^A-Za-z])SBL(?:$|[^A-Za-z])/.test(editions);
}
export function parseTagnt(text: string): ParsedTagntRecord[] {
  const records: ParsedTagntRecord[] = [];
  const ids = new Set<string>();
  let inData = false;
  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    if (line.startsWith("Word & Type\t")) {
      inData = true;
      continue;
    }
    if (!inData || !line.trim() || line.startsWith("#")) continue;
    const cells = line.split("\t");
    const locator = cells[0] ?? "";
    const match = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)([^#]*)#(\d+[^=]*)=(.+)$/.exec(locator);
    if (!match || cells.length < 12)
      throw new Error(`Unrecognized TAGNT row at line ${lineIndex + 1}: ${locator}`);
    const bookId = TAGNT_BOOKS[match[1]!];
    if (!bookId) throw new Error(`Unknown TAGNT book ${match[1]}`);
    if (ids.has(locator)) throw new Error(`Duplicate TAGNT source record ${locator}`);
    ids.add(locator);
    // Keep all reference markers in locator. NRSV is primary; no inferred reassignment to SBL.
    // Strip only the gloss part of each supplied dictionary-form component.
    const lemma = cells[4]!
      .split(" + ")
      .map((component) => component.split("=")[0]!)
      .join(" + ");
    records.push({
      locator,
      line: lineIndex + 1,
      bookId,
      chapter: Number(match[2]),
      verse: Number(match[3]),
      order: Number.parseInt(match[5]!, 10),
      greek: cells[1]!,
      lexicalGrammar: cells[3]!,
      lemma,
      editions: cells[5]!,
      spelling: cells[7]!,
      strongInstance: cells[11]!,
    });
  }
  if (!records.length) throw new Error("TAGNT contains no records");
  return records;
}
export function parseMorphologyDefinitions(text: string): Record<string, MorphologicalAnalysis> {
  const definitions: Record<string, MorphologicalAnalysis> = {};
  const fieldMap = {
    Function: "partOfSpeech",
    Case: "case",
    Number: "number",
    Gender: "gender",
    Tense: "tense",
    Voice: "voice",
    Mood: "mood",
    Person: "person",
  } as const;
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z0-9-]+)\t(Function=[^\t]+)/.exec(line);
    if (!match) continue;
    const result: MorphologicalAnalysis = {
      rawMorphologyCode: match[1]!,
      status: "parsed",
      features: {},
      extras: {},
    };
    for (const component of match[2]!.split(";")) {
      const [field, value] = component.trim().split("=");
      if (!field || !value) continue;
      const key = fieldMap[field as keyof typeof fieldMap];
      if (key) result.features[key] = value.toLowerCase().trim();
      else result.extras[field] = value.trim();
    }
    definitions[result.rawMorphologyCode] = result;
  }
  if (!Object.keys(definitions).length) throw new Error("No TEGMC morphology definitions");
  return definitions;
}
export function morphologyCodes(raw: string): string[] {
  return [...raw.matchAll(/=([A-Z0-9-]+)/g)].map((m) => m[1]!);
}

interface AlignmentResult {
  target: TokenOccurrence;
  source: ParsedTagntRecord | null;
  status: AlignmentStatus;
  reason: string;
  candidates: ParsedTagntRecord[];
}
function matchStatus(target: TokenOccurrence, source: ParsedTagntRecord): AlignmentStatus | null {
  const surface = greekCell(source.greek).surface;
  if (target.surface === surface) return "exact";
  if (matchingGreek(target.surface) === matchingGreek(surface)) return "normalized";
  // Only the SBL-specific spelling segment is admissible as variant evidence.
  for (const segment of source.spelling.split(";")) {
    const colon = segment.indexOf(":");
    if (
      colon >= 0 &&
      hasSblMembership(segment.slice(0, colon)) &&
      matchingGreek(segment.slice(colon + 1)) === matchingGreek(target.surface)
    )
      return "positional";
  }
  return null;
}

/** LCS optimal-path analysis: never choose a repeated word arbitrarily across a gap. */
export function alignVerse(
  targets: TokenOccurrence[],
  allSources: ParsedTagntRecord[],
): AlignmentResult[] {
  const members = allSources.filter((s) => hasSblMembership(s.editions));
  // TAGNT arrows count the origin word: «2 exchanges a word with its predecessor.
  // Fractional sort keys place the moved word before/after the destination, without ties.
  const sources = members
    .map((source, index) => {
      const movement = /SBL([«»])(\d+)/.exec(source.editions);
      return {
        source,
        rank: index + (movement ? (movement[1] === "«" ? -1 : 1) * (Number(movement[2]) - 0.5) : 0),
      };
    })
    .sort((a, b) => a.rank - b.rank)
    .map((item) => item.source);
  const n = targets.length,
    m = sources.length;
  if (n > 500 || m > 500) throw new Error("Verse exceeds alignment safety limit");
  const statuses = targets.map((t) => sources.map((s) => matchStatus(t, s)));
  const before = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  const after = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      before[i + 1]![j + 1] = Math.max(
        before[i]![j + 1]!,
        before[i + 1]![j]!,
        before[i]![j]! + (statuses[i]![j] ? 1 : 0),
      );
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      after[i]![j] = Math.max(
        after[i + 1]![j]!,
        after[i]![j + 1]!,
        after[i + 1]![j + 1]! + (statuses[i]![j] ? 1 : 0),
      );
  const optimum = before[n]![m]!;
  const results = targets.map((target, i): AlignmentResult => {
    const candidates = sources.filter(
      (_, j) => statuses[i]![j] && before[i]![j]! + 1 + after[i + 1]![j + 1]! === optimum,
    );
    const canSkip = Array.from(
      { length: m + 1 },
      (_, j) => before[i]![j]! + after[i + 1]![j]!,
    ).some((score) => score === optimum);
    const source = candidates.length === 1 && !canSkip ? candidates[0]! : null;
    if (source) {
      const moved = sources.indexOf(source) !== members.indexOf(source);
      return {
        target,
        source,
        status: moved ? "positional" : matchStatus(target, source)!,
        reason: moved
          ? "sbl-explicit-displacement+unique-sequence"
          : "sbl-membership+unique-optimal-sequence",
        candidates: [],
      };
    }
    return {
      target,
      source: null,
      status: candidates.length ? "ambiguous" : "unmatched",
      candidates,
      reason: candidates.length
        ? "multiple-optimal-alignments"
        : !allSources.length
          ? "source-verse-absent"
          : !sources.length
            ? "no-sbl-membership"
            : "no-compatible-sbl-record",
    };
  });
  // Unique same-position substitution between adjacent anchors; no guessing across insertions or deletions.
  for (let i = 1; i < results.length - 1; i++) {
    const result = results[i]!;
    if (result.status !== "unmatched") continue;
    const previous = results[i - 1]!.source,
      next = results[i + 1]!.source;
    if (!previous || !next) continue;
    const a = sources.indexOf(previous),
      b = sources.indexOf(next);
    if (b !== a + 2) continue;
    const source = sources[a + 1]!;
    const targetForm = matchingGreek(result.target.surface),
      sourceForm = matchingGreek(greekCell(source.greek).surface);
    const nuDifference =
      (targetForm + "ν" === sourceForm || sourceForm + "ν" === targetForm) &&
      /[ει]ν?$/.test(sourceForm) &&
      /=(?:V-|[A-Z]+-D)/.test(source.lexicalGrammar);
    if (matchStatus(result.target, source) !== "positional" && !nuDifference) continue;
    results[i] = {
      target: result.target,
      source,
      status: "positional",
      reason: nuDifference
        ? "terminal-nu-difference+adjacent-anchors"
        : "sbl-spelling+adjacent-anchors",
      candidates: [],
    };
  }
  return results;
}
