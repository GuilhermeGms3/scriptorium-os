/**
 * ============================================================================
 * DEMO / SEED DATA — Library fixtures
 * ============================================================================
 * A small set of resources to demonstrate the Library UI. Entries marked
 * isDemo are fictional stand-ins; real public-domain works keep accurate
 * attribution. Nothing here is a full importable text.
 * ============================================================================
 */

import type { LibraryCollection, LibraryResource } from "../domain/library";

export const DEMO_RESOURCES: LibraryResource[] = [
  {
    id: "res-web",
    title: "World English Bible",
    author: "Michael Paul Johnson (ed.)",
    type: "bible",
    language: "en",
    year: 2020,
    license: {
      name: "Public Domain",
      redistributionAllowed: true,
      commercialUseAllowed: true,
      attributionRequired: false,
      sourceUrl: "https://worldenglish.bible",
    },
    tags: ["english", "translation"],
    description: "Public domain English translation. Bundled excerpt: John 1, Genesis 1, Psalm 23, Romans 5 (DEMO).",
    availability: "local",
    indexingStatus: "indexed",
  },
  {
    id: "res-wh",
    title: "The New Testament in the Original Greek",
    author: "Westcott & Hort",
    type: "bible",
    language: "grc",
    year: 1881,
    publisher: "Macmillan",
    license: {
      name: "Public Domain",
      redistributionAllowed: true,
      commercialUseAllowed: true,
      attributionRequired: false,
    },
    tags: ["greek", "critical-edition", "original-language"],
    description: "1881 critical Greek text, public domain. Bundled excerpt: John 1:1–2 tokens (DEMO).",
    availability: "local",
    indexingStatus: "indexed",
  },
  {
    id: "res-sblgnt",
    title: "SBL Greek New Testament",
    author: "Michael W. Holmes (ed.)",
    type: "bible",
    language: "grc",
    year: 2010,
    publisher: "Society of Biblical Literature",
    license: {
      name: "SBLGNT License",
      copyrightHolder: "Society of Biblical Literature",
      redistributionAllowed: true,
      commercialUseAllowed: false,
      attributionRequired: true,
      attributionText: "Scripture quotations marked SBLGNT are from the SBL Greek New Testament.",
      sourceUrl: "https://sblgnt.com",
    },
    tags: ["greek", "critical-edition", "original-language"],
    description: "Modern critical Greek NT. Not bundled — requires user download under its own license.",
    availability: "not-downloaded",
    indexingStatus: "not-indexed",
  },
  {
    id: "res-lexicon-demo",
    title: "Greek–English Lexicon (DEMO excerpt)",
    author: "Scriptorium demo data",
    type: "lexicon",
    language: "grc",
    year: 2026,
    license: {
      name: "Demo fixture — no real lexicon content",
      redistributionAllowed: false,
    },
    tags: ["greek", "lexicon", "demo"],
    description: "Placeholder lexicon with 4 demo lemmas (λόγος, ἀρχή, θεός, רֵאשִׁית). Replace with a licensed lexicon.",
    availability: "local",
    indexingStatus: "indexed",
    isDemo: true,
  },
  {
    id: "res-church-history",
    title: "A History of the Early Church (DEMO record)",
    author: "Scriptorium demo data",
    type: "history",
    language: "en",
    year: 2026,
    license: { name: "Demo fixture", redistributionAllowed: false },
    tags: ["history", "patristics", "demo"],
    description: "Demo catalog record demonstrating metadata: author, type, year, tags, license, indexing status.",
    availability: "not-downloaded",
    indexingStatus: "not-indexed",
    isDemo: true,
  },
  {
    id: "res-personal-pdf",
    title: "Seminar notes — Gospel of John.pdf",
    author: "You",
    type: "personal-document",
    language: "pt",
    year: 2026,
    license: { name: "Personal document", redistributionAllowed: false },
    tags: ["personal", "john"],
    description: "DEMO record for a user-imported PDF. Import pipeline (parse → index) is future work.",
    availability: "local",
    indexingStatus: "pending",
    isDemo: true,
  },
  {
    id: "res-lxx",
    title: "Septuaginta (Rahlfs) — catalog record",
    author: "Alfred Rahlfs (ed.)",
    type: "ancient-literature",
    language: "grc",
    year: 1935,
    publisher: "Deutsche Bibelgesellschaft",
    license: {
      name: "Under evaluation",
      redistributionAllowed: false,
      attributionRequired: true,
    },
    tags: ["greek", "septuagint", "ot"],
    description: "Catalog record only. Availability and redistribution depend on the specific edition's license.",
    availability: "remote",
    indexingStatus: "not-indexed",
  },
];

export const DEMO_COLLECTIONS: LibraryCollection[] = [
  { id: "all", name: "All resources", resourceIds: DEMO_RESOURCES.map((r) => r.id) },
  { id: "bibles", name: "Bibles", resourceIds: ["res-web", "res-wh", "res-sblgnt"] },
  { id: "languages", name: "Languages", resourceIds: ["res-wh", "res-sblgnt", "res-lexicon-demo"] },
  { id: "history", name: "History", resourceIds: ["res-church-history"] },
  { id: "ancient", name: "Ancient Literature", resourceIds: ["res-lxx"] },
  { id: "personal", name: "Personal Documents", resourceIds: ["res-personal-pdf"] },
];

/** DEMO discover catalog — legal external sources to be wired up later. */
export const DEMO_DISCOVER_CATEGORIES = [
  { id: "public-domain", name: "Public Domain", count: 3 },
  { id: "open-access", name: "Open Access", count: 2 },
  { id: "bibles", name: "Bibles", count: 2 },
  { id: "ancient-texts", name: "Ancient Texts", count: 1 },
  { id: "dictionaries", name: "Dictionaries", count: 1 },
  { id: "academic", name: "Academic Resources", count: 1 },
] as const;
