CREATE TABLE studies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  research_questions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE study_links (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL,
  target_id TEXT,
  target_json TEXT,
  label TEXT NOT NULL,
  added_at TEXT NOT NULL,
  CHECK(target_id IS NOT NULL OR target_json IS NOT NULL)
) STRICT;

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('plain','markdown')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE note_links (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL,
  target_id TEXT,
  target_json TEXT,
  CHECK(target_id IS NOT NULL OR target_json IS NOT NULL)
) STRICT;

CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id TEXT,
  target_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(target_id IS NOT NULL OR target_json IS NOT NULL)
) STRICT;
CREATE TABLE highlights (
  id TEXT PRIMARY KEY,
  target_kind TEXT NOT NULL,
  target_id TEXT,
  target_json TEXT,
  style_token TEXT NOT NULL,
  note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  CHECK(target_id IS NOT NULL OR target_json IS NOT NULL)
) STRICT;
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  target_kind TEXT NOT NULL,
  target_id TEXT,
  target_json TEXT,
  label TEXT,
  created_at TEXT NOT NULL,
  CHECK(target_id IS NOT NULL OR target_json IS NOT NULL)
) STRICT;

CREATE TABLE research_questions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open','investigating','provisional','answered','archived')),
  description TEXT,
  study_id TEXT REFERENCES studies(id) ON DELETE SET NULL,
  provisional_conclusion TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE research_question_links (
  id TEXT PRIMARY KEY,
  research_question_id TEXT NOT NULL REFERENCES research_questions(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL,
  target_id TEXT,
  target_json TEXT,
  CHECK(target_id IS NOT NULL OR target_json IS NOT NULL)
) STRICT;

CREATE VIRTUAL TABLE workspace_fts USING fts5(
  entity_kind UNINDEXED,
  entity_id UNINDEXED,
  title,
  body,
  tokenize='unicode61 remove_diacritics 2'
);
CREATE INDEX idx_study_links_study ON study_links(study_id);
CREATE INDEX idx_note_links_note ON note_links(note_id);
CREATE INDEX idx_questions_study ON research_questions(study_id);

