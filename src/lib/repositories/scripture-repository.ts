/**
 * ScriptureRepository — UI never reads fixtures directly; it goes through
 * this seam so a future corpus engine (local DB, packages, remote) can
 * replace the fixture backend without touching components.
 */

import type { Book, ChapterContent, Edition, Lemma } from "../domain/scripture";
import {
  DEMO_AVAILABLE,
  DEMO_BOOKS,
  DEMO_CHAPTERS,
  DEMO_EDITIONS,
  DEMO_LEXICON,
  DEMO_OCCURRENCES,
} from "../fixtures/scripture.fixture";

export const ScriptureRepository = {
  listEditions(): Edition[] {
    return DEMO_EDITIONS;
  },

  listBooks(): Book[] {
    return DEMO_BOOKS;
  },

  /** Chapters that actually have DEMO text imported for a book. */
  availableChapters(bookId: string): number[] {
    return DEMO_AVAILABLE[bookId] ?? [];
  },

  hasContent(bookId: string, chapter: number): boolean {
    return (DEMO_AVAILABLE[bookId] ?? []).includes(chapter);
  },

  getChapter(bookId: string, chapter: number): ChapterContent | null {
    return DEMO_CHAPTERS[`${bookId}/${chapter}`] ?? null;
  },

  getLexiconEntry(lemma: string): Lemma | null {
    return DEMO_LEXICON[lemma] ?? null;
  },

  getOccurrences(lemma: string): string[] {
    return DEMO_OCCURRENCES[lemma] ?? [];
  },
};
