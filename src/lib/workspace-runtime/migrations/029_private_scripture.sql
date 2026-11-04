-- Private PDF-derived editions stay in the user's workspace, never public corpus packages.
CREATE TABLE private_scripture_editions (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 abbreviation TEXT NOT NULL,
 language TEXT NOT NULL,
 editorial_position TEXT NOT NULL,
 imported_at TEXT NOT NULL
) STRICT;
CREATE TABLE private_scripture_units (
 id TEXT PRIMARY KEY,
 edition_id TEXT NOT NULL REFERENCES private_scripture_editions(id) ON DELETE RESTRICT,
 document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE RESTRICT,
 sequence INTEGER NOT NULL CHECK(sequence>=0),
 book_id TEXT NOT NULL,
 chapter INTEGER NOT NULL CHECK(chapter>0),
 verse INTEGER NOT NULL CHECK(verse>0),
 source_scheme TEXT NOT NULL,
 mapping_json TEXT NOT NULL CHECK(json_valid(mapping_json)),
 text TEXT NOT NULL CHECK(length(text)>0),
 text_checksum TEXT NOT NULL CHECK(length(text_checksum)=64),
 fragments_json TEXT NOT NULL CHECK(json_valid(fragments_json)),
 UNIQUE(edition_id,book_id,chapter,verse)
) STRICT;
CREATE INDEX private_scripture_chapter ON private_scripture_units(book_id,chapter,edition_id,verse);
CREATE INDEX private_scripture_document ON private_scripture_units(document_id);
CREATE VIRTUAL TABLE private_scripture_fts USING fts5(text,content='private_scripture_units',content_rowid='rowid',tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER private_scripture_ai AFTER INSERT ON private_scripture_units BEGIN
 INSERT INTO private_scripture_fts(rowid,text) VALUES(new.rowid,new.text);
END;
CREATE TRIGGER private_scripture_ad AFTER DELETE ON private_scripture_units BEGIN
 INSERT INTO private_scripture_fts(private_scripture_fts,rowid,text) VALUES('delete',old.rowid,old.text);
END;
CREATE TRIGGER private_scripture_au AFTER UPDATE ON private_scripture_units BEGIN
 INSERT INTO private_scripture_fts(private_scripture_fts,rowid,text) VALUES('delete',old.rowid,old.text);
 INSERT INTO private_scripture_fts(rowid,text) VALUES(new.rowid,new.text);
END;
