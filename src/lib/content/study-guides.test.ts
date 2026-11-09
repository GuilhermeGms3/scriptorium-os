import { describe, expect, it } from "vitest";
import { STUDY_MAP_NODES } from "./study-learning-map";
import { guideIdForNode, studyGuideById, studyForGuide, STUDY_GUIDES } from "./study-guides";
import type { Study } from "../domain/study";

describe("topic study guides", () => {
  it("gives every map node its own complete guide", () => {
    const ids = STUDY_MAP_NODES.map(guideIdForNode);
    expect(new Set(ids).size).toBe(STUDY_MAP_NODES.length);
    for (const id of ids) {
      const guide = studyGuideById(id)!;
      expect(guide).toBeDefined();
      expect(guide.modules.length).toBeGreaterThanOrEqual(1);
      expect(
        guide.modules.every((item) => item.explanation.length > 100 && item.questions.length > 0),
      ).toBe(true);
    }
  });
  it("names the center Teologia and keeps every related guide resolvable", () => {
    expect(STUDY_MAP_NODES[0]?.shortTitle).toBe("Teologia");
    expect(guideIdForNode(STUDY_MAP_NODES[0]!)).toBe("teologia");
    for (const guide of STUDY_GUIDES)
      for (const id of guide.relatedIds) expect(studyGuideById(id)).toBeDefined();
    expect(studyGuideById("unknown")).toBeUndefined();
  });
  it("uses specific curricula and sources instead of a global list for every topic", () => {
    const patristics = studyGuideById("patristica")!;
    const eschatology = studyGuideById("escatologia")!;
    expect(patristics.resources.some((resource) => resource.workId === "work:didache")).toBe(true);
    expect(eschatology.resources).toEqual([]);
    expect(patristics.modules[0]?.title).not.toBe(eschatology.modules[0]?.title);
    expect(
      eschatology.modules
        .flatMap((item) => item.passages)
        .some((item) => item.book === "revelation"),
    ).toBe(true);
  });
  it("resumes a renamed investigation by its stable guide marker before legacy titles", () => {
    const guide = studyGuideById("patristica")!;
    const old: Study = {
      id: "old",
      slug: "old",
      title: guide.title,
      items: [],
      createdAt: "",
      updatedAt: "",
    };
    const marked: Study = {
      ...old,
      id: "marked",
      title: "Minha pesquisa",
      items: [
        {
          id: "marker",
          kind: "concept",
          refId: `study-guide:${guide.id}`,
          label: guide.title,
          addedAt: "",
        },
      ],
    };
    expect(studyForGuide(guide, [old, marked])?.id).toBe("marked");
    expect(studyForGuide(guide, [old])?.id).toBe("old");
    expect(studyForGuide(guide, [])).toBeUndefined();
  });
});
