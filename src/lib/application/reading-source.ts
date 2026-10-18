import type { StudySource } from "../domain/study-notebook";
import type { NoteLink } from "../domain/study";
import type { PassageRef } from "../domain/scripture";
import { passageRefKey } from "../domain/scripture";
import type { WorkspacePassageKnowledgeItem } from "../domain/workspace-passage-knowledge";

export interface ReadingSource {
  source: StudySource;
  /** Selected local study when a source is opened from a topic. */
  studyId?: string;
  caption?: string;
  context?: string | undefined;
  links?: NoteLink[];
  /** Already-available quoted fragment, never fetched from the external web or auto-saved. */
  excerpt?: string;
  externalUrl?: string;
}
/** A bibliographic origin and a scheme-aware passage link, not a new academic claim. */
export function passageReadingSource(item: WorkspacePassageKnowledgeItem): ReadingSource {
  const analysis = item.passageRelation.payload.contextualAnalysis;
  const passage = item.passageRelation.payload.passage;
  const ref: PassageRef | undefined = passage.chapter
    ? {
        bookId: passage.bookId,
        chapter: passage.chapter,
        versificationSchemeId: passage.versificationSchemeId,
        ...(passage.workId ? { workId: passage.workId } : {}),
        ...(passage.verseStart ? { verseStart: passage.verseStart } : {}),
        ...(passage.verseEnd ? { verseEnd: passage.verseEnd } : {}),
      }
    : undefined;
  return {
    source: {
      kind: "private-document",
      documentId: item.document.id,
      unitId: item.unit.id,
      title: item.document.title,
      page: analysis?.sourceVisual?.physicalPage ?? (item.pages[0] ?? 0) + 1,
    },
    ...(analysis?.sourceVisual ? { caption: analysis.sourceVisual.caption } : {}),
    context: `${analysis?.title ?? item.context.sectionTitle ?? "Trecho relacionado"} · ${item.reviewState === "confirmed" ? "Ligação revisada" : "Ligação automática; auditoria pendente"}`,
    links: [
      { kind: "resource", target: item.document.sourceId, label: item.document.title },
      ...(ref
        ? [
            {
              kind: "passage" as const,
              target: passageRefKey(ref),
              label: item.passageRelation.payload.rawReference,
              anchor: { type: "passage" as const, ref },
            },
          ]
        : []),
    ],
  };
}
