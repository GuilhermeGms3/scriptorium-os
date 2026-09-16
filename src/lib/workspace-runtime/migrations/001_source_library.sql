PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspace_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
) STRICT;

CREATE TABLE authors (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK(author_type IN ('person','organization','collective','anonymous','traditional-attribution')),
  birth_json TEXT,
  death_json TEXT,
  tradition_ids_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE author_aliases (
  author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY(author_id, language, value)
) STRICT;
CREATE TABLE author_identifiers (
  author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  scheme TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY(author_id, scheme),
  UNIQUE(scheme, value)
) STRICT;

CREATE TABLE works (
  id TEXT PRIMARY KEY,
  canonical_title TEXT NOT NULL,
  alternative_titles_json TEXT NOT NULL DEFAULT '[]',
  language_original TEXT,
  work_type TEXT NOT NULL,
  composition_date_json TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE work_authors (
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
  attribution_kind TEXT NOT NULL DEFAULT 'attributed',
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(work_id, author_id, attribution_kind)
) STRICT;

CREATE TABLE editions (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  publisher TEXT,
  publication_date_json TEXT,
  edition_statement TEXT,
  url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE edition_contributors (
  edition_id TEXT NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK(role IN ('editor','translator')),
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(edition_id, author_id, role)
) STRICT;
CREATE TABLE edition_identifiers (
  edition_id TEXT NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  scheme TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY(edition_id, scheme),
  UNIQUE(scheme, value)
) STRICT;

CREATE TABLE bibliographic_sources (
  id TEXT PRIMARY KEY,
  work_id TEXT REFERENCES works(id) ON DELETE RESTRICT,
  edition_id TEXT REFERENCES editions(id) ON DELETE RESTRICT,
  parent_source_id TEXT REFERENCES bibliographic_sources(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  language TEXT,
  publication_year INTEGER,
  publisher TEXT,
  abstract TEXT,
  rights_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE source_authors (
  source_id TEXT NOT NULL REFERENCES bibliographic_sources(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(source_id, author_id)
) STRICT;
CREATE TABLE source_identifiers (
  source_id TEXT NOT NULL REFERENCES bibliographic_sources(id) ON DELETE CASCADE,
  scheme TEXT NOT NULL,
  value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  PRIMARY KEY(source_id, scheme),
  UNIQUE(scheme, normalized_value)
) STRICT;
CREATE TABLE source_relations (
  id TEXT PRIMARY KEY,
  from_source_id TEXT NOT NULL REFERENCES bibliographic_sources(id) ON DELETE CASCADE,
  to_source_id TEXT NOT NULL REFERENCES bibliographic_sources(id) ON DELETE RESTRICT,
  relation_type TEXT NOT NULL,
  notes TEXT
) STRICT;
CREATE TABLE source_assets (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES bibliographic_sources(id) ON DELETE RESTRICT,
  storage_reference TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
  checksum TEXT NOT NULL,
  original_name TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  UNIQUE(source_id, checksum)
) STRICT;

CREATE TABLE library_collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE library_collection_items (
  collection_id TEXT NOT NULL REFERENCES library_collections(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES bibliographic_sources(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  PRIMARY KEY(collection_id, source_id)
) STRICT;
CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE) STRICT;
CREATE TABLE tag_links (
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('source','note','study','research-question')),
  target_id TEXT NOT NULL,
  PRIMARY KEY(tag_id, target_kind, target_id)
) STRICT;

CREATE INDEX idx_sources_title ON bibliographic_sources(normalized_title);
CREATE INDEX idx_sources_type_year ON bibliographic_sources(source_type, publication_year);
CREATE INDEX idx_source_authors_author ON source_authors(author_id, source_id);

