CREATE TABLE knowledge_entity_sources (
  entity_id TEXT NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(entity_id, source_id)
) STRICT;

CREATE TABLE knowledge_relations (
  id TEXT PRIMARY KEY,
  from_anchor_json TEXT NOT NULL,
  to_anchor_json TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  description TEXT,
  review_status TEXT NOT NULL,
  provenance_json TEXT NOT NULL
) STRICT;

CREATE TABLE knowledge_relation_sources (
  relation_id TEXT NOT NULL REFERENCES knowledge_relations(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(relation_id, source_id)
) STRICT;

CREATE TABLE lexemes (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  lemma TEXT NOT NULL,
  transliteration TEXT,
  strongs TEXT,
  source_id TEXT NOT NULL REFERENCES sources(id),
  review_status TEXT NOT NULL,
  provenance_json TEXT NOT NULL
) STRICT;

CREATE TABLE lexical_senses (
  id TEXT PRIMARY KEY,
  lexeme_id TEXT NOT NULL REFERENCES lexemes(id) ON DELETE CASCADE,
  gloss TEXT NOT NULL,
  definition TEXT,
  source_id TEXT NOT NULL REFERENCES sources(id),
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0)
) STRICT;

CREATE VIRTUAL TABLE knowledge_fts USING fts5(
  record_kind UNINDEXED,
  record_id UNINDEXED,
  title,
  body,
  aliases,
  tokenize='unicode61 remove_diacritics 2'
);

CREATE INDEX idx_knowledge_entities_type_name ON knowledge_entities(entity_type, canonical_name);
CREATE INDEX idx_knowledge_relations_type ON knowledge_relations(relation_type);
CREATE INDEX idx_claim_sources_source ON claim_sources(source_id, claim_id);
CREATE INDEX idx_lexemes_lemma ON lexemes(language, lemma);
