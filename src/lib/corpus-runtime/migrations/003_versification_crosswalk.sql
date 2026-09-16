CREATE TABLE crosswalks (
  id TEXT PRIMARY KEY,
  source_scheme_id TEXT NOT NULL REFERENCES versification_schemes(id),
  target_scheme_id TEXT NOT NULL REFERENCES versification_schemes(id),
  relation_type TEXT NOT NULL CHECK(relation_type IN ('equivalent','partial','contains','contained-by','split','merged','reordered','approximate','no-equivalent')),
  confidence REAL CHECK(confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  source_id TEXT REFERENCES sources(id),
  notes TEXT,
  CHECK(source_scheme_id <> target_scheme_id)
) STRICT;

CREATE TABLE crosswalk_members (
  crosswalk_id TEXT NOT NULL REFERENCES crosswalks(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK(side IN ('source','target')),
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  text_unit_id TEXT REFERENCES text_units(id),
  anchor_json TEXT NOT NULL,
  PRIMARY KEY(crosswalk_id, side, ordinal)
) STRICT;

CREATE INDEX idx_crosswalk_schemes ON crosswalks(source_scheme_id, target_scheme_id);

CREATE VIRTUAL TABLE text_units_fts USING fts5(
  text_unit_id UNINDEXED,
  edition_id UNINDEXED,
  work_id UNINDEXED,
  language UNINDEXED,
  title,
  surface_text,
  normalized_search_text,
  lemma_text,
  morphology_text,
  tokenize='unicode61 remove_diacritics 0'
);
