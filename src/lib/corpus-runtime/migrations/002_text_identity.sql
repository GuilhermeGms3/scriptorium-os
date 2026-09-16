CREATE TABLE versification_schemes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT,
  description TEXT,
  tradition TEXT,
  source_id TEXT REFERENCES sources(id),
  version TEXT
) STRICT;

CREATE TABLE text_units (
  id TEXT PRIMARY KEY,
  corpus_id TEXT NOT NULL REFERENCES corpora(id),
  edition_id TEXT NOT NULL REFERENCES corpus_editions(id),
  work_id TEXT NOT NULL REFERENCES works(id),
  versification_scheme_id TEXT REFERENCES versification_schemes(id),
  sequence INTEGER NOT NULL,
  unit_type TEXT NOT NULL CHECK(unit_type IN ('verse','verse-part','paragraph','superscription','title','fragment','line','sentence','section')),
  surface_text TEXT NOT NULL,
  normalized_search_text TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  UNIQUE(edition_id, work_id, sequence)
) STRICT;

CREATE TABLE text_addresses (
  id INTEGER PRIMARY KEY,
  text_unit_id TEXT NOT NULL REFERENCES text_units(id) ON DELETE CASCADE,
  versification_scheme_id TEXT NOT NULL REFERENCES versification_schemes(id),
  book_id TEXT,
  chapter INTEGER,
  verse_start INTEGER,
  verse_end INTEGER,
  subverse_start TEXT,
  subverse_end TEXT,
  section_label TEXT,
  paragraph_label TEXT,
  saying_label TEXT,
  fragment_label TEXT,
  page_label TEXT,
  column_label TEXT,
  line_start INTEGER,
  line_end INTEGER,
  display_address TEXT NOT NULL,
  CHECK(verse_end IS NULL OR (verse_start IS NOT NULL AND verse_end >= verse_start)),
  CHECK(line_end IS NULL OR (line_start IS NOT NULL AND line_end >= line_start))
) STRICT;

CREATE INDEX idx_text_units_work_sequence ON text_units(edition_id, work_id, sequence);
CREATE INDEX idx_text_addresses_bcv ON text_addresses(versification_scheme_id, book_id, chapter, verse_start, verse_end);

CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  text_unit_id TEXT NOT NULL REFERENCES text_units(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK(position > 0),
  surface_form TEXT NOT NULL,
  normalized_form TEXT NOT NULL,
  consonantal_form TEXT,
  lemma_id TEXT,
  morphology TEXT,
  strongs TEXT,
  language TEXT NOT NULL,
  transliteration TEXT,
  prefix_text TEXT,
  suffix_text TEXT,
  paragraph_id TEXT,
  starts_paragraph INTEGER CHECK(starts_paragraph IS NULL OR starts_paragraph IN (0,1)),
  start_offset INTEGER,
  end_offset INTEGER,
  source_id TEXT REFERENCES sources(id),
  provenance_json TEXT NOT NULL,
  UNIQUE(text_unit_id, position)
) STRICT;

CREATE TABLE token_annotations (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  annotation_type TEXT NOT NULL,
  value TEXT NOT NULL,
  source_id TEXT REFERENCES sources(id),
  provenance_json TEXT NOT NULL
) STRICT;
