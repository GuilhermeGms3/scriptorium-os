CREATE TABLE workspace_manifest (
  id TEXT PRIMARY KEY CHECK(id = 'workspace'),
  workspace_uuid TEXT NOT NULL UNIQUE,
  schema_label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

INSERT INTO workspace_manifest(id, workspace_uuid, schema_label, created_at, updated_at)
VALUES(
  'workspace',
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' ||
    substr('89ab',abs(random()) % 4 + 1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
  'scriptorium-workspace-v1',
  '2026-10-09T00:00:00.000Z',
  '2026-10-09T00:00:00.000Z'
);

CREATE TABLE private_document_profiles (
  document_id TEXT PRIMARY KEY REFERENCES private_documents(id) ON DELETE CASCADE,
  profile TEXT NOT NULL CHECK(profile IN (
    'study-bible','commentary','lexicon','dictionary','encyclopedia','confession','catechism',
    'systematic-theology','biblical-theology','academic-monograph','exegesis-method',
    'patristic-work','ancient-primary-source','nag-hammadi-anthology','interlinear',
    'archaeology','church-history','unknown'
  )),
  method TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  review_status TEXT NOT NULL CHECK(review_status IN ('machine-proposed','accepted','rejected')),
  signals_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(signals_json)),
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_private_document_profiles_profile
  ON private_document_profiles(profile, review_status, document_id);

CREATE TABLE document_processing_steps (
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK(step IN (
    'extraction','ocr','classification','structure','analysis','linking','publication'
  )),
  status TEXT NOT NULL CHECK(status IN (
    'pending','running','partial','complete','failed','skipped'
  )),
  completed_units INTEGER NOT NULL DEFAULT 0 CHECK(completed_units >= 0),
  total_units INTEGER NOT NULL DEFAULT 0 CHECK(total_units >= 0),
  checkpoint_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(checkpoint_json)),
  last_error TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(document_id, step)
) STRICT;

CREATE INDEX idx_document_processing_steps_status
  ON document_processing_steps(step, status, document_id);

CREATE TABLE semantic_unit_roles (
  unit_id TEXT PRIMARY KEY REFERENCES semantic_units(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN (
    'structural-heading','body','commentary','lexicon-entry','question','answer',
    'primary-source-section','method-discussion','bibliographic','navigation-noise'
  )),
  method TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_semantic_unit_roles_document
  ON semantic_unit_roles(document_id, role, unit_id);

INSERT INTO document_processing_steps(
  document_id, step, status, completed_units, total_units, checkpoint_json, updated_at
)
SELECT
  id,
  'extraction',
  CASE WHEN text_page_count = page_count THEN 'complete' ELSE 'partial' END,
  text_page_count,
  page_count,
  json_object('sourceChecksum', checksum),
  imported_at
FROM private_documents;

INSERT INTO document_processing_steps(
  document_id, step, status, completed_units, total_units, checkpoint_json, updated_at
)
SELECT
  id,
  'ocr',
  CASE WHEN text_page_count = page_count THEN 'skipped' ELSE 'pending' END,
  text_page_count,
  page_count,
  json_object('missingPages', page_count - text_page_count),
  imported_at
FROM private_documents;
