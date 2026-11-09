import { z } from "zod";
import type { PassageRef } from "./scripture";
import type { StudyFoundation } from "./study-foundation";

export interface CourseReference {
  id: string;
  title: string;
  url: string;
  perspective: string;
}
export interface CourseSection {
  kind: "introduction" | "concept" | "example" | "discussion" | "conclusion";
  title: string;
  paragraphs: readonly string[];
  references: readonly string[];
}
export interface CourseLesson {
  id: string;
  title: string;
  sections: readonly CourseSection[];
}
export interface CoursePassage {
  id: string;
  label: string;
  purpose: string;
  ref: PassageRef;
}
export interface CourseModule {
  foundation?: readonly StudyFoundation[];
  libraryWorks?: readonly { workId: string; label: string }[];
  studyGuideId?: string;
  readingSearch?: string;
  id: string;
  title: string;
  description: string;
  objectives: readonly string[];
  lessons: readonly CourseLesson[];
  passages: readonly CoursePassage[];
  domains: readonly string[];
  activity: { prompt: string; criteria: readonly string[] };
  connections: readonly {
    label: string;
    explanation: string;
    entityId?: string;
    ref?: PassageRef;
  }[];
  videos: readonly {
    title: string;
    author: string;
    url: string;
    perspective: string;
    purpose: string;
  }[];
}
export interface StudyCourse {
  id: string;
  revision: number;
  title: string;
  description: string;
  prerequisites: readonly string[];
  outcomes: readonly string[];
  modules: readonly CourseModule[];
  references: readonly CourseReference[];
}
export const CourseWorkSchema = z.object({
  lessons: z.array(z.string().min(1).max(150)).max(100),
  readings: z.array(z.string().min(1).max(150)).max(100),
  response: z.string().max(30000),
  criteria: z.array(z.number().int().nonnegative()).max(20),
});
export type CourseWork = z.infer<typeof CourseWorkSchema>;
export interface CourseProgress {
  moduleId: string;
  work: CourseWork;
  completedAt: string | null;
  version: number;
  updatedAt: string;
}
export function emptyCourseWork(): CourseWork {
  return { lessons: [], readings: [], response: "", criteria: [] };
}
export function moduleUnlocked(
  course: StudyCourse,
  moduleId: string,
  progress: readonly CourseProgress[],
): boolean {
  const index = course.modules.findIndex((item) => item.id === moduleId);
  return (
    index >= 0 &&
    course.modules
      .slice(0, index)
      .every((item) => progress.some((p) => p.moduleId === item.id && p.completedAt))
  );
}
export function completionIssues(module: CourseModule, work: CourseWork): string[] {
  return [
    ...module.lessons
      .filter((item) => !work.lessons.includes(item.id))
      .map((item) => `Confirme a leitura da aula: ${item.title}.`),
    ...module.passages
      .filter((item) => !work.readings.includes(item.id))
      .map((item) => `Confirme a leitura de ${item.label}.`),
    ...(work.response.trim().length < 80
      ? ["Registre sua resposta à atividade com argumento e referência (mínimo de 80 caracteres)."]
      : []),
    ...module.activity.criteria.flatMap((criterion, index) =>
      work.criteria.includes(index) ? [] : [`Confira o critério: ${criterion}`],
    ),
  ];
}
