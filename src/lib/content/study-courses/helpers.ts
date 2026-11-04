import type { CourseLesson, CourseSection, CoursePassage } from "../../domain/study-course";
export const section = (
  kind: CourseSection["kind"],
  title: string,
  references: string[],
  ...paragraphs: string[]
): CourseSection => ({ kind, title, references, paragraphs });
export const lesson = (id: string, title: string, ...sections: CourseSection[]): CourseLesson => ({
  id,
  title,
  sections,
});
export const reading = (
  id: string,
  label: string,
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
  purpose: string,
): CoursePassage => ({
  id,
  label,
  purpose,
  ref: { bookId, chapter, verseStart, verseEnd, versificationSchemeId: "scriptorium-bcv-1" },
});
export const criteria = [
  "Distingui observações do texto e minhas interpretações.",
  "Indiquei a passagem ou a fonte usada para sustentar meu argumento.",
  "Considerei uma alternativa ou um limite da minha conclusão.",
];
