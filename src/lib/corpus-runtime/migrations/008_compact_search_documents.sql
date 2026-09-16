CREATE TABLE search_documents (
  rowid INTEGER PRIMARY KEY,
  text_unit_id TEXT NOT NULL UNIQUE REFERENCES text_units(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX idx_search_documents_text_unit ON search_documents(text_unit_id);
