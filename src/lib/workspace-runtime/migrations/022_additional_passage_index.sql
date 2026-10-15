-- Only actual secondary targets enter this index. Empty/missing arrays must not
-- turn a chapter lookup into a JSON scan of every relation in the library.
CREATE INDEX idx_knowledge_proposals_additional_passages
  ON knowledge_proposals(proposal_kind, review_status)
  WHERE proposal_kind='passage-relation'
    AND json_array_length(payload_json, '$.additionalPassages') > 0;
