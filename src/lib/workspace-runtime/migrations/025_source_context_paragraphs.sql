-- The original Bible-note importer used footnote for all excerpts. The new
-- calibrated patristic/confessional profiles produce paragraphs, not footnotes.
-- Repair only this machine-generated namespace; never reclassify reviewed units.
UPDATE semantic_units SET unit_kind='paragraph'
WHERE method='deterministic-source-commentary:v1:deterministic-source-context-v1'
  AND unit_kind='footnote'
  AND EXISTS (
    SELECT 1 FROM knowledge_proposals p
    WHERE p.semantic_unit_id=semantic_units.id
      AND p.proposal_kind='passage-relation'
      AND json_extract(p.payload_json,'$.contextualAnalysis.sourceContext.kind')
          IN ('patristic-exposition','catechism','confession')
  )
  AND NOT EXISTS (
    SELECT 1 FROM knowledge_proposals p
    WHERE p.semantic_unit_id=semantic_units.id
      AND (p.review_status<>'machine-proposed' OR p.reviewed_at IS NOT NULL)
  );
