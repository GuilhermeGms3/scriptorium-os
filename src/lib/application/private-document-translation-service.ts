import type { LocalTranslation } from "../domain/semantic-content";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { LocalTranslationRepository } from "../repositories/local-translation-repository";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";
import { LocalTranslationService } from "./local-translation-service";

export interface PrivateTranslationProgress {
  completed: number;
  total: number;
  sourceId?: string;
}

export const PrivateDocumentTranslationService = {
  async listAccepted(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<LocalTranslation[]> {
    const accepted = await DocumentKnowledgeRepository.listProposals(
      documentId,
      { reviewStatus: "accepted", limit: 2_000 },
      database,
    );
    return LocalTranslationRepository.listForSources(
      "private-segment",
      accepted.map((proposal) => proposal.semanticUnitId),
      database,
    );
  },

  async translateAccepted(
    documentId: string,
    listener?: (progress: PrivateTranslationProgress) => void,
    database?: WorkspaceDatabase,
  ): Promise<LocalTranslation[]> {
    const accepted = await DocumentKnowledgeRepository.listProposals(
      documentId,
      { reviewStatus: "accepted", limit: 2_000 },
      database,
    );
    const unitIds = [...new Set(accepted.map((proposal) => proposal.semanticUnitId))];
    const units = await DocumentKnowledgeRepository.listUnits(documentId, unitIds, database);
    const translatable = units.filter((unit) => /^en(?:-|$)/iu.test(unit.language));
    if (!translatable.length)
      throw new Error("Nenhuma unidade aceita em inglês está disponível para tradução.");

    const translations: LocalTranslation[] = [];
    listener?.({ completed: 0, total: translatable.length });
    for (const [index, unit] of translatable.entries()) {
      translations.push(
        await LocalTranslationService.translate(
          {
            sourceKind: "private-segment",
            sourceId: unit.id,
            sourceLanguage: unit.language,
            targetLanguage: "pt-BR",
            text: unit.text,
          },
          database,
        ),
      );
      listener?.({ completed: index + 1, total: translatable.length, sourceId: unit.id });
    }
    return translations;
  },

  async review(
    translationId: string,
    translatedText: string,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    await LocalTranslationRepository.review(translationId, translatedText, database);
  },
};
