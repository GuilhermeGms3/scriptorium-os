import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { CorpusPackageManifest, SourceArtifact } from "../../../src/lib/domain/corpus";
import type { TokenOccurrence, VerseContent } from "../../../src/lib/domain/scripture";
import type { CorpusAdapter, DiscoveredCorpusArtifact, NormalizedCorpusBook } from "../adapter";
import { decodeOshbMorphology } from "./oshb-morphology";

interface BookDefinition {
  fileStem: string;
  sourceId: string;
  id: string;
  name: string;
  abbreviation: string;
  order: number;
}

const BOOKS: BookDefinition[] = [
  ["Gen", "Gen", "genesis", "Genesis", "Gen", 1],
  ["Exod", "Exod", "exodus", "Exodus", "Exod", 2],
  ["Lev", "Lev", "leviticus", "Leviticus", "Lev", 3],
  ["Num", "Num", "numbers", "Numbers", "Num", 4],
  ["Deut", "Deut", "deuteronomy", "Deuteronomy", "Deut", 5],
  ["Josh", "Josh", "joshua", "Joshua", "Josh", 6],
  ["Judg", "Judg", "judges", "Judges", "Judg", 7],
  ["Ruth", "Ruth", "ruth", "Ruth", "Ruth", 8],
  ["1Sam", "1Sam", "1-samuel", "1 Samuel", "1 Sam", 9],
  ["2Sam", "2Sam", "2-samuel", "2 Samuel", "2 Sam", 10],
  ["1Kgs", "1Kgs", "1-kings", "1 Kings", "1 Kgs", 11],
  ["2Kgs", "2Kgs", "2-kings", "2 Kings", "2 Kgs", 12],
  ["1Chr", "1Chr", "1-chronicles", "1 Chronicles", "1 Chr", 13],
  ["2Chr", "2Chr", "2-chronicles", "2 Chronicles", "2 Chr", 14],
  ["Ezra", "Ezra", "ezra", "Ezra", "Ezra", 15],
  ["Neh", "Neh", "nehemiah", "Nehemiah", "Neh", 16],
  ["Esth", "Esth", "esther", "Esther", "Esth", 17],
  ["Job", "Job", "job", "Job", "Job", 18],
  ["Ps", "Ps", "psalms", "Psalms", "Ps", 19],
  ["Prov", "Prov", "proverbs", "Proverbs", "Prov", 20],
  ["Eccl", "Eccl", "ecclesiastes", "Ecclesiastes", "Eccl", 21],
  ["Song", "Song", "song-of-songs", "Song of Songs", "Song", 22],
  ["Isa", "Isa", "isaiah", "Isaiah", "Isa", 23],
  ["Jer", "Jer", "jeremiah", "Jeremiah", "Jer", 24],
  ["Lam", "Lam", "lamentations", "Lamentations", "Lam", 25],
  ["Ezek", "Ezek", "ezekiel", "Ezekiel", "Ezek", 26],
  ["Dan", "Dan", "daniel", "Daniel", "Dan", 27],
  ["Hos", "Hos", "hosea", "Hosea", "Hos", 28],
  ["Joel", "Joel", "joel", "Joel", "Joel", 29],
  ["Amos", "Amos", "amos", "Amos", "Amos", 30],
  ["Obad", "Obad", "obadiah", "Obadiah", "Obad", 31],
  ["Jonah", "Jonah", "jonah", "Jonah", "Jonah", 32],
  ["Mic", "Mic", "micah", "Micah", "Mic", 33],
  ["Nah", "Nah", "nahum", "Nahum", "Nah", 34],
  ["Hab", "Hab", "habakkuk", "Habakkuk", "Hab", 35],
  ["Zeph", "Zeph", "zephaniah", "Zephaniah", "Zeph", 36],
  ["Hag", "Hag", "haggai", "Haggai", "Hag", 37],
  ["Zech", "Zech", "zechariah", "Zechariah", "Zech", 38],
  ["Mal", "Mal", "malachi", "Malachi", "Mal", 39],
].map(([fileStem, sourceId, id, name, abbreviation, order]) => ({
  fileStem: String(fileStem),
  sourceId: String(sourceId),
  id: String(id),
  name: String(name),
  abbreviation: String(abbreviation),
  order: Number(order),
}));

const BY_STEM = new Map(BOOKS.map((book) => [book.fileStem, book]));
type OrderedNode = Record<string, unknown>;
const children = (node: OrderedNode, name: string): OrderedNode[] | null =>
  Array.isArray(node[name]) ? (node[name] as OrderedNode[]) : null;
const attribute = (node: OrderedNode, name: string): string | null => {
  const attrs = node[":@"];
  const value =
    attrs && typeof attrs === "object" ? (attrs as Record<string, unknown>)[`@_${name}`] : null;
  return typeof value === "string" ? value : null;
};
const text = (node: OrderedNode, name: string): string | null => {
  const nested = children(node, name);
  const value = nested?.find((item) => Object.hasOwn(item, "#text"))?.["#text"];
  return value === undefined ? null : String(value);
};
function assertInside(parent: string, child: string): void {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith("..") || path.includes(":"))
    throw new Error(`Corpus path escapes source root: ${child}`);
}
function findNodes(nodes: OrderedNode[], name: string): OrderedNode[] {
  const result: OrderedNode[] = [];
  for (const node of nodes) {
    if (children(node, name)) result.push(node);
    for (const value of Object.values(node))
      if (Array.isArray(value)) result.push(...findNodes(value as OrderedNode[], name));
  }
  return result;
}
function lexemeId(lemma: string): string {
  return `lexeme:oshb:${createHash("sha256").update(lemma).digest("hex").slice(0, 24)}`;
}
function render(tokens: TokenOccurrence[]): string {
  return tokens
    .map((token) => `${token.surface}${token.suffix ?? " "}`)
    .join("")
    .trimEnd();
}

export class OshbOsisAdapter implements CorpusAdapter {
  readonly id = "oshb-osis";
  readonly importerVersion = "1.0.0";
  supports(manifest: CorpusPackageManifest): boolean {
    return manifest.corpusId === "wlc" && manifest.format === "osis";
  }
  async discover(
    sourceRoot: string,
    manifest: CorpusPackageManifest,
  ): Promise<DiscoveredCorpusArtifact[]> {
    const plan = manifest.acquisitionPlan;
    if (!plan) throw new Error(`Package ${manifest.id} has no acquisition plan.`);
    const artifactRoot = resolve(sourceRoot, plan.artifactRoot);
    assertInside(sourceRoot, artifactRoot);
    const result: DiscoveredCorpusArtifact[] = [];
    for (const entry of (await readdir(artifactRoot, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".xml") continue;
      const definition = BY_STEM.get(basename(entry.name, ".xml"));
      if (!definition) continue;
      result.push({
        absolutePath: resolve(artifactRoot, entry.name),
        sourcePath: `${plan.artifactRoot}/${entry.name}`,
        fileName: entry.name,
        classification: "book",
        canonicalBookId: definition.id,
      });
    }
    const ids = new Set(
      result.flatMap((item) => (item.canonicalBookId ? [item.canonicalBookId] : [])),
    );
    const missing = plan.expectedBookIds.filter((id) => !ids.has(id));
    if (missing.length) throw new Error(`Missing expected OSHB books: ${missing.join(", ")}`);
    return result;
  }
  async parseAndNormalize(
    artifact: DiscoveredCorpusArtifact,
    sourceArtifact: SourceArtifact,
    manifest: CorpusPackageManifest,
    datasetId: string,
  ): Promise<NormalizedCorpusBook | null> {
    const definition = BOOKS.find((book) => book.id === artifact.canonicalBookId);
    if (!definition) throw new Error(`No OSHB mapping for ${artifact.fileName}.`);
    const xml = await readFile(artifact.absolutePath, "utf8");
    if (xml.toUpperCase().includes("<!DOCTYPE") || xml.toUpperCase().includes("<!ENTITY"))
      throw new Error(`Forbidden XML declaration in ${artifact.fileName}.`);
    const validation = XMLValidator.validate(xml);
    if (validation !== true)
      throw new Error(`Invalid OSIS XML ${artifact.fileName}: ${validation.err.msg}`);
    const document = new XMLParser({
      preserveOrder: true,
      ignoreAttributes: false,
      processEntities: false,
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: false,
      maxNestedTags: 32,
    }).parse(xml) as OrderedNode[];
    const verseNodes = findNodes(document, "verse");
    const byChapter = new Map<number, VerseContent[]>();
    for (const node of verseNodes) {
      const osisId = attribute(node, "osisID");
      const match = osisId ? /^([^.]+)\.(\d+)\.(\d+)$/.exec(osisId) : null;
      if (!match || match[1] !== definition.sourceId) continue;
      const chapter = Number(match[2]);
      const verseNumber = Number(match[3]);
      const ref = {
        bookId: definition.id,
        chapter,
        verseStart: verseNumber,
        versification: manifest.versificationScheme,
      };
      const tokens: TokenOccurrence[] = [];
      for (const child of children(node, "verse") ?? []) {
        const surface = text(child, "w");
        if (surface !== null) {
          const rawLemma = attribute(child, "lemma") ?? "";
          const rawMorphology = attribute(child, "morph") ?? "";
          const position = tokens.length + 1;
          tokens.push({
            id: `${manifest.editionId}:${definition.id}:${chapter}:${verseNumber}:${String(position).padStart(3, "0")}`,
            editionId: manifest.editionId,
            textUnitId: `${manifest.editionId}:${definition.id}.${chapter}.${verseNumber}`,
            ref,
            position,
            language: "hbo",
            surface,
            ...(rawLemma
              ? { lemma: rawLemma, lemmaId: lexemeId(rawLemma), strongs: rawLemma }
              : {}),
            ...(rawMorphology ? { morphology: decodeOshbMorphology(rawMorphology) } : {}),
          });
          continue;
        }
        const segment = text(child, "seg");
        if (segment !== null && tokens.length)
          tokens[tokens.length - 1]!.suffix = `${tokens.at(-1)!.suffix ?? ""}${segment}`;
      }
      if (!tokens.length) throw new Error(`Empty OSHB verse ${osisId}.`);
      const verse: VerseContent = {
        ref,
        verse: verseNumber,
        translations: { [manifest.editionId]: render(tokens) },
        original: tokens,
        originalEditionId: manifest.editionId,
      };
      const list = byChapter.get(chapter) ?? [];
      list.push(verse);
      byChapter.set(chapter, list);
    }
    const chapters = [...byChapter.entries()]
      .sort(([a], [b]) => a - b)
      .map(([chapter, verses]) => ({
        schemaVersion: 1 as const,
        corpusId: manifest.corpusId,
        editionId: manifest.editionId,
        packageId: manifest.id,
        datasetId,
        sourceArtifactId: sourceArtifact.id,
        sourcePath: artifact.sourcePath,
        bookId: definition.id,
        chapter,
        verses,
      }));
    return {
      book: {
        id: definition.id,
        name: definition.name,
        abbreviation: definition.abbreviation,
        order: definition.order,
        chapters: Math.max(...byChapter.keys()),
      },
      sourceArtifactId: sourceArtifact.id,
      sourcePath: artifact.sourcePath,
      chapters,
      warnings: [],
    };
  }
  validate(book: NormalizedCorpusBook, manifest: CorpusPackageManifest): string[] {
    const errors: string[] = [];
    if (!manifest.acquisitionPlan?.expectedBookIds.includes(book.book.id))
      errors.push(`Unexpected OSHB book ${book.book.id}.`);
    for (const chapter of book.chapters)
      for (const verse of chapter.verses) {
        if (!verse.original?.length)
          errors.push(`${book.book.id} ${chapter.chapter}:${verse.verse} has no tokens.`);
        for (const token of verse.original ?? [])
          if (!token.morphology?.code) errors.push(`${token.id} has no OSHB morphology code.`);
      }
    return errors;
  }
}
