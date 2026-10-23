export interface LessonReference {
  id: string;
  title: string;
  url: string;
  perspective: string;
}
export interface LessonChapter {
  id: string;
  title: string;
  paragraphs: readonly string[];
  references: readonly string[];
}
export interface TopicPrimer {
  family: string;
  paragraphs: readonly string[];
  references: readonly string[];
}
export interface StudyLesson {
  title: string;
  chapters: readonly LessonChapter[];
}
export const chapter = (
  id: string,
  title: string,
  paragraphs: readonly string[],
  references: readonly string[],
): LessonChapter => ({ id, title, paragraphs, references });
