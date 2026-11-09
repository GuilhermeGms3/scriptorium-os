-- Additive and independent of existing notes, books, links and processing history.
CREATE TABLE study_course_progress (
  course_id TEXT NOT NULL CHECK(length(course_id) BETWEEN 1 AND 150),
  course_revision INTEGER NOT NULL CHECK(course_revision > 0),
  module_id TEXT NOT NULL CHECK(length(module_id) BETWEEN 1 AND 150),
  work_json TEXT NOT NULL CHECK(json_valid(work_json) AND length(work_json) <= 100000),
  completed_at TEXT,
  version INTEGER NOT NULL CHECK(version > 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(course_id,course_revision,module_id)
) STRICT;
