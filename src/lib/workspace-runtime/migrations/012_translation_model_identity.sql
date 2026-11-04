ALTER TABLE local_translations RENAME TO local_translations_v10;

CREATE TABLE local_translations (
  id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('primary-text-unit','private-segment','lexical-entry')),
  source_id TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  source_checksum TEXT NOT NULL CHECK(length(source_checksum) = 64),
  translated_text TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  model_revision TEXT NOT NULL DEFAULT 'main',
  review_status TEXT NOT NULL CHECK(review_status IN ('machine-generated','human-reviewed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source_kind, source_id, target_language, source_checksum, model, model_revision)
) STRICT;

INSERT INTO local_translations(
  id,source_kind,source_id,source_language,target_language,source_checksum,translated_text,
  provider,model,model_revision,review_status,created_at,updated_at
)
SELECT id,source_kind,source_id,source_language,target_language,source_checksum,translated_text,
       provider,model,coalesce(model_revision,'main'),review_status,created_at,updated_at
FROM local_translations_v10;

DROP TABLE local_translations_v10;

CREATE INDEX idx_local_translations_source
  ON local_translations(source_kind, source_id, target_language, updated_at);

ALTER TABLE semantic_segment_domains RENAME TO semantic_segment_domains_v10;

CREATE TABLE semantic_segment_domains (
  segment_id TEXT NOT NULL REFERENCES semantic_segments(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK(domain IN (
    'exegesis','hermeneutics','theology','historical-context','social-history','political-history',
    'archaeology','geography','textual-criticism','linguistics','patristics','liturgy','tradition',
    'soteriology','eschatology','religious-currents','philosophy-of-religion','science','other'
  )),
  score REAL NOT NULL CHECK(score >= 0 AND score <= 1),
  method TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  review_status TEXT NOT NULL CHECK(review_status IN ('machine-proposed','accepted','rejected')),
  PRIMARY KEY(segment_id, domain)
) STRICT;

INSERT INTO semantic_segment_domains
SELECT * FROM semantic_segment_domains_v10;

DROP TABLE semantic_segment_domains_v10;
