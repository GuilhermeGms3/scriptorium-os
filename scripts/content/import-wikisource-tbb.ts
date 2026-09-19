import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { compactChapter } from "../../src/lib/domain/compact-corpus";
import type { GeneratedChapterShard, GeneratedCorpusManifest } from "../../src/lib/domain/generated-corpus";
import bibliaLivreManifest from "../../generated/corpora/biblia-livre/2025.1.0/manifest.json";

const ROOT = resolve(import.meta.dirname, "../..");
const SOURCE_PATH = resolve(ROOT, "corpora/source/traducao-brasileira-wikisource/2026-09-16/pages.json");
const OUTPUT_ROOT = resolve(ROOT, "generated/corpora/traducao-brasileira/1917");
const CORPUS_ID = "traducao-brasileira";
const EDITION_ID = "traducao-brasileira-1917";
const PACKAGE_ID = "pkg-traducao-brasileira-wikisource-1917";
const SCHEME_ID = "traducao-brasileira-wikisource-1917";
const ARTIFACT_ID = "artifact:wikisource:tbb:pages";

type Snapshot = {
  schemaVersion: 1;
  retrievedAt: string;
  pages: {
    canonicalBookId: string;
    chapter: number;
    title: string;
    pageId: number;
    revisionId: number;
    revisionTimestamp: string;
    content: string;
  }[];
};

function stripWikitext(value: string): string {
  return value
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref\b[^/>]*\/>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\[(?:https?:\/\/\S+)\s+([^\]]+)\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

export function parseWikisourceChapter(content: string): string[] {
  const verses: string[] = [];
  let current = "";
  for (const rawLine of content.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const start = /^#(?![#*:;])\s*(.*)$/.exec(rawLine);
    if (start) {
      if (current) verses.push(stripWikitext(current));
      current = start[1] ?? "";
    } else if (current && rawLine.trim() && !/^\s*\{\{/.test(rawLine)) {
      current += ` ${rawLine.trim()}`;
    }
  }
  if (current) verses.push(stripWikitext(current));
  if (!verses.length || verses.some((verse) => !verse)) throw new Error("Chapter has empty or missing verse rows.");
  return verses;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const sourceBytes = await readFile(SOURCE_PATH);
  const digest = createHash("sha256").update(sourceBytes).digest("hex");
  const lock = JSON.parse(await readFile(resolve(ROOT, "content/source-lock.json"), "utf8")) as {
    wikisourceTraducaoBrasileira?: { sha256: string; sizeBytes: number; pages: number };
  };
  if (
    !lock.wikisourceTraducaoBrasileira ||
    digest !== lock.wikisourceTraducaoBrasileira.sha256 ||
    sourceBytes.byteLength !== lock.wikisourceTraducaoBrasileira.sizeBytes
  ) {
    throw new Error("Wikisource TBB snapshot failed the registered checksum/size custody check.");
  }
  const snapshot = JSON.parse(sourceBytes.toString("utf8")) as Snapshot;
  if (snapshot.schemaVersion !== 1) throw new Error("Unsupported Wikisource snapshot schema.");
  const byLocation = new Map(snapshot.pages.map((page) => [`${page.canonicalBookId}/${page.chapter}`, page]));
  const datasetId = `dataset:${CORPUS_ID}:1917:${digest}`;
  const books: GeneratedCorpusManifest["books"] = [];
  let verseCount = 0;

  for (const book of bibliaLivreManifest.books) {
    const chapterFiles: Record<string, string> = {};
    for (let chapterNumber = 1; chapterNumber <= book.chapters; chapterNumber += 1) {
      const page = byLocation.get(`${book.id}/${chapterNumber}`);
      if (!page) throw new Error(`Snapshot is missing ${book.id} ${chapterNumber}.`);
      const texts = parseWikisourceChapter(page.content);
      verseCount += texts.length;
      const relativePath = `books/${book.id}/${String(chapterNumber).padStart(2, "0")}.json`;
      const shard: GeneratedChapterShard = {
        schemaVersion: 1,
        corpusId: CORPUS_ID,
        editionId: EDITION_ID,
        packageId: PACKAGE_ID,
        datasetId,
        sourceArtifactId: ARTIFACT_ID,
        sourcePath: `pages.json#pageid=${page.pageId}&oldid=${page.revisionId}`,
        bookId: book.id,
        chapter: chapterNumber,
        verses: texts.map((text, index) => ({
          ref: { bookId: book.id, chapter: chapterNumber, verseStart: index + 1, verseEnd: index + 1 },
          verse: index + 1,
          translations: { [EDITION_ID]: text },
        })),
      };
      const output = resolve(OUTPUT_ROOT, relativePath);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(compactChapter(shard))}\n`, "utf8");
      chapterFiles[String(chapterNumber)] = relativePath;
    }
    books.push({ ...book, chapterFiles });
  }

  if (byLocation.size !== lock.wikisourceTraducaoBrasileira.pages || books.length !== 66) {
    throw new Error("Snapshot is not a complete 66-book corpus.");
  }
  const manifest: GeneratedCorpusManifest = {
    schemaVersion: 1,
    importer: { name: "Scriptorium Wikisource Importer", version: "1.0.0", adapter: "wikisource-numbered-list" },
    corpusId: CORPUS_ID,
    editionId: EDITION_ID,
    packageId: PACKAGE_ID,
    sourceRevision: `wikisource-snapshot-${snapshot.retrievedAt.slice(0, 10)}`,
    sourcePackageDigest: { algorithm: "SHA-256", value: digest },
    attribution: "Tradução Brasileira da Bíblia (1917), texto em domínio público. Transcrição colaborativa do Wikisource em português, disponibilizada sob CC BY-SA 4.0; consulte os históricos de revisão registrados no artefato-fonte. O próprio catálogo alerta que se trata de transcrição de segunda mão.",
    versificationScheme: SCHEME_ID,
    sourceArtifactIds: [ARTIFACT_ID],
    transformations: [
      { id: "transformation:tbb:1.0.0:parse-wikitext", type: "parse-f4", inputArtifactIds: [ARTIFACT_ID], outputDatasetId: datasetId },
      { id: "transformation:tbb:1.0.0:chapter-shards", type: "build-chapter-shards", inputArtifactIds: [ARTIFACT_ID], outputDatasetId: datasetId },
    ],
    datasetId,
    books,
    statistics: {
      artifacts: 1, books: 66, chapters: 1189, verses: verseCount, textUnits: verseCount,
      tokenOccurrences: 0, paragraphBoundaries: 0, bytesProcessed: sourceBytes.byteLength,
      errors: 0, warnings: 1,
    },
    structuralDecisions: [
      "Cada item numerado da transcrição Wikisource é preservado como uma unidade de versículo.",
      "Markup, referências e navegação do Wikisource são removidos; o texto legível é normalizado para Unicode NFC.",
      "Revisões de cada página são registradas no snapshot para uma cadeia de custódia reproduzível.",
      "A edição recebe esquema próprio e crosswalk explícito para a navegação bíblica canônica do Scriptorium.",
      "Nenhum alinhamento palavra a palavra é inferido.",
    ],
  };
  await mkdir(OUTPUT_ROOT, { recursive: true });
  await writeFile(resolve(OUTPUT_ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(manifest.statistics, null, 2)}\n`);
}
