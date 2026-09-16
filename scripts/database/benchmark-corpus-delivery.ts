import { statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

const sblPath = resolve("public/corpus-packages/sblgnt-1.2/john.sqlite3");
const portuguesePath = resolve("public/corpus-packages/biblia-livre-n4-2025.1.0/john.sqlite3");
const linguisticPath = resolve("public/corpus-packages/sblgnt-1.2/linguistic.sqlite3");
const sblMonolithPath = resolve("public/corpus-packages/sblgnt-1.2.sqlite3");
const portugueseMonolithPath = resolve("public/corpus-packages/biblia-livre-n4-2025.1.0.sqlite3");

function measured<T>(operation: () => T): { value: T; ms: number } {
  const started = performance.now();
  const value = operation();
  return { value, ms: Number((performance.now() - started).toFixed(3)) };
}

const rssBefore = process.memoryUsage().rss;
const sblOpen = measured(() => new DatabaseSync(sblPath, { readOnly: true }));
const sblChapter = measured(() =>
  sblOpen.value
    .prepare(
      `SELECT u.id,u.surface_text FROM text_units u
  JOIN text_addresses a ON a.text_unit_id=u.id
  WHERE a.book_id='john' AND a.chapter=1 ORDER BY u.sequence`,
    )
    .all(),
);
const linguisticOpen = measured(() => new DatabaseSync(linguisticPath, { readOnly: true }));
const lemma = measured(() =>
  linguisticOpen.value
    .prepare(
      `SELECT count(*) count FROM tokens
  WHERE lemma_id='lexeme:tagnt:54a44093161939a81264db35' OR strongs='G3056'`,
    )
    .get(),
);
const portugueseOpen = measured(() => new DatabaseSync(portuguesePath, { readOnly: true }));
const portugueseChapter = measured(() =>
  portugueseOpen.value
    .prepare(
      `SELECT u.id,u.surface_text FROM text_units u
  JOIN text_addresses a ON a.text_unit_id=u.id
  WHERE a.book_id='john' AND a.chapter=1 ORDER BY u.sequence`,
    )
    .all(),
);
const returnToSbl = measured(() =>
  sblOpen.value
    .prepare(
      `SELECT u.surface_text FROM text_units u
  JOIN text_addresses a ON a.text_unit_id=u.id
  WHERE a.book_id='john' AND a.chapter=1 AND a.verse_start=1`,
    )
    .get(),
);
const rssAfter = process.memoryUsage().rss;

console.log(
  JSON.stringify(
    {
      scenario: "john-1-lemma-switch-return",
      johnTransferredBytes: statSync(sblPath).size + statSync(portuguesePath).size,
      phase8MonolithBytes: statSync(sblMonolithPath).size + statSync(portugueseMonolithPath).size,
      globalLinguisticIndexBytes: statSync(linguisticPath).size,
      approximateRssDeltaBytes: Math.max(0, rssAfter - rssBefore),
      timingsMs: {
        sblColdOpen: sblOpen.ms,
        sblChapter: sblChapter.ms,
        linguisticColdOpen: linguisticOpen.ms,
        lemma: lemma.ms,
        portugueseColdOpen: portugueseOpen.ms,
        portugueseChapter: portugueseChapter.ms,
        sblWarmReturn: returnToSbl.ms,
      },
      rows: {
        sblChapter: sblChapter.value.length,
        portugueseChapter: portugueseChapter.value.length,
      },
    },
    null,
    2,
  ),
);
sblOpen.value.close();
portugueseOpen.value.close();
linguisticOpen.value.close();
