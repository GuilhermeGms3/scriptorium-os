CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  proposition TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  origin TEXT NOT NULL,
  review_status TEXT NOT NULL,
  support_level TEXT NOT NULL,
  assessment_note TEXT,
  provenance_json TEXT NOT NULL
) STRICT;

CREATE TABLE claim_anchors (
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  anchor_json TEXT NOT NULL,
  PRIMARY KEY(claim_id, ordinal)
) STRICT;

CREATE TABLE claim_sources (
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(claim_id, source_id)
) STRICT;

CREATE TABLE claim_perspectives (
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES perspective_profiles(id),
  association_kind TEXT NOT NULL CHECK(association_kind IN ('author-perspective','claimed-tradition','interpretive-context')),
  PRIMARY KEY(claim_id, profile_id, association_kind)
) STRICT;

CREATE TABLE evidence (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_json TEXT NOT NULL,
  review_status TEXT NOT NULL,
  authorship TEXT NOT NULL,
  notes TEXT
) STRICT;

CREATE TABLE claim_evidence (
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL REFERENCES evidence(id),
  relation_type TEXT NOT NULL CHECK(relation_type IN ('supports','opposes','qualifies','undercuts','rebuts')),
  PRIMARY KEY(claim_id, evidence_id, relation_type)
) STRICT;

CREATE TABLE evidence_sources (
  evidence_id TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(evidence_id, source_id)
) STRICT;

CREATE TABLE arguments (
  id TEXT PRIMARY KEY,
  title TEXT,
  conclusion_claim_id TEXT NOT NULL REFERENCES claims(id),
  argument_type TEXT,
  notes TEXT
) STRICT;

CREATE TABLE argument_premises (
  argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
  claim_id TEXT NOT NULL REFERENCES claims(id),
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  PRIMARY KEY(argument_id, ordinal),
  UNIQUE(argument_id, claim_id)
) STRICT;

CREATE TABLE argument_perspectives (
  argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES perspective_profiles(id),
  PRIMARY KEY(argument_id, profile_id)
) STRICT;

CREATE TABLE argument_relations (
  id TEXT PRIMARY KEY,
  from_kind TEXT NOT NULL CHECK(from_kind IN ('claim','argument','evidence','theory')),
  from_id TEXT NOT NULL,
  to_kind TEXT NOT NULL CHECK(to_kind IN ('claim','argument','evidence','theory')),
  to_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK(relation_type IN ('supports','opposes','objects-to','responds-to','qualifies','depends-on','undercuts','rebuts','alternative-to','competes-with','derived-from')),
  notes TEXT
) STRICT;

CREATE TABLE argument_sources (
  argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(argument_id, source_id)
) STRICT;

CREATE TABLE argument_relation_sources (
  relation_id TEXT NOT NULL REFERENCES argument_relations(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(relation_id, source_id)
) STRICT;

CREATE INDEX idx_arguments_conclusion ON arguments(conclusion_claim_id);
CREATE INDEX idx_argument_relations_from ON argument_relations(from_kind, from_id);
CREATE INDEX idx_argument_relations_to ON argument_relations(to_kind, to_id);
