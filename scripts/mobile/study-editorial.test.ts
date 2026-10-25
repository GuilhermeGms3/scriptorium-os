import { describe, expect, it } from "vitest";
import { buildStudyEditorial } from "./study-editorial";
import { THEOLOGY_FORMATION } from "./theology-formation";
import { KNOWING_GOD_COURSE } from "../../src/lib/content/study-courses/knowing-god";
import baseline from "./study-progress-baseline.json";

describe("conteúdo editorial móvel sem reimportação do acervo", () => {
  it("entrega todas as aulas e capítulos resolvíveis, com aprofundamento e referências válidas", () => {
    const content = buildStudyEditorial();
    expect(Object.keys(content.lessons)).toHaveLength(111);
    const references = new Set(content.references.map((r) => r.id));
    for (const lesson of Object.values(content.lessons)) {
      for (const id of lesson.chapterIds) {
        const chapter = content.chapters[id]!;
        expect(chapter, id).toBeDefined();
        expect(chapter.deepening, id).toBeDefined();
        for (const paragraph of Object.values(chapter.deepening!))
          expect(paragraph.split(/\s+/).length, id).toBeGreaterThan(25);
        for (const ref of chapter.references) expect(references.has(ref), ref).toBe(true);
      }
    }
  });
  it("deduplica os capítulos de competências comuns sem perder sua ordem nas aulas", () => {
    const content = buildStudyEditorial();
    const full = Object.values(content.lessons).map((lesson) =>
      lesson.chapterIds.map((id) => content.chapters[id]),
    );
    expect(JSON.stringify(content).length).toBeLessThan(JSON.stringify(full).length * 0.65);
    expect(new Set(Object.keys(content.chapters)).size).toBe(Object.keys(content.chapters).length);
    expect(content.lessons["study-guide:biblia-interpretacao"]!.chapterIds).toEqual([
      "interpretation",
      "context",
      "parable",
      "reception",
    ]);
  });
  it("conserva os identificadores de aulas, leituras e módulos que já possuem progresso", () => {
    const project = (course: typeof THEOLOGY_FORMATION | typeof KNOWING_GOD_COURSE) =>
      course.modules.map((m) => ({
        id: m.id,
        lessons: m.lessons.map((l) => l.id),
        readings: m.passages.map((p) => p.id),
      }));
    expect(project(THEOLOGY_FORMATION)).toEqual(baseline.formation);
    expect(project(KNOWING_GOD_COURSE)).toEqual(baseline.discovery);
    const lessons = buildStudyEditorial().lessons;
    for (const [id, count] of Object.entries(baseline.lessonChapterCounts))
      expect(lessons[id]!.chapterIds.length, id).toBe(count);
  });
});
