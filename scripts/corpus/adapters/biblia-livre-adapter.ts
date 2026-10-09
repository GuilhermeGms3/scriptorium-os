import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { SourceArtifact, CorpusPackageManifest } from "../../../src/lib/domain/corpus";
import type { GeneratedChapterShard } from "../../../src/lib/domain/generated-corpus";
import {
  BIBLIA_LIVRE_BOOKS,
  BIBLIA_LIVRE_EDITION_ID,
  BIBLIA_LIVRE_PACKAGE_ID,
} from "../../../src/lib/corpus-config/biblia-livre";
import type { CorpusAdapter, DiscoveredCorpusArtifact, NormalizedCorpusBook } from "../adapter";

type Marker = { kind: string; text: string };
export type BibliaLivreParsedBook = {
  chapters: Map<number, Map<number, string>>;
  notes: Marker[];
  headings: Marker[];
  anomalies: string[];
};

export function parseBibliaLivreF4(raw: string): BibliaLivreParsedBook {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  const chapters = new Map<number, Map<number, string>>();
  const notes: Marker[] = [],
    headings: Marker[] = [],
    anomalies: string[] = [];
  let current: { chapter: number; verse: number; text: string[] } | null = null;
  let block: "fn" | "added" | "psalm-title" | "ref" | "key" | null = null;
  let blockText: string[] = [];
  const finishBlock = () => {
    const text = blockText.join(" ").replace(/\s+/g, " ").trim();
    if (block === "fn" && text) notes.push({ kind: block, text });
    else if (block === "psalm-title" && text) headings.push({ kind: block, text });
    else if (block === "added" && text && current) current.text.push(text);
    block = null;
    blockText = [];
  };
  const finishVerse = () => {
    if (!current) return;
    const verses = chapters.get(current.chapter) ?? new Map<number, string>();
    if (verses.has(current.verse)) anomalies.push(`duplicate:${current.chapter}:${current.verse}`);
    else
      verses.set(
        current.verse,
        current.text
          .join(" ")
          .replace(/\s+/g, " ")
          .replace(/\s+([,.;:!?])/g, "$1")
          .trim()
          .normalize("NFC"),
      );
    chapters.set(current.chapter, verses);
    current = null;
  };
  for (const original of lines) {
    const line = original.trim();
    const verse = /^\\v\s+[^.]+\.(\d+)\.(\d+)(?:-(\d+))?\s*$/.exec(line);
    if (verse) {
      if (block) finishBlock();
      finishVerse();
      current = { chapter: Number(verse[1]), verse: Number(verse[2]), text: [] };
      if (verse[3]) anomalies.push(`range:${verse[1]}:${verse[2]}-${verse[3]}`);
      continue;
    }
    if (String(block) === "fn") {
      if (/^\\\*fn\s*$/.test(line)) finishBlock();
      else if (!/^\\\*?key\s*$/.test(line) && line) blockText.push(line);
      continue;
    }
    const start = /^\\(fn|added|psalm-title|ref|key)\s*$/.exec(line);
    if (start) {
      if (block) finishBlock();
      block = start[1] as typeof block;
      continue;
    }
    if (/^\\\*(fn|added|psalm-title|ref|key)[,.”]?\s*$/.test(line)) {
      if (block) finishBlock();
      continue;
    }
    if (/^\\(?:name-long|name-short|abbreviation|ubs-code)\s*$/.test(line)) {
      block = "ref";
      blockText = [];
      continue;
    }
    if (/^\\\*(?:name-long|name-short|abbreviation|ubs-code)\s*$/.test(line)) {
      block = null;
      blockText = [];
      continue;
    }
    if (!line) continue;
    if (block) blockText.push(line);
    else if (current) current.text.push(line);
  }
  if (block) finishBlock();
  finishVerse();
  for (const [chapter, verses] of chapters) {
    const max = Math.max(...verses.keys());
    for (let v = 1; v <= max; v++) if (!verses.has(v)) anomalies.push(`omitted:${chapter}:${v}`);
  }
  return { chapters, notes, headings, anomalies };
}

export class BibliaLivreAdapter implements CorpusAdapter {
  readonly id = "biblia-livre-f4";
  readonly importerVersion = "1.0.0";
  readonly transformationType = "parse-f4";
  readonly structuralDecisions = [
    "Official UTF-8 F4 files are parsed directly; no opaque conversion tool is used.",
    "Footnotes and psalm titles are counted and excluded from the visible verse string; added text remains visible.",
    "No paragraph markers exist in this N4 source revision, so no paragraphs are invented.",
    "Canonical passage references are shared, but no Portuguese-to-Greek word alignment is created.",
    "Generated storage is partitioned by book and chapter.",
  ];
  supports(manifest: CorpusPackageManifest) {
    return manifest.id === BIBLIA_LIVRE_PACKAGE_ID;
  }
  async discover(root: string): Promise<DiscoveredCorpusArtifact[]> {
    const base = resolve(root, "textos/f4/n4");
    const books = (await readdir(base, { withFileTypes: true })).filter(
      (e) => e.isFile() && e.name.endsWith(".txt"),
    );
    const discovered: DiscoveredCorpusArtifact[] = books.map((e) => {
      const info = BIBLIA_LIVRE_BOOKS[e.name as keyof typeof BIBLIA_LIVRE_BOOKS];
      if (!info) throw new Error(`Unknown Bíblia Livre book artifact: ${e.name}`);
      return {
        absolutePath: resolve(base, e.name),
        sourcePath: `textos/f4/n4/${e.name}`,
        fileName: e.name,
        classification: "book" as const,
        canonicalBookId: info[0],
      };
    });
    for (const name of ["README.md", "LICENCA.md"])
      discovered.push({
        absolutePath: resolve(root, name),
        sourcePath: name,
        fileName: name,
        classification: "metadata",
      });
    return discovered.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  }
  async parseAndNormalize(
    artifact: DiscoveredCorpusArtifact,
    source: SourceArtifact,
    manifest: CorpusPackageManifest,
    datasetId: string,
  ): Promise<NormalizedCorpusBook | null> {
    if (artifact.classification === "metadata") return null;
    const info = BIBLIA_LIVRE_BOOKS[basename(artifact.fileName) as keyof typeof BIBLIA_LIVRE_BOOKS];
    if (!info) throw new Error(`Missing canonical mapping for ${artifact.fileName}`);
    const parsed = parseBibliaLivreF4(await readFile(artifact.absolutePath, "utf8"));
    const chapters: GeneratedChapterShard[] = [...parsed.chapters]
      .sort(([a], [b]) => a - b)
      .map(([chapter, verses]) => ({
        schemaVersion: 1,
        corpusId: manifest.corpusId,
        editionId: manifest.editionId,
        packageId: manifest.id,
        datasetId,
        sourceArtifactId: source.id,
        sourcePath: artifact.sourcePath,
        bookId: info[0],
        chapter,
        verses: [...verses]
          .sort(([a], [b]) => a - b)
          .map(([verse, text]) => ({
            ref: { bookId: info[0], chapter, verseStart: verse, verseEnd: verse },
            verse,
            translations: { [BIBLIA_LIVRE_EDITION_ID]: text },
          })),
      }));
    return {
      book: {
        id: info[0],
        name: info[1],
        abbreviation: info[2],
        order: info[3],
        chapters: chapters.length,
      },
      sourceArtifactId: source.id,
      sourcePath: artifact.sourcePath,
      chapters,
      warnings: parsed.anomalies.map((a) => `${info[0]}:${a}`),
      structuralCounts: {
        paragraphs: 0,
        headings: parsed.headings.length,
        notes: parsed.notes.length,
      },
    };
  }
  validate(book: NormalizedCorpusBook) {
    const errors: string[] = [];
    if (!book.chapters.length) errors.push(`${book.book.id}: no chapters`);
    for (const chapter of book.chapters)
      for (const verse of chapter.verses)
        if (!verse.translations[BIBLIA_LIVRE_EDITION_ID])
          errors.push(`${book.book.id} ${chapter.chapter}:${verse.verse}: empty`);
    return errors;
  }
}
