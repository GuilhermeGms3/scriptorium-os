-- Evidence may support multiple units (a paragraph and a cross-page commentary note).
-- Preserve existing rows; uniqueness is local to a unit, not ownership of a source page.
CREATE TABLE semantic_unit_spans_v24 (
  unit_id TEXT NOT NULL REFERENCES semantic_units(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL REFERENCES private_document_pages(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL CHECK(page_index >= 0),
  start_offset INTEGER NOT NULL CHECK(start_offset >= 0),
  end_offset INTEGER NOT NULL CHECK(end_offset > start_offset),
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  PRIMARY KEY(unit_id, ordinal),
  UNIQUE(unit_id, page_id, start_offset, end_offset)
) STRICT;
INSERT INTO semantic_unit_spans_v24 SELECT * FROM semantic_unit_spans;
DROP TABLE semantic_unit_spans;
ALTER TABLE semantic_unit_spans_v24 RENAME TO semantic_unit_spans;
CREATE INDEX idx_semantic_unit_spans_page
  ON semantic_unit_spans(page_id, start_offset, end_offset);

-- Normalize only generated chapter labels from early extractor batches. Source text,
-- anchors, legacy editorial analyses and individually reviewed proposals are untouched.
UPDATE knowledge_proposals SET payload_json=json_set(payload_json,
  '$.rawReference', 'Cap. ' || json_extract(payload_json,'$.passage.chapter'),
  '$.contextualAnalysis.title', replace(json_extract(payload_json,'$.contextualAnalysis.title'),
    json_extract(payload_json,'$.rawReference'), 'Cap. ' || json_extract(payload_json,'$.passage.chapter')),
  '$.contextualAnalysis.rationale', replace(json_extract(payload_json,'$.contextualAnalysis.rationale'),
    json_extract(payload_json,'$.rawReference'), 'Cap. ' || json_extract(payload_json,'$.passage.chapter'))
)
WHERE proposal_kind='passage-relation' AND method LIKE 'deterministic-source-commentary:%'
  AND review_status='machine-proposed' AND reviewed_at IS NULL
  AND json_extract(payload_json,'$.contextualAnalysis.mode')='source-excerpt'
  AND json_extract(payload_json,'$.relationScope')='chapter'
  AND json_extract(payload_json,'$.rawReference')=json_extract(payload_json,'$.passage.chapter') || ':0';
