import { writeFileSync } from "node:fs";
import { BIBLIA_LIVRE_BOOKS } from "../../src/lib/corpus-config/biblia-livre";
import { bookLabel } from "../../src/lib/i18n";
import { PORTUGUESE_KNOWLEDGE_LABELS } from "../../src/lib/content/knowledge-presentation";
import { groupScriptureBooks } from "../../src/lib/content/scripture-navigation";
import type { Book } from "../../src/lib/domain/scripture";

// Software-owned navigation labels only. No books, personal data or generated database in the APK.
const groups = groupScriptureBooks(
  Object.values(BIBLIA_LIVRE_BOOKS).map(([id]) => ({ id }) as Book),
);
const symbols = ["✧", "▤", "♫", "✦", "✦", "✝", "✉", "✉", "☼"];
const books = Object.fromEntries(
  Object.values(BIBLIA_LIVRE_BOOKS).map(([id, english, abbreviation]) => {
    const index = groups.findIndex((group) => group.books.some((book) => book.id === id));
    return [
      id,
      {
        title: bookLabel(id),
        aliases: [bookLabel(id), english, abbreviation],
        group: groups[index]?.label,
        symbol: symbols[index] ?? "▤",
      },
    ];
  }),
);
writeFileSync(
  "android/reading-labels.json",
  JSON.stringify({ books, topics: PORTUGUESE_KNOWLEDGE_LABELS }, null, 2) + "\n",
);
