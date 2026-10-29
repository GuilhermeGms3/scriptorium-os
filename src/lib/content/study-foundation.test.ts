import { describe, expect, it } from "vitest";
import { STUDY_MAP_EDGES, STUDY_MAP_NODES } from "./study-learning-map";
import { STUDY_SKILL_NODES, studyNodeState } from "./study-skill-tree";
import { KNOWING_GOD_COURSE } from "./study-courses/knowing-god";
import { guideCourse } from "./study-courses/guide-course";
import { STUDY_GUIDES, guideIdForNode } from "./study-guides";
import { chapterFoundation } from "./study-lessons/foundations-metadata";
import { buildStudyEditorial } from "../../../scripts/mobile/study-editorial";

describe("formação e fundamentação", () => {
  it("preserva conceitos e relações, com avanço visual para a direita e sem liberação por notas", () => {
    expect(STUDY_SKILL_NODES.map((node) => node.id)).toEqual(
      STUDY_MAP_NODES.map((node) => node.id),
    );
    const nodes = new Map(STUDY_SKILL_NODES.map((node) => [node.id, node]));
    const complete = new Set<string>();
    expect(studyNodeState("study-origin", complete)).toBe("available");
    expect(studyNodeState("journey:biblia", complete)).toBe("locked");
    complete.add("study-origin");
    expect(studyNodeState("journey:biblia", complete)).toBe("available");
    expect(studyNodeState("path:exegese-recepcao", complete)).toBe("locked");
    complete.add("journey:biblia");
    expect(studyNodeState("journey:biblia", complete)).toBe("completed");
    expect(studyNodeState("path:exegese-recepcao", complete)).toBe("available");
    for (const edge of STUDY_MAP_EDGES)
      expect(nodes.get(edge.to)!.x).toBeGreaterThan(nodes.get(edge.from)!.x);
    for (const node of STUDY_SKILL_NODES) expect(guideCourse(guideIdForNode(node))).not.toBeNull();
  });

  it("expõe afirmação, perspectiva, localizador e limite para os seis módulos iniciais", () => {
    expect(KNOWING_GOD_COURSE.id).toBe("conhecer-para-amar");
    expect(KNOWING_GOD_COURSE.title).toBe("Conhecimento de Deus — fé e razão");
    for (const module of KNOWING_GOD_COURSE.modules) {
      expect(module.foundation?.length).toBeGreaterThan(0);
      for (const foundation of module.foundation!) {
        expect(foundation.claim.length).toBeGreaterThan(20);
        expect(foundation.basis.length).toBeGreaterThan(20);
        expect(foundation.alternatives.length).toBeGreaterThan(30);
        for (const source of foundation.sources) {
          expect(new URL(source.url).protocol).toBe("https:");
          for (const key of ["locator", "perspective", "supports", "limit"] as const)
            expect(source[key].trim().length).toBeGreaterThan(0);
        }
      }
    }
    const archaeology = KNOWING_GOD_COURSE.modules
      .flatMap((module) => module.foundation ?? [])
      .find((item) => item.area === "Arqueologia")!;
    expect(archaeology.status).toBe("Registro material");
    expect(archaeology.sources[0]!.limit).toContain("não demonstra");
    expect(archaeology.sources[0]!.url).toContain("imj.org.il");
  });

  it("não transforma bibliografia genérica em comprovação frase a frase", () => {
    expect(chapterFoundation("unknown", ["missing"])).toEqual([]);
    const social = chapterFoundation("method:social-scientific", ["dei-verbum"])[0]!;
    expect(social.area).toBe("Antropologia social");
    expect(social.status).toBe("Bibliografia temática");
    expect(social.sources[0]!.limit).toContain("Não há atribuição automática");
    expect(chapterFoundation("doctrine:anthropology", ["dei-verbum"])[0]!.area).toBe("Teologia");
    const editorial = buildStudyEditorial();
    for (const chapter of Object.values(editorial.chapters)) {
      if (chapter.references.length)
        expect(chapter.foundation?.length, chapter.id).toBeGreaterThan(0);
    }
  });

  it("converte os guias para o repositório de progresso existente sem perder capítulos ou leituras", () => {
    expect(guideCourse("nonexistent")).toBeNull();
    for (const guide of STUDY_GUIDES) {
      const course = guideCourse(guide.id)!;
      const module = course.modules[0]!;
      expect(course.id).toBe(`guia-${guide.id}`);
      expect(module.lessons.length).toBeGreaterThan(0);
      expect(module.lessons.every((lesson) => lesson.sections.length === 4)).toBe(true);
      expect(new Set(module.passages.map((passage) => passage.id)).size).toBe(
        module.passages.length,
      );
      expect(module.activity.criteria).toHaveLength(3);
      expect(module.foundation?.length).toBeGreaterThan(0);
    }
  });
});
