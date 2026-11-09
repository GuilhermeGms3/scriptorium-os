CREATE TABLE embedding_cache (
 checksum TEXT NOT NULL, model TEXT NOT NULL, revision TEXT NOT NULL,
 vector BLOB NOT NULL, dimension INTEGER NOT NULL CHECK(dimension BETWEEN 1 AND 4096),
 PRIMARY KEY(checksum,model,revision), CHECK(length(vector)=dimension*4)
) STRICT;
CREATE TABLE candidate_embeddings (
 candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
 model TEXT NOT NULL, revision TEXT NOT NULL, recipe TEXT NOT NULL, checksum TEXT NOT NULL,
 vector BLOB NOT NULL, dimension INTEGER NOT NULL CHECK(dimension BETWEEN 1 AND 4096),
 PRIMARY KEY(candidate_id,model,revision,recipe), CHECK(length(vector)=dimension*4)
) STRICT;
