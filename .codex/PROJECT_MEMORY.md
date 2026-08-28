# Project Memory

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

- Modules: file routes; feature components; domain types; fixture-backed repositories; workbench context.
- Dependency direction: routes/components -> repositories/context -> domain/fixtures.
- Important flows: reader token -> word inspector -> knowledge -> study -> note/resource link.
- Persistence: user notes, studies, theme and reading preferences in browser localStorage.
- Auth/security boundaries: no authentication or remote backend in phase 1.

## Non-negotiable constraints

- Source-first, tradition-aware, local-first and usable without an account.
- Never present DEMO/SEED material as sourced scholarship.
- No unauthorized copyrighted corpus, fake AI/RAG/interlinear engine or silent methodology mixing.
- Preserve the dense academic workstation identity.

## Active scope

- Requested outcome: Phase 5 Greek Linguistic Layer and full TAGNT alignment against SBLGNT.
- In scope: rights-reviewed immutable TAGNT/TEGMC acquisition, separate annotations/alignment, lexical concordance, inspector provenance, exhaustive mismatch audit and lossless compact SBL storage.
- Out of scope: invented analyses, glosses/full lexicons, other corpora, Hebrew/LXX, Portuguese translation, AI/RAG, remote search and database migration.

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

## Current state

- Completed: phases 1–4 and Phase 5 TAGNT acquisition/alignment, morphology, concordance, inspector and compact storage; existing architecture, academic UI and local notes preserved.
- In progress: no active implementation item.
- Data: 142,096 TAGNT records processed; 137,074/137,741 targets aligned (99.5158%): 82,918 exact, 53,740 normalized, 416 positional, 75 ambiguous, 592 unmatched. 5,621 lexical identities; 27 books/260 chapters. John 7:53–8:11 retains all 187 textual tokens with no accepted TAGNT link.
- Storage: SBL generated 74,746,655 → 23,829,469 bytes (-68.12%); generated TAGNT 33,726,686 bytes. Exact metrics and timing in `docs/corpora/phase5-metrics.json`.
- Known issues: repository-wide CRLF/Prettier debt remains. Other STEPBible subsets and Bíblia Livre remain rights-blocked. Translation samples/knowledge/interpretation fixtures remain DEMO; no Portuguese corpus, exegesis, Hebrew or LXX was imported. Largest lazy lexical bucket is 396,300 bytes; pagination is local within a loaded bucket. A crashed importer can leave a lock that requires inspection before removal.
- Verification performed: two acquire/verify/import cycles with identical 520-file TAGNT tree hash `08e391c09172cc79c4f9d06b209cea0205af3acac700ba84a5f93d63ab03fbff`; 56 tests across 5 files; typecheck; focused ESLint; client/SSR/Nitro build; diff check. Browser QA on 2026-08-28: logos lemma/provenance, concordance pagination and passage navigation, unmatched passage, 390x844 mobile drawer, no captured warnings/errors. No physical-device/load testing, commit, push or deployment.

## Next safe actions

- Add the next corpus only through a new adapter and rights-reviewed package manifest; keep the generic pipeline unchanged unless the source format proves a missing abstraction.
- Curate the 667 unresolved targets with explicit editorial evidence; do not silently borrow analyses from another edition or force coverage to 100%.
- Review source-distribution policy before publishing raw artifacts; preserve separate provenance for future comparison datasets.
