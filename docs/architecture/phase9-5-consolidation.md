# Phase 9.5 — consolidation and Content Seed v0.1

`public/knowledge/knowledge.sqlite3` is the sole curated knowledge runtime. Reader, Knowledge Explorer and global search reach it through `KnowledgeRepository`; the old fixture repositories are test-only compatibility adapters. Generic entities, ontology, claims, relations, arguments, evidence and lexical identities are built from `content/scriptorium-content-seed-v0.1.json` by a deterministic, FK-checked build.

The workspace database remains separate because it contains user-owned mutable data. Workspace schema 6 removes the bundled demo chain, including the known localStorage-imported fixture from already-upgraded OPFS databases; schema 5 adds `authors.canonical_entity_id` and seeds bibliographic metadata and reference-only citations. An author can point at a canonical person entity, while organizations, collectives, anonymous works and traditional attributions remain valid without a person identity.

Workspace backup v2 exports library metadata, identifiers, citations, relations, collections, tags, local-asset metadata, studies, notes, questions, annotations, highlights and bookmarks. Binary assets are not embedded. Restore validates the document and checksum, writes in one transaction, rebuilds FTS and checks foreign keys. Schema-v1 research backups remain importable.

The seed separates project-editorial taxonomy from source-derived observations. John 1 claims are direct observations anchored to SBLGNT/TAGNT, not theological verdicts. Historical creeds and early-Christian works are metadata-only until a concrete digital edition and translation pass a rights review. Synoptic records carry real bibliography but omit unverified page locators and quotations.

The committed lexical seed contains identity only. `npm run content:fetch:lexicon` obtains pinned TBESG bytes, verifies length and SHA-256, and preserves STEP Bible attribution. A later importer can normalize definitions without changing this custody boundary.

`src/lib/fixtures/*` remains for isolated tests. `DEMO_LEXICON`, `DEMO_OCCURRENCES`, `SourceRepository`, `LibraryResource` and Phase 8 knowledge arrays do not govern Reader, Library, Knowledge or Search.

Corpus schema 9 adds a stable `search_documents` row mapping and an indexed text-unit/address join. Delivery search shards use contentless FTS5 plus the minimum text/address projection required to render a result; they do not carry tokens, crosswalks, or duplicated provenance. Opening a chapter still uses its work shard, and global concordance uses the dedicated linguistic shard.
