-- WorkSchema stores labels with an explicit language; Phase 9.5 seed v0.1 used bare strings.
UPDATE works
SET alternative_titles_json='[{"language":"en","value":"Teaching of the Twelve Apostles"}]'
WHERE id='work:didache'
  AND alternative_titles_json='["Teaching of the Twelve Apostles"]';

UPDATE works
SET alternative_titles_json='[{"language":"en","value":"First Epistle of Clement"}]'
WHERE id='work:first-clement'
  AND alternative_titles_json='["First Epistle of Clement"]';
