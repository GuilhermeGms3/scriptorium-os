import type { CourseModule } from "../domain/study-course";
import type { WorkspacePassageKnowledgeItem } from "../domain/workspace-passage-knowledge";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";
import { WorkspacePassageKnowledgeService } from "./workspace-passage-knowledge-service";
import { passageRefsOverlap } from "../domain/scripture";

export interface CourseReading {
  item: WorkspacePassageKnowledgeItem;
  purpose: string;
}
/** Selection uses registered passage roles and source-backed context, never keyword coincidence. */
export function selectCourseReadings(
  module: CourseModule,
  items: readonly WorkspacePassageKnowledgeItem[],
): CourseReading[] {
  const found = new Map<string, CourseReading>();
  for (const item of items) {
    const relation = item.passageRelation.payload;
    if (item.reviewState === "pending" || !relation.contextualAnalysis || !item.unit.text.trim())
      continue;
    const matches = module.passages.filter((passage) =>
      passageRefsOverlap(passage.ref, {
        bookId: relation.passage.bookId,
        chapter: relation.passage.chapter ?? passage.ref.chapter,
        ...(relation.passage.workId ? { workId: relation.passage.workId } : {}),
        versificationSchemeId: relation.passage.versificationSchemeId,
        ...(relation.passage.verseStart ? { verseStart: relation.passage.verseStart } : {}),
        ...(relation.passage.verseEnd ? { verseEnd: relation.passage.verseEnd } : {}),
      }),
    );
    if (!matches.length) continue;
    const lexical = relation.referenceRole === "lexical-mention";
    if (lexical && !module.domains.includes("linguistics")) continue;
    const assignments = item.proposals.flatMap((proposal) =>
      proposal.payload.kind === "topic-assignment" ? [proposal.payload.domain] : [],
    );
    const contextModule = module.id === "contexto";
    if (contextModule && !assignments.some((domain) => module.domains.includes(domain))) continue;
    const purpose = lexical
      ? "Verificar o verbete e distinguir o uso lexical de um comentário da passagem."
      : `${matches[0]!.purpose} Compare a explicação desta fonte com a aula e registre o argumento do autor.`;
    found.set(item.unit.id, { item, purpose });
  }
  return [...found.values()].sort(
    (a, b) =>
      Number(b.item.reviewState === "confirmed") - Number(a.item.reviewState === "confirmed") ||
      a.item.document.title.localeCompare(b.item.document.title, "pt-BR") ||
      (a.item.pages[0] ?? 0) - (b.item.pages[0] ?? 0),
  );
}
export async function loadCourseReadings(module: CourseModule, database?: WorkspaceDatabase) {
  const results = await Promise.allSettled(
    module.passages.map((passage) =>
      WorkspacePassageKnowledgeService.load(passage.ref, null, database),
    ),
  );
  return {
    readings: selectCourseReadings(
      module,
      results.flatMap((result) => (result.status === "fulfilled" ? result.value.items : [])),
    ),
    incomplete: results.some((result) => result.status === "rejected"),
  };
}
