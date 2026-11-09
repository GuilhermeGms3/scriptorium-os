import { STUDY_MAP_NODES, STUDY_MAP_EDGES } from "./study-learning-map";

const positions: Readonly<Record<string, readonly [number, number]>> = {
  "study-origin": [90, 380],
  "journey:biblia": [310, 140],
  "journey:teologia": [310, 330],
  "journey:historia": [310, 530],
  "journey:literatura": [310, 680],
  "path:exegese-recepcao": [590, 70],
  "path:hermeneutica-metodos": [590, 175],
  "path:trindade-cristologia": [570, 260],
  "path:etica-soteriologia": [790, 260],
  "path:escatologia": [990, 320],
  "path:pneumatologia": [570, 370],
  "path:hamartiologia-justificacao": [790, 405],
  "path:sacramentos-santificacao": [990, 455],
  "path:patristica": [580, 520],
  "path:eclesiologia-liturgia": [810, 570],
  "path:gnosticismo": [590, 680],
};
export const STUDY_SKILL_NODES = STUDY_MAP_NODES.map((node) => {
  const position = positions[node.id];
  if (!position) throw new Error(`Conceito sem posição: ${node.id}`);
  return { ...node, x: position[0], y: position[1] };
});
export function studyNodeState(
  id: string,
  completed: ReadonlySet<string>,
): "completed" | "available" | "locked" {
  if (completed.has(id)) return "completed";
  if (id === "study-origin") return "available";
  const parents = STUDY_MAP_EDGES.filter((edge) => edge.to === id);
  return parents.length && parents.every((edge) => completed.has(edge.from))
    ? "available"
    : "locked";
}
