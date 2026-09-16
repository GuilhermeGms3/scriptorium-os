# ADR 0011 — One knowledge runtime and one source runtime

## Decision

Curated knowledge is built into one read-only SQLite package. Mutable bibliographic and research data lives in one OPFS workspace database. Production services join identities at the application boundary and never fall back silently to fixture repositories.

## Consequences

- passage claims resolve source metadata from the knowledge database;
- citations and user library records resolve from the workspace database;
- cross-database links are validated by application services because SQLite cannot enforce an FK across files;
- optional `Author.canonical_entity_id` avoids duplicate person identities without pretending every author is a person.
