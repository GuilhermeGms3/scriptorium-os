CREATE TABLE pipeline_jobs (
  document_id TEXT PRIMARY KEY REFERENCES private_documents(id) ON DELETE CASCADE,
  configuration_key TEXT NOT NULL,
  next_ordinal INTEGER NOT NULL DEFAULT 0 CHECK(next_ordinal >= 0),
  status TEXT NOT NULL CHECK(status IN ('running','paused','complete','failed')),
  error TEXT,
  updated_at TEXT NOT NULL,
  configuration_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(configuration_json))
) STRICT;
CREATE TABLE pipeline_decisions (
  proposal_id TEXT PRIMARY KEY REFERENCES knowledge_proposals(id) ON DELETE CASCADE,
  publication TEXT NOT NULL CHECK(publication IN ('machine-visible','exception','withheld','revoked')),
  origin TEXT NOT NULL CHECK(origin IN ('explicit','inferred')),
  evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
  configuration_key TEXT NOT NULL,
  audit_status TEXT NOT NULL DEFAULT 'pending' CHECK(audit_status IN ('pending','confirmed','rejected')),
  updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX idx_pipeline_publication ON pipeline_decisions(publication,proposal_id);
CREATE TABLE pipeline_unit_receipts (
  unit_id TEXT PRIMARY KEY REFERENCES semantic_units(id) ON DELETE CASCADE,
  configuration_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('candidates','inferred','abstained','oversized')),
  receipt_json TEXT NOT NULL CHECK(json_valid(receipt_json)),
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE document_page_layouts (
  page_id TEXT PRIMARY KEY REFERENCES private_document_pages(id) ON DELETE CASCADE,
  source_checksum TEXT NOT NULL CHECK(length(source_checksum)=64),
  method TEXT NOT NULL,
  revision TEXT NOT NULL,
  layout_json TEXT NOT NULL CHECK(json_valid(layout_json)),
  updated_at TEXT NOT NULL
) STRICT;
