-- Additive: existing notes, studies and book associations remain untouched.
ALTER TABLE studies ADD COLUMN color TEXT
  CHECK(color IS NULL OR (length(color)=7 AND substr(color,1,1)='#' AND substr(color,2) NOT GLOB '*[^0-9a-fA-F]*'));
ALTER TABLE notes ADD COLUMN color TEXT
  CHECK(color IS NULL OR (length(color)=7 AND substr(color,1,1)='#' AND substr(color,2) NOT GLOB '*[^0-9a-fA-F]*'));
ALTER TABLE notes ADD COLUMN source_json TEXT CHECK(source_json IS NULL OR json_valid(source_json));
CREATE TABLE note_connections (
  source_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(source_note_id,target_note_id),
  CHECK(source_note_id < target_note_id)
) STRICT;
CREATE INDEX note_connections_target ON note_connections(target_note_id);
