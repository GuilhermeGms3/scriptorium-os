import { readFile, readdir } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { CorpusPackageManifest, SourceArtifact } from "../../../src/lib/domain/corpus";
import type { TokenOccurrence, VerseContent } from "../../../src/lib/domain/scripture";
import type { CorpusAdapter, DiscoveredCorpusArtifact, NormalizedCorpusBook } from "../adapter";

interface SblgntBookDefinition {
  fileStem: string;
  sourceId: string;
  id: string;
  name: string;
  abbreviation: string;
  order: number;
}

const BOOKS: SblgntBookDefinition[] = [
  {
    fileStem: "Matt",
    sourceId: "Mt",
    id: "matthew",
    name: "Matthew",
    abbreviation: "Matt",
    order: 40,
  },
  { fileStem: "Mark", sourceId: "Mk", id: "mark", name: "Mark", abbreviation: "Mark", order: 41 },
  { fileStem: "Luke", sourceId: "Lu", id: "luke", name: "Luke", abbreviation: "Luke", order: 42 },
  { fileStem: "John", sourceId: "Jn", id: "john", name: "John", abbreviation: "John", order: 43 },
  { fileStem: "Acts", sourceId: "Ac", id: "acts", name: "Acts", abbreviation: "Acts", order: 44 },
  { fileStem: "Rom", sourceId: "Ro", id: "romans", name: "Romans", abbreviation: "Rom", order: 45 },
  {
    fileStem: "1Cor",
    sourceId: "1Co",
    id: "1-corinthians",
    name: "1 Corinthians",
    abbreviation: "1 Cor",
    order: 46,
  },
  {
    fileStem: "2Cor",
    sourceId: "2Co",
    id: "2-corinthians",
    name: "2 Corinthians",
    abbreviation: "2 Cor",
    order: 47,
  },
  {
    fileStem: "Gal",
    sourceId: "Gal",
    id: "galatians",
    name: "Galatians",
    abbreviation: "Gal",
    order: 48,
  },
  {
    fileStem: "Eph",
    sourceId: "Eph",
    id: "ephesians",
    name: "Ephesians",
    abbreviation: "Eph",
    order: 49,
  },
  {
    fileStem: "Phil",
    sourceId: "Php",
    id: "philippians",
    name: "Philippians",
    abbreviation: "Phil",
    order: 50,
  },
  {
    fileStem: "Col",
    sourceId: "Col",
    id: "colossians",
    name: "Colossians",
    abbreviation: "Col",
    order: 51,
  },
  {
    fileStem: "1Thess",
    sourceId: "1Th",
    id: "1-thessalonians",
    name: "1 Thessalonians",
    abbreviation: "1 Thess",
    order: 52,
  },
  {
    fileStem: "2Thess",
    sourceId: "2Th",
    id: "2-thessalonians",
    name: "2 Thessalonians",
    abbreviation: "2 Thess",
    order: 53,
  },
  {
    fileStem: "1Tim",
    sourceId: "1Tim",
    id: "1-timothy",
    name: "1 Timothy",
    abbreviation: "1 Tim",
    order: 54,
  },
  {
    fileStem: "2Tim",
    sourceId: "2Tim",
    id: "2-timothy",
    name: "2 Timothy",
    abbreviation: "2 Tim",
    order: 55,
  },
  {
    fileStem: "Titus",
    sourceId: "Tit",
    id: "titus",
    name: "Titus",
    abbreviation: "Titus",
    order: 56,
  },
  {
    fileStem: "Phlm",
    sourceId: "Phm",
    id: "philemon",
    name: "Philemon",
    abbreviation: "Phlm",
    order: 57,
  },
  {
    fileStem: "Heb",
    sourceId: "Heb",
    id: "hebrews",
    name: "Hebrews",
    abbreviation: "Heb",
    order: 58,
  },
  { fileStem: "Jas", sourceId: "Jam", id: "james", name: "James", abbreviation: "Jas", order: 59 },
  {
    fileStem: "1Pet",
    sourceId: "1Pe",
    id: "1-peter",
    name: "1 Peter",
    abbreviation: "1 Pet",
    order: 60,
  },
  {
    fileStem: "2Pet",
    sourceId: "2Pe",
    id: "2-peter",
    name: "2 Peter",
    abbreviation: "2 Pet",
    order: 61,
  },
  {
    fileStem: "1John",
    sourceId: "1Jn",
    id: "1-john",
    name: "1 John",
    abbreviation: "1 John",
    order: 62,
  },
  {
    fileStem: "2John",
    sourceId: "2Jn",
    id: "2-john",
    name: "2 John",
    abbreviation: "2 John",
    order: 63,
  },
  {
    fileStem: "3John",
    sourceId: "3Jn",
    id: "3-john",
    name: "3 John",
    abbreviation: "3 John",
    order: 64,
  },
  { fileStem: "Jude", sourceId: "Jud", id: "jude", name: "Jude", abbreviation: "Jude", order: 65 },
  {
    fileStem: "Rev",
    sourceId: "Re",
    id: "revelation",
    name: "Revelation",
    abbreviation: "Rev",
    order: 66,
  },
];

const BY_STEM = new Map(BOOKS.map((book) => [book.fileStem, book]));
const MAX_XML_BYTES = 16 * 1024 * 1024;

type OrderedNode = Record<string, unknown>;

function nodeChildren(node: OrderedNode, name: string): OrderedNode[] | null {
  const value = node[name];
  return Array.isArray(value) ? (value as OrderedNode[]) : null;
}

function nodeText(node: OrderedNode, name: string): string | null {
  const children = nodeChildren(node, name);
  if (!children) return null;
  const text = children.find((child) => Object.hasOwn(child, "#text"))?.["#text"];
  if (text === undefined || text === null) return "";
  return String(text);
}

function rootAttribute(node: OrderedNode, name: string): string | null {
  const attributes = node[":@"];
  if (!attributes || typeof attributes !== "object") return null;
  const value = (attributes as Record<string, unknown>)[`@_${name}`];
  return typeof value === "string" ? value : null;
}

function assertInside(parent: string, child: string): void {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith("..") || path.includes(":")) {
    throw new Error(`Corpus path escapes the expected source root: ${child}`);
  }
}

function parseVerseMarker(marker: string, currentChapter: number | null): [number, number] {
  const trimmed = marker.trim();
  if (trimmed.includes(":")) {
    const [chapterText, verseText, extra] = trimmed.split(":");
    if (extra !== undefined) throw new Error(`Invalid verse marker: ${marker}`);
    const chapter = Number(chapterText);
    const verse = Number(verseText);
    if (!Number.isInteger(chapter) || chapter < 1 || !Number.isInteger(verse) || verse < 1) {
      throw new Error(`Invalid verse marker: ${marker}`);
    }
    return [chapter, verse];
  }
  const verse = Number(trimmed);
  if (currentChapter === null || !Number.isInteger(verse) || verse < 1) {
    throw new Error(`Verse marker lacks a valid chapter context: ${marker}`);
  }
  return [currentChapter, verse];
}

function renderVerseText(tokens: TokenOccurrence[]): string {
  return tokens
    .map((token) => `${token.prefix ?? ""}${token.surface}${token.suffix || " "}`)
    .join("")
    .trimEnd();
}

export class SblgntXmlAdapter implements CorpusAdapter {
  readonly id = "sblgnt-xml";
  readonly importerVersion = "1.0.0";
  readonly transformationType = "parse-xml";
  readonly structuralDecisions = [
    "Storage schema v2 omits only token editionId, textUnitId, ref and language inherited from chapter/verse; repository restores the v1 domain exactly. JSON whitespace is removed.",
    "Each source <w> is preserved as one TokenOccurrence; no whitespace retokenization is performed.",
    "Source <prefix> and <suffix> values are preserved on the adjacent token.",
    "Source <p> boundaries are preserved as paragraph IDs and chapter-local boundary ranges.",
    "Lexeme, gloss, morphology and Strong identifiers remain absent because the SBLGNT XML does not supply them.",
    "Generated storage is partitioned by book and chapter; no per-verse files are created.",
  ];

  supports(manifest: CorpusPackageManifest): boolean {
    return manifest.corpusId === "sblgnt" && manifest.format === "multiple";
  }

  async discover(
    sourceRoot: string,
    manifest: CorpusPackageManifest,
  ): Promise<DiscoveredCorpusArtifact[]> {
    const plan = manifest.acquisitionPlan;
    if (!plan) throw new Error(`Package ${manifest.id} has no acquisition plan.`);
    if (plan.artifactPattern !== "*.xml") {
      throw new Error(`Unsupported artifact pattern for ${this.id}: ${plan.artifactPattern}`);
    }
    const artifactRoot = resolve(sourceRoot, plan.artifactRoot);
    assertInside(sourceRoot, artifactRoot);
    const entries = await readdir(artifactRoot, { withFileTypes: true });
    const discovered: DiscoveredCorpusArtifact[] = [];

    for (const entry of entries.sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    )) {
      if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".xml") continue;
      const absolutePath = resolve(artifactRoot, entry.name);
      assertInside(artifactRoot, absolutePath);
      const stem = basename(entry.name, ".xml");
      const book = BY_STEM.get(stem);
      discovered.push({
        absolutePath,
        sourcePath: `${plan.artifactRoot}/${entry.name}`.replaceAll("\\", "/"),
        fileName: entry.name,
        classification: stem === "sblgnt" ? "metadata" : "book",
        ...(book ? { canonicalBookId: book.id } : {}),
      });
    }

    const unknown = discovered.filter(
      (artifact) => artifact.classification === "book" && !artifact.canonicalBookId,
    );
    if (unknown.length) {
      throw new Error(
        `Unknown SBLGNT book artifacts: ${unknown.map((item) => item.fileName).join(", ")}`,
      );
    }
    const bookIds = discovered.flatMap((artifact) =>
      artifact.canonicalBookId ? [artifact.canonicalBookId] : [],
    );
    const duplicates = bookIds.filter((id, index) => bookIds.indexOf(id) !== index);
    if (duplicates.length)
      throw new Error(`Duplicate SBLGNT books: ${[...new Set(duplicates)].join(", ")}`);
    const missing = plan.expectedBookIds.filter((id) => !bookIds.includes(id));
    if (missing.length) throw new Error(`Missing expected SBLGNT books: ${missing.join(", ")}`);
    const unexpected = bookIds.filter((id) => !plan.expectedBookIds.includes(id));
    if (unexpected.length) throw new Error(`Unexpected SBLGNT books: ${unexpected.join(", ")}`);
    return discovered;
  }

  async parseAndNormalize(
    artifact: DiscoveredCorpusArtifact,
    sourceArtifact: SourceArtifact,
    manifest: CorpusPackageManifest,
    datasetId: string,
  ): Promise<NormalizedCorpusBook | null> {
    if (artifact.classification === "metadata") return null;
    const definition = BOOKS.find((book) => book.id === artifact.canonicalBookId);
    if (!definition) throw new Error(`No canonical mapping for ${artifact.fileName}.`);

    const bytes = await readFile(artifact.absolutePath);
    if (bytes.byteLength > MAX_XML_BYTES) {
      throw new Error(`${artifact.fileName} exceeds the ${MAX_XML_BYTES} byte XML safety limit.`);
    }
    const xml = bytes.toString("utf8");
    const upper = xml.toUpperCase();
    if (upper.includes("<!DOCTYPE") || upper.includes("<!ENTITY")) {
      throw new Error(`${artifact.fileName} contains a forbidden DOCTYPE or ENTITY declaration.`);
    }
    const validation = XMLValidator.validate(xml);
    if (validation !== true) {
      throw new Error(`${artifact.fileName} is invalid XML: ${validation.err.msg}`);
    }
    const parser = new XMLParser({
      preserveOrder: true,
      ignoreAttributes: false,
      processEntities: false,
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: false,
      maxNestedTags: 32,
    });
    const document = parser.parse(xml) as OrderedNode[];
    const root = document.find((node) => nodeChildren(node, "book"));
    const rootChildren = root ? nodeChildren(root, "book") : null;
    if (!root || !rootChildren)
      throw new Error(`${artifact.fileName} does not contain a book root.`);
    if (rootAttribute(root, "id") !== definition.sourceId) {
      throw new Error(`${artifact.fileName} has an unexpected source book id.`);
    }

    const verses: VerseContent[] = [];
    const warnings: string[] = [];
    let currentChapter: number | null = null;
    let paragraphSequence = 0;
    let currentVerse: VerseContent | null = null;
    let pendingPrefix = "";

    const finishVerse = () => {
      if (!currentVerse) return;
      if (!currentVerse.original?.length) {
        throw new Error(`${artifact.fileName} contains an empty verse ${currentVerse.verse}.`);
      }
      currentVerse.translations[manifest.editionId] = renderVerseText(currentVerse.original);
      verses.push(currentVerse);
      currentVerse = null;
    };

    for (const rootChild of rootChildren) {
      const paragraph = nodeChildren(rootChild, "p");
      if (!paragraph) continue;
      paragraphSequence += 1;
      const paragraphId = `sblgnt:1.2:${definition.id}:p:${String(paragraphSequence).padStart(4, "0")}`;
      let firstTokenInParagraph = true;

      for (const child of paragraph) {
        const verseMarker = nodeText(child, "verse-number");
        if (verseMarker !== null) {
          finishVerse();
          const [chapter, verse] = parseVerseMarker(verseMarker, currentChapter);
          currentChapter = chapter;
          const ref = {
            bookId: definition.id,
            chapter,
            verseStart: verse,
            versification: manifest.versificationScheme,
          };
          currentVerse = {
            ref,
            verse,
            translations: {},
            original: [],
            originalEditionId: manifest.editionId,
            paragraphId,
            paragraphIds: [paragraphId],
            startsParagraph: firstTokenInParagraph,
          };
          continue;
        }
        const prefix = nodeText(child, "prefix");
        if (prefix !== null) {
          pendingPrefix += prefix;
          continue;
        }
        const surface = nodeText(child, "w");
        if (surface !== null) {
          if (!currentVerse) throw new Error(`${artifact.fileName} has a word outside a verse.`);
          const position = (currentVerse.original?.length ?? 0) + 1;
          const chapter = currentVerse.ref.chapter;
          const verse = currentVerse.verse;
          const textUnitId = `${manifest.editionId}:${definition.id}.${chapter}.${verse}`;
          if (!currentVerse.paragraphIds?.includes(paragraphId)) {
            currentVerse.paragraphIds = [...(currentVerse.paragraphIds ?? []), paragraphId];
          }
          currentVerse.original!.push({
            id: `sblgnt:1.2:${definition.id}:${chapter}:${verse}:${String(position).padStart(3, "0")}`,
            editionId: manifest.editionId,
            textUnitId,
            ref: currentVerse.ref,
            position,
            language: "grc",
            surface,
            paragraphId,
            startsParagraph: firstTokenInParagraph,
            ...(pendingPrefix ? { prefix: pendingPrefix } : {}),
          });
          firstTokenInParagraph = false;
          pendingPrefix = "";
          continue;
        }
        const suffix = nodeText(child, "suffix");
        if (suffix !== null) {
          const token = currentVerse?.original?.at(-1);
          if (!token)
            throw new Error(`${artifact.fileName} has a suffix without a preceding word.`);
          if (suffix) token.suffix = `${token.suffix ?? ""}${suffix}`;
        }
      }
      if (pendingPrefix) warnings.push(`Unused prefix at paragraph ${paragraphSequence}.`);
    }
    finishVerse();

    const chapterNumbers = [...new Set(verses.map((verse) => verse.ref.chapter))].sort(
      (left, right) => left - right,
    );
    const chapters = chapterNumbers.map((chapter) => {
      const chapterVerses = verses.filter((verse) => verse.ref.chapter === chapter);
      const paragraphIds = [...new Set(chapterVerses.flatMap((verse) => verse.paragraphIds ?? []))];
      const paragraphBoundaries = paragraphIds.map((id) => {
        const paragraphTokens = chapterVerses.flatMap((verse) =>
          (verse.original ?? []).filter((token) => token.paragraphId === id),
        );
        return {
          id,
          verseStart: paragraphTokens[0]!.ref.verseStart!,
          verseEnd: paragraphTokens.at(-1)!.ref.verseStart!,
          tokenStartPosition: paragraphTokens[0]!.position,
          tokenEndPosition: paragraphTokens.at(-1)!.position,
        };
      });
      return {
        schemaVersion: 1 as const,
        corpusId: manifest.corpusId,
        editionId: manifest.editionId,
        packageId: manifest.id,
        datasetId,
        sourceArtifactId: sourceArtifact.id,
        sourcePath: artifact.sourcePath,
        bookId: definition.id,
        chapter,
        verses: chapterVerses,
        paragraphBoundaries,
      };
    });

    return {
      book: {
        id: definition.id,
        name: definition.name,
        abbreviation: definition.abbreviation,
        order: definition.order,
        chapters: Math.max(...chapterNumbers),
      },
      sourceArtifactId: sourceArtifact.id,
      sourcePath: artifact.sourcePath,
      chapters,
      warnings,
    };
  }

  validate(book: NormalizedCorpusBook, manifest: CorpusPackageManifest): string[] {
    const errors: string[] = [];
    if (!manifest.acquisitionPlan?.expectedBookIds.includes(book.book.id)) {
      errors.push(`Book ${book.book.id} is not expected by package ${manifest.id}.`);
    }
    const chapterNumbers = book.chapters.map((chapter) => chapter.chapter);
    for (let chapter = 1; chapter <= book.book.chapters; chapter += 1) {
      if (!chapterNumbers.includes(chapter))
        errors.push(`${book.book.id} is missing chapter ${chapter}.`);
    }
    const ids = new Set<string>();
    for (const chapter of book.chapters) {
      let previousVerse = 0;
      for (const verse of chapter.verses) {
        if (verse.verse <= previousVerse) {
          errors.push(`${book.book.id} ${chapter.chapter} has unordered or duplicate verses.`);
        }
        previousVerse = verse.verse;
        if (!verse.original?.length)
          errors.push(`${book.book.id} ${chapter.chapter}:${verse.verse} has no words.`);
        for (const token of verse.original ?? []) {
          if (ids.has(token.id)) errors.push(`Duplicate deterministic token id ${token.id}.`);
          ids.add(token.id);
          if (token.editionId !== manifest.editionId || token.position < 1) {
            errors.push(`Token ${token.id} is not traceable to the imported edition.`);
          }
        }
      }
    }
    return errors;
  }
}
