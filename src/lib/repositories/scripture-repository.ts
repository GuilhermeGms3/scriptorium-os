/**
 * ScriptureRepository — UI never reads fixtures directly; it goes through
 * this seam so a future corpus engine (local DB, packages, remote) can
 * replace the fixture backend without touching components.
 */

import type {
  Book,
  ChapterContent,
  Edition,
  Lemma,
  PassageRef,
  TextUnit,
  VerseContent,
} from "../domain/scripture";
import type { GeneratedChapterShard, GeneratedCorpusManifest } from "../domain/generated-corpus";
import type { Provenance } from "../domain/source";
import { expandChapter, type CompactChapterShard } from "../domain/compact-corpus";
import sblgntManifestJson from "../../../generated/corpora/sblgnt/1.2/manifest.json";
import {
  DEMO_AVAILABLE,
  DEMO_BOOKS,
  DEMO_CHAPTERS,
  DEMO_EDITIONS,
  DEMO_LEXICON,
  DEMO_OCCURRENCES,
} from "../fixtures/scripture.fixture";

const SBLGNT_MANIFEST = sblgntManifestJson as GeneratedCorpusManifest;
const SBLGNT_EDITION: Edition = {
  id: SBLGNT_MANIFEST.editionId,
  corpusId: SBLGNT_MANIFEST.corpusId,
  title: "SBL Greek New Testament, version 1.2",
  abbreviation: "SBLGNT",
  language: "grc",
  script: "Grek",
  direction: "ltr",
  kind: "original-language",
  year: 2023,
  licenseId: "CC-BY-4.0",
};
const GENERATED_BOOKS: Book[] = SBLGNT_MANIFEST.books.map((book) => ({
  id: book.id,
  name: book.name,
  abbreviation: book.abbreviation,
  order: book.order,
  chapters: book.chapters,
  testament: "nt",
}));
const chapterModules = import.meta.glob<{ default: GeneratedChapterShard | CompactChapterShard }>(
  "../../../generated/corpora/sblgnt/1.2/books/**/*.json",
);
const generatedChapterCache = new Map<string, GeneratedChapterShard>();
const loadedChapterCache = new Map<string, ChapterContent>();

function chapterKey(bookId: string, chapter: number): string {
  return `${bookId}/${chapter}`;
}

function generatedChapterPath(bookId: string, chapter: number): string | null {
  const book = SBLGNT_MANIFEST.books.find((item) => item.id === bookId);
  const path = book?.chapterFiles[String(chapter)];
  return path ? `../../../generated/corpora/sblgnt/1.2/${path}` : null;
}

function mergeChapters(
  generated: GeneratedChapterShard | undefined,
  demo: ChapterContent | undefined,
): ChapterContent | null {
  if (!generated) return demo ?? null;
  if (!demo) return generated;
  const demoByVerse = new Map(demo.verses.map((verse) => [verse.verse, verse]));
  return {
    ...generated,
    verses: generated.verses.map((verse) => {
      const demoVerse = demoByVerse.get(verse.verse);
      return demoVerse
        ? {
            ...verse,
            translations: { ...demoVerse.translations, ...verse.translations },
          }
        : verse;
    }),
  };
}

export const ScriptureRepository = {
  listEditions(): Edition[] {
    return [...DEMO_EDITIONS.filter((edition) => edition.id !== SBLGNT_EDITION.id), SBLGNT_EDITION];
  },

  listBooks(): Book[] {
    const books = new Map(DEMO_BOOKS.map((book) => [book.id, book]));
    GENERATED_BOOKS.forEach((book) => books.set(book.id, book));
    return [...books.values()].sort((left, right) => left.order - right.order);
  },

  getBook(bookId: string): Book | null {
    return this.listBooks().find((book) => book.id === bookId) ?? null;
  },

  /** Chapters that actually have DEMO text imported for a book. */
  availableChapters(bookId: string): number[] {
    const generated = SBLGNT_MANIFEST.books.find((book) => book.id === bookId);
    return generated
      ? Object.keys(generated.chapterFiles)
          .map(Number)
          .sort((left, right) => left - right)
      : (DEMO_AVAILABLE[bookId] ?? []);
  },

  hasContent(bookId: string, chapter: number): boolean {
    return this.availableChapters(bookId).includes(chapter);
  },

  getChapter(bookId: string, chapter: number): ChapterContent | null {
    const loaded = loadedChapterCache.get(chapterKey(bookId, chapter));
    if (loaded) return loaded;
    return mergeChapters(
      generatedChapterCache.get(chapterKey(bookId, chapter)),
      DEMO_CHAPTERS[chapterKey(bookId, chapter)],
    );
  },

  async loadChapter(bookId: string, chapter: number): Promise<ChapterContent | null> {
    const key = chapterKey(bookId, chapter);
    if (!generatedChapterCache.has(key)) {
      const path = generatedChapterPath(bookId, chapter);
      const loader = path ? chapterModules[path] : undefined;
      if (loader) {
        const loaded = expandChapter((await loader()).default);
        if (loaded.bookId !== bookId || loaded.chapter !== chapter) {
          throw new Error(`Generated chapter identity mismatch for ${bookId} ${chapter}.`);
        }
        generatedChapterCache.set(key, loaded);
      }
    }
    const loaded = mergeChapters(generatedChapterCache.get(key), DEMO_CHAPTERS[key]);
    if (loaded) loadedChapterCache.set(key, loaded);
    return loaded;
  },

  /** Restores serialized route-loader data before the first client render. */
  primeChapter(chapter: ChapterContent | null): void {
    if (!chapter) return;
    loadedChapterCache.set(chapterKey(chapter.bookId, chapter.chapter), chapter);
  },

  defaultEditionId(bookId: string, chapter: number): string {
    const firstVerse = this.getChapter(bookId, chapter)?.verses[0];
    if (!firstVerse) return "web";
    if (firstVerse.translations["web"]) return "web";
    return Object.keys(firstVerse.translations)[0] ?? "web";
  },

  getPassageProvenance(ref: PassageRef): Provenance | null {
    const key = chapterKey(ref.bookId, ref.chapter);
    const chapter = generatedChapterCache.get(key) ?? loadedChapterCache.get(key);
    if (
      !chapter ||
      !("packageId" in chapter) ||
      !("sourceArtifactId" in chapter) ||
      !("datasetId" in chapter) ||
      typeof chapter.packageId !== "string" ||
      typeof chapter.sourceArtifactId !== "string" ||
      typeof chapter.datasetId !== "string"
    ) {
      return null;
    }
    return {
      acquisition: "bundled",
      creationMethod: "machine-assisted",
      packageId: chapter.packageId,
      sourceArtifactIds: [chapter.sourceArtifactId],
      transformationIds: SBLGNT_MANIFEST.transformations.map((item) => item.id),
      datasetId: chapter.datasetId,
      attribution: SBLGNT_MANIFEST.attribution,
      note: `SBLGNT ${SBLGNT_MANIFEST.sourceRevision} via ${SBLGNT_MANIFEST.importer.adapter}.`,
    };
  },

  getPassage(ref: PassageRef): VerseContent[] {
    const chapter = this.getChapter(ref.bookId, ref.chapter);
    if (!chapter) return [];
    const start = ref.verseStart ?? 1;
    const end = ref.verseEnd ?? ref.verseStart ?? Number.MAX_SAFE_INTEGER;
    return chapter.verses.filter((verse) => verse.verse >= start && verse.verse <= end);
  },

  getTextUnits(ref: PassageRef): TextUnit[] {
    return this.getPassage(ref).flatMap((verse) => {
      const translations = Object.entries(verse.translations).map(([editionId, text]) => ({
        id: `${editionId}:${verse.ref.bookId}.${verse.ref.chapter}.${verse.verse}`,
        ref: verse.ref,
        editionId,
        text,
      }));
      const original =
        verse.original &&
        verse.originalEditionId &&
        !Object.hasOwn(verse.translations, verse.originalEditionId)
          ? [
              {
                id: `${verse.originalEditionId}:${verse.ref.bookId}.${verse.ref.chapter}.${verse.verse}`,
                ref: verse.ref,
                editionId: verse.originalEditionId,
                text: verse.original.map((token) => token.surface).join(" "),
              },
            ]
          : [];
      return [...translations, ...original];
    });
  },

  getLexiconEntry(lemma: string): Lemma | null {
    return DEMO_LEXICON[lemma] ?? null;
  },

  getLemmaEntries(lemmas: string[]): Lemma[] {
    return [...new Set(lemmas)]
      .map((lemma) => this.getLexiconEntry(lemma))
      .filter((entry): entry is Lemma => entry !== null);
  },

  getOccurrences(lemma: string): string[] {
    return DEMO_OCCURRENCES[lemma] ?? [];
  },
};
