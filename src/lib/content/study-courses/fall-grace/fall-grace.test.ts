import { describe, expect, it } from "vitest";
import { FALL_GRACE_COURSE as course } from ".";
import { STUDY_GUIDES } from "../../study-guides";
import { PORTUGUESE_KNOWLEDGE_LABELS } from "../../knowledge-presentation";
import { BIBLIA_LIVRE_BOOKS } from "../../../corpus-config/biblia-livre";
import { completionIssues, emptyCourseWork, moduleUnlocked } from "../../../domain/study-course";
import { PASSAGE_COVERAGE_AREAS } from "../../../domain/workspace-passage-knowledge";
import { buildStudyEditorial } from "../../../../../scripts/mobile/study-editorial";

describe("Queda, graça e providência", () => {
  it("cobre o percurso completo com elaboração própria, fontes e vínculos resolvíveis", () => {
    expect(course.modules.map((module) => module.id)).toEqual([
      "sentido",
      "cinco-vias",
      "adao",
      "alteridade",
      "queda",
      "cristo",
      "sheol",
      "graca",
      "providencia",
      "calvinismo",
      "luteranismo",
      "anglicanismo",
      "oracao",
      "sintese",
    ]);
    const books = new Set<string>(Object.values(BIBLIA_LIVRE_BOOKS).map(([id]) => id));
    const references = new Set(course.references.map((reference) => reference.id));
    const lessons = new Set<string>();
    const catalogWorks = new Set(
      STUDY_GUIDES.flatMap((guide) => guide.resources.map((resource) => resource.workId)),
    );
    for (const module of course.modules) {
      expect(
        STUDY_GUIDES.some((guide) => guide.id === module.studyGuideId),
        module.id,
      ).toBe(true);
      expect(module.foundation?.length, module.id).toBeGreaterThan(0);
      expect(module.passages.length, module.id).toBeGreaterThan(0);
      expect(new Set(module.passages.map((p) => p.id)).size).toBe(module.passages.length);
      for (const work of module.libraryWorks)
        expect(catalogWorks.has(work.workId), work.workId).toBe(true);
      for (const area of module.domains) expect(PASSAGE_COVERAGE_AREAS, area).toContain(area);
      for (const lesson of module.lessons) {
        expect(lessons.has(lesson.id), lesson.id).toBe(false);
        lessons.add(lesson.id);
        expect(lesson.sections.map((s) => s.kind)).toEqual([
          "introduction",
          "concept",
          "example",
          "discussion",
          "conclusion",
        ]);
        expect(
          lesson.sections
            .flatMap((s) => s.paragraphs)
            .join(" ")
            .split(/\s+/).length,
          lesson.id,
        ).toBeGreaterThan(220);
        for (const section of lesson.sections)
          for (const reference of section.references)
            expect(references.has(reference), reference).toBe(true);
      }
      for (const passage of module.passages) {
        expect(books.has(passage.ref.bookId), passage.label).toBe(true);
        expect(passage.ref.verseStart).toBeGreaterThan(0);
        expect(passage.ref.verseEnd).toBeGreaterThanOrEqual(passage.ref.verseStart!);
      }
      for (const connection of module.connections)
        if (connection.entityId)
          expect(
            PORTUGUESE_KNOWLEDGE_LABELS[connection.entityId],
            connection.entityId,
          ).toBeDefined();
      for (const foundation of module.foundation!) {
        expect(foundation.basis.length).toBeGreaterThan(30);
        expect(foundation.alternatives.length).toBeGreaterThan(30);
        for (const source of foundation.sources) {
          expect(new URL(source.url).protocol).toBe("https:");
          expect(source.locator.length).toBeGreaterThan(3);
          expect(source.limit.length).toBeGreaterThan(20);
        }
      }
    }
  });
  it("desenvolve cada via como aula própria e preserva hipóteses e contrapontos", () => {
    expect(course.modules[1]!.lessons.map((lesson) => lesson.id)).toEqual([
      "vias:movimento",
      "vias:causa",
      "vias:contingencia",
      "vias:graus",
      "vias:finalidade",
    ]);
    expect(course.modules.find((m) => m.id === "adao")!.foundation![0]!.basis).toContain(
      "Hipótese de estudo",
    );
    expect(course.modules.find((m) => m.id === "cristo")!.foundation![0]!.claim).toContain(
      "realidade de sua morte humana",
    );
    const sheol = course.modules.find((m) => m.id === "sheol")!;
    expect(
      sheol.foundation![0]!.sources.find((s) => s.title.includes("Westminster"))!.limit,
    ).toContain("contraponto");
    expect(
      sheol.lessons[0]!.sections.find((s) => s.kind === "discussion")!.paragraphs.join(" "),
    ).toContain("sem conhecer sua pregação");
  });
  it("libera B somente após leitura, elaboração e critérios, sem exigir concordância", () => {
    const a = course.modules[0]!;
    expect(completionIssues(a, emptyCourseWork()).length).toBeGreaterThan(0);
    expect(moduleUnlocked(course, course.modules[1]!.id, [])).toBe(false);
    const work = {
      lessons: a.lessons.map((l) => l.id),
      readings: a.passages.map((p) => p.id),
      criteria: [0, 1, 2],
      response:
        "Discordo da interpretação apresentada e fundamento minha objeção na passagem e no contexto do autor. Distingo finitude e ausência de sentido e registro uma limitação dessa conclusão.",
    };
    expect(completionIssues(a, work)).toEqual([]);
    const marks = [
      { moduleId: a.id, work, completedAt: "2026-10-26", updatedAt: "2026-10-26", version: 1 },
    ];
    expect(moduleUnlocked(course, course.modules[1]!.id, marks)).toBe(true);
    expect(moduleUnlocked(course, course.modules[2]!.id, marks)).toBe(false);
  });
  it("entrega o mesmo currículo ao Android com ID próprio e não altera o conteúdo antigo", () => {
    const content = buildStudyEditorial();
    expect(content.courses["course:queda-graca-providencia"]).toEqual({
      ...course,
      id: `course:${course.id}`,
    });
    expect(content.courses["course:genesis-1"]!.id).toBe("genesis-1");
    expect(Object.keys(content.lessons)).toHaveLength(111);
  });
});
