-- Expand the private, reviewable proposal vocabulary without changing already
-- reviewed payloads. SQLite cannot alter a CHECK constraint in place, so the
-- table is rebuilt inside the migration transaction.

ALTER TABLE knowledge_proposals RENAME TO knowledge_proposals_v13;

CREATE TABLE knowledge_proposals (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  semantic_unit_id TEXT NOT NULL REFERENCES semantic_units(id) ON DELETE CASCADE,
  proposal_kind TEXT NOT NULL CHECK(proposal_kind IN (
    'claim','argument','citation','entity','passage-relation','topic-assignment',
    'bibliographic-reference','attribution','coreference'
  )),
  payload_json TEXT NOT NULL,
  method TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  review_status TEXT NOT NULL CHECK(review_status IN ('machine-proposed','accepted','rejected')),
  reviewed_at TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(document_id, semantic_unit_id, proposal_kind, method, payload_json)
) STRICT;

INSERT INTO knowledge_proposals(
  id,document_id,semantic_unit_id,proposal_kind,payload_json,method,confidence,
  review_status,reviewed_at,review_note,created_at,updated_at
)
SELECT
  id,document_id,semantic_unit_id,proposal_kind,payload_json,method,confidence,
  review_status,reviewed_at,review_note,created_at,updated_at
FROM knowledge_proposals_v13;

DROP TABLE knowledge_proposals_v13;

CREATE INDEX idx_knowledge_proposals_review
  ON knowledge_proposals(document_id, review_status, proposal_kind, updated_at);
