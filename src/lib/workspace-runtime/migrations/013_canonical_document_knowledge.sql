-- Consolidate accepted results from the phase-10 semantic segment engine into the
-- canonical document-knowledge graph. The legacy tables remain readable during
-- the compatibility window, but no UI/runtime query depends on them after this
-- migration.

INSERT OR IGNORE INTO semantic_units(
  id, document_id, document_node_id, unit_kind, ordinal, text_checksum, language, method
)
SELECT
  'unit:legacy:' || s.id,
  s.document_id,
  NULL,
  CASE s.structural_kind
    WHEN 'heading' THEN 'heading'
    WHEN 'paragraph' THEN 'paragraph'
    WHEN 'list-item' THEN 'list-item'
    WHEN 'footnote' THEN 'footnote'
    ELSE 'unknown'
  END,
  1000000000 + row_number() OVER (
    PARTITION BY s.document_id ORDER BY s.page_index, s.ordinal, s.id
  ),
  s.text_checksum,
  s.language,
  'legacy-semantic-engine-migration:1'
FROM semantic_segments s
WHERE EXISTS (
  SELECT 1 FROM semantic_passage_links l
  WHERE l.segment_id = s.id AND l.review_status = 'accepted'
) OR EXISTS (
  SELECT 1 FROM semantic_segment_domains d
  WHERE d.segment_id = s.id AND d.review_status = 'accepted'
);

INSERT OR IGNORE INTO semantic_unit_spans(
  unit_id, page_id, page_index, start_offset, end_offset, ordinal
)
SELECT
  'unit:legacy:' || s.id,
  s.page_id,
  s.page_index,
  s.start_offset,
  s.end_offset,
  0
FROM semantic_segments s
JOIN semantic_units u ON u.id = 'unit:legacy:' || s.id;

INSERT OR IGNORE INTO knowledge_proposals(
  id, document_id, semantic_unit_id, proposal_kind, payload_json, method, confidence,
  review_status, reviewed_at, review_note, created_at, updated_at
)
SELECT
  'proposal:legacy-passage:' || l.id,
  l.document_id,
  'unit:legacy:' || l.segment_id,
  'passage-relation',
  json_object(
    'kind', 'passage-relation',
    'rawReference', l.raw_reference,
    'relationType', l.relation_type,
    'passage', json_patch(
      json_object(
        'workId', l.work_id,
        'bookId', l.book_id,
        'chapter', l.chapter,
        'versificationSchemeId', l.versification_scheme_id
      ),
      CASE
        WHEN l.verse_start IS NULL THEN '{}'
        WHEN l.verse_end IS NULL THEN json_object('verseStart', l.verse_start)
        ELSE json_object('verseStart', l.verse_start, 'verseEnd', l.verse_end)
      END
    )
  ),
  'legacy-semantic-engine-migration:1',
  l.confidence,
  'accepted',
  coalesce(l.reviewed_at, '2026-10-01T00:00:00.000Z'),
  'Migrado do índice semântico legado; decisão humana preservada.',
  coalesce(l.reviewed_at, '2026-10-01T00:00:00.000Z'),
  coalesce(l.reviewed_at, '2026-10-01T00:00:00.000Z')
FROM semantic_passage_links l
JOIN semantic_units u ON u.id = 'unit:legacy:' || l.segment_id
WHERE l.review_status = 'accepted';

INSERT OR IGNORE INTO knowledge_proposals(
  id, document_id, semantic_unit_id, proposal_kind, payload_json, method, confidence,
  review_status, reviewed_at, review_note, created_at, updated_at
)
SELECT
  'proposal:legacy-topic:' || d.segment_id || ':' || d.domain,
  s.document_id,
  'unit:legacy:' || d.segment_id,
  'topic-assignment',
  json_object(
    'kind', 'topic-assignment',
    'domain', d.domain,
    'evidence', json(d.evidence_json)
  ),
  'legacy-semantic-engine-migration:1',
  d.score,
  'accepted',
  '2026-10-01T00:00:00.000Z',
  'Migrado do índice semântico legado; decisão humana preservada.',
  '2026-10-01T00:00:00.000Z',
  '2026-10-01T00:00:00.000Z'
FROM semantic_segment_domains d
JOIN semantic_segments s ON s.id = d.segment_id
JOIN semantic_units u ON u.id = 'unit:legacy:' || d.segment_id
WHERE d.review_status = 'accepted';

INSERT OR IGNORE INTO document_knowledge_indexes(
  document_id, analyzer_id, analyzer_version, source_checksum, status, stage,
  checkpoint_page, node_count, unit_count, proposal_count, progress_json, indexed_at, error
)
SELECT
  d.id,
  'legacy-semantic-engine-migration',
  '1',
  d.checksum,
  'ready',
  'complete',
  d.page_count,
  0,
  (SELECT count(*) FROM semantic_units u WHERE u.document_id = d.id),
  (SELECT count(*) FROM knowledge_proposals p WHERE p.document_id = d.id),
  json_object('migration', 'legacy-semantic-engine:1'),
  '2026-10-01T00:00:00.000Z',
  NULL
FROM private_documents d
WHERE EXISTS (
  SELECT 1 FROM semantic_units u
  WHERE u.document_id = d.id AND u.method = 'legacy-semantic-engine-migration:1'
);

UPDATE document_knowledge_indexes
SET
  unit_count = (SELECT count(*) FROM semantic_units u WHERE u.document_id = document_knowledge_indexes.document_id),
  proposal_count = (SELECT count(*) FROM knowledge_proposals p WHERE p.document_id = document_knowledge_indexes.document_id),
  progress_json = json_set(progress_json, '$.legacyMigration', 'complete')
WHERE EXISTS (
  SELECT 1 FROM semantic_units u
  WHERE u.document_id = document_knowledge_indexes.document_id
    AND u.method = 'legacy-semantic-engine-migration:1'
);

-- Translation jobs make long local batches resumable without putting document
-- content in a remote queue or in the distributable knowledge package.
CREATE TABLE IF NOT EXISTS private_translation_jobs (
  document_id TEXT PRIMARY KEY REFERENCES private_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('pending','running','paused','complete','failed')),
  completed_count INTEGER NOT NULL DEFAULT 0 CHECK(completed_count >= 0),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK(total_count >= completed_count),
  last_source_id TEXT,
  error TEXT,
  updated_at TEXT NOT NULL
) STRICT;
