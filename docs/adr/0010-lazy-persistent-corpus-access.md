# ADR 0010 — Corpus delivery uses lazy persistent access

Status: accepted.

The browser opens only the requested work shard and can persist installed shards in Cache API. SHA-256 is checked before SQLite opens. Work sharding provides bounded transfer on static/local deployments without an HTTP-range server. Full indexes remain available for explicitly global operations behind `CorpusStorage`.
