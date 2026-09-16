ALTER TABLE tokens ADD COLUMN lemma_text TEXT;

CREATE INDEX idx_tokens_lemma ON tokens(lemma_id) WHERE lemma_id IS NOT NULL;
CREATE INDEX idx_token_annotations_token_type ON token_annotations(token_id, annotation_type);
