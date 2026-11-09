import { describe, expect, it } from "vitest";
import { buildTopicGraph } from "./study-topic-graph";
import type { StudyTopic } from "./study-topic-service";
import type { Note, Study } from "../domain/study";
import { describeStudyGuide } from "./study-topic-service";
import { studyGuideById } from "../content/study-guides";
import { OntologyEntitySchema } from "../domain/theology";

const topic: StudyTopic = {
  id: "doctrine:trinity",
  kind: "entity",
  title: "Trindade",
  description: "",
  terms: ["Trindade"],
};
const study: Study = {
  id: "study:one",
  title: "Caderno",
  slug: "caderno",
  items: [{ id: "link", kind: "concept", refId: topic.id, label: topic.title, addedAt: "" }],
  createdAt: "",
  updatedAt: "",
};
const a: Note = {
  id: "note:a",
  title: "Leitura A",
  body: "",
  links: [{ kind: "study", target: study.id, label: study.title }],
  color: "#aabbcc",
  createdAt: "",
  updatedAt: "",
};
const b: Note = { ...a, id: "note:b", title: "Leitura B" };

describe("study graph provenance", () => {
  it("connects a guide only to editorial topic IDs that actually exist in the catalog", () => {
    const guide = describeStudyGuide(studyGuideById("trindade-cristologia")!);
    const entity = OntologyEntitySchema.parse({
      id: topic.id,
      kind: "doctrine",
      labels: { canonicalName: "Trinity" },
    });
    const graph = buildTopicGraph(guide, undefined, [{ kind: "ontology", entity }], [], [], []);
    expect(graph.nodes.some((node) => node.id === topic.id)).toBe(true);
    expect(graph.nodes.some((node) => node.id === "doctrine:incarnation")).toBe(false);
    expect(graph.edges.find((edge) => edge.to === topic.id)).toMatchObject({
      kind: "catalog",
      label: "tema do percurso editorial",
    });
  });
  it("draws only actual study membership and stored note connections", () => {
    const connection = { sourceId: a.id, targetId: b.id, createdAt: "" };
    const graph = buildTopicGraph(
      topic,
      undefined,
      [],
      [study],
      [a, b],
      [connection, connection, { ...connection, targetId: "missing" }],
    );
    expect(graph.nodes.map((node) => node.id)).toEqual([topic.id, study.id, a.id, b.id]);
    expect(graph.edges.filter((edge) => edge.label === "conexão entre notas")).toHaveLength(1);
    expect(
      graph.edges.every(
        (edge) =>
          graph.nodes.some((node) => node.id === edge.from) &&
          graph.nodes.some((node) => node.id === edge.to),
      ),
    ).toBe(true);
    expect(graph.nodes.find((node) => node.id === a.id)?.color).toBe(a.color);
  });
  it("does not create connections from matching words or empty topics", () => {
    const unlinked = { ...a, title: "Trindade", body: "Uma nota sobre Trindade", links: [] };
    expect(buildTopicGraph(topic, undefined, [], [], [unlinked], []).nodes).toHaveLength(1);
    expect(buildTopicGraph(topic, undefined, [], [], [unlinked], []).edges).toEqual([]);
  });
});
