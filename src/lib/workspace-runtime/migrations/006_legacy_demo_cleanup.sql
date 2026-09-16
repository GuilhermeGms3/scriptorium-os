DELETE FROM workspace_fts
WHERE entity_kind='note'
  AND entity_id IN (
    SELECT n.id
    FROM notes n
    JOIN note_links l ON l.note_id=n.id
    WHERE l.target_kind='study'
      AND l.target_id='study:demo-logos'
      AND n.title='Initial lexical observation'
      AND n.content='Compare λόγος usage in John 1 with the structured citation.'
  );

DELETE FROM notes
WHERE id IN (
  SELECT n.id
  FROM notes n
  JOIN note_links l ON l.note_id=n.id
  WHERE l.target_kind='study'
    AND l.target_id='study:demo-logos'
    AND n.title='Initial lexical observation'
    AND n.content='Compare λόγος usage in John 1 with the structured citation.'
);

DELETE FROM workspace_fts
WHERE entity_id IN (
  'study:demo-logos',
  'source:demo-logos',
  'citation:demo-logos-john1',
  'rq:demo-logos',
  'note:demo-logos'
);
DELETE FROM research_question_links WHERE research_question_id='rq:demo-logos';
DELETE FROM research_questions WHERE id='rq:demo-logos';
DELETE FROM note_links WHERE note_id='note:demo-logos';
DELETE FROM notes WHERE id='note:demo-logos';
DELETE FROM studies WHERE id='study:demo-logos';
DELETE FROM citation_relations WHERE citation_id='citation:demo-logos-john1';
DELETE FROM citations WHERE id='citation:demo-logos-john1';
DELETE FROM source_authors WHERE source_id='source:demo-logos';
DELETE FROM library_collection_items WHERE source_id='source:demo-logos';
DELETE FROM bibliographic_sources WHERE id='source:demo-logos';
DELETE FROM library_collection_items WHERE collection_id='collection:demo-johannine';
DELETE FROM library_collections WHERE id='collection:demo-johannine';
DELETE FROM editions WHERE id='edition:demo-johannine-study:1';
DELETE FROM work_authors WHERE work_id='work:demo-johannine-study';
DELETE FROM works WHERE id='work:demo-johannine-study';
DELETE FROM authors WHERE id='author:demo-researcher';

UPDATE authors
SET canonical_entity_id='entity:person:michael-w-holmes'
WHERE id='author:michael-w-holmes';
