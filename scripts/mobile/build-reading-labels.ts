import { writeFileSync } from "node:fs";
import { BIBLIA_LIVRE_BOOKS } from "../../src/lib/corpus-config/biblia-livre";
import {
  argumentRelationLabel,
  bookLabel,
  claimKindLabel,
  reviewStatusLabel,
} from "../../src/lib/i18n";
import { ARGUMENT_RELATION_TYPES } from "../../src/lib/domain/argument";
import { CLAIM_KINDS, REVIEW_STATUSES } from "../../src/lib/domain/knowledge";
import { ONTOLOGY_RELATION_TYPES } from "../../src/lib/domain/theology";
import {
  PORTUGUESE_KNOWLEDGE_LABELS,
  knowledgeSourceLinks,
} from "../../src/lib/content/knowledge-presentation";
import { groupScriptureBooks } from "../../src/lib/content/scripture-navigation";
import { TOPIC_PRIMERS, lessonForTopic } from "../../src/lib/content/study-lessons/catalog";
import { STUDY_GUIDES } from "../../src/lib/content/study-guides";
import type { Book } from "../../src/lib/domain/scripture";
import { THEOLOGY_FORMATION } from "./theology-formation";
import { KNOWING_GOD_COURSE } from "../../src/lib/content/study-courses/knowing-god";
import { buildStudyEditorial } from "./study-editorial";
import mundial from "../../generated/corpora/biblia-portuguesa-mundial/2026-08-19/manifest.json";
import kingJames from "../../generated/corpora/king-james-version/2026-09-26/manifest.json";
import { MOBILE_WORK_LABELS, MOBILE_EDITION_LABELS } from "./reading-metadata";

// Public editorial labels, lesson families and exact work links. No private books or databases.
const canonical = Object.values(BIBLIA_LIVRE_BOOKS);
const canonicalIds = new Set<string>(canonical.map(([id]) => id));
const entries = [
  ...canonical,
  ...[...mundial.books, ...kingJames.books].map(
    (book) => [book.id, book.name, book.abbreviation] as const,
  ),
].filter(([id], index, all) => all.findIndex(([other]) => other === id) === index);
const groups = groupScriptureBooks(entries.map(([id]) => ({ id }) as Book));
const symbols = ["✧", "▤", "♫", "✦", "✦", "✝", "✉", "✉", "☼"];
const books = Object.fromEntries(
  entries.map(([id, english, abbreviation]) => {
    const index = groups.findIndex((group) => group.books.some((book) => book.id === id));
    return [
      id,
      {
        title: bookLabel(id),
        aliases: [bookLabel(id), english, abbreviation],
        group: groups[index]?.label,
        symbol: symbols[index] ?? "▤",
        tags: canonicalIds.has(id) ? [] : ["Apócrifo", "Não canônico"],
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
      works: MOBILE_WORK_LABELS,
      editions: MOBILE_EDITION_LABELS,
      topics: PORTUGUESE_KNOWLEDGE_LABELS,
      lessons,
      studyAreas,
      formation: THEOLOGY_FORMATION,
      discovery: { ...KNOWING_GOD_COURSE, id: `course:${KNOWING_GOD_COURSE.id}` },
      studyContent: buildStudyEditorial(),
      // The site's names for codes the Android screens show (Teologia, proposições).
      vocabulary: {
        claimKinds: Object.fromEntries(CLAIM_KINDS.map((kind) => [kind, claimKindLabel(kind)])),
        reviewStatus: Object.fromEntries(
          REVIEW_STATUSES.map((status) => [status, reviewStatusLabel(status)]),
        ),
        relations: Object.fromEntries(
          [...ONTOLOGY_RELATION_TYPES, ...ARGUMENT_RELATION_TYPES].map((type) => [
            type,
            argumentRelationLabel(type),
          ]),
        ),
      },
    },
    null,
    2,
  ) + "\n",
);
