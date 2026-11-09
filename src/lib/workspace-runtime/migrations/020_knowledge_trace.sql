-- Historical snapshots are private. No FK to proposals: reprocessing can delete them.
CREATE TABLE knowledge_trace_events (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES private_documents(id) ON DELETE CASCADE,
  proposal_id TEXT NOT NULL,
  event_kind TEXT NOT NULL CHECK(event_kind IN ('snapshot','registered','proposal-changed','decision','removed')),
  occurred_at TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  state_json TEXT NOT NULL CHECK(json_valid(state_json))
) STRICT;
CREATE INDEX idx_knowledge_trace_proposal ON knowledge_trace_events(proposal_id,occurred_at,id);
CREATE INDEX idx_knowledge_trace_document ON knowledge_trace_events(document_id,occurred_at,id);
CREATE TABLE knowledge_trace_control (
  id INTEGER PRIMARY KEY CHECK(id=1),
  enabled INTEGER NOT NULL CHECK(enabled IN (0,1))
) STRICT;
INSERT INTO knowledge_trace_control VALUES(1,1);

-- A baseline is not a reconstructed history; its timestamp is the migration time.
INSERT INTO knowledge_trace_events
SELECT lower(hex(randomblob(16))),p.document_id,p.id,'snapshot',
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),p.payload_json,
  json_object('method',p.method,'reviewStatus',p.review_status,'reviewNote',p.review_note,
    'publication',d.publication,'origin',d.origin,'auditStatus',d.audit_status,
    'evidence',json(d.evidence_json),'configurationKey',d.configuration_key)
FROM knowledge_proposals p LEFT JOIN pipeline_decisions d ON d.proposal_id=p.id
WHERE p.proposal_kind='passage-relation';

CREATE TRIGGER trace_proposal_insert AFTER INSERT ON knowledge_proposals
WHEN NEW.proposal_kind='passage-relation' AND (SELECT enabled FROM knowledge_trace_control WHERE id=1)=1
BEGIN
  INSERT INTO knowledge_trace_events VALUES(lower(hex(randomblob(16))),NEW.document_id,NEW.id,
    'registered',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NEW.payload_json,
    json_object('method',NEW.method,'reviewStatus',NEW.review_status,'reviewNote',NEW.review_note));
END;
CREATE TRIGGER trace_proposal_update AFTER UPDATE ON knowledge_proposals
WHEN NEW.proposal_kind='passage-relation' AND (SELECT enabled FROM knowledge_trace_control WHERE id=1)=1
  AND (NEW.payload_json IS NOT OLD.payload_json OR NEW.review_status IS NOT OLD.review_status
    OR NEW.review_note IS NOT OLD.review_note OR NEW.method IS NOT OLD.method)
BEGIN
  INSERT INTO knowledge_trace_events VALUES(lower(hex(randomblob(16))),NEW.document_id,NEW.id,
    'proposal-changed',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NEW.payload_json,
    json_object('method',NEW.method,'reviewStatus',NEW.review_status,'reviewNote',NEW.review_note,
      'previousPayload',json(OLD.payload_json),'previousReviewStatus',OLD.review_status));
END;
CREATE TRIGGER trace_proposal_delete BEFORE DELETE ON knowledge_proposals
WHEN OLD.proposal_kind='passage-relation' AND (SELECT enabled FROM knowledge_trace_control WHERE id=1)=1
  AND EXISTS(SELECT 1 FROM private_documents WHERE id=OLD.document_id)
BEGIN
  INSERT INTO knowledge_trace_events VALUES(lower(hex(randomblob(16))),OLD.document_id,OLD.id,
    'removed',strftime('%Y-%m-%dT%H:%M:%fZ','now'),OLD.payload_json,
    json_object('method',OLD.method,'reviewStatus',OLD.review_status));
END;
CREATE TRIGGER trace_decision_insert AFTER INSERT ON pipeline_decisions
WHEN (SELECT enabled FROM knowledge_trace_control WHERE id=1)=1
BEGIN
  INSERT INTO knowledge_trace_events
  SELECT lower(hex(randomblob(16))),p.document_id,p.id,'decision',
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),p.payload_json,
    json_object('method',p.method,'reviewStatus',p.review_status,'publication',NEW.publication,
      'origin',NEW.origin,'auditStatus',NEW.audit_status,'evidence',json(NEW.evidence_json),
      'configurationKey',NEW.configuration_key)
  FROM knowledge_proposals p WHERE p.id=NEW.proposal_id AND p.proposal_kind='passage-relation';
END;
CREATE TRIGGER trace_decision_update AFTER UPDATE ON pipeline_decisions
WHEN (SELECT enabled FROM knowledge_trace_control WHERE id=1)=1 AND
  (NEW.publication IS NOT OLD.publication OR NEW.audit_status IS NOT OLD.audit_status
    OR NEW.evidence_json IS NOT OLD.evidence_json OR NEW.origin IS NOT OLD.origin
    OR NEW.configuration_key IS NOT OLD.configuration_key)
BEGIN
  INSERT INTO knowledge_trace_events
  SELECT lower(hex(randomblob(16))),p.document_id,p.id,'decision',
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),p.payload_json,
    json_object('method',p.method,'reviewStatus',p.review_status,'publication',NEW.publication,
      'origin',NEW.origin,'auditStatus',NEW.audit_status,'evidence',json(NEW.evidence_json),
      'configurationKey',NEW.configuration_key,'previousPublication',OLD.publication)
  FROM knowledge_proposals p WHERE p.id=NEW.proposal_id AND p.proposal_kind='passage-relation';
END;
