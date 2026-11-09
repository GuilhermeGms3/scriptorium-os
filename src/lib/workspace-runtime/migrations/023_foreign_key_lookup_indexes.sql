-- Foreign keys whose child column had no index of its own: every delete or cascade on the parent
-- scanned the child table once per row. Reprocessing a book (units → proposals → decisions → batch
-- members), deleting its structure (nodes → child nodes and units) and the audit snapshot all
-- paid for it; with real libraries that meant seconds or minutes instead of milliseconds.
CREATE INDEX IF NOT EXISTS idx_pipeline_review_batch_members_proposal
  ON pipeline_review_batch_members(proposal_id);
CREATE INDEX IF NOT EXISTS idx_semantic_units_document_node
  ON semantic_units(document_node_id);
CREATE INDEX IF NOT EXISTS idx_document_nodes_parent
  ON document_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_research_question_links_question
  ON research_question_links(research_question_id);
CREATE INDEX IF NOT EXISTS idx_citation_relations_citation
  ON citation_relations(citation_id);
CREATE INDEX IF NOT EXISTS idx_highlights_note
  ON highlights(note_id);
