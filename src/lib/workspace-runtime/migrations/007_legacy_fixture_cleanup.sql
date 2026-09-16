-- A pre-SQLite localStorage fixture used a second identity for the same demo study.
-- Match the complete immutable fixture signature so a user's similarly named study is preserved.
DELETE FROM studies
WHERE id='study-logos'
  AND slug='logos-in-john'
  AND title='The concept of Logos in John'
  AND description='DEMO study workspace. Collects passages, words, concepts and sources around λόγος in John 1. No theological conclusions are bundled — only structure.';
