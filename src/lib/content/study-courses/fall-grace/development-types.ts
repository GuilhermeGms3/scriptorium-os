import type { CourseSection } from "../../../domain/study-course";
import type { SourceKey } from "./sources";

/** Expository additions reuse the same lesson/section identities and completion criteria. */
export interface LessonDevelopment {
  references: readonly SourceKey[];
  paragraphs: Record<CourseSection["kind"], readonly string[]>;
}
