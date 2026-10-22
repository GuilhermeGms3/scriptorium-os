import { describe, expect, it } from "vitest";
import { FORMATION_PLAN, THEOLOGY_FORMATION } from "./theology-formation";
import {
  moduleUnlocked,
  completionIssues,
  emptyCourseWork,
} from "../../src/lib/domain/study-course";

describe("formação geral em teologia", () => {
  it("ordena fundamentos antes de métodos, história, sistemática e síntese", () => {
    expect(FORMATION_PLAN).toHaveLength(18);
    const ids = FORMATION_PLAN.map((item) => item.id);
    expect(ids.indexOf("orientation")).toBeLessThan(ids.indexOf("scripture"));
    expect(ids.indexOf("scripture")).toBeLessThan(ids.indexOf("exegesis"));
    expect(ids.indexOf("exegesis")).toBeLessThan(ids.indexOf("ancient-history"));
    expect(ids.indexOf("ancient-history")).toBeLessThan(ids.indexOf("trinity"));
    expect(ids.at(-1)).toBe("synthesis");
    expect(new Set(THEOLOGY_FORMATION.modules.map((module) => module.id)).size).toBe(18);
  });
  it("leva capítulos reais, referências válidas, objetivos, leituras e atividades", () => {
    const references = new Set(THEOLOGY_FORMATION.references.map((item) => item.id));
    const modules = THEOLOGY_FORMATION.modules;
    for (const module of modules) {
      expect(module.studyGuideId).toBeTruthy();
      expect(module.objectives.length).toBeGreaterThanOrEqual(3);
      expect(module.activity.prompt.length).toBeGreaterThan(100);
      for (const lesson of module.lessons)
        for (const section of lesson.sections) {
          expect(section.paragraphs.length).toBeGreaterThan(0);
          for (const id of section.references) expect(references.has(id), id).toBe(true);
        }
    }
    const words = modules
      .flatMap((module) =>
        module.lessons.flatMap((lesson) =>
          lesson.sections.flatMap((section) => section.paragraphs),
        ),
      )
      .join(" ")
      .split(/\s+/).length;
    expect(words).toBeGreaterThan(7000);
    expect(modules.filter((module) => module.passages.length > 0).length).toBeGreaterThan(12);
  });
  it("exige trabalho completo para liberar B e conserva revisão de A", () => {
    const course = THEOLOGY_FORMATION;
    const a = course.modules[0]!;
    const b = course.modules[1]!;
    expect(moduleUnlocked(course, a.id, [])).toBe(true);
    expect(moduleUnlocked(course, b.id, [])).toBe(false);
    expect(completionIssues(a, emptyCourseWork()).length).toBeGreaterThan(0);
    const work = {
      lessons: a.lessons.map((item) => item.id),
      readings: a.passages.map((item) => item.id),
      response:
        "Resposta de estudo com argumento, identificação da fonte e delimitação do problema e dos limites da conclusão apresentada.",
      criteria: a.activity.criteria.map((_, index) => index),
    };
    expect(completionIssues(a, work)).toEqual([]);
    const progress = [
      {
        moduleId: a.id,
        work,
        completedAt: "2026-10-22T00:00:00Z",
        version: 1,
        updatedAt: "2026-10-22T00:00:00Z",
      },
    ];
    expect(moduleUnlocked(course, b.id, progress)).toBe(true);
    expect(moduleUnlocked(course, course.modules[2]!.id, progress)).toBe(false);
    expect(moduleUnlocked(course, a.id, progress)).toBe(true);
  });
});
