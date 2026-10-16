# Project Memory

## Proposta adiada — Compor leitura (2026-10-15)

- Ideia registrada em `docs/architecture/reading-composer-proposal.md`: blocos conectáveis para
  compor texto, fontes e perspectivas, com consultas determinísticas, sem inferência LLM.
- Apenas documentação autorizada. Antes de implementar, priorizar cobertura contextual do acervo
  já entregue ao longo da Bíblia e ampliação das traduções realmente legíveis. 116 notas em
  passagens selecionadas de Gn 1–12 não significam cobertura completa desses capítulos.
- King James, NAA e outras Almeida são opções desejadas, não corpora declarados instalados;
  identificar edição/idioma/direitos antes de adquirir e integrar.

## Exclusividade do acervo (2026-10-15)

- Corrigido o protocolo de `8c58d9a`: heartbeat antigo não prova morte de processo Windows/Docker;
  não há takeover automático por timeout. Locks inválidos também falham fechados.
- API verifica posse antes das operações e após leitura assíncrona de uploads/comandos; heartbeat
  usa descriptor sem recriar lock ausente e qualquer falha suspende acesso. Importador contextual
  compartilha o lock até fechar SQLite, inclusive durante backup.
- Crash exige recuperação offline com todos os escritores parados. Atualizar todos os runtimes/
  imagem Docker; scripts/editores externos que ignoram o protocolo não são protegidos.
- Fonte canônica: `docs/architecture/installation-workspace.md`. Acervo privado não usado para
  testes de concorrência; sem alteração de schema, reprocessamento ou redesign nesta correção.
- Verificação: 360 testes/45 arquivos, typecheck, lint completo, build e formatação passaram.
  Inclui importador em processo separado e perda de posse durante streaming sem apagar registro.
  SQLite privado manteve tamanho/mtime; Docker não foi reconstruído nem iniciado nesta correção.

## Acervo compartilhado da instalação (2026-10-13)

- Escopo ativo: migração integral OPFS → pasta local do projeto/Docker e biblioteca/leitor reais.
  Leitura contextual editorial retomada em 14/10: 116 notas reais (Shedd, Genebra, MacArthur),
  seleção Gn 1–12. Não é cobertura integral nem revisão humana. Consulte a seção de leitura
  contextual abaixo e `docs/content/contextual-bible-reading.md`. Esta seção substitui a
  limitação histórica OPFS-only das notas abaixo.
- `SCRIPTORIUM_WORKSPACE_DIR` habilita adapter SQLite nativo autenticado por sessão local, header e
  origem. Sem configuração, o modo navegador/Cloudflare permanece OPFS; falhas não alternam bancos.
  Compose monta `data/workspace`; loopback single-user, não pronto para LAN/internet.
- Migração real preservou 37 PDFs/671.893.492 bytes, 26.243 páginas, 49.229 unidades, 388.961 propostas,
  137.375 decisões e eventos de Rastro. Original OPFS intacto. Pasta privada ignorada por Git/Docker;
  não confundir estar na pasta do repositório com ser publicado no Git ou incluído na imagem.
- Backup SQLite consistente `data/workspace/workspace.sqlite3.before-index22` e recibo local SHA-256
  verificado. Nenhum PDF foi reprocessado, aceito ou rejeitado para fazer a migração.
- Schema 22: índice parcial de secondary targets + união materializada dos IDs evita o scan causado
  pelo OR de additionalPassages. Teste verifica índices, deduplicação e esquema. Medição Windows real:
  Gênesis 1/200 relações 124 ms cold/91 ms warm; camada completa 184 ms. Em 14/10, camada completa
  pelo adapter HTTP/Docker retornou os 200 itens em 5.440 ms; não confundir o transporte com SQL nativo.
- Estante usa primeiras páginas reais via Poppler lazy, perfis por título explicitamente sugeridos;
  leitor tem estrutura/assuntos extraídos, dicionário FTS e links página+unidade com realce. Estrutura
  detectada ainda não é sumário editorial validado. Nag Hammadi localiza ocorrências nos volumes,
  não inventa limites de tratados/códices. Contexto editorial bíblico fica recolhido.
- Tradutor Marian inglês→português funciona no companion CPU com SentencePiece/Sacremoses e cache
  /models corrigido para uid1001. Proxy same-origin, botão visível, tradução preservada separadamente.
  Teste real Didaquê foi armazenado, mas mostrou qualidade ruim/omissões em trecho longo arcaico;
  não declarar tradução acadêmica fiel. Espanhol não implementado, botão informa indisponibilidade.
- Gates finais: 344 tests/44 arquivos e 11 Python tests, typecheck, lint e formatação passaram;
  imagem Node/Docker produzida e verificada com as alterações finais; build Cloudflare também passou.
  Docker reiniciado em 14/10 confirmou 37 livros/26.243 páginas/schema22, ambos serviços healthy.
- QA IAB anterior à interrupção: estante 37 livros em localhost3000 sem reimportar, dicionários com
  ocorrências reais de aliança, Nag Hammadi/Apócrifo de João na p.229, citação Shedd p.922 com um mark,
  tradução Didaquê persistida após recriação, leitor 390px sem overflow, console Docker limpo.
  Na retomada de 14/10, abas restauradas chrome-error foram bloqueadas pela política do navegador;
  não houve tentativa de contorno nem nova validação visual dessa retomada. Abrir a URL normal
  manualmente para uma nova rodada visual. A leitura contextual editorial integral não foi feita.
- Fonte canônica: `docs/architecture/installation-workspace.md`. Reset/deleção física compartilhados
  recusados; restore JSON grande, sincronização push entre browsers, HTTP Range e catálogo público
  metadata-only permanecem dívida documentada. Nunca subir Vite/Windows + Docker/Linux sobre o mesmo DB.

## Profile reliability integration (2026-10-12)

- Integrated coworker branch `origin/melhoria/confiabilidade-perfis` into
  `melhoria/verificacao-no-versiculo` with a merge, preserving published history and seven local
  contextual-reading files in checkpoint `e45cafe`; merge commit `c305963`.
- Canonical payload keeps reference zones, profile-specific roles and optional contextual analysis.
  Contextual importer uses the shared secure-context hashing helper; trace explanations recover
  from the canonical analysis after quote-redacted structural backup restore.
- Five synthetic integration tests cover evidence offsets/errors, idempotent import and human
  rejection preservation, profile/analysis coexistence, backup restore and atomic prevalidation.
- Verification: 339 tests / 43 files, typecheck, full lint and production build passed. Browser QA
  opened the real 37-book OPFS catalog, contextual-import disclosure, Shedd's profile selector and
  Genesis 1; explanations toggled off/on and console had no warnings/errors. No private content
  was imported, reprocessed or newly committed.
- Existing-document reference-zone fixes still require explicit reprocessing. Whole-library
  contextual reading is paused, not completed by this integration.
- Structural rebuilding of a book with contextual analysis now refuses before deleting units;
  span reconciliation is still required before safely reprocessing those notes. Existing books
  without assistant contextual notes retain their normal reprocessing flow.

## Knowledge trace module (2026-10-12)

- `/trace` joins real proposals/decisions/private document spans; paginated filters and detail with
  rationale, source page, scheme, original unit and timeline. Private Reader cards link directly.
- Migration 020 captures proposal/decision changes with SQL triggers; legacy records get an honest
  baseline snapshot. Reprocessing retains history by old proposal ID; deleting a document cascades it.
- Backup v3 optional traceEvents preserves history and suppresses artificial restore events within
  the transaction. No book corpus was newly analyzed by this UI delivery.
- Canonical spec: `docs/architecture/knowledge-trace.md`. Migration 021 indexes paginated queries.
- Verification: 256 tests in 37 files, strict typecheck, full lint and production build passed.
  Browser QA recovered the persistent collection after a transient memory fallback, opened a real
  Shedd link to physical page 935, and filtered Genebra references at Genesis 1:1. No editorial
  analysis, acceptance, rejection or book reprocessing was performed during this read-only QA.
- OPFS baseline history survived closing/reopening the browser tab on the same origin. Final
  clean-tab console had no warnings/errors; mobile 390 px and desktop 1280 px had no global overflow.

## Gamified visual study tree (2026-10-11)

- Follow-up: every map node now navigates to its own `/study/guide/$topic` page; the center is
  Teologia and the former right node inspector is removed. The previous inspector behavior below
  describes the first iteration and is superseded by this navigation contract.
- Sixteen distinct guides use editorial curricula plus bounded private-page FTS and verified
  manifest resources. Search occurrences are not presented as approved semantic knowledge.
- Personal investigations resume via stable `study-guide:<id>` markers, with legacy title fallback;
  guide questions use existing ResearchQuestion persistence and workspaces link back to their guide.
- Follow-up verification: 247 tests in 36 files; strict typecheck, full lint and Node production
  build passed. Browser QA verified real PDF pages, duplicate-question prevention, guide/workspace
  navigation, clean console and 390 px layout. Guide-only router scroll reset preserves Reader.

- `/study` now opens a visual learning map inspired by a skill tree, while preserving the academic
  workstation identity. Four journeys connect eleven existing source-backed study paths.
- Node state is honest and derived from current data: an exact matching local study means started;
  a path with sources is available; a path without source resources is an explicit collection gap.
  No XP, mastery score or completion is fabricated.
- Selecting a node shows contextual description, real starting works and the next action. Starting
  creates the existing SQLite-backed `Study`; continuing opens its current workspace. Personal
  investigations and workspace backup remain available in a dedicated view.
- The Knowledge route remains the free graph mode. Study-map edges are pedagogical organization,
  not theological truth claims or ontology relations.
- Canonical graph content and derivation live in `src/lib/content/study-learning-map.ts`; rendering
  lives in `src/components/study/study-learning-map.tsx`.

## Functional front-end restructuring (2026-10-10)

- Home rotates a real daily passage across all installed chapters and persists the last chapter in
  localStorage. It never fabricates exegesis/hermeneutics for uncovered passages.
- Scripture navigation is grouped by literary/canonical blocks; additional traditions remain an
  explicit group rather than being mixed into the 66-book order.
- Study is the primary learning tree and links to Knowledge as a deeper concept map. Knowledge was
  removed from primary navigation but its route and graph remain available.
- Library catalog has focused views for private books, installed primary sources, Nag Hammadi and
  bibliographic records. PDF import/OCR/linking/audit moved to `/library/process`.
- Passage and word inspectors hide empty tabs. Private passage cards foreground extracted claims
  and arguments and collapse the source excerpt. English lexicon translation is now foregrounded.
- Search offers intent examples and result-group filters over the existing SQLite-backed service.

## Front-end experience foundation (2026-10-10)

- Canonical UX direction: `docs/architecture/frontend-experience.md`. Preserve the dense academic
  workstation identity, but organize the product into reading, library and investigation contexts.
- The passage/word inspector is now route-scoped to chapter reading. Library, Study, Knowledge,
  Search and other general routes no longer sacrifice space to an empty biblical inspector.
- Library pipeline controls use progressive disclosure; the catalog remains the primary surface.
- Knowledge Explorer now filters entities and omits empty relation cards, replacing an entirely
  empty graph with one honest explanatory state.
- Translation is already exposed for English primary-source units, accepted English private units
  and eligible word definitions. Private batch translation and the configured Docker model remain
  English-to-Portuguese only; Spanish-to-Portuguese is not implemented yet.
- Verification: 229 tests across 31 files, typecheck, repository lint, Node production build and
  desktop/mobile browser QA passed. Browser QA covered contextual inspector visibility, pipeline
  disclosure, Knowledge filtering, 390 px overflow and clean-console fresh-page loads.

## Contextual private knowledge engine (2026-10-02)

- Workspace schema 14 preserves reviewed proposals while adding explicit bibliographic reference,
  attribution and coreference proposal kinds. The deterministic analyzer carries bibliography,
  recent-person and recent-work context across its 50-page checkpoints.
- The optional Python service now implements the same bounded `analyzeBatch()` contract and returns
  a serializable provider checkpoint. The client accepts only loopback endpoints, validates output
  with Zod, rejects proposals for units outside the submitted batch and keeps every result
  `machine-proposed`.
- Private PDF batch import continues after per-file failures, detects Portuguese/English/Spanish and
  Greek/Hebrew script conservatively, reports partial text layers and accepts files up to 256 MiB.
  OCR remains explicit future work; protected bytes/text remain OPFS-only.
- Python development is pinned to 3.13.3 through `.python-version`; npm semantic commands prefer the
  local venv or Windows `py -3.13`, avoiding the stale `python` 3.10 PATH alias.
- Client chunking separates React runtime from the application entry. The final measured entry fell
  from 550.03 kB to 372.11 kB (React runtime 189.73 kB) without raising the warning threshold.
- Browser QA imported the 37 PDFs found in the user's private library into OPFS: 31 were indexed and
  six were rejected explicitly because they have no extractable text layer and require OCR. Protected
  bytes and extracted text remain local and are not tracked by Git. Checksum reimports corrected
  metadata without duplicating documents.
- The contextual analyzer was exercised end-to-end against the local Python service. Reprocessing a
  21-page document produced 260 reviewable proposals; a detected lowercase false attribution was
  eliminated by the deterministic guard, and the browser console remained clean.
- Fast Refresh ESLint exceptions are restricted to known stable component helpers/hooks; all eight
  previous warnings are gone while the rule remains active.

## Local pipeline implementation milestone (2026-10-04)

- Architecture: `docs/architecture/local-knowledge-pipeline.md`; local companion setup in
  `services/semantic-engine/README.md`. Extension of canonical units/proposals, not a duplicate engine.
- Workspace migration 15: jobs/configuration/checkpoints, unit receipts, publication/audit decisions,
  OCR layouts. Optional backup-v3 fields preserve compatibility with older checksums.
- Scanned originals can now be imported; Tesseract recovers only empty pages. Native PDF geometry is
  retained on new text-layer imports. Existing text/evidence is never overwritten by OCR.
- Companion: bounded loopback-only OCR/index/link endpoints; optional global multilingual CPU vector
  retrieval plus FTS and cosine rerank; candidate-constrained JSON LLM output and literal UTF-16 spans.
- Front: per-book preparation, OCR languages, model toggle, scheme confirmation, pause/resume, audit
  sampling and bulk review/revocation. Inspector distinguishes private machine links from editorial review.
- Inferential auto-publication remains blocked pending evaluation; explicit reference auto-visibility
  requires verified source numbering and corpus resolution. Author/bibliography/coreference still heuristic.
- Validation: typecheck, focused ESLint, Ruff, Python 3.13.3 syntax and production build passed;
  migrations reapplied to an in-memory SQLite database at version 15 with zero FK violations.
- Deferred at user request: automated suites, real OCR/model processing, performance and browser QA.
  No new PDFs were processed during this code-only stage. Concurrent tabs/job leases, neural structure,
  cross-encoder and calibration remain debt. Rebuilding canonical units invalidates private derived audits.

## Canonical private knowledge consolidation details (2026-10-01)

- Workspace schema 13 migrates accepted `semantic_segments` passage/domain results into canonical
  `semantic_units` and `knowledge_proposals`. Production UI and Passage Inspector no longer query
  the legacy semantic engine; its service/repository remain deprecated compatibility surfaces.
- Library now lists persisted private documents after reload. Backup schema v3 preserves private
  document identity, structure, spans, review decisions, translations and translation-job state,
  but deliberately exports empty page anchors rather than protected text. Reimport of the original
  checksum rehydrates those page IDs without deleting derived knowledge.
- Knowledge Explorer now consumes supporting/opposing arguments, evidence, objections, responses
  and multidimensional perspectives. Private passage knowledge renders arguments, premises,
  citations and entities in addition to claims/topics/translations.
- Immutable knowledge builds use the epoch migration timestamp and a byte-for-byte reproducibility
  test. Curated claims now include actual evidence and perspective links instead of schema-only
  support.
- Local English-to-Portuguese translation resolves Hugging Face aliases to a commit SHA, separates
  model-info and inference timeouts, persists batch progress and supports pause/resume through the
  checksum cache. `main` is rejected as cache identity.
- The document analyzer provider boundary remains canonical. Deterministic analyzer v2 improves
  claim-kind and qualifier classification and processes 50-page batches with a serialized
  hierarchy/ordinal checkpoint. Failed runs resume after the last committed batch with idempotent
  inserts. Full author/citation/coreference understanding remains future work; optional providers
  only gain resumability when they implement `analyzeBatch()`.

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
- 2026-10-05 — orchestrate the complete private library through the existing canonical knowledge pipeline, persisting run/document state and continuing after isolated failures; do not introduce a competing analyzer or storage path.
- 2026-10-05 — represent contextual passage reach as one primary target plus bounded additional targets, with explicit verse/range/pericope/chapter/book scope; keep source edition and versification provenance on every relation.
- 2026-10-05 — release explicit reference links under their own policy and keep inferred links withheld behind deterministic distributed batch samples; accepting a sample is an operational publication gate, not proof of theological or statistical truth.

## Current state

- Completed: phases 1–8 plus the Phase 9 implementation foundation for delivery, source/citation/library and persistent research.
- Completed: Phase 9 implementation and final validation, including OPFS reload/restart persistence, workspace export/wipe/import, idempotent bibliography, mutation refresh, measured delivery, compact concordance, client-only corpus runtime during SSR and separate Node/Cloudflare builds.
- Data: 142,096 TAGNT records processed; 137,074/137,741 targets aligned (99.5158%): 82,918 exact, 53,740 normalized, 416 positional, 75 ambiguous, 592 unmatched. 5,621 lexical identities; 27 books/260 chapters. John 7:53–8:11 retains all 187 textual tokens with no accepted TAGNT link.
- Storage: SBL generated 74,746,655 → 23,829,469 bytes (-68.12%); generated TAGNT 33,726,686 bytes. Exact metrics and timing in `docs/corpora/phase5-metrics.json`.
- Bíblia Livre: 68 artifacts, 4,582,764 source bytes; 66 books, 1,189 chapters, 31,101 verses; 1,167 notes, 116 psalm titles, zero explicit paragraphs; 8,472,398 generated bytes. One explicit anomaly: Mark 5:19 omitted in N4.
- Known issues: repository-wide CRLF/Prettier debt remains. The generic Bíblia Livre candidate remains blocked, while only the official pinned package is bundled. Knowledge/interpretation/bibliographic fixtures remain DEMO. F4 notes/titles are audited but lack their own editorial UI. No Portuguese word alignment, LXX or aparato crítico. Global text FTS still opens the complete edition index; concordance now uses a 60,268,544-byte linguistic index and Reader paths use work shards. Browser workspace persistence requires OPFS support; unsupported contexts run in visibly degraded memory mode. Private PDF ingestion, deterministic structure/linking and optional OCR exist; OCR requires Tesseract/idiomas locais e EPUB permanece futuro.
- Verification performed: Phase 9 passed 106 tests across 11 files, typecheck, focused lint, Node production build and Lovable sandbox Cloudflare build. Browser QA covered João 1, OPFS across reload/server restart, immediate source-list invalidation, duplicate import, λόγος with 328 paginated occurrences and a clean console. A byte-counting proxy observed 31,744,000 corpus bytes for João versus 358,256,640 monolithic bytes; concordance transferred only the 60,268,544-byte linguistic part. Direct SSR returned the client loading shell without SQLite/OPFS initialization. Repository-wide lint remains blocked by the pre-existing line-ending/Prettier debt snapshot.
- Phase 10.1 continuation: imported the public-domain 1885 ANF IX OCR source for Origen's Commentary on John Books I-II as 65 stable primary-source units and a 1,908,736-byte work-sharded SQLite/FTS5 package. John 1:1 now links to exact unit II.2 through a source-backed reception-history analysis. Final verification passed 126 tests across 16 files, typecheck, focused ESLint and Node production build; a no-change corpus rebuild reused all six packages. Browser QA opened the exact II.2 unit, confirmed real global FTS results and a clean console. Repository-wide lint still reports 2,974 pre-existing formatting/CRLF problems.
- Phase 10.1 content continuation: imported the public-domain eBible Bíblia Portuguesa Mundial draft as 81 works, 1,402 chapters, 38,029 text units and 2,311 detected editorial notes. Added 15 Portuguese deuterocanonical/other apocryphal works to navigation and work-sharded SQLite/FTS delivery. Wikisource TBB is blocked from the public registry pending Brazilian rights review.
- Private library continuation (2026-09-25): six user-purchased Portuguese PDFs were imported locally as 4,280 physical pages, 4,261 with searchable text. Global search opens exact document pages; reload persistence and checksum-idempotent reimport were verified in the browser. The files and extracted content are not tracked by Git.
- Private library orchestration (2026-10-09): schema 18 persists workspace identity, whole-library runs, per-document stage state, document profiles, semantic-unit roles and review batches; an indexed unit/proposal lookup keeps deterministic resumptions bounded. Coverage reports missing text/OCR/structure/linking state, profile distribution, proposal policy and target/domain gaps. Reader selection can narrow the inspector to one verse; accepted private excerpts appear below the relevant verse with page/section/author metadata and obey the explanations toggle.
- Workspace consolidation (2026-10-10): the canonical OPFS origin is `http://127.0.0.1:5173` and now contains all 37 PDFs, 26,243 pages, 49,229 semantic units and a completed deterministic run (37/37, zero operational failures). It reaches 16,701 distinct verses; 60,036 relations are machine-visible and 77,339 remain in exception/review. The former six-book OPFS workspace was archived outside the live browser profile after a verified raw backup.
- The final raw OPFS backup is `C:\Users\comical\Documents\Scriptorium Workspace Backups\2026-10-10-final-workspace-consolidation`; its 1,187,467,264-byte main database file matches the canonical source by SHA-256 (`926C73C2B41FB23EB015459121391D9C28C4B9B1627D5861C58EECC9C1015FDC`). The retired six-book store is recoverable at `2026-10-10-retired-six-book-workspace` and the earlier before/after snapshots remain available.
- Reader consolidation (2026-10-10): schema 19 adds the passage lookup index; contextual proposal resolution now uses the already-computed publication set instead of a correlated scan and fetches only required document nodes/pages. A native Gênesis 1 diagnostic fell from about 28.2 s to 0.51 s. Browser QA on the 1.1 GB OPFS workspace showed 200 published links in Gênesis 1, source/page cards, filters, inspector coverage and a working clean-reading explanations toggle. OPFS cold startup remains around 30 s and the browser/WASM reader path around 18 s for the 200-item chapter cap.

## Next safe actions

- Add editorial rendering for F4 notes/titles and investigate Mark 5:19 against source evidence without renumbering.
- If translation/original alignment is added later, use an explicit dataset and algorithm; never infer Portuguese↔Greek links by position.
- Keep the 667 TAGNT residues unchanged unless explicit editorial evidence is introduced.
- Build a compact cross-work search/lexeme index or range VFS before global operations span substantially larger corpora; preserve the `CorpusStorage` boundary.
- Audit high-density explicit references and false positives by document profile; the completed deterministic run connects the library but does not make every extracted link academically correct.
- Install Tesseract with Portuguese/English/Spanish language data only when recovering the remaining 219 image-only pages; OCR no longer blocks the 37-document collection.
- Add EPUB support and improve structural section/citation extraction without weakening local-only privacy or provenance.

# Leitura contextual privada — 2026-10-14

- Incorporadas realmente 116 notas. Primeiros lotes: Shedd p. físicas 5–6 (Gn 1–3), Genebra p. 28–36
  (seleção Gn 1–2). Lote privado `genesis-shedd-genebra-20261014-01`, JSON/plano em
  `data/workspace/`; idempotência real: 0 importadas/48 reutilizadas. Não é leitura integral.
- Segundo lote: 3 notas MacArthur p. 37–39, Gn 1:26, 3:1–24 e 12:1–3,
  `genesis-macarthur-20261014-01`; reimportado 0/3. Snapshot completo de 48 notas
  verificado por IDs + ambos os pacotes permitem recuperação; `.partial` não é backup válido.
- Terceiro lote `genesis-shedd-genebra-20261014-02`: 65 notas novas, Shedd p. 7–11
  (seleção Gn 3–12), Genebra p. 38–41 (seleção Gn 3–4). Importado 65/0 e repetido 0/65.
  Novos snapshots completos antes dessas operações preservam 51 e 116 notas. Não é cobertura integral.
- `content:import:contextual` usa serviço canônico + backup SQLite e exige runtimes parados.
  Não executar Windows e Docker escrevendo simultaneamente no bind mount.
- Reader mostra múltiplas fontes contextuais, links sublinhados para página/unidade;
  intervalos >7 versos recolhidos; consulta prioriza contexto antes do teto de 200 relações.
- A versão digital Genebra tem português e referências defeituosos no próprio PDF;
  limitação preservada nas notas. Não afirmar que a edição foi certificada.
- Continuidade: completar notas/capítulos na ordem bíblica; nunca converter citações
  cruzadas existentes em comentário direto sem leitura. Docs: `docs/content/contextual-bible-reading.md`.
- Marcadores editoriais: Shedd p. física 11, próxima nota `13.2`; Genebra p. física 41,
  após `4:01`, seguir na p. 42. Lacunas deliberadas incluem Shedd 5:24 (p. 7–8) e
  Genebra 3:2–5 (p. 37–38), 3:17 (p. 39–40): precisam recortes multi-página.
  O livro de exegese/hermenêutica ainda não recebeu um lote editorial nesta entrega.
