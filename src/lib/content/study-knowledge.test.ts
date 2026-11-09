import { describe, expect, it } from "vitest";
import { ENTITY_TYPES } from "../domain/knowledge";
import { OntologyEntitySchema } from "../domain/theology";
import {
  groupStudyKnowledge,
  STUDY_KNOWLEDGE_BRANCHES,
  studyKnowledgeBranch,
} from "./study-knowledge";

describe("knowledge integrated into studies", () => {
  it("places every supported entity kind exactly once so no catalog entries disappear", () => {
    const kinds = [
      ...ENTITY_TYPES,
      ...OntologyEntitySchema.options.map((schema) => schema.shape.kind.value),
    ];
    for (const kind of kinds) {
      expect(
        STUDY_KNOWLEDGE_BRANCHES.filter((branch) =>
          (branch.kinds as readonly string[]).includes(kind),
        ),
      ).toHaveLength(1);
    }
  });
  it("preserves identity and keeps editorial grouping distinct from doctrinal evidence", () => {
    const doctrine = OntologyEntitySchema.parse({
      id: "doctrine:trinity",
      kind: "doctrine",
      labels: { canonicalName: "Trinity" },
      sourceIds: ["source:creed"],
    });
    const item = { kind: "ontology" as const, entity: doctrine };
    const groups = groupStudyKnowledge([item]);
    expect(studyKnowledgeBranch(item)?.journeyId).toBe("teologia");
    expect(groups.flatMap((group) => group.entities)).toEqual([item]);
    expect(groups.find((group) => group.entities.length)?.entities[0]).toBe(item);
    expect(doctrine.sourceIds).toEqual(["source:creed"]);
    expect(groupStudyKnowledge([]).every((group) => group.entities.length === 0)).toBe(true);
  });
});
