import { PrimarySourceRepository } from "../repositories/primary-source-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type { StudySource } from "../domain/study-notebook";

interface TextDependencies {
  page: (documentId: string, index: number) => Promise<{ text: string } | null>;
  unit: (workId: string, unitId: string) => Promise<{ text: string } | null>;
}
/** Fetch the exact anchor; an FTS snippet is never substituted for the original text. */
export async function loadTopicReadingText(
  source: StudySource,
  dependencies: TextDependencies = {
    page: (id, index) => PrivateDocumentRepository.getPage(id, index),
    unit: (id, unit) => PrimarySourceRepository.getUnit(id, unit),
  },
): Promise<string | null> {
  if (source.kind === "bibliographic" || (source.kind === "primary-text" && !source.unitId))
    return null;
  const record =
    source.kind === "private-document"
      ? await dependencies.page(source.documentId, source.page - 1)
      : await dependencies.unit(source.workId, source.unitId!);
  if (!record) throw new Error("O trecho original não está disponível neste workspace.");
  return record.text;
}
