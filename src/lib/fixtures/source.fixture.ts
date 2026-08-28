/** DEMO / SEED DATA — bibliographic records and concrete evidence locations. */
import type { SourceFragment, SourceReference } from "../domain/source";

const bundledDemo = {
  acquisition: "bundled",
  creationMethod: "human",
  isDemo: true,
} as const;

export const DEMO_SOURCE_REFERENCES: SourceReference[] = [
  {
    id: "src-wh-john-1-1",
    author: "Westcott & Hort",
    work: "The New Testament in the Original Greek",
    edition: "1881",
    year: 1881,
    resourceId: "res-wh",
    sourceType: "edition",
    language: "grc",
    provenance: bundledDemo,
  },
  {
    id: "src-demo-lexicon-logos",
    author: "Scriptorium demo data",
    work: "Greek–English Lexicon (DEMO excerpt)",
    year: 2026,
    resourceId: "res-lexicon-demo",
    sourceType: "dataset",
    language: "en",
    provenance: bundledDemo,
  },
  {
    id: "src-web-john-1",
    work: "World English Bible",
    year: 2020,
    resourceId: "res-web",
    sourceType: "edition",
    language: "en",
    provenance: bundledDemo,
  },
];

export const DEMO_SOURCE_FRAGMENTS: SourceFragment[] = [
  {
    id: "frag-wh-john-1-1",
    sourceId: "src-wh-john-1-1",
    resourceId: "res-wh",
    locator: "John 1:1",
    passage: { bookId: "john", chapter: 1, verseStart: 1 },
    sourceType: "primary-text",
    epistemicRole: "primary",
    provenance: bundledDemo,
  },
  {
    id: "frag-demo-lexicon-logos",
    sourceId: "src-demo-lexicon-logos",
    resourceId: "res-lexicon-demo",
    locator: "λόγος",
    sourceType: "editorial-note",
    epistemicRole: "secondary",
    provenance: bundledDemo,
  },
  {
    id: "frag-web-john-1-1-5",
    sourceId: "src-web-john-1",
    resourceId: "res-web",
    locator: "John 1:1–5",
    passage: { bookId: "john", chapter: 1, verseStart: 1, verseEnd: 5 },
    sourceType: "primary-text",
    epistemicRole: "primary",
    provenance: bundledDemo,
  },
];
