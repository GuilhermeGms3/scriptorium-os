import type { ExplorerEntity } from "../application/knowledge-query-service";
import type { StudyJourneyId } from "./study-learning-map";
import { knowledgeLabel } from "./knowledge-presentation";

/** Pedagogical placement, not an inferred doctrinal relation or a claim of agreement. */
export const STUDY_KNOWLEDGE_BRANCHES = [
  {
    id: "reading-methods",
    title: "Caminhos de interpretação",
    journeyId: "biblia",
    kinds: ["method", "epistemic-stance", "interpretive-framework", "theory"],
  },
  {
    id: "doctrinal-questions",
    title: "Questões da fé",
    journeyId: "teologia",
    kinds: ["doctrine", "position"],
  },
  {
    id: "theological-fields",
    title: "Campos da teologia",
    journeyId: "teologia",
    kinds: ["theological-topic"],
  },
  { id: "ideas", title: "Ideias fundamentais", journeyId: "teologia", kinds: ["concept"] },
  {
    id: "communities",
    title: "Tradições em diálogo",
    journeyId: "historia",
    kinds: ["tradition", "school"],
  },
  {
    id: "witnesses",
    title: "Vozes da história",
    journeyId: "historia",
    kinds: ["historical-source", "person", "place", "event"],
  },
  {
    id: "texts",
    title: "Obras e testemunhos",
    journeyId: "literatura",
    kinds: ["work", "manuscript", "passage", "word"],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  journeyId: StudyJourneyId;
  kinds: readonly string[];
}[];

export type StudyKnowledgeBranch = (typeof STUDY_KNOWLEDGE_BRANCHES)[number];

export function studyEntityTitle(item: ExplorerEntity): string {
  return knowledgeLabel(
    item.entity.id,
    item.kind === "knowledge" ? item.entity.name : item.entity.labels.canonicalName,
  );
}

export function studyKnowledgeBranch(item: ExplorerEntity): StudyKnowledgeBranch | undefined {
  const kind = item.kind === "knowledge" ? item.entity.type : item.entity.kind;
  return STUDY_KNOWLEDGE_BRANCHES.find((branch) =>
    (branch.kinds as readonly string[]).includes(kind),
  );
}

export function groupStudyKnowledge(entities: readonly ExplorerEntity[]) {
  return STUDY_KNOWLEDGE_BRANCHES.map((branch) => ({
    ...branch,
    entities: entities
      .filter((entity) => studyKnowledgeBranch(entity)?.id === branch.id)
      .sort((a, b) => studyEntityTitle(a).localeCompare(studyEntityTitle(b), "pt-BR")),
  }));
}
