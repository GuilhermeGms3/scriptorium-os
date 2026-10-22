import { writeFileSync } from "node:fs";
import { BIBLIA_LIVRE_BOOKS } from "../../src/lib/corpus-config/biblia-livre";
import { bookLabel } from "../../src/lib/i18n";
import {
  PORTUGUESE_KNOWLEDGE_LABELS,
  knowledgeSourceLinks,
} from "../../src/lib/content/knowledge-presentation";
import { groupScriptureBooks } from "../../src/lib/content/scripture-navigation";
import { TOPIC_PRIMERS, lessonForTopic } from "../../src/lib/content/study-lessons/catalog";
import { STUDY_GUIDES } from "../../src/lib/content/study-guides";
import type { Book } from "../../src/lib/domain/scripture";
import { THEOLOGY_FORMATION } from "./theology-formation";

// Public editorial labels, lesson families and exact work links. No private books or databases.
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
const studyAreas = Object.fromEntries(
  STUDY_GUIDES.map((guide) => [
    guide.id,
    { title: guide.title, keywords: guide.keywords, works: guide.resources },
  ]),
);
const guideChapters = STUDY_GUIDES.map((guide) => ({
  id: guide.id,
  chapters: new Set(
    lessonForTopic({ id: `study-guide:${guide.id}`, title: guide.title })?.chapters.map(
      (chapter) => chapter.id,
    ) ?? [],
  ),
}));
function supportGuide(id: string): string | undefined {
  const chapters =
    lessonForTopic({ id, title: PORTUGUESE_KNOWLEDGE_LABELS[id] ?? "Estudo temático" })?.chapters ??
    [];
  return guideChapters
    .map((guide) => ({
      id: guide.id,
      score:
        chapters.filter((chapter) => guide.chapters.has(chapter.id)).length /
        Math.max(1, guide.chapters.size),
    }))
    .filter((guide) => guide.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.id;
}
const lessons = Object.fromEntries([
  ...Object.entries(TOPIC_PRIMERS).map(([id, primer]) => [
    id,
    {
      family: primer.family,
      supportGuide: supportGuide(id),
      chapters:
        lessonForTopic({ id, title: PORTUGUESE_KNOWLEDGE_LABELS[id] ?? "Estudo temático" })
          ?.chapters.length ?? 0,
      works: knowledgeSourceLinks(id),
    },
  ]),
  ...STUDY_GUIDES.map((guide) => [
    `study-guide:${guide.id}`,
    {
      family: "guides",
      supportGuide: guide.id,
      chapters:
        lessonForTopic({ id: `study-guide:${guide.id}`, title: guide.title })?.chapters.length ?? 0,
      works: guide.resources,
    },
  ]),
]);
writeFileSync(
  "android/reading-labels.json",
  JSON.stringify(
    {
      books,
      topics: PORTUGUESE_KNOWLEDGE_LABELS,
      lessons,
      studyAreas,
      formation: THEOLOGY_FORMATION,
    },
    null,
    2,
  ) + "\n",
);
