import { describe, expect, it } from "vitest";
import type { Study } from "../domain/study";
import {
  STUDY_JOURNEYS,
  STUDY_MAP_EDGES,
  STUDY_MAP_NODES,
  journeyStartCount,
  studyPathById,
  studyPathProgress,
} from "./study-learning-map";

const startedStudy: Study = {
  id: "study:1",
  slug: "patristica-1",
  title: "Patrística e cristianismo antigo",
  items: [
    {
      id: "item:1",
      kind: "resource",
      refId: "work:didache",
      label: "Didaquê",
      addedAt: "2026-10-11T00:00:00.000Z",
    },
  ],
  createdAt: "2026-10-11T00:00:00.000Z",
  updatedAt: "2026-10-11T00:00:00.000Z",
};

describe("study learning map", () => {
  it("keeps every edge attached to an existing node", () => {
    const nodeIds = new Set(STUDY_MAP_NODES.map((node) => node.id));
    for (const edge of STUDY_MAP_EDGES) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it("derives started progress only from a real local study", () => {
    const path = studyPathById("patristica");
    expect(path).toBeDefined();
    expect(studyPathProgress(path!, [startedStudy])).toMatchObject({
      state: "started",
      study: startedStudy,
      collectedItems: 1,
    });
  });

  it("does not present an empty path as available content", () => {
    const path = studyPathById("escatologia");
    expect(path).toBeDefined();
    expect(studyPathProgress(path!, [])).toEqual({
      state: "collection-gap",
      collectedItems: 0,
    });
  });

  it("counts initiated paths per journey without claiming completion", () => {
    const history = STUDY_JOURNEYS.find((journey) => journey.id === "historia");
    expect(history).toBeDefined();
    expect(journeyStartCount(history!, [startedStudy])).toBe(1);
  });
});
