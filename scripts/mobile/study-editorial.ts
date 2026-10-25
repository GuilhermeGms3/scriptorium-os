import { STUDY_GUIDES } from "../../src/lib/content/study-guides";
import { PORTUGUESE_KNOWLEDGE_LABELS } from "../../src/lib/content/knowledge-presentation";
import { lessonForTopic, LESSON_REFERENCES } from "../../src/lib/content/study-lessons/catalog";
import type { LessonChapter } from "../../src/lib/content/study-lessons/types";
import { GENESIS_COURSE } from "../../src/lib/content/study-courses/genesis";

/** Deduplicated editorial content. Never reads private documents or personal progress. */
export function buildStudyEditorial() {
  const chapters: Record<string, LessonChapter> = {};
  const lessons: Record<string, { title: string; chapterIds: string[] }> = {};
  const topics = [
    ...Object.entries(PORTUGUESE_KNOWLEDGE_LABELS).map(([id, title]) => ({ id, title })),
    ...STUDY_GUIDES.map((guide) => ({ id: `study-guide:${guide.id}`, title: guide.title })),
  ];
  for (const topic of topics) {
    const lesson = lessonForTopic(topic);
    if (!lesson) throw new Error(`Aula editorial ausente: ${topic.id}`);
    lessons[topic.id] = {
      title: lesson.title,
      chapterIds: lesson.chapters.map((chapter) => chapter.id),
    };
    for (const chapter of lesson.chapters) {
      if (chapters[chapter.id] && JSON.stringify(chapters[chapter.id]) !== JSON.stringify(chapter))
        throw new Error(`Capítulo editorial conflitante: ${chapter.id}`);
      chapters[chapter.id] = chapter;
    }
  }
  return {
    lessons,
    chapters,
    references: LESSON_REFERENCES,
    courses: { [`course:${GENESIS_COURSE.id}`]: GENESIS_COURSE },
  };
}
