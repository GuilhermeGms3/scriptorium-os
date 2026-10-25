import type { DeepStudy } from "./deepening-types";
import type { LessonPassage } from "./deepening-passages";
import type { StudyFoundation } from "../../domain/study-foundation";

export interface LessonReference {
  id: string;
  title: string;
  url: string;
  perspective: string;
}
export interface LessonChapter {
  foundation?: readonly StudyFoundation[];
  id: string;
  title: string;
  paragraphs: readonly string[];
  references: readonly string[];
  deepening?: DeepStudy;
  passages?: readonly LessonPassage[];
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
