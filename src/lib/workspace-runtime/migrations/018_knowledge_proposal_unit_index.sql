CREATE INDEX idx_knowledge_proposals_unit_kind_method
  ON knowledge_proposals(semantic_unit_id, proposal_kind, method);
