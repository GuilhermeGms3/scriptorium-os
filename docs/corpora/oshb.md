# Open Scriptures Hebrew Bible / WLC

Phase 10 imports the complete tagged `v.2.2` release at immutable commit
`6a5db284c715c18b239422e57bb89684e6a19f00`.

## Identity and custody

- Corpus: `wlc`; edition: `wlc-oshb-2.2`; package: `pkg-wlc-oshb-2.2`.
- Source: `https://github.com/openscriptures/morphhb`.
- Source inventory: 39 OSIS book files under `wlc/`, with per-file SHA-256 and a deterministic
  package digest in the acquired artifact manifest.
- Generated content: 39 books, 929 chapters, 23,213 verses and 305,507 word records.
- Runtime: SQLite work shards, a full-text search shard and a compact linguistic/concordance
  shard. Hebrew is loaded only for Old Testament works opened by the Reader.

## Rights

The official project license declares the WLC text public domain and the lemma/morphology data
CC BY 4.0. The package therefore retains the two grants separately in its attribution:

> Open Scriptures Hebrew Bible Project; WLC text is Public Domain and OSHB lemma/morphology data
> are CC BY 4.0.

This is a package-specific record, not a general grant for unrelated Hebrew datasets.

## Transformation rules

- OSIS `<w>` boundaries remain source token boundaries.
- Surface Hebrew, niqqud, cantillation and slash-delimited source segmentation are preserved
  verbatim. Unicode normalization is search-only.
- `lemma` and `morph` attributes remain available in raw form. Decoded morphology fields are
  additive and never replace the source code.
- Lemma IDs are deterministic internal identities; Strong-compatible numbers are references, not
  primary keys.
- No Portuguese-to-Hebrew word alignment is inferred.

The current `oshb-wlc-2.2` navigation mapping is explicit and edition-scoped. It must not be
silently treated as an LXX, Vulgate or universal versification.
