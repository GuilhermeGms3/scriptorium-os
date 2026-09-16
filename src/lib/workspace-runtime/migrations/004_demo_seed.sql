INSERT OR IGNORE INTO authors(id,canonical_name,author_type,tradition_ids_json,created_at,updated_at)
VALUES ('author:demo-researcher','Scriptorium DEMO researcher','person','[]','2026-09-13T00:00:00.000Z','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO works(id,canonical_title,alternative_titles_json,language_original,work_type,description,created_at,updated_at)
VALUES ('work:demo-johannine-study','Logos Terminology in John (DEMO)','[]','en','book','Synthetic fixture; not a real academic publication.','2026-09-13T00:00:00.000Z','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO work_authors(work_id,author_id,ordinal)
VALUES ('work:demo-johannine-study','author:demo-researcher',0);
INSERT OR IGNORE INTO editions(id,work_id,title,language,edition_statement,created_at,updated_at)
VALUES ('edition:demo-johannine-study:1','work:demo-johannine-study','Logos Terminology in John — DEMO edition','en','DEMO-NOT-A-CITATION','2026-09-13T00:00:00.000Z','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO bibliographic_sources(id,work_id,edition_id,title,normalized_title,source_type,language,publication_year,rights_json,provenance_json,created_at,updated_at)
VALUES ('source:demo-logos','work:demo-johannine-study','edition:demo-johannine-study:1','Logos Terminology in John (DEMO)','logos terminology in john demo','book','en',2026,'{"metadataRedistributable":true,"contentRedistributable":true,"quoteAllowed":true,"localOnly":false,"license":"DEMO fixture"}','{"origin":"bundled-demo","importMethod":"migration-seed","importedAt":"2026-09-13T00:00:00.000Z","isDemo":true}','2026-09-13T00:00:00.000Z','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO source_authors(source_id,author_id,ordinal)
VALUES ('source:demo-logos','author:demo-researcher',0);
INSERT OR IGNORE INTO citations(id,source_id,content_kind,locator_json,original_text,original_language,note,provenance_json,review_status,created_at,updated_at)
VALUES ('citation:demo-logos-john1','source:demo-logos','exact-quote','{"sourceId":"source:demo-logos","pageStart":"42","section":"2.1","canonicalLocator":"p. 42, sec. 2.1"}','DEMO quotation about Logos terminology.','en','Synthetic text used only to test citation traceability.','{"origin":"bundled-demo","creationMethod":"human","isDemo":true}','draft','2026-09-13T00:00:00.000Z','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO citation_relations(id,citation_id,relation_type,target_kind,target_id)
VALUES ('citation-relation:demo-logos-claim','citation:demo-logos-john1','supports','claim','claim:john-logos-linguistic');
INSERT OR IGNORE INTO library_collections(id,name,description,created_at,updated_at)
VALUES ('collection:demo-johannine','Johannine Studies','DEMO collection','2026-09-13T00:00:00.000Z','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO library_collection_items(collection_id,source_id,added_at)
VALUES ('collection:demo-johannine','source:demo-logos','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO studies(id,slug,title,description,status,research_questions_json,created_at,updated_at)
VALUES ('study:demo-logos','logos-in-john','The concept of Logos in John','DEMO workspace backed by SQLite.','active','[]','2026-09-13T00:00:00.000Z','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO research_questions(id,question,status,description,study_id,created_at,updated_at)
VALUES ('rq:demo-logos','What is the relationship between Logos terminology and John 1?','investigating','DEMO research question.','study:demo-logos','2026-09-13T00:00:00.000Z','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO notes(id,title,content,format,created_at,updated_at)
VALUES ('note:demo-logos','Initial lexical observation','Compare λόγος usage in John 1 with the structured citation.','markdown','2026-09-13T00:00:00.000Z','2026-09-13T00:00:00.000Z');
INSERT OR IGNORE INTO note_links(id,note_id,target_kind,target_id)
VALUES ('note-link:demo-study','note:demo-logos','study','study:demo-logos');
INSERT OR IGNORE INTO research_question_links(id,research_question_id,target_kind,target_id)
VALUES ('rq-link:demo-source','rq:demo-logos','source','source:demo-logos');
INSERT OR IGNORE INTO research_question_links(id,research_question_id,target_kind,target_json)
VALUES ('rq-link:demo-passage','rq:demo-logos','passage','{"anchor":{"kind":"passage","workId":"work:john","versificationSchemeId":"scriptorium-bcv-1","passage":{"workId":"work:john","versificationSchemeId":"scriptorium-bcv-1","bookId":"john","chapter":1}}}');
INSERT OR IGNORE INTO workspace_fts(entity_kind,entity_id,title,body)
SELECT 'source',id,title,coalesce(abstract,'') FROM bibliographic_sources WHERE id='source:demo-logos';
INSERT OR IGNORE INTO workspace_fts(entity_kind,entity_id,title,body)
VALUES ('citation','citation:demo-logos-john1','Logos citation','DEMO quotation about Logos terminology.'),
       ('note','note:demo-logos','Initial lexical observation','Compare λόγος usage in John 1 with the structured citation.'),
       ('research-question','rq:demo-logos','What is the relationship between Logos terminology and John 1?','DEMO research question.');
