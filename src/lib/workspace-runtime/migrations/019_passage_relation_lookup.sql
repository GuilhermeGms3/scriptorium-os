CREATE INDEX idx_knowledge_proposals_passage_lookup
  ON knowledge_proposals(
    proposal_kind,
    review_status,
    json_extract(payload_json, '$.passage.bookId'),
    json_extract(payload_json, '$.passage.versificationSchemeId'),
    json_extract(payload_json, '$.passage.chapter'),
    json_extract(payload_json, '$.passage.verseStart'),
    json_extract(payload_json, '$.passage.verseEnd')
  );
