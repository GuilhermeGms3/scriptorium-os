CREATE TABLE document_knowledge_indexes (
  document_id TEXT PRIMARY KEY REFERENCES private_documents(id) ON DELETE CASCADE,
  analyzer_id TEXT NOT NULL,
  analyzer_version TEXT NOT NULL,
  source_checksum TEXT NOT NULL CHECK(length(source_checksum) = 64),
  status TEXT NOT NULL CHECK(status IN ('processing','ready','failed')),
  stage TEXT NOT NULL CHECK(stage IN ('structure','proposals','aggregation','complete')),
  checkpoint_page INTEGER NOT NULL DEFAULT 0 CHECK(checkpoint_page >= 0),
  node_count INTEGER NOT NULL DEFAULT 0 CHECK(node_count >= 0),
  unit_count INTEGER NOT NULL DEFAULT 0 CHECK(unit_count >= 0),
  proposal_count INTEGER NOT NULL DEFAULT 0 CHECK(proposal_count >= 0),
  progress_json TEXT NOT NULL DEFAULT '{}',
  indexed_at TEXT,
  error TEXT
) STRICT;

CREATE TABLE document_nodes (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES document_nodes(id) ON DELETE CASCADE,
  node_kind TEXT NOT NULL CHECK(node_kind IN (
    'book','front-matter','part','chapter','section','subsection','back-matter','bibliography'
  )),
  title TEXT,
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  page_start INTEGER NOT NULL CHECK(page_start >= 0),
  page_end INTEGER NOT NULL CHECK(page_end >= page_start),
  method TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  review_status TEXT NOT NULL CHECK(review_status IN ('machine-proposed','accepted','rejected')),
  UNIQUE(document_id, ordinal)
) STRICT;

CREATE INDEX idx_document_nodes_tree
  ON document_nodes(document_id, parent_id, ordinal);

CREATE TABLE semantic_units (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  document_node_id TEXT REFERENCES document_nodes(id) ON DELETE SET NULL,
  unit_kind TEXT NOT NULL CHECK(unit_kind IN (
    'heading','paragraph','quotation','footnote','list-item','bibliography-entry','unknown'
  )),
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  text_checksum TEXT NOT NULL CHECK(length(text_checksum) = 64),
  language TEXT NOT NULL,
  method TEXT NOT NULL,
  UNIQUE(document_id, ordinal)
) STRICT;

CREATE INDEX idx_semantic_units_node
  ON semantic_units(document_id, document_node_id, ordinal);

CREATE TABLE semantic_unit_spans (
  unit_id TEXT NOT NULL REFERENCES semantic_units(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL REFERENCES private_document_pages(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL CHECK(page_index >= 0),
  start_offset INTEGER NOT NULL CHECK(start_offset >= 0),
  end_offset INTEGER NOT NULL CHECK(end_offset > start_offset),
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  PRIMARY KEY(unit_id, ordinal),
  UNIQUE(page_id, start_offset, end_offset)
) STRICT;

CREATE INDEX idx_semantic_unit_spans_page
  ON semantic_unit_spans(page_id, start_offset, end_offset);

CREATE TABLE knowledge_proposals (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  semantic_unit_id TEXT NOT NULL REFERENCES semantic_units(id) ON DELETE CASCADE,
  proposal_kind TEXT NOT NULL CHECK(proposal_kind IN (
    'claim','argument','citation','entity','passage-relation','topic-assignment'
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

CREATE INDEX idx_knowledge_proposals_review
  ON knowledge_proposals(document_id, review_status, proposal_kind, updated_at);

