import type { CourseModule, CourseSection } from "../../../domain/study-course";
import { criteria, lesson } from "../helpers";

export type FormationUnit = CourseModule & {
  studyGuideId: string;
  readingSearch: string;
  phase: string;
};
type UnitInput = Omit<FormationUnit, "lessons" | "activity" | "videos" | "domains"> & {
  sections: CourseSection[];
  prompt: string;
  domains?: string[];
};
/** Only structural reuse: every unit supplies its own exposition, case, objection and task. */
export function unit({
  sections,
  prompt,
  domains = ["theology", "hermeneutics"],
  ...input
}: UnitInput): FormationUnit {
  return {
    ...input,
    domains,
    lessons: [lesson(`${input.id}:aula`, input.title, ...sections)],
    activity: { prompt, criteria },
    videos: [],
  };
}
