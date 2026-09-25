CREATE TABLE private_documents (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL UNIQUE REFERENCES bibliographic_sources(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL UNIQUE REFERENCES source_assets(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  language TEXT,
  page_count INTEGER NOT NULL CHECK(page_count > 0),
  text_page_count INTEGER NOT NULL CHECK(text_page_count >= 0 AND text_page_count <= page_count),
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
  checksum TEXT NOT NULL UNIQUE CHECK(length(checksum) = 64),
  extraction_method TEXT NOT NULL CHECK(extraction_method IN ('pdf-text-layer','ocr','mixed')),
  imported_at TEXT NOT NULL
) STRICT;

CREATE TABLE private_document_pages (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL CHECK(page_index >= 0),
  page_label TEXT NOT NULL,
  text TEXT NOT NULL,
  character_count INTEGER NOT NULL CHECK(character_count >= 0),
  extraction_method TEXT NOT NULL CHECK(extraction_method IN ('pdf-text-layer','ocr','empty')),
  quality_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE(document_id, page_index)
) STRICT;

CREATE INDEX idx_private_document_pages_document
  ON private_document_pages(document_id, page_index);

CREATE VIRTUAL TABLE private_document_pages_fts USING fts5(
  text,
  content='private_document_pages',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER private_document_pages_ai AFTER INSERT ON private_document_pages BEGIN
  INSERT INTO private_document_pages_fts(rowid, text) VALUES (new.rowid, new.text);
END;
CREATE TRIGGER private_document_pages_ad AFTER DELETE ON private_document_pages BEGIN
  INSERT INTO private_document_pages_fts(private_document_pages_fts, rowid, text)
  VALUES ('delete', old.rowid, old.text);
END;
CREATE TRIGGER private_document_pages_au AFTER UPDATE ON private_document_pages BEGIN
  INSERT INTO private_document_pages_fts(private_document_pages_fts, rowid, text)
  VALUES ('delete', old.rowid, old.text);
  INSERT INTO private_document_pages_fts(rowid, text) VALUES (new.rowid, new.text);
END;
