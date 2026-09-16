CREATE TABLE citations (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES bibliographic_sources(id) ON DELETE RESTRICT,
  content_kind TEXT NOT NULL CHECK(content_kind IN ('exact-quote','paraphrase','summary','reference-only')),
  locator_json TEXT,
  original_text TEXT,
  original_language TEXT,
  translated_text TEXT,
  translator TEXT,
  note TEXT,
  provenance_json TEXT NOT NULL,
  review_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(content_kind <> 'exact-quote' OR original_text IS NOT NULL)
) STRICT;
CREATE TABLE citation_relations (
  id TEXT PRIMARY KEY,
  citation_id TEXT NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK(relation_type IN ('supports','challenges','qualifies','evidence-for','contextualizes')),
  target_kind TEXT NOT NULL CHECK(target_kind IN ('claim','argument','theory','passage')),
  target_id TEXT,
  target_anchor_json TEXT,
  CHECK(target_id IS NOT NULL OR target_anchor_json IS NOT NULL)
) STRICT;
CREATE INDEX idx_citations_source ON citations(source_id);
CREATE INDEX idx_citation_relations_target ON citation_relations(target_kind, target_id);

