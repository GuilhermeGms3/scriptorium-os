CREATE TABLE library_pipeline_runs (
  id TEXT PRIMARY KEY,
  configuration_key TEXT NOT NULL,
  configuration_json TEXT NOT NULL CHECK(json_valid(configuration_json)),
  status TEXT NOT NULL CHECK(status IN ('running','paused','complete','partial','failed')),
  total_documents INTEGER NOT NULL DEFAULT 0 CHECK(total_documents >= 0),
  completed_documents INTEGER NOT NULL DEFAULT 0 CHECK(completed_documents >= 0),
  failed_documents INTEGER NOT NULL DEFAULT 0 CHECK(failed_documents >= 0),
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  error TEXT
) STRICT;

CREATE TABLE library_pipeline_documents (
  run_id TEXT NOT NULL REFERENCES library_pipeline_runs(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  stage TEXT NOT NULL CHECK(stage IN ('queued','ocr','structure','linking','complete','failed')),
  status TEXT NOT NULL CHECK(status IN ('pending','running','complete','failed')),
  source_checksum TEXT NOT NULL CHECK(length(source_checksum) = 64),
  result_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(result_json)),
  error TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(run_id, document_id),
  UNIQUE(run_id, ordinal)
) STRICT;

CREATE INDEX idx_library_pipeline_document_status
  ON library_pipeline_documents(run_id, status, ordinal);

CREATE TABLE pipeline_review_batches (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  configuration_key TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  member_count INTEGER NOT NULL CHECK(member_count > 0),
  sample_count INTEGER NOT NULL CHECK(sample_count > 0 AND sample_count <= member_count),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','released','rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(document_id, configuration_key, ordinal)
) STRICT;

CREATE TABLE pipeline_review_batch_members (
  batch_id TEXT NOT NULL REFERENCES pipeline_review_batches(id) ON DELETE CASCADE,
  proposal_id TEXT NOT NULL REFERENCES pipeline_decisions(proposal_id) ON DELETE CASCADE,
  is_sample INTEGER NOT NULL CHECK(is_sample IN (0,1)),
  PRIMARY KEY(batch_id, proposal_id)
) STRICT;

CREATE INDEX idx_pipeline_review_sample
  ON pipeline_review_batch_members(batch_id, is_sample, proposal_id);
