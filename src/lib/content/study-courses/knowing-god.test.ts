import { describe, expect, it } from "vitest";
import { KNOWING_GOD_COURSE as course } from "./knowing-god";
import { BIBLIA_LIVRE_BOOKS } from "../../corpus-config/biblia-livre";
import { STUDY_GUIDES } from "../study-guides";
import { completionIssues, emptyCourseWork, moduleUnlocked } from "../../domain/study-course";

describe("Conhecer para amar", () => {
  it("desenvolve seis questões graduais com conteúdo completo e fontes identificadas", () => {
    expect(course.modules.map((m) => m.id)).toEqual(["buscar", "israel", "jesus", "cruz", "ressurreicao", "viver"]);
    const references = new Set(course.references.map((r) => r.id));
    for (const module of course.modules) {
      expect(STUDY_GUIDES.some((g) => g.id === module.studyGuideId)).toBe(true);
      expect(module.lessons[0]!.sections.map((s) => s.kind)).toEqual(["introduction", "concept", "example", "discussion", "conclusion"]);
      expect(module.lessons.flatMap((l) => l.sections.flatMap((s) => s.paragraphs)).join(" ").split(/\s+/).length).toBeGreaterThan(350);
      for (const section of module.lessons.flatMap((l) => l.sections))
        for (const ref of section.references) expect(references.has(ref), ref).toBe(true);
      for (const passage of module.passages) {
        expect(Object.values(BIBLIA_LIVRE_BOOKS).some((b) => b[0] === passage.ref.bookId), passage.label).toBe(true);
        expect(passage.ref.verseStart).toBeGreaterThan(0);
        expect(passage.ref.verseEnd).toBeGreaterThanOrEqual(passage.ref.verseStart!);
      }
    }
  });
  it("exige leitura e síntese antes de liberar B, mantendo A revisável", () => {
    const a = course.modules[0]!;
    expect(moduleUnlocked(course, a.id, [])).toBe(true);
    expect(moduleUnlocked(course, course.modules[1]!.id, [])).toBe(false);
    expect(completionIssues(a, emptyCourseWork()).length).toBeGreaterThan(0);
    const work = { lessons: a.lessons.map((l) => l.id), readings: a.passages.map((p) => p.id), response: "Minha síntese relaciona a pergunta inicial à observação da passagem, diferencia interpretação e indica uma dúvida para investigação posterior.", criteria: [0, 1, 2] };
    expect(completionIssues(a, work)).toEqual([]);
    const progress = [{ moduleId: a.id, completedAt: "2026-10-25", work, version: 1, updatedAt: "2026-10-25" }];
    expect(moduleUnlocked(course, course.modules[1]!.id, progress)).toBe(true);
    expect(moduleUnlocked(course, a.id, progress)).toBe(true);
    expect(moduleUnlocked(course, course.modules[2]!.id, progress)).toBe(false);
  });
});
