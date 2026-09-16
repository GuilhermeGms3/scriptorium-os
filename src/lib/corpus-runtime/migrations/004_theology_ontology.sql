CREATE TABLE knowledge_entities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  description TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE TABLE ontology_entities (
  id TEXT PRIMARY KEY,
  ontology_kind TEXT NOT NULL CHECK(ontology_kind IN ('theological-topic','doctrine','tradition','school','method','epistemic-stance','interpretive-framework','position','theory')),
  canonical_name TEXT NOT NULL,
  description TEXT,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  localized_labels_json TEXT NOT NULL DEFAULT '{}',
  abbreviations_json TEXT NOT NULL DEFAULT '[]',
  historical_period_json TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE TABLE ontology_entity_sources (
  entity_id TEXT NOT NULL REFERENCES ontology_entities(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(entity_id, source_id)
) STRICT;

CREATE TABLE ontology_relations (
  id TEXT PRIMARY KEY,
  from_entity_id TEXT NOT NULL REFERENCES ontology_entities(id),
  to_entity_id TEXT NOT NULL REFERENCES ontology_entities(id),
  relation_type TEXT NOT NULL,
  historical_validity_json TEXT,
  notes TEXT
) STRICT;

CREATE TABLE ontology_relation_sources (
  relation_id TEXT NOT NULL REFERENCES ontology_relations(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(relation_id, source_id)
) STRICT;

CREATE TABLE perspective_profiles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  historical_context_json TEXT,
  author_id TEXT
) STRICT;

CREATE TABLE perspective_dimensions (
  profile_id TEXT NOT NULL REFERENCES perspective_profiles(id) ON DELETE CASCADE,
  dimension_kind TEXT NOT NULL CHECK(dimension_kind IN ('tradition','school','method','epistemic-stance','interpretive-framework')),
  ontology_entity_id TEXT NOT NULL REFERENCES ontology_entities(id),
  PRIMARY KEY(profile_id, dimension_kind, ontology_entity_id)
) STRICT;

CREATE INDEX idx_perspective_dimensions_lookup ON perspective_dimensions(dimension_kind, ontology_entity_id);
