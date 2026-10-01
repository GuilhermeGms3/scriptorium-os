# Project Memory

## Passage aggregation and editorial gate (2026-10-01)

- Workspace schema 12 keys local translations by provider model revision and expands controlled
  semantic domains for social/political history, tradition, soteriology, eschatology and religious
  currents.
- Accepted private-book passage relations now resolve to their citeable semantic unit, sibling
  accepted proposals, physical pages and optional local translation in Passage Inspector. This is
  a private overlay; curated knowledge remains read-only and separate.
- Passage Inspector exposes an honest 15-area coverage matrix. Pending links do not count as
  coverage.
- The deterministic resolver supports full pt/en references, same-chapter continuations and
  context-bound relative verses; exact per-chapter verse counts remain future work.
- Accepted English units can be translated in batch, without tokenizer truncation, and translations
  have an explicit human-review action.
- Claims and arguments can declare an interpretive perspective. Editorial staging always has
  `publicationAllowed: false` and blocks private rights, missing passage or missing evidence before
  any future curated import.

## Book Decomposition Pipeline v1 (2026-10-01)

- Workspace schema 11 adds private `document_nodes`, multi-span `semantic_units`,
  `semantic_unit_spans`, reviewable `knowledge_proposals` and versioned
  `document_knowledge_indexes`. No proposal writes to the public knowledge snapshot.
- `DocumentKnowledgeAnalyzer` is the provider boundary. The deterministic v1 implementation
  detects book/part/chapter/section/bibliography structure, joins simple cross-page continuations
  and proposes topics, passage relations, claims, arguments, quotations and controlled entities.
- Proposal IDs include a payload fingerprint. Reprocessing is idempotent and preserves accepted or
  rejected decisions, including edited claim text, when the semantic proposal remains the same.
- The private document reader now exposes Structure, Review and Aggregate views. Export is explicit,
  local-only JSON (`scriptorium-private-knowledge-export-v1`) marked as requiring rights review.
- Verification: strict typecheck passed; focused ESLint passed; 24 focused tests passed; direct Vite
  client/SSR/Nitro build passed. Direct full Vitest without `pretest` remained blocked by local
  corpus SQLite files whose checksums differ from the committed registry after a Node 24 rebuild;
  this is the previously identified cross-toolchain artifact reproducibility issue.
- Next safe actions: browser QA with a real text-layer PDF; add golden-layout fixtures for footnotes,
  bibliographies and complex tables of contents; pin the binary corpus build toolchain.

## Semantic content engine (2026-09-30)

- Workspace schema 10 adds page-offset semantic segments, controlled domain classifications,
  reviewable passage-link candidates and cached local translations. Deterministic extraction is a
  reproducible baseline; scores describe pattern matching, never theological or historical truth.
- A candidate link starts as `machine-proposed`. Only accepted links surface back in the biblical
  Passage Inspector. Protected PDF text and its derivatives remain in the browser workspace and do
  not enter distributable corpus packages.
- English primary-source units and English Greek/Hebrew lexical definitions can be translated on
  demand by the optional Python service using `Helsinki-NLP/opus-mt-tc-big-en-pt`. Original text is
  always preserved, translations are cached by checksum/model and labeled machine-generated.
- No configured “Premier 18”/18B model was found. Translation provider/model remain replaceable;
  the Python service is a separate Docker profile and does not alter the Node, Lovable or Cloudflare
  production targets.
- Repository research identified Sefaria, ETCBC/BHSA, Open Scriptures morphhb/Strong's and Concord
  as useful architectural/data references. Every future import still requires per-artifact rights
  and provenance review.
- Six commercial PDFs are currently tracked in `livros/` by user-authored commit `ffe3b8a`; do not
  derive and publish their text. Runtime analysis of user-owned copies remains local-only.

## Phase 10.2 (2026-09-25)

- The primary-source runtime now includes the Coptic SCRIPTORIUM Gospel of Thomas (CC BY 4.0) as prologue, sayings 1–114 and colophon. It is explicitly a Sahidic Coptic source text with no translation.
- The Library has a complete metadata catalog of 13 Nag Hammadi codices and 52 tractate witnesses. Repeated witnesses remain distinct; catalog presence is not presented as installed text.
- Public-domain historical English editions add Augustine's complete Confessions (13 books) and all four Project Gutenberg parts of Aquinas's Summa Theologica (2,661 addressable articles) as work-sharded SQLite/FTS packages.
- Source acquisition is pinned by URL, revision/eBook id, byte size and SHA-256 through `npm run content:fetch:theology`. A modern complete Portuguese Nag Hammadi translation is not bundled; it requires explicit redistribution permission or private OPFS import.
- Study now exposes source-backed starting paths for exegesis/reception, patristics, Trinity/Christology, ethics/soteriology, Nag Hammadi and ecclesiology/liturgy. The routes open installed primary works rather than displaying methodological prompts as content.
- Phase 10.2 verification passed 139 tests across 20 files, typecheck, focused ESLint and the full client/SSR/Nitro build. A repeated corpus build reused all ten packages; browser QA covered Thomas, Aquinas, Study and Knowledge, including Portuguese presentation labels and per-volume citations.

## Docker deployment (2026-09-28)

- Local/self-hosted packaging uses a multi-stage Node 22 image around the existing Nitro `node-server` output. Runtime is non-root, read-only and needs no server-side data volume because mutable studies, notes and private documents remain browser-owned in OPFS.
- Remote browser access must terminate HTTPS to retain the persistent OPFS path; plain HTTP outside `localhost` can force the visibly degraded in-memory workspace.

## Phase 10.1 (2026-09-16)

- Primary-source runtime now packages seven Apostolic Fathers works and five historic creeds/conciliar documents from pinned public-domain Project Gutenberg artifacts into work-sharded SQLite plus FTS5 search shards.
- Ancient reception now includes 65 navigable units from Books I-II of Origen's Commentary on John, extracted from the public-domain 1885 ANF IX Internet Archive/Cornell scan. John 1:1 links directly to Book II section 2 and the Reader history tab opens the exact primary-source unit; this is classified as reception history, not as an automatically accepted grammatical or theological conclusion.
- Phase 10.1 passage analyses were migrated from the wrong canonical-anchor JSON shape to the Knowledge `TextAnchor` shape and from nonexistent lens IDs to `philological`/`exegetical`; Genesis 1, Philippians 2, Romans 3, Mark 1, Psalm 22 and the new Origen reception entry are now queryable by the Reader. Knowledge claim labels and source-checked states render in Portuguese, and authored claim summaries were localized while original-language tokens and primary-source text remain unchanged.
- Primary-source titles have a Portuguese presentation label while preserving the canonical English source title; source text is never translated silently. The `/library` route is now a proper layout with `/library/` index and `/library/read/$workId` child, so the actual reader renders instead of the parent catalog swallowing the child route.
- WLC/OSHB morphology now has a positional decoder; TBESH contributes Hebrew identifiers, lemma, transliteration, morphology and short glosses only. Long TBESH definitions remain excluded because the source header requires separate permission.
- Corpus builds use package fingerprints and verified artifact reuse. A clean no-change corpus index completed in about 2.4 seconds and reported all five editions as reused; changing the Hebrew lexical input rebuilt only WLC.
- Study UI is organized as a three-step personal flow (question, gathered material, notes). Backup and methodological prompts use progressive disclosure, and the prompts explicitly state that they are not academic content.
- Private PDF ingestion is operational for documents with a text layer: originals stay in OPFS, page text is stored in workspace SQLite/FTS5, and results open at the physical page. EPUB/OCR remain unimplemented.
- Phase 10.1 verification snapshot before the Origen increment: 122 tests across 16 files passed; typecheck, production Node build and focused lint passed. Repository-wide lint is still blocked by pre-existing CRLF/Prettier debt. Browser QA passed desktop Study, Study detail interaction, Didaquê reader routing/localization and 390x844 mobile Study with no console warnings/errors.

## Phase 9.5 (2026-09-14)

- Canonical knowledge schema is version 9; knowledge, theology, perspectives and arguments share `public/knowledge/knowledge.sqlite3`.
- Corpus schema is version 11; global FTS uses compact contentless search shards and indexed address joins, while Reader opens only the selected work shard.
- Phase 10 imports WLC/OSHB v2.2 from pinned commit `6a5db284c715c18b239422e57bb89684e6a19f00`: 39 books, 929 chapters, 23,213 verses and 305,507 tokens. WLC text remains Public Domain and OSHB annotations CC BY 4.0.
- TBESG is now an operational SQLite lexical package with 11,035 source records, normalized lexical references and lazy Word Inspector lookup; it is no longer merely a downloaded source artifact.
- `content/packs/phase10-content-v0.2.json` adds source-backed John 1:1–18 observations, draft machine-assisted analyses, Apostolic Fathers metadata and council identities. Draft analyses are not human-reviewed.
- Production fixture fallbacks for knowledge sources, `LibraryResource`, demo lexicon definitions and demo occurrences were removed from Reader/Search paths.
- `Scriptorium Content Seed v0.1` lives in `content/scriptorium-content-seed-v0.1.json`; editorial taxonomy is explicitly separate from source-derived claims.
- Workspace schema is version 9 and backup schema is v2. Migration 9 adds private documents, page-preserving text and a dedicated FTS5 index. Backups cover library/research metadata but intentionally exclude private PDF bytes and extracted protected text; those documents require reimport after restore.
- TBESG acquisition is pinned in `content/source-lock.json`; run `npm run content:fetch:lexicon` to fetch and verify it.

## Project identity

- Purpose: Open, local-first Biblical Knowledge OS for reading, research, library, study and evidence-aware knowledge connections.
- Repository root: `F:\DSF\scriptorium-os`
- Main stack: TypeScript 5.8, React 19, TanStack Start/Router, Vite 8, Tailwind CSS 4, Radix primitives.

## Canonical sources

- Architecture and requirements: `README.md`
- Repository constraints: `AGENTS.md`
- Route conventions: `src/routes/README.md`
- Domain/contracts: `src/lib/domain/**`
- Demo data: `src/lib/fixtures/**`
- Tests/build: `package.json`

## Architecture map

- Modules: file routes; feature components; domain types; SQLite-backed corpus, knowledge and personal workspace repositories; workbench context.
- Dependency direction: passage routes/components -> Knowledge Engine -> repositories -> domain/corpora; general catalog views may use their own repositories.
- Important flows: route -> PassageRef -> PassageKnowledgeBundle -> reader/inspectors; selected token -> WordKnowledgeBundle -> TAGNT lexeme/concordance; user notes remain in workbench/local storage.
- Persistence: corpus packages are immutable work-sharded SQLite; curated knowledge is a separate read-only SQLite DB; sources and user research use a mutable Worker-owned SQLite database persisted through OPFS. Theme, reading preferences and package enablement remain localStorage preferences.
- Auth/security boundaries: no authentication or remote backend in phase 1.

## Non-negotiable constraints

- Source-first, tradition-aware, local-first and usable without an account.
- Never present DEMO/SEED material as sourced scholarship.
- No unauthorized copyrighted corpus, fake AI/RAG/interlinear engine or silent methodology mixing.
- Preserve the dense academic workstation identity.

## Active scope

- Requested outcome: Phase 10 content expansion over the Phase 9/9.5 runtime.
- In scope: Greek lexicon, full Hebrew/WLC linguistic layer, John 1:1–18 pilot, patristic and historical-document catalogs, real Synoptic Problem content and focused Reader integration.
- Out of scope after Phase 10.2: LXX, apparatus, the remaining Nag Hammadi source texts/translations, remote backend, IA/RAG, EPUB/OCR, automatic bibliographic merge and complete scholarly encyclopedic coverage.

## Decisions

- 2026-08-25 — model interpretive approaches as distinct study lenses with evidence kinds and source requirements — user request and source-first principle.
- 2026-08-25 — show honest empty/awaiting-source states instead of generated academic conclusions — README requirements.
- 2026-08-26 — separate token occurrences from lemmas and identify occurrences by edition, text unit, passage and position — Knowledge Core requirements.
- 2026-08-26 — model `TextAnchor` as a discriminated union and keep Study Lens separate from Perspective — prevents string identity and methodology/tradition conflation.
- 2026-08-26 — separate bibliographic `SourceReference`, concrete `SourceFragment` and cataloged `LibraryResource` — copyright and provenance requirements.
- 2026-08-26 — use semantic support/review states for claims and relations; numeric confidence remains deprecated compatibility only — avoids false precision.
- 2026-08-26 — keep `ScriptureKnowledgeEngine` as repository orchestration in `src/lib/knowledge-engine/` — no UI, persistence or AI responsibilities.
- 2026-08-26 — primary product locale is `pt-BR`; internal technical/domain language remains English; corpus and document language remain independent from UI locale — localization phase requirements.
- 2026-08-26 — use a local typed semantic-key catalog in `src/lib/i18n/` with presentation helpers instead of translating domain values, canonical IDs, URLs or saved records — preserves architecture and legacy data.
- 2026-08-26 — represent edition direction independently (`ltr`/`rtl`) and infer controlled fallback from document language — enables Greek, Hebrew and Aramaic without coupling bidi behavior to UI locale.
- 2026-08-26 — make `CorpusPackageManifest` the machine-readable source of truth for corpus identity, edition, artifacts, rights, provenance, capabilities, integrity and versification; Library rows may reference it through `corpusPackageId` — avoids parallel license/corpus architectures.
- 2026-08-26 — require SHA-256, byte size and retrieval metadata for every concrete `SourceArtifact`; candidate packages have no placeholder artifact and remain `not-verified` until a file is actually received — preserves honest chain of custody.
- 2026-08-26 — preserve immutable source artifacts separately from normalized derivatives, transformations and internal dataset/record receipts — makes future ingestion reproducible without overwriting originals.
- 2026-08-26 — `CorpusRightsGate` permits bundling only for `verified` rights with redistribution explicitly `yes` and structured attribution when required; all other statuses block — safety policy, not legal advice.
- 2026-08-26 — split WLC text from the OSHB lemma/morphology layer; keep STEPBible at per-subdataset review and Bíblia Livre at `conflicting-metadata` until a concrete edition/artifact is selected — official notices and candidate requirements.
- 2026-08-27 — pin SBLGNT 1.2 to upstream commit `736fdc76158950c3d04b949b7e013ca14305145a`; preserve all 28 source XML artifacts as original bytes and calculate the package digest with code-point-sorted source paths — reproducible acquisition independent of locale.
- 2026-08-27 — keep acquisition, verification, import and build as distinct commands behind a generic `CorpusAdapter`; the SBL adapter rejects DTD/entity declarations and maps one book at a time into chapter shards — bounded memory and fail-closed XML handling.
- 2026-08-27 — serialize loaded chapter data through the TanStack route loader and prime the repository cache before client render — SSR and client now share identical corpus/provenance state without hydration mismatch.
- 2026-08-27 — pin TAGNT/TEGMC to `efe428a0047bf7b9c3ce2624f60c252c6e435945`; keep textual tokens immutable and linguistic annotations in a separate dataset — source separation and reproducibility. Canonical details: `docs/corpora/stepbible-tagnt.md` and `linguistic-alignment.md`.
- 2026-08-27 — accept unique edition-aware sequence links; keep ambiguous/unmatched targets without analysis and audit both target and unused source records — coverage is measured, not inferred.
- 2026-08-27 — compact SBL chapter storage v2 by removing whitespace and four inherited fields only; reconstruct prior domain exactly; lazy linguistic chapters and 256 lexical buckets — preserve identity without loading the entire NT for concordance.
- 2026-08-27 — TAGNT headers include CC BY 4.0/software permission and a redistribution-centralization request; retain both notices and document the operational interpretation. Exclude translations/glosses from runtime; raw source publication still needs review — no blanket STEPBible rights grant.
- 2026-08-27 — generated TAGNT publication uses exclusive writer lock, identical-tree no-op, backup and rollback after a Windows/Vite rename failure — preserve the previous derived snapshot on failure.
- 2026-09-06 — pin official Bíblia Livre N4 to `a315a15e9f4d01883b62206fe441d57762f126b3` and ingest 66 F4 files plus README/license directly — avoid eBible metadata mixing and opaque conversion.
- 2026-09-06 — retain the generic conflicting-metadata candidate while bundling a distinct source-specific CC BY 3.0 BR package — rights evidence is package-scoped and historical evidence remains intact.
- 2026-09-06 — use canonical PassageRefs to combine BLIVRE N4 and SBLGNT while keeping `PassageKnowledgeBundle.texts[]`, originals and TAGNT provenance independent — passage alignment is not word alignment.
- 2026-09-06 — recognize F4 notes/titles/additions; exclude notes/titles from visible verse text, preserve added text, and never invent absent paragraph markers — source-faithful transformation.
- 2026-09-08 — make `PassageKnowledgeBundle` the official composition unit for passage UI and add `WordKnowledgeBundle` for occurrence-level inspection — components no longer orchestrate textual and linguistic repositories.
- 2026-09-08 — resolve corpus sources and fragments from package/artifact provenance in the engine; retain demo knowledge as `demo` and real TAGNT ambiguity as `ambiguous` — prevents empty/demo/real states from collapsing into one meaning.
- 2026-09-10 — make stable `TextUnit.id` the textual identity and keep human addresses scheme-dependent; direct overlap requires the same versification and cross-scheme comparison requires an explicit N:M crosswalk — verse numbering is not universal identity.
- 2026-09-10 — use per-edition SQLite/FTS5 packages behind `CorpusStorage`, with SHA-256 verification, schema migrations and lazy opening through SQLite WASM — large corpora no longer govern the Vite module graph.
- 2026-09-10 — import TAGNT alignments, lemmata, morphology and provenance into the SBLGNT SQLite package; concordance queries use an indexed lexeme identity instead of generated JSON buckets — one effective corpus runtime.
- 2026-09-10 — distinguish Topic, Doctrine, Tradition, School, Method, EpistemicStance, InterpretiveFramework, Position and Theory; compose them through multidimensional perspective profiles — avoids categorical conflation.
- 2026-09-10 — retain claims as propositions and model premises, evidence, objections, responses and competing theories as a typed argument graph — no automated theological winner or truth score.
- 2026-09-13 — shard corpus delivery by work; use a dedicated compact cross-work linguistic index for concordance while retaining the complete SQLite index only for global text search. Cache API installation and SHA-256 verification stay behind `CorpusPackageRegistry` — bounds Reader and lexical transfer without requiring a range server.
- 2026-09-13 — persist user-owned sources, citations and research in a dedicated Worker-owned SQLite database using the OPFS SAH-pool VFS, with an honest in-memory degraded state — separates mutable private data from reproducible corpora and curated knowledge.
- 2026-09-13 — model Author, Work, Edition and Source independently and store citations as structured locator/content/relation records — enables traceability without turning source presence into truth.
- 2026-09-13 — import CSL-JSON, BibTeX and RIS through preview, normalization, validation, duplicate detection and report; conflicting duplicates are skipped rather than merged destructively.
- 2026-09-22 — quarantine the Wikisource Tradução Brasileira from distributable runtime packages because US hosting does not establish Brazilian public-domain status; preserve the artifact only for rights review.
- 2026-09-22 — pin the official eBible porbrbsl USFM ZIP (SHA-256 52eae6cc562494ac9d68e618e271ff764628dec34017cc2a4f37fd446f3e66bd) as the public-domain Portuguese expansion; label it as a draft in active revision and preserve all 81 works without treating its collection as a universal canon.
- 2026-09-25 — ingest user-owned PDFs only into private browser storage: keep original bytes in OPFS, index page text in workspace SQLite/FTS5, derive stable IDs from SHA-256, make checksum reimports idempotent and never add protected files/text to Git or public corpus packages.

## Current state

- Completed: phases 1–8 plus the Phase 9 implementation foundation for delivery, source/citation/library and persistent research.
- Completed: Phase 9 implementation and final validation, including OPFS reload/restart persistence, workspace export/wipe/import, idempotent bibliography, mutation refresh, measured delivery, compact concordance, client-only corpus runtime during SSR and separate Node/Cloudflare builds.
- Data: 142,096 TAGNT records processed; 137,074/137,741 targets aligned (99.5158%): 82,918 exact, 53,740 normalized, 416 positional, 75 ambiguous, 592 unmatched. 5,621 lexical identities; 27 books/260 chapters. John 7:53–8:11 retains all 187 textual tokens with no accepted TAGNT link.
- Storage: SBL generated 74,746,655 → 23,829,469 bytes (-68.12%); generated TAGNT 33,726,686 bytes. Exact metrics and timing in `docs/corpora/phase5-metrics.json`.
- Bíblia Livre: 68 artifacts, 4,582,764 source bytes; 66 books, 1,189 chapters, 31,101 verses; 1,167 notes, 116 psalm titles, zero explicit paragraphs; 8,472,398 generated bytes. One explicit anomaly: Mark 5:19 omitted in N4.
- Known issues: repository-wide CRLF/Prettier debt remains. The generic Bíblia Livre candidate remains blocked, while only the official pinned package is bundled. Knowledge/interpretation/bibliographic fixtures remain DEMO. F4 notes/titles are audited but lack their own editorial UI. No Portuguese word alignment, interlinear, Hebrew or LXX. Global text FTS still opens the complete edition index; concordance now uses a 60,268,544-byte linguistic index and Reader paths use work shards. Browser workspace persistence requires OPFS support; unsupported contexts run in visibly degraded memory mode. Private PDF text-layer ingestion works; OCR, EPUB, structural section detection and automatic passage linking remain future work.
- Verification performed: Phase 9 passed 106 tests across 11 files, typecheck, focused lint, Node production build and Lovable sandbox Cloudflare build. Browser QA covered João 1, OPFS across reload/server restart, immediate source-list invalidation, duplicate import, λόγος with 328 paginated occurrences and a clean console. A byte-counting proxy observed 31,744,000 corpus bytes for João versus 358,256,640 monolithic bytes; concordance transferred only the 60,268,544-byte linguistic part. Direct SSR returned the client loading shell without SQLite/OPFS initialization. Repository-wide lint remains blocked by the pre-existing line-ending/Prettier debt snapshot.
- Phase 10.1 continuation: imported the public-domain 1885 ANF IX OCR source for Origen's Commentary on John Books I-II as 65 stable primary-source units and a 1,908,736-byte work-sharded SQLite/FTS5 package. John 1:1 now links to exact unit II.2 through a source-backed reception-history analysis. Final verification passed 126 tests across 16 files, typecheck, focused ESLint and Node production build; a no-change corpus rebuild reused all six packages. Browser QA opened the exact II.2 unit, confirmed real global FTS results and a clean console. Repository-wide lint still reports 2,974 pre-existing formatting/CRLF problems.
- Phase 10.1 content continuation: imported the public-domain eBible Bíblia Portuguesa Mundial draft as 81 works, 1,402 chapters, 38,029 text units and 2,311 detected editorial notes. Added 15 Portuguese deuterocanonical/other apocryphal works to navigation and work-sharded SQLite/FTS delivery. Wikisource TBB is blocked from the public registry pending Brazilian rights review.
- Private library continuation (2026-09-25): six user-purchased Portuguese PDFs were imported locally as 4,280 physical pages, 4,261 with searchable text. Global search opens exact document pages; reload persistence and checksum-idempotent reimport were verified in the browser. The files and extracted content are not tracked by Git.

## Next safe actions

- Add editorial rendering for F4 notes/titles and investigate Mark 5:19 against source evidence without renumbering.
- If translation/original alignment is added later, use an explicit dataset and algorithm; never infer Portuguese↔Greek links by position.
- Keep the 667 TAGNT residues unchanged unless explicit editorial evidence is introduced.
- Build a compact cross-work search/lexeme index or range VFS before global operations span substantially larger corpora; preserve the `CorpusStorage` boundary.
- Add OCR, EPUB, structural section detection, private citations and human-reviewed passage links without weakening local-only privacy or provenance.
