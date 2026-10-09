# Universal Corpus Ingestion Pipeline

The local Node/TypeScript pipeline separates acquisition, integrity verification and import:

```bash
npm run corpus:acquire -- sblgnt
npm run corpus:verify -- sblgnt
npm run corpus:import -- sblgnt
npm run corpus:build -- sblgnt
```

Every command resolves the registered package and adapter. Mutable revisions such as `HEAD`,
`master` and `latest` are forbidden. The rights gate runs before acquisition, verification and
import, including development runs.

## Execution guarantees

- **Atomic installation.** `acquire` clones into `corpora/.staging/<corpus>-XXXX/checkout`, copies
  the discovered artifacts to `snapshot/`, writes `artifact-manifest.json` and verifies the staged
  snapshot. Only then is it moved to `corpora/source/<corpus>/<commit>`. An installed snapshot that
  verifies is reused without cloning. One that does not verify is never replaced silently: the
  command fails with `integrity`. `acquire --force` re-acquires and swaps the directories; if the
  swap fails, the previous snapshot is restored.
- **Lock per corpus.** `acquire`, `import` and `build` hold `corpora/.staging/<corpus>.lock`, created
  with `open(path, "wx")` and holding the pid and start time. A lock whose process is alive and that
  is younger than 6 hours makes the run fail with `locked`. A lock whose process is gone, or that is
  older than 6 hours, is recovered and reported. The lock is reentrant within one process, because
  `build` runs `acquire` and then `import`.
- **Complete verification.** `verify` collects every problem before failing: missing file, size,
  SHA-256, package digest, identity mismatch, and a discovered artifact that is not registered (or a
  registered one that is no longer discovered). All of them are reported together as `integrity`.
- **Incremental import.** `import` reuses the dataset when `importer.adapter`, `importer.version`
  and `sourcePackageDigest` match and every `chapterFiles` entry exists. `--force` regenerates it.
  **Bump the adapter's `importerVersion` whenever an adapter changes its output**; otherwise an
  existing dataset still looks up to date and is reused.
- **Atomic import.** Shards are generated in `generated/corpora/<corpus>/.staging/import-XXXX`. The
  previous version is moved to `.staging/previous-*` and deleted only after the new one is in place;
  if the swap fails, it is restored.
- **Aggregated validation.** Parse and validation errors of every book, plus expected books that are
  missing and books that are not expected, are reported together as `validation`, each as
  `<source path> › <problem>`. The previous dataset stays untouched.

The committed SBLGNT and WLC datasets were produced by earlier adapter revisions and already differ
from what the current adapters emit. Their `importerVersion` still matches, so a plain `import`
reuses them; `import --force` would rewrite them. Do that only together with an `importerVersion`
bump and a review of the resulting diff.

```bash
npm run corpus:list
npm run corpus:status -- biblia-livre
npm run corpus:import -- biblia-livre --force
npm run corpus:verify -- --all --json
```

| Command   | Effect                                                             |
| --------- | ------------------------------------------------------------------ |
| `list`    | Registered corpora, package, adapter and rights decision.          |
| `status`  | `registered`, rights, `acquisition` and `dataset` state, with why. |
| `acquire` | Pinned clone, verified in staging, installed atomically.           |
| `verify`  | Full integrity report of the installed snapshot.                   |
| `import`  | Incremental, atomic chapter-shard generation.                      |
| `build`   | `acquire` + `import` under one lock.                               |

Flags: `--all` (every registered corpus, including `stepbible-tagnt`), `--force` (`acquire`,
`import`, `build`), `--json` (machine-readable stdout) and `--help`. Progress events go to stderr.
`stepbible-tagnt` still runs through `tagnt-acquisition.ts` and `tagnt-import.ts`.

Exit codes: `0` success, `1` pipeline failure (stderr shows `[code] message` and every detail),
`2` usage error. Failure codes (`CorpusPipelineError.code`): `not-registered`, `rights-denied`,
`mutable-revision`, `locked`, `integrity`, `validation`, `incomplete` (snapshot not acquired, or a
directory without `artifact-manifest.json`) and `git`.

`createCorpusPipeline({ projectRoot, registry, adapters, git, now, onEvent })` builds an isolated
pipeline; the exported `acquireCorpus`, `verifyCorpus`, `importCorpus` and `buildCorpus` use the
default instance.

## Boundaries

- `scripts/corpus/pipeline.ts`: generic orchestration, Git acquisition, byte-level SHA-256,
  package digest, transactional output and statistics.
- `scripts/corpus/adapter.ts`: small reusable adapter contract.
- `scripts/corpus/adapters/sblgnt-xml-adapter.ts`: SBLGNT discovery, secure XML parsing,
  normalization and validation.
- `corpora/source/<corpus>/<commit>/`: immutable original artifacts and custody manifest.
- `generated/corpora/<corpus>/<version>/`: deterministic dataset manifest and chapter shards.

The XML adapter disables entity processing, rejects DOCTYPE/ENTITY declarations, enforces a file
size and nesting limit, validates XML before parsing and never uses regex as an XML parser.

## Reproducibility

Individual SHA-256 values cover the original bytes. The package digest is SHA-256 over every
sorted `sourcePath + NUL + artifact SHA-256 + LF` record. Generated IDs depend on corpus version,
canonical location and source word position; timestamps and random values are excluded.

Source `<w>`, `<prefix>`, `<suffix>` and `<p>` structure is preserved. The adapter does not invent
lemmas, morphology, glosses or Strong numbers. Output uses one JSON shard per chapter, never one
file per verse.

## Phase 5: linguistic packages

`npm run corpus:<acquire|verify|import|build> -- stepbible-tagnt` dispatches to
`tagnt-acquisition.ts` and `tagnt-import.ts`. A linguistic source is not forced through the
text-only `NormalizedCorpusBook` contract. `adapters/tagnt-adapter.ts` owns TSV parsing,
TEGMC definitions and edition-aware alignment. Both paths retain the existing rights/artifact
contracts. Acquisition uses an explicit fixed-commit HTTPS file allowlist with size/time limits.

SBLGNT shards now use storage schema 2; `compact-corpus.ts` restores the existing schema-1
domain contract, including every original ID, prefix, suffix and paragraph field. Only four
inherited token fields and JSON whitespace are omitted. No textual source bytes were changed.

Stop the dev server before regenerating datasets on Windows. TAGNT publication is a no-op
when the generated tree is identical; changed trees retain the old snapshot until replacement
succeeds. On failed rollback, the error gives the preserved recovery path. No concurrent
import writers are allowed: an exclusive `.import.lock` fails closed. After a killed process,
verify no importer is running before manually removing its stale lock.
See [alignment](./linguistic-alignment.md) for data formats.

## Phase 6: Bíblia Livre F4

`biblia-livre-f4` é o segundo adapter textual do mesmo pipeline. Ele descobre automaticamente os 66 arquivos oficiais `textos/f4/n4/*.txt` no commit fixado, reconhece marcadores F4 e produz shards por capítulo. O pacote inclui README/licença na custódia, mas esses artifacts não viram livros. O parser não usa o conversor upstream, não inventa parágrafos e não tokeniza o português.

O candidato genérico de direitos permanece bloqueado; apenas o pacote oficial específico passa no RightsGate. A auditoria de versificação fica no manifest gerado. O Reader carrega a tradução e o SBLGNT como edições independentes e jamais transforma passage alignment em word alignment.
