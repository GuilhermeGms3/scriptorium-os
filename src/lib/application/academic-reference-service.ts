import type { AcademicResult } from "../domain/academic-search";
import { SourceImportService } from "./source-import-service";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";

export function academicCsl(result: AcademicResult): string {
  const type =
    result.publicationType === "book"
      ? "book"
      : result.publicationType === "book-chapter"
        ? "chapter"
        : result.publicationType === "dissertation"
          ? "thesis"
          : result.publicationType === "article"
            ? "article-journal"
            : "manuscript";
  return JSON.stringify([
    {
      id: result.id,
      type,
      title: result.title,
      author: result.authors.map((name) => ({ literal: name })),
      ...(result.year !== undefined ? { issued: { "date-parts": [[result.year]] } } : {}),
      ...(result.language ? { language: result.language } : {}),
      ...(result.doi ? { DOI: result.doi } : {}),
      URL: result.url,
      provider: result.provider,
      ...(result.venue ? { "container-title": result.venue } : {}),
    },
  ]);
}
export const AcademicReferenceService = {
  async save(
    result: AcademicResult,
    database?: WorkspaceDatabase,
  ): Promise<{ sourceId: string; existing: boolean }> {
    const db = database ?? (await getWorkspaceDatabase());
    const report = await SourceImportService.import("csl-json", academicCsl(result), db);
    if (report.invalid || (!report.imported && !report.duplicates))
      throw new Error(
        "Não foi possível guardar a referência bibliográfica. O resultado externo continua disponível.",
      );
    let sourceId = report.sourceIds[0];
    if (!sourceId) {
      const rows = await db.query(
        "SELECT source_id FROM source_identifiers WHERE (scheme='url' AND normalized_value=?) OR (scheme='doi' AND normalized_value=?) LIMIT 1",
        [result.url, result.doi?.toLowerCase() ?? ""],
      );
      sourceId = typeof rows[0]?.["source_id"] === "string" ? rows[0]["source_id"] : undefined;
    }
    if (!sourceId)
      throw new Error(
        "Uma referência semelhante já existe na Biblioteca. Confira o registro antes de criar outra.",
      );
    notifyKnowledgeMutation();
    return { sourceId, existing: report.duplicates > 0 };
  },
};
