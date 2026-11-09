import type { ExplorerEntity, KnowledgeExplorerBundle } from "./knowledge-query-service";
import type { StudyTopic } from "./study-topic-service";
import { editorialEntityIdsForGuide, notesForTopic, studiesForTopic } from "./study-topic-service";
import { studyEntityTitle } from "../content/study-knowledge";
import type { Note, Study } from "../domain/study";
import type { NoteConnection } from "../domain/study-notebook";
import { studyGuideById } from "../content/study-guides";
import { knowledgeSourceLinks } from "../content/knowledge-presentation";

export interface TopicGraphNode {
  id: string;
  title: string;
  kind: "topic" | "entity" | "guide" | "group" | "note";
  color?: string;
}
export interface TopicGraphEdge {
  from: string;
  to: string;
  label: string;
  kind: "catalog" | "personal";
}
export function buildTopicGraph(
  topic: StudyTopic,
  bundle: KnowledgeExplorerBundle | undefined,
  entities: readonly ExplorerEntity[],
  studies: readonly Study[],
  notes: readonly Note[],
  connections: readonly NoteConnection[],
) {
  const nodes = new Map<string, TopicGraphNode>([
    [topic.id, { id: topic.id, title: topic.title, kind: "topic" }],
  ]);
  const edges: TopicGraphEdge[] = [];
  const byId = new Map(entities.map((item) => [item.entity.id, item]));
  const guideIds =
    topic.kind === "guide" ? (topic.guide?.relatedIds ?? []) : topic.guide ? [topic.guide.id] : [];
  for (const guideId of guideIds) {
    const guide = studyGuideById(guideId);
    if (!guide) continue;
    const id = `study-guide:${guide.id}`;
    if (id === topic.id) continue;
    nodes.set(id, { id, title: guide.title, kind: "guide" });
    edges.push({
      from: topic.id,
      to: id,
      label: "percurso editorial relacionado",
      kind: "catalog",
    });
  }
  function catalogNeighbor(id: string, label: string) {
    if (id === topic.id) return;
    const item = byId.get(id);
    if (!item) return;
    nodes.set(id, { id, title: studyEntityTitle(item), kind: "entity" });
    edges.push({ from: topic.id, to: id, label, kind: "catalog" });
  }
  if (topic.kind === "guide" && topic.guide) {
    for (const id of editorialEntityIdsForGuide(topic.guide.id))
      catalogNeighbor(id, "tema do percurso editorial");
    const workIds = new Set(topic.guide.resources.map((resource) => resource.workId));
    for (const item of entities)
      if (
        item.kind === "knowledge" &&
        ["historical-source", "work"].includes(item.entity.type) &&
        knowledgeSourceLinks(item.entity.id).some((source) => workIds.has(source.workId))
      )
        catalogNeighbor(item.entity.id, "fonte indicada no percurso");
  }
  for (const relation of bundle?.ontologyRelations ?? []) {
    if (relation.fromEntityId === topic.id)
      catalogNeighbor(relation.toEntityId, relation.relationType);
    else if (relation.toEntityId === topic.id)
      catalogNeighbor(relation.fromEntityId, relation.relationType);
  }
  for (const relation of bundle?.knowledgeRelations ?? []) {
    if (
      relation.from.type === "entity" &&
      relation.from.entityId === topic.id &&
      relation.to.type === "entity"
    )
      catalogNeighbor(relation.to.entityId, relation.relation.value);
    else if (
      relation.to.type === "entity" &&
      relation.to.entityId === topic.id &&
      relation.from.type === "entity"
    )
      catalogNeighbor(relation.from.entityId, relation.relation.value);
  }
  const selected = bundle?.selected;
  if (selected?.kind === "ontology") {
    if (selected.entity.kind === "doctrine")
      for (const id of selected.entity.topicIds) catalogNeighbor(id, "campo declarado");
    if (selected.entity.kind === "theological-topic" && selected.entity.parentTopicId)
      catalogNeighbor(selected.entity.parentTopicId, "campo de origem");
    if (selected.entity.kind === "position")
      for (const id of selected.entity.doctrineIds) catalogNeighbor(id, "doutrina abordada");
  }
  const groups = studiesForTopic(topic, studies, notes);
  for (const group of groups) {
    nodes.set(group.id, {
      id: group.id,
      title: group.title,
      kind: "group",
      ...(group.color ? { color: group.color } : {}),
    });
    edges.push({
      from: topic.id,
      to: group.id,
      label: group.items.some((item) => item.kind === "concept" && item.refId === topic.id)
        ? "grupo associado por você"
        : "contém nota sobre o tema",
      kind: "personal",
    });
  }
  const topicNotes = notesForTopic(topic, studies, notes).slice(0, 48);
  for (const note of topicNotes) {
    nodes.set(note.id, {
      id: note.id,
      title: note.title,
      kind: "note",
      ...(note.color ? { color: note.color } : {}),
    });
    const group = groups.find((candidate) =>
      note.links.some((link) => link.kind === "study" && link.target === candidate.id),
    );
    edges.push({
      from: group?.id ?? topic.id,
      to: note.id,
      label: group ? "nota do grupo" : "nota ligada ao tema",
      kind: "personal",
    });
  }
  for (const connection of connections)
    if (nodes.has(connection.sourceId) && nodes.has(connection.targetId))
      edges.push({
        from: connection.sourceId,
        to: connection.targetId,
        label: "conexão entre notas",
        kind: "personal",
      });
  return {
    nodes: [...nodes.values()],
    edges: [
      ...new Map(edges.map((edge) => [`${edge.from}:${edge.to}:${edge.label}`, edge])).values(),
    ],
    omittedNotes: Math.max(0, notesForTopic(topic, studies, notes).length - topicNotes.length),
  };
}
