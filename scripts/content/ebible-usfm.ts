import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { compactChapter } from "../../src/lib/domain/compact-corpus";
import type {
  GeneratedChapterShard,
  GeneratedCorpusManifest,
} from "../../src/lib/domain/generated-corpus";

/** Shared by every eBible.org USFM edition: book codes, the USFM reader, download and import. */
const ROOT = resolve(import.meta.dirname, "../..");

export interface EbibleBook {
  id: string;
  name: string;
  abbreviation: string;
  testament: "ot" | "nt" | "other";
}

export const EBIBLE_BOOKS: Record<string, EbibleBook> = {
  GEN: { id: "genesis", name: "Gênesis", abbreviation: "Gn", testament: "ot" },
  EXO: { id: "exodus", name: "Êxodo", abbreviation: "Êx", testament: "ot" },
  LEV: { id: "leviticus", name: "Levítico", abbreviation: "Lv", testament: "ot" },
  NUM: { id: "numbers", name: "Números", abbreviation: "Nm", testament: "ot" },
  DEU: { id: "deuteronomy", name: "Deuteronômio", abbreviation: "Dt", testament: "ot" },
  JOS: { id: "joshua", name: "Josué", abbreviation: "Js", testament: "ot" },
  JDG: { id: "judges", name: "Juízes", abbreviation: "Jz", testament: "ot" },
  RUT: { id: "ruth", name: "Rute", abbreviation: "Rt", testament: "ot" },
  "1SA": { id: "1-samuel", name: "1 Samuel", abbreviation: "1Sm", testament: "ot" },
  "2SA": { id: "2-samuel", name: "2 Samuel", abbreviation: "2Sm", testament: "ot" },
  "1KI": { id: "1-kings", name: "1 Reis", abbreviation: "1Rs", testament: "ot" },
  "2KI": { id: "2-kings", name: "2 Reis", abbreviation: "2Rs", testament: "ot" },
  "1CH": { id: "1-chronicles", name: "1 Crônicas", abbreviation: "1Cr", testament: "ot" },
  "2CH": { id: "2-chronicles", name: "2 Crônicas", abbreviation: "2Cr", testament: "ot" },
  EZR: { id: "ezra", name: "Esdras", abbreviation: "Ed", testament: "ot" },
  NEH: { id: "nehemiah", name: "Neemias", abbreviation: "Ne", testament: "ot" },
  EST: { id: "esther", name: "Ester", abbreviation: "Et", testament: "ot" },
  JOB: { id: "job", name: "Jó", abbreviation: "Jó", testament: "ot" },
  PSA: { id: "psalms", name: "Salmos", abbreviation: "Sl", testament: "ot" },
  PRO: { id: "proverbs", name: "Provérbios", abbreviation: "Pv", testament: "ot" },
  ECC: { id: "ecclesiastes", name: "Eclesiastes", abbreviation: "Ec", testament: "ot" },
  SNG: { id: "song-of-songs", name: "Cântico dos Cânticos", abbreviation: "Ct", testament: "ot" },
  ISA: { id: "isaiah", name: "Isaías", abbreviation: "Is", testament: "ot" },
  JER: { id: "jeremiah", name: "Jeremias", abbreviation: "Jr", testament: "ot" },
  LAM: { id: "lamentations", name: "Lamentações", abbreviation: "Lm", testament: "ot" },
  EZK: { id: "ezekiel", name: "Ezequiel", abbreviation: "Ez", testament: "ot" },
  DAN: { id: "daniel", name: "Daniel", abbreviation: "Dn", testament: "ot" },
  HOS: { id: "hosea", name: "Oseias", abbreviation: "Os", testament: "ot" },
  JOL: { id: "joel", name: "Joel", abbreviation: "Jl", testament: "ot" },
  AMO: { id: "amos", name: "Amós", abbreviation: "Am", testament: "ot" },
  OBA: { id: "obadiah", name: "Obadias", abbreviation: "Ob", testament: "ot" },
  JON: { id: "jonah", name: "Jonas", abbreviation: "Jn", testament: "ot" },
  MIC: { id: "micah", name: "Miqueias", abbreviation: "Mq", testament: "ot" },
  NAM: { id: "nahum", name: "Naum", abbreviation: "Na", testament: "ot" },
  HAB: { id: "habakkuk", name: "Habacuque", abbreviation: "Hc", testament: "ot" },
  ZEP: { id: "zephaniah", name: "Sofonias", abbreviation: "Sf", testament: "ot" },
  HAG: { id: "haggai", name: "Ageu", abbreviation: "Ag", testament: "ot" },
  ZEC: { id: "zechariah", name: "Zacarias", abbreviation: "Zc", testament: "ot" },
  MAL: { id: "malachi", name: "Malaquias", abbreviation: "Ml", testament: "ot" },
  TOB: { id: "tobit", name: "Tobias", abbreviation: "Tb", testament: "other" },
  JDT: { id: "judith", name: "Judite", abbreviation: "Jt", testament: "other" },
  ESG: { id: "greek-esther", name: "Ester Grego", abbreviation: "EtGr", testament: "other" },
  WIS: { id: "wisdom", name: "Sabedoria", abbreviation: "Sb", testament: "other" },
  SIR: { id: "sirach", name: "Eclesiástico", abbreviation: "Eclo", testament: "other" },
  BAR: { id: "baruch", name: "Baruque", abbreviation: "Br", testament: "other" },
  "1MA": { id: "1-maccabees", name: "1 Macabeus", abbreviation: "1Mc", testament: "other" },
  "2MA": { id: "2-maccabees", name: "2 Macabeus", abbreviation: "2Mc", testament: "other" },
  "1ES": { id: "1-esdras", name: "1 Esdras", abbreviation: "1Es", testament: "other" },
  MAN: {
    id: "prayer-of-manasseh",
    name: "Oração de Manassés",
    abbreviation: "OrMan",
    testament: "other",
  },
  PS2: { id: "psalm-151", name: "Salmo 151", abbreviation: "Sl151", testament: "other" },
  "3MA": { id: "3-maccabees", name: "3 Macabeus", abbreviation: "3Mc", testament: "other" },
  "2ES": { id: "2-esdras", name: "2 Esdras", abbreviation: "2Es", testament: "other" },
  "4MA": { id: "4-maccabees", name: "4 Macabeus", abbreviation: "4Mc", testament: "other" },
  DAG: { id: "greek-daniel", name: "Daniel Grego", abbreviation: "DnGr", testament: "other" },
  S3Y: {
    id: "song-of-three-youths",
    name: "Cântico dos Três Jovens",
    abbreviation: "C3J",
    testament: "other",
  },
  SUS: { id: "susanna", name: "Susana", abbreviation: "Sus", testament: "other" },
  BEL: {
    id: "bel-and-the-dragon",
    name: "Bel e o Dragão",
    abbreviation: "Bel",
    testament: "other",
  },
  MAT: { id: "matthew", name: "Mateus", abbreviation: "Mt", testament: "nt" },
  MRK: { id: "mark", name: "Marcos", abbreviation: "Mc", testament: "nt" },
  LUK: { id: "luke", name: "Lucas", abbreviation: "Lc", testament: "nt" },
  JHN: { id: "john", name: "João", abbreviation: "Jo", testament: "nt" },
  ACT: { id: "acts", name: "Atos", abbreviation: "At", testament: "nt" },
  ROM: { id: "romans", name: "Romanos", abbreviation: "Rm", testament: "nt" },
  "1CO": { id: "1-corinthians", name: "1 Coríntios", abbreviation: "1Co", testament: "nt" },
  "2CO": { id: "2-corinthians", name: "2 Coríntios", abbreviation: "2Co", testament: "nt" },
  GAL: { id: "galatians", name: "Gálatas", abbreviation: "Gl", testament: "nt" },
  EPH: { id: "ephesians", name: "Efésios", abbreviation: "Ef", testament: "nt" },
  PHP: { id: "philippians", name: "Filipenses", abbreviation: "Fp", testament: "nt" },
  COL: { id: "colossians", name: "Colossenses", abbreviation: "Cl", testament: "nt" },
  "1TH": { id: "1-thessalonians", name: "1 Tessalonicenses", abbreviation: "1Ts", testament: "nt" },
  "2TH": { id: "2-thessalonians", name: "2 Tessalonicenses", abbreviation: "2Ts", testament: "nt" },
  "1TI": { id: "1-timothy", name: "1 Timóteo", abbreviation: "1Tm", testament: "nt" },
  "2TI": { id: "2-timothy", name: "2 Timóteo", abbreviation: "2Tm", testament: "nt" },
  TIT: { id: "titus", name: "Tito", abbreviation: "Tt", testament: "nt" },
  PHM: { id: "philemon", name: "Filemom", abbreviation: "Fm", testament: "nt" },
  HEB: { id: "hebrews", name: "Hebreus", abbreviation: "Hb", testament: "nt" },
  JAS: { id: "james", name: "Tiago", abbreviation: "Tg", testament: "nt" },
  "1PE": { id: "1-peter", name: "1 Pedro", abbreviation: "1Pe", testament: "nt" },
  "2PE": { id: "2-peter", name: "2 Pedro", abbreviation: "2Pe", testament: "nt" },
  "1JN": { id: "1-john", name: "1 João", abbreviation: "1Jo", testament: "nt" },
  "2JN": { id: "2-john", name: "2 João", abbreviation: "2Jo", testament: "nt" },
  "3JN": { id: "3-john", name: "3 João", abbreviation: "3Jo", testament: "nt" },
  JUD: { id: "jude", name: "Judas", abbreviation: "Jd", testament: "nt" },
  REV: { id: "revelation", name: "Apocalipse", abbreviation: "Ap", testament: "nt" },
};

export type ParsedUsfmVerse = {
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string;
};

function stripUsfm(value: string): { text: string; notes: number } {
  let notes = 0;
  // A note sits right after its word, often before punctuation ("Beraca\f …\f*, pois"); a word
  // right after the note still needs its space ("Resaías,\f …\f*Eneneu").
  const withoutNotes = value.replace(
    /\\(?:f|x)\s[\s\S]*?\\(?:f|x)\*/g,
    (note: string, offset: number, whole: string) => {
      notes += 1;
      return /[\p{L}\p{N}]/u.test(whole[offset + note.length] ?? "") ? " " : "";
    },
  );
  return {
    // Word attributes (|strong="G2983") run up to their closing marker. Closing markers add no
    // space, so "received\w*," stays "received," and not "received ,".
    text: withoutNotes
      .replace(/\|[^\\]*(?=\\\+?[a-z0-9]+\*)/gi, "")
      .replace(/\\\+?[a-z0-9]+\*/gi, "")
      .replace(/\\\+?[a-z0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      // A span reopened after its note ("unigênito\wj*\f …\f* \wj , para") still leaves one.
      .replace(/ ([,.;:!?])/g, "$1")
      .trim()
      .normalize("NFC"),
    notes,
  };
}

export function parseUsfm(source: string): { verses: ParsedUsfmVerse[]; notes: number } {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const chapterMarkers = [...normalized.matchAll(/^\\c\s+(\d+)\s*$/gm)];
  const verses: ParsedUsfmVerse[] = [];
  let notes = 0;
  for (let chapterIndex = 0; chapterIndex < chapterMarkers.length; chapterIndex += 1) {
    const marker = chapterMarkers[chapterIndex]!;
    const chapter = Number(marker[1]);
    const start = (marker.index ?? 0) + marker[0].length;
    const end = chapterMarkers[chapterIndex + 1]?.index ?? normalized.length;
    const body = normalized.slice(start, end);
    const verseMarkers = [...body.matchAll(/^\\v\s+(\d+)(?:-(\d+))?\s+/gm)];
    for (let verseIndex = 0; verseIndex < verseMarkers.length; verseIndex += 1) {
      const verseMarker = verseMarkers[verseIndex]!;
      const textStart = (verseMarker.index ?? 0) + verseMarker[0].length;
      const textEnd = verseMarkers[verseIndex + 1]?.index ?? body.length;
      const stripped = stripUsfm(body.slice(textStart, textEnd));
      notes += stripped.notes;
      // Some deuterocanonical USFM files retain an address whose content exists only
      // in an editorial note (for example Sirach 1:5). Do not promote that note to
      // scripture text or invent a placeholder text unit.
      if (!stripped.text) continue;
      verses.push({
        chapter,
        verseStart: Number(verseMarker[1]),
        verseEnd: Number(verseMarker[2] ?? verseMarker[1]),
        text: stripped.text,
      });
    }
  }
  if (!verses.length) throw new Error("USFM work contains no verses.");
  return { verses, notes };
}

/** One eBible.org USFM package and the edition it becomes. Paths are relative to the repository. */
export interface EbibleEdition {
  /** Key in content/source-lock.json holding the pinned sha256, size and number of works. */
  lockKey: string;
  /** eBible id as it appears in the zip's file names, e.g. "porbrbsl" or "eng-kjv". */
  code: string;
  /** Short name for messages and transformation ids, e.g. "bpm". */
  key: string;
  /** Codes whose content differs in this edition, e.g. KJV ESG holds only the additions to Esther. */
  books?: Record<string, EbibleBook>;
  label: string;
  revision: string;
  sourceUrl: string;
  sourcePath: string;
  outputRoot: string;
  corpusId: string;
  editionId: string;
  packageId: string;
  schemeId: string;
  artifactId: string;
  attribution: string;
  warnings: number;
  structuralDecisions: string[];
}

// Front matter, glossary and other non-scripture books eBible may ship alongside the canon.
const PERIPHERAL_CODES = new Set(["FRT", "BAK", "OTH", "INT", "CNC", "GLO", "TDX", "NDX"]);

export async function fetchEbibleUsfm(edition: EbibleEdition, minimumBytes = 1_000_000) {
  const output = resolve(ROOT, edition.sourcePath);
  const describe = (bytes: Uint8Array, reused: boolean) => ({
    output,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    source: edition.sourceUrl,
    reused,
  });
  try {
    const existing = await readFile(output);
    if (existing.byteLength > minimumBytes) return describe(existing, true);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(edition.sourceUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Scriptorium/0.1 corpus-acquisition (local research tool)" },
    });
    if (!response.ok) throw new Error(`eBible returned HTTP ${response.status}.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < minimumBytes)
      throw new Error("The eBible package is unexpectedly small.");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, bytes);
    return describe(bytes, false);
  } finally {
    clearTimeout(timeout);
  }
}

export async function importEbibleUsfm(edition: EbibleEdition) {
  const sourceBytes = await readFile(resolve(ROOT, edition.sourcePath));
  const digest = createHash("sha256").update(sourceBytes).digest("hex");
  const lock = JSON.parse(
    await readFile(resolve(ROOT, "content/source-lock.json"), "utf8"),
  ) as Record<string, { sha256: string; sizeBytes: number; works: number } | undefined>;
  const pinned = lock[edition.lockKey];
  if (!pinned || digest !== pinned.sha256 || sourceBytes.byteLength !== pinned.sizeBytes) {
    throw new Error(
      `eBible ${edition.label} package failed the registered checksum/size custody check.`,
    );
  }
  const fileName = new RegExp(
    `^(\\d+)-([A-Z0-9]{3})${edition.code.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}\\.usfm$`,
  );
  const archive = unzipSync(sourceBytes);
  const entries = Object.entries(archive)
    .filter(([name]) => name.endsWith(".usfm"))
    .filter(([name]) => !PERIPHERAL_CODES.has(fileName.exec(name)?.[2] ?? ""))
    .sort(([left], [right]) => left.localeCompare(right, "en"));
  if (entries.length !== pinned.works)
    throw new Error(`Expected ${pinned.works} USFM works, received ${entries.length}.`);

  const outputRoot = resolve(ROOT, edition.outputRoot);
  const datasetId = `dataset:${edition.corpusId}:${edition.revision}:${digest}`;
  const books: GeneratedCorpusManifest["books"] = [];
  let verseCount = 0;
  let noteCount = 0;
  let chapterCount = 0;
  for (const [filename, bytes] of entries) {
    const match = fileName.exec(filename);
    const definition = match ? (edition.books?.[match[2]!] ?? EBIBLE_BOOKS[match[2]!]) : undefined;
    if (!match || !definition) throw new Error(`Unsupported eBible USFM entry ${filename}.`);
    let parsed: ReturnType<typeof parseUsfm>;
    try {
      parsed = parseUsfm(strFromU8(bytes));
    } catch (error) {
      throw new Error(`Unable to import ${filename}: ${(error as Error).message}`, {
        cause: error,
      });
    }
    noteCount += parsed.notes;
    verseCount += parsed.verses.length;
    const chapterNumbers = [...new Set(parsed.verses.map((verse) => verse.chapter))].sort(
      (left, right) => left - right,
    );
    const chapterFiles: Record<string, string> = {};
    for (const chapter of chapterNumbers) {
      const chapterVerses = parsed.verses.filter((verse) => verse.chapter === chapter);
      const relativePath = `books/${definition.id}/${String(chapter).padStart(2, "0")}.json`;
      const shard: GeneratedChapterShard = {
        schemaVersion: 1,
        corpusId: edition.corpusId,
        editionId: edition.editionId,
        packageId: edition.packageId,
        datasetId,
        sourceArtifactId: edition.artifactId,
        sourcePath: `${filename}#chapter=${chapter}`,
        bookId: definition.id,
        chapter,
        verses: chapterVerses.map((verse) => ({
          ref: {
            bookId: definition.id,
            chapter,
            verseStart: verse.verseStart,
            verseEnd: verse.verseEnd,
          },
          verse: verse.verseStart,
          translations: { [edition.editionId]: verse.text },
        })),
      };
      const output = resolve(outputRoot, relativePath);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(compactChapter(shard))}\n`, "utf8");
      chapterFiles[String(chapter)] = relativePath;
      chapterCount += 1;
    }
    books.push({
      id: definition.id,
      name: definition.name,
      abbreviation: definition.abbreviation,
      order: Number(match[1]),
      chapters: chapterNumbers.length,
      chapterFiles,
    });
  }

  const manifest: GeneratedCorpusManifest = {
    schemaVersion: 1,
    importer: { name: "Scriptorium eBible USFM Importer", version: "1.0.0", adapter: "usfm-3" },
    corpusId: edition.corpusId,
    editionId: edition.editionId,
    packageId: edition.packageId,
    sourceRevision: `ebible-${edition.code}-${edition.revision}`,
    sourcePackageDigest: { algorithm: "SHA-256", value: digest },
    attribution: edition.attribution,
    versificationScheme: edition.schemeId,
    sourceArtifactIds: [edition.artifactId],
    transformations: [
      {
        id: `transformation:${edition.key}:1.0.0:parse-usfm`,
        type: "parse-f4",
        inputArtifactIds: [edition.artifactId],
        outputDatasetId: datasetId,
      },
      {
        id: `transformation:${edition.key}:1.0.0:chapter-shards`,
        type: "build-chapter-shards",
        inputArtifactIds: [edition.artifactId],
        outputDatasetId: datasetId,
      },
    ],
    datasetId,
    books,
    statistics: {
      artifacts: 1,
      books: books.length,
      chapters: chapterCount,
      verses: verseCount,
      textUnits: verseCount,
      tokenOccurrences: 0,
      paragraphBoundaries: 0,
      bytesProcessed: sourceBytes.byteLength,
      errors: 0,
      warnings: edition.warnings,
      notes: noteCount,
    },
    structuralDecisions: edition.structuralDecisions,
  };
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    resolve(outputRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return manifest;
}
