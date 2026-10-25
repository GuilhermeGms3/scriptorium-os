import { DOCTRINE_PRIMERS } from "./doctrines";
import { DOCUMENT_PRIMERS } from "./documents";
import { METHOD_PRIMERS } from "./methods";
import { TRADITION_PRIMERS } from "./traditions";
import { READING_CHAPTERS, THEOLOGY_CHAPTERS } from "./foundations";
import { TEACHING_CHAPTERS } from "./teachings";
import { chapter, type LessonChapter, type StudyLesson } from "./types";
import { TOPIC_DEEPENING, chapterDeepening } from "./deepening";
import { DEEPENING_PASSAGES } from "./deepening-passages";
import { chapterFoundation } from "./foundations-metadata";
import {
  COUNCIL_STUDY_CHAPTERS,
  CONFESSIONAL_STUDY_CHAPTERS,
  MEDIEVAL_STUDY_CHAPTERS,
} from "./church-history";
export { LESSON_REFERENCES } from "./references";

export const TOPIC_PRIMERS = {
  ...DOCTRINE_PRIMERS,
  ...DOCUMENT_PRIMERS,
  ...METHOD_PRIMERS,
  ...TRADITION_PRIMERS,
};
const FAMILIES: Readonly<Record<string, readonly LessonChapter[]>> = {
  reading: READING_CHAPTERS,
  theology: THEOLOGY_CHAPTERS,
  ...TEACHING_CHAPTERS,
};
const GUIDE_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  teologia: ["theology", "christology", "salvation", "history"],
  "biblia-interpretacao": ["reading"],
  "teologia-sistematica": [
    "theology",
    "christology",
    "humanity",
    "salvation",
    "church",
    "spirit",
    "hope",
  ],
  "historia-tradicoes": ["history", "christology", "church"],
  "literatura-fontes": ["history", "gnosticism", "reading"],
  "exegese-recepcao": ["reading"],
  "hermeneutica-metodos": ["reading"],
  patristica: ["history", "christology"],
  "trindade-cristologia": ["christology"],
  "etica-soteriologia": ["salvation", "humanity"],
  gnosticismo: ["gnosticism", "history"],
  "eclesiologia-liturgia": ["church", "history"],
  escatologia: ["hope"],
  pneumatologia: ["spirit", "christology"],
  "hamartiologia-justificacao": ["humanity", "salvation"],
  "sacramentos-santificacao": ["church", "salvation"],
};

/** Editorial lessons are explicit correspondences, never fabricated excerpts from a user's books. */
export function lessonForTopic(topic: { id: string; title: string }): StudyLesson | null {
  const primer = TOPIC_PRIMERS[topic.id];
  const families = primer
    ? [primer.family]
    : topic.id.startsWith("study-guide:")
      ? GUIDE_FAMILIES[topic.id.slice("study-guide:".length)]
      : undefined;
  if (!families) return null;
  const chapters = [
    ...(primer
      ? [chapter(`overview:${topic.id}`, topic.title, primer.paragraphs, primer.references)]
      : []),
    ...([
      "study-guide:historia-tradicoes",
      "study-guide:eclesiologia-liturgia",
      "study-guide:teologia",
      "study-guide:patristica",
    ].includes(topic.id)
      ? [
          ...COUNCIL_STUDY_CHAPTERS,
          ...CONFESSIONAL_STUDY_CHAPTERS,
          ...(topic.id === "study-guide:patristica" ? [] : MEDIEVAL_STUDY_CHAPTERS),
        ]
      : []),
    ...([
      "tradition:lutheran",
      "tradition:reformed",
      "tradition:eastern-orthodox",
      "tradition:oriental-orthodox",
    ].includes(topic.id)
      ? CONFESSIONAL_STUDY_CHAPTERS
      : []),
    ...families.flatMap((family) => FAMILIES[family] ?? []),
  ];
  return {
    title: topic.title,
    chapters: [...new Map(chapters.map((item) => [item.id, item])).values()].map((item) => {
      const deepening =
        item.id === `overview:${topic.id}` ? TOPIC_DEEPENING[topic.id] : chapterDeepening(item.id);
      const passages =
        item.id === `overview:${topic.id}` ? DEEPENING_PASSAGES[topic.id] : undefined;
      return {
        ...item,
        foundation: chapterFoundation(item.id.replace(/^overview:/, ""), item.references),
        ...(deepening ? { deepening } : {}),
        ...(passages ? { passages } : {}),
      };
    }),
  };
}
