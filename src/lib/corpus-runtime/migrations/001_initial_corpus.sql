PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE corpora (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  rights_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL
) STRICT;

CREATE TABLE corpus_editions (
  id TEXT PRIMARY KEY,
  corpus_id TEXT NOT NULL REFERENCES corpora(id),
  title TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  language TEXT NOT NULL,
  script TEXT,
  direction TEXT CHECK(direction IN ('ltr','rtl')),
  edition_kind TEXT NOT NULL,
  version TEXT,
  package_id TEXT NOT NULL UNIQUE,
  package_checksum TEXT NOT NULL
) STRICT;

CREATE TABLE works (
  id TEXT PRIMARY KEY,
  corpus_id TEXT NOT NULL REFERENCES corpora(id),
  title TEXT NOT NULL,
  work_kind TEXT NOT NULL DEFAULT 'book',
  sequence INTEGER NOT NULL,
  UNIQUE(corpus_id, sequence)
) STRICT;

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  locator TEXT,
  checksum TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE TABLE corpus_sources (
  corpus_id TEXT NOT NULL REFERENCES corpora(id),
  source_id TEXT NOT NULL REFERENCES sources(id),
  role TEXT NOT NULL,
  PRIMARY KEY(corpus_id, source_id, role)
) STRICT;
