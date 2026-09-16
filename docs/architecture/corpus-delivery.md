# Corpus delivery

Corpus databases are immutable, read-only packages. The registry reads a signed-by-checksum manifest, resolves a work shard, verifies SHA-256, and only then opens SQLite WASM. A passage request such as John resolves `work:john`. Global concordance resolves a dedicated `linguistic` part containing only addressable text-unit shells and lemmatized tokens; it does not load the complete textual/apparatus database. Global FTS still uses the complete index and remains explicit technical debt.

The delivery path is `registry -> manifest -> Cache API or bundled asset -> checksum -> SQLite WASM -> CorpusStorage`. Installed packages are cached persistently; enabled state is a user preference. States are `available`, `installing`, `installed`, `enabled`, `disabled`, `loading`, `ready`, `update-available`, `corrupted`, and `unavailable`. Recovery removes the cached copy and installs it again.

Work sharding was selected over an HTTP-range VFS because the current TanStack/browser deployment must also work from ordinary static hosting. It bounds the hot path without adding a server requirement. The compact concordance index bounds cross-work lexical queries; the complete indexes remain a known cost only for global text search. A desktop adapter may later use native SQLite, and a future HTTP deployment may add a range VFS behind the unchanged `CorpusStorage` boundary.

For João, the SBLGNT shard is 28,549,120 bytes and the Bíblia Livre shard is 3,194,880 bytes: 31,744,000 bytes combined versus 358,256,640 bytes for both complete databases. SQLite WASM still receives one shard as a byte buffer, so peak memory is bounded by that shard rather than by every corpus.

Package rights and provenance remain independent of the application license. Generated `.sqlite3` files are reproducible build artifacts; manifests retain package and source checksums.

See [phase9-validation.md](phase9-validation.md) for the measured browser transfer and runtime verification snapshot.
