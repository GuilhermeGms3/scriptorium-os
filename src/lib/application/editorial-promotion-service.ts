import type {
  EditorialKnowledgeExport,
  EditorialReadinessIssue,
} from "../domain/document-knowledge";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { LocalTranslationRepository } from "../repositories/local-translation-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";

export const EditorialPromotionService = {
  async prepare(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<EditorialKnowledgeExport> {
    const document = await PrivateDocumentRepository.getDocument(documentId, database);
    if (!document) throw new Error("Documento privado não encontrado.");
    const proposals = await DocumentKnowledgeRepository.listProposals(
      documentId,
      { reviewStatus: "accepted", limit: 2_000 },
      database,
    );
    const unitIds = [...new Set(proposals.map((proposal) => proposal.semanticUnitId))];
    const evidenceUnits = await DocumentKnowledgeRepository.listUnits(
      documentId,
      unitIds,
      database,
    );
    const translations = await LocalTranslationRepository.listForSources(
      "private-segment",
      unitIds,
      database,
    );
    const issues: EditorialReadinessIssue[] = [
      {
        code: "private-rights",
        severity: "blocker",
        message:
          "A origem é uma biblioteca privada. Licença, citação permitida e redistribuição precisam de decisão editorial documentada.",
      },
    ];
    if (!proposals.some((proposal) => proposal.payload.kind === "passage-relation"))
      issues.push({
        code: "missing-passage",
        severity: "blocker",
        message: "Nenhuma relação bíblica aceita conecta o conteúdo a uma passagem.",
      });
    if (!evidenceUnits.length || evidenceUnits.some((unit) => !unit.spans.length))
      issues.push({
        code: "missing-evidence",
        severity: "blocker",
        message: "Há conhecimento sem unidade citável e localização verificável no documento.",
      });
    if (
      proposals.some(
        (proposal) =>
          (proposal.payload.kind === "claim" || proposal.payload.kind === "argument") &&
          proposal.payload.perspectiveProfileIds.length === 0,
      )
    )
      issues.push({
        code: "missing-perspective",
        severity: "warning",
        message: "Afirmações ou argumentos ainda não declaram sua perspectiva interpretativa.",
      });
    if (translations.some((translation) => translation.reviewStatus === "machine-generated"))
      issues.push({
        code: "machine-translation",
        severity: "warning",
        message: "Há traduções de máquina que ainda exigem revisão humana.",
      });

    return {
      format: "scriptorium-editorial-staging-v1",
      exportedAt: new Date().toISOString(),
      localOnly: true,
      requiresRightsReview: true,
      publicationAllowed: false,
      readiness: {
        status: issues.some((issue) => issue.severity === "blocker") ? "blocked" : "needs-review",
        issues,
      },
      document: {
        id: document.id,
        sourceId: document.sourceId,
        title: document.title,
        checksum: document.checksum,
      },
      structure: await DocumentKnowledgeRepository.listNodes(documentId, database),
      evidenceUnits,
      proposals,
    };
  },
};
