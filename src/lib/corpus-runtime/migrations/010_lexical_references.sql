CREATE TABLE lexical_references (
  lexeme_id TEXT NOT NULL REFERENCES lexemes(id) ON DELETE CASCADE,
  reference_system TEXT NOT NULL,
  reference_value TEXT NOT NULL,
  PRIMARY KEY (lexeme_id, reference_system, reference_value)
) STRICT;

CREATE INDEX idx_lexical_references_lookup
  ON lexical_references(reference_system, reference_value, lexeme_id);
