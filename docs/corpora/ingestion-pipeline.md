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
