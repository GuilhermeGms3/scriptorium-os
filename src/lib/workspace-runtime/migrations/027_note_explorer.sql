-- Additive: original notes, study associations, sources and manual edges stay untouched.
CREATE TABLE note_folders (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  parent_id TEXT,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
  created_at TEXT NOT NULL,
  UNIQUE(id,study_id),
  FOREIGN KEY(parent_id,study_id) REFERENCES note_folders(id,study_id) ON DELETE RESTRICT,
  CHECK(parent_id IS NULL OR parent_id <> id)
) STRICT;
CREATE UNIQUE INDEX note_folder_siblings ON note_folders(study_id,coalesce(parent_id,''),name COLLATE NOCASE);
CREATE INDEX note_folder_parent ON note_folders(parent_id);
CREATE TRIGGER note_folder_cycle BEFORE UPDATE OF parent_id ON note_folders
WHEN NEW.parent_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT,'A folder cannot contain itself or an ancestor')
  WHERE NEW.parent_id IN (
    WITH RECURSIVE descendants(id) AS (
      SELECT OLD.id UNION ALL SELECT f.id FROM note_folders f JOIN descendants d ON f.parent_id=d.id
    ) SELECT id FROM descendants
  );
END;
-- A shared note can be organized independently in each of its existing study groups.
CREATE TABLE note_placements (
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  PRIMARY KEY(note_id,study_id),
  FOREIGN KEY(folder_id,study_id) REFERENCES note_folders(id,study_id) ON DELETE RESTRICT
) STRICT;
CREATE INDEX note_placement_folder ON note_placements(folder_id);
-- Directed references in the document are separate from manually drawn, undirected edges.
CREATE TABLE note_references (
  source_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  PRIMARY KEY(source_note_id,target_note_id),
  CHECK(source_note_id <> target_note_id)
) STRICT;
CREATE INDEX note_reference_target ON note_references(target_note_id);
