/**
 * ============================================================================
 * DEMO / SEED DATA — Study workspace fixtures
 * ============================================================================
 * One demo study so the workspace is never empty. User-created studies and
 * notes are stored locally (localStorage) by the StudyRepository.
 * ============================================================================
 */

import type { SourceReference, Study } from "../domain/study";

export const DEMO_SOURCES: SourceReference[] = [
  {
    id: "src-wh-john-1-1",
    author: "Westcott & Hort",
    work: "The New Testament in the Original Greek",
    edition: "1881",
    location: "John 1:1",
    year: 1881,
    resourceId: "res-wh",
  },
  {
    id: "src-demo-lexicon-logos",
    author: "Scriptorium demo data",
    work: "Greek–English Lexicon (DEMO excerpt)",
    location: "λόγος",
    year: 2026,
    resourceId: "res-lexicon-demo",
  },
];

export const DEMO_STUDY: Study = {
  id: "study-logos",
  slug: "logos-in-john",
  title: "The concept of Logos in John",
  description:
    "DEMO study workspace. Collects passages, words, concepts and sources around λόγος in John 1. No theological conclusions are bundled — only structure.",
  items: [
    {
      id: "si-1",
      kind: "passage",
      refId: "john/1/1",
      label: "John 1:1",
      passageRef: { bookId: "john", chapter: 1, verseStart: 1 },
      addedAt: "2026-08-20T10:00:00Z",
    },
    {
      id: "si-2",
      kind: "word",
      refId: "λόγος",
      label: "λόγος (logos)",
      addedAt: "2026-08-20T10:05:00Z",
    },
    {
      id: "si-3",
      kind: "concept",
      refId: "ent-logos",
      label: "Logos",
      addedAt: "2026-08-20T10:06:00Z",
    },
    {
      id: "si-4",
      kind: "passage",
      refId: "genesis/1/1",
      label: "Genesis 1:1",
      passageRef: { bookId: "genesis", chapter: 1, verseStart: 1 },
      addedAt: "2026-08-21T09:00:00Z",
    },
    {
      id: "si-5",
      kind: "resource",
      refId: "res-wh",
      label: "Westcott & Hort Greek NT",
      addedAt: "2026-08-21T09:30:00Z",
    },
    {
      id: "si-6",
      kind: "resource",
      refId: "res-lexicon-demo",
      label: "Greek–English Lexicon (DEMO excerpt)",
      addedAt: "2026-08-22T08:00:00Z",
    },
  ],
  createdAt: "2026-08-20T10:00:00Z",
  updatedAt: "2026-08-22T08:00:00Z",
};
