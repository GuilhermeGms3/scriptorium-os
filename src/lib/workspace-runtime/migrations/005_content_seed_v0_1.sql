ALTER TABLE authors ADD COLUMN canonical_entity_id TEXT;
CREATE UNIQUE INDEX idx_authors_canonical_entity ON authors(canonical_entity_id) WHERE canonical_entity_id IS NOT NULL;

DELETE FROM workspace_fts WHERE entity_id IN ('source:demo-logos','citation:demo-logos-john1','note:demo-logos','rq:demo-logos');
DELETE FROM library_collection_items WHERE collection_id='collection:demo-johannine';
DELETE FROM library_collections WHERE id='collection:demo-johannine';
DELETE FROM research_question_links WHERE research_question_id='rq:demo-logos';
DELETE FROM research_questions WHERE id='rq:demo-logos';
DELETE FROM note_links WHERE note_id='note:demo-logos';
DELETE FROM notes WHERE id='note:demo-logos';
DELETE FROM studies WHERE id='study:demo-logos';
DELETE FROM citation_relations WHERE citation_id='citation:demo-logos-john1';
DELETE FROM citations WHERE id='citation:demo-logos-john1';
DELETE FROM source_authors WHERE source_id='source:demo-logos';
DELETE FROM bibliographic_sources WHERE id='source:demo-logos';
DELETE FROM editions WHERE id='edition:demo-johannine-study:1';
DELETE FROM work_authors WHERE work_id='work:demo-johannine-study';
DELETE FROM works WHERE id='work:demo-johannine-study';
DELETE FROM authors WHERE id='author:demo-researcher';

INSERT OR IGNORE INTO authors(id,canonical_name,author_type,created_at,updated_at)
VALUES
 ('author:michael-w-holmes','Michael W. Holmes','person','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('author:burnett-hillman-streeter','Burnett Hillman Streeter','person','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('author:austin-m-farrer','Austin M. Farrer','person','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('author:william-r-farmer','William R. Farmer','person','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('author:anonymous-apostolic-fathers','Anonymous / traditional attribution','traditional-attribution','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z');

UPDATE authors
SET canonical_entity_id='entity:person:michael-w-holmes'
WHERE id='author:michael-w-holmes';

INSERT OR IGNORE INTO works(id,canonical_title,alternative_titles_json,language_original,work_type,description,created_at,updated_at)
VALUES
 ('work:sblgnt','SBL Greek New Testament','[]','grc','scripture','Critical Greek New Testament edition edited by Michael W. Holmes.','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('work:four-gospels-streeter','The Four Gospels: A Study of Origins','[]','en','book','Bibliographic record for Synoptic Problem research.','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('work:dispensing-with-q','On Dispensing with Q','[]','en','chapter','Bibliographic record for the Farrer hypothesis.','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('work:synoptic-problem-farmer','The Synoptic Problem: A Critical Analysis','[]','en','book','Bibliographic record for the Griesbach/Farmer hypothesis.','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('work:didache','Didache','["Teaching of the Twelve Apostles"]','grc','early-christian-work','Metadata-only record pending edition-specific rights review.','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('work:first-clement','1 Clement','["First Epistle of Clement"]','grc','early-christian-work','Metadata-only record pending edition-specific rights review.','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z');

INSERT OR IGNORE INTO work_authors(work_id,author_id,attribution_kind,ordinal)
VALUES
 ('work:sblgnt','author:michael-w-holmes','editor',0),
 ('work:four-gospels-streeter','author:burnett-hillman-streeter','author',0),
 ('work:dispensing-with-q','author:austin-m-farrer','author',0),
 ('work:synoptic-problem-farmer','author:william-r-farmer','author',0),
 ('work:didache','author:anonymous-apostolic-fathers','traditional',0),
 ('work:first-clement','author:anonymous-apostolic-fathers','traditional',0);

INSERT OR IGNORE INTO editions(id,work_id,title,language,publisher,publication_date_json,edition_statement,url,created_at,updated_at)
VALUES ('edition:sblgnt:1.2','work:sblgnt','SBL Greek New Testament 1.2','grc','Society of Biblical Literature','{"kind":"exact-year","year":2010}','Version 1.2','https://sblgnt.com/','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z');

INSERT OR IGNORE INTO bibliographic_sources(id,work_id,edition_id,title,normalized_title,source_type,language,publication_year,publisher,rights_json,provenance_json,created_at,updated_at)
VALUES
 ('source:sblgnt:1.2','work:sblgnt','edition:sblgnt:1.2','SBL Greek New Testament 1.2','sbl greek new testament 1.2','dataset','grc',2010,'Society of Biblical Literature','{"metadataRedistributable":true,"contentRedistributable":true,"quoteAllowed":true,"localOnly":false,"license":"CC BY 4.0"}','{"origin":"content-seed-v0.1","importMethod":"migration-seed","importedAt":"2026-09-14T00:00:00.000Z","isDemo":false}','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('source:streeter:four-gospels:1924','work:four-gospels-streeter',NULL,'The Four Gospels: A Study of Origins','the four gospels a study of origins','book','en',1924,'Macmillan','{"metadataRedistributable":true,"contentRedistributable":false,"quoteAllowed":false,"localOnly":false,"license":"metadata-only"}','{"origin":"content-seed-v0.1","importMethod":"migration-seed","importedAt":"2026-09-14T00:00:00.000Z","isDemo":false}','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('source:farrer:dispensing-with-q:1955','work:dispensing-with-q',NULL,'On Dispensing with Q','on dispensing with q','chapter','en',1955,NULL,'{"metadataRedistributable":true,"contentRedistributable":false,"quoteAllowed":false,"localOnly":false,"license":"metadata-only"}','{"origin":"content-seed-v0.1","importMethod":"migration-seed","importedAt":"2026-09-14T00:00:00.000Z","isDemo":false}','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('source:farmer:synoptic-problem:1964','work:synoptic-problem-farmer',NULL,'The Synoptic Problem: A Critical Analysis','the synoptic problem a critical analysis','book','en',1964,'Macmillan','{"metadataRedistributable":true,"contentRedistributable":false,"quoteAllowed":false,"localOnly":false,"license":"metadata-only"}','{"origin":"content-seed-v0.1","importMethod":"migration-seed","importedAt":"2026-09-14T00:00:00.000Z","isDemo":false}','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('source:didache:metadata','work:didache',NULL,'Didache — metadata record','didache metadata record','ancient-work','grc',NULL,NULL,'{"metadataRedistributable":true,"contentRedistributable":false,"quoteAllowed":false,"localOnly":false,"license":"edition-rights-pending"}','{"origin":"content-seed-v0.1","importMethod":"migration-seed","importedAt":"2026-09-14T00:00:00.000Z","isDemo":false}','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('source:first-clement:metadata','work:first-clement',NULL,'1 Clement — metadata record','1 clement metadata record','ancient-work','grc',NULL,NULL,'{"metadataRedistributable":true,"contentRedistributable":false,"quoteAllowed":false,"localOnly":false,"license":"edition-rights-pending"}','{"origin":"content-seed-v0.1","importMethod":"migration-seed","importedAt":"2026-09-14T00:00:00.000Z","isDemo":false}','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z');

INSERT OR IGNORE INTO source_authors(source_id,author_id,ordinal)
VALUES
 ('source:sblgnt:1.2','author:michael-w-holmes',0),
 ('source:streeter:four-gospels:1924','author:burnett-hillman-streeter',0),
 ('source:farrer:dispensing-with-q:1955','author:austin-m-farrer',0),
 ('source:farmer:synoptic-problem:1964','author:william-r-farmer',0),
 ('source:didache:metadata','author:anonymous-apostolic-fathers',0),
 ('source:first-clement:metadata','author:anonymous-apostolic-fathers',0);

INSERT OR IGNORE INTO citations(id,source_id,content_kind,locator_json,note,provenance_json,review_status,created_at,updated_at)
VALUES
 ('citation:sblgnt:john-1-1','source:sblgnt:1.2','reference-only','{"sourceId":"source:sblgnt:1.2","canonicalLocator":"John 1:1"}','Direct textual reference; no quotation duplicated in the workspace.','{"origin":"content-seed-v0.1","creationMethod":"human","isDemo":false}','verified','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('citation:streeter:two-source','source:streeter:four-gospels:1924','reference-only',NULL,'Bibliographic reference for the Two-Source Hypothesis; page locator intentionally omitted.','{"origin":"content-seed-v0.1","creationMethod":"human","isDemo":false}','imported','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'),
 ('citation:farrer:q','source:farrer:dispensing-with-q:1955','reference-only',NULL,'Bibliographic reference for the Farrer hypothesis; page locator intentionally omitted.','{"origin":"content-seed-v0.1","creationMethod":"human","isDemo":false}','imported','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z');

INSERT OR IGNORE INTO citation_relations(id,citation_id,relation_type,target_kind,target_id)
VALUES
 ('citation-relation:sblgnt-john-logos','citation:sblgnt:john-1-1','evidence-for','claim','claim:john-1-1-logos-occurrence'),
 ('citation-relation:streeter-two-source','citation:streeter:two-source','supports','theory','theory:two-source'),
 ('citation-relation:farrer-q','citation:farrer:q','supports','theory','theory:farrer');

INSERT INTO workspace_fts(entity_kind,entity_id,title,body)
SELECT 'source',id,title,coalesce(abstract,'') FROM bibliographic_sources
WHERE json_extract(provenance_json,'$.origin')='content-seed-v0.1';
INSERT INTO workspace_fts(entity_kind,entity_id,title,body)
SELECT 'citation',id,title,body FROM (
 SELECT c.id,s.title,coalesce(c.note,'') body FROM citations c JOIN bibliographic_sources s ON s.id=c.source_id
 WHERE json_extract(c.provenance_json,'$.origin')='content-seed-v0.1'
);
