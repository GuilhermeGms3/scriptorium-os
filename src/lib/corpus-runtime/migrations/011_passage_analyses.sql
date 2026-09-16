CREATE TABLE passage_analyses (
  id TEXT PRIMARY KEY,
  anchor_json TEXT NOT NULL,
  lens_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  analysis_status TEXT NOT NULL CHECK(analysis_status IN ('placeholder','draft','reviewed')),
  review_status TEXT NOT NULL,
  interpretation_kind TEXT NOT NULL,
  authorship TEXT NOT NULL CHECK(authorship IN ('human-authored','machine-assisted','machine-generated','human-reviewed')),
  author_note TEXT
) STRICT;

CREATE TABLE passage_analysis_sources (
  analysis_id TEXT NOT NULL REFERENCES passage_analyses(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY (analysis_id, source_id)
) STRICT;

CREATE INDEX idx_passage_analyses_lens ON passage_analyses(lens_id, review_status);
