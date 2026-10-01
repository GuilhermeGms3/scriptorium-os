CREATE TABLE semantic_document_indexes (
  document_id TEXT PRIMARY KEY REFERENCES private_documents(id) ON DELETE CASCADE,
  engine_version TEXT NOT NULL,
  source_checksum TEXT NOT NULL CHECK(length(source_checksum) = 64),
  status TEXT NOT NULL CHECK(status IN ('processing','ready','failed')),
  segment_count INTEGER NOT NULL DEFAULT 0 CHECK(segment_count >= 0),
  passage_link_count INTEGER NOT NULL DEFAULT 0 CHECK(passage_link_count >= 0),
  indexed_at TEXT,
  error TEXT
) STRICT;

CREATE TABLE semantic_segments (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL REFERENCES private_document_pages(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL CHECK(page_index >= 0),
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  start_offset INTEGER NOT NULL CHECK(start_offset >= 0),
  end_offset INTEGER NOT NULL CHECK(end_offset > start_offset),
  structural_kind TEXT NOT NULL CHECK(structural_kind IN ('heading','paragraph','list-item','footnote','unknown')),
  text_checksum TEXT NOT NULL CHECK(length(text_checksum) = 64),
  language TEXT NOT NULL,
  UNIQUE(document_id, page_index, ordinal),
  UNIQUE(page_id, start_offset, end_offset)
) STRICT;

CREATE TABLE semantic_segment_domains (
  segment_id TEXT NOT NULL REFERENCES semantic_segments(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK(domain IN (
    'exegesis','hermeneutics','theology','historical-context','archaeology','geography',
    'textual-criticism','linguistics','patristics','liturgy','philosophy-of-religion','science','other'
  )),
  score REAL NOT NULL CHECK(score >= 0 AND score <= 1),
  method TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  review_status TEXT NOT NULL CHECK(review_status IN ('machine-proposed','accepted','rejected')),
  PRIMARY KEY(segment_id, domain)
) STRICT;

CREATE TABLE semantic_passage_links (
  id TEXT PRIMARY KEY,
  segment_id TEXT NOT NULL REFERENCES semantic_segments(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL CHECK(page_index >= 0),
  raw_reference TEXT NOT NULL,
  work_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL CHECK(chapter > 0),
  verse_start INTEGER CHECK(verse_start > 0),
  verse_end INTEGER CHECK(verse_end >= verse_start),
  versification_scheme_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK(relation_type IN ('cites','discusses','alludes-to')),
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  method TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK(review_status IN ('machine-proposed','accepted','rejected')),
  reviewed_at TEXT,
  UNIQUE(segment_id, work_id, chapter, verse_start, verse_end, raw_reference)
) STRICT;

CREATE INDEX idx_semantic_segments_document_page
  ON semantic_segments(document_id, page_index, ordinal);
CREATE INDEX idx_semantic_links_passage
  ON semantic_passage_links(book_id, chapter, verse_start, verse_end, review_status);
CREATE INDEX idx_semantic_links_document_page
  ON semantic_passage_links(document_id, page_index, review_status);

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
  model_revision TEXT,
  review_status TEXT NOT NULL CHECK(review_status IN ('machine-generated','human-reviewed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source_kind, source_id, target_language, source_checksum, model)
) STRICT;

CREATE INDEX idx_local_translations_source
  ON local_translations(source_kind, source_id, target_language, updated_at);
