CREATE INDEX idx_knowledge_trace_active_page
  ON knowledge_proposals(updated_at DESC,id) WHERE proposal_kind='passage-relation';
CREATE INDEX idx_knowledge_trace_document_page
  ON knowledge_proposals(document_id,updated_at DESC,id) WHERE proposal_kind='passage-relation';
