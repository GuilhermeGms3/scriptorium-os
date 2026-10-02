import type { LocalTranslation } from "../domain/semantic-content";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { LocalTranslationRepository } from "../repositories/local-translation-repository";
import { PrivateTranslationJobRepository } from "../repositories/private-translation-job-repository";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";
import { LocalTranslationService } from "./local-translation-service";

export interface PrivateTranslationProgress {
  completed: number;
  total: number;
  sourceId?: string;
}

export interface PrivateTranslationOptions {
  signal?: AbortSignal;
}

export const PrivateDocumentTranslationService = {
  getJob: PrivateTranslationJobRepository.get,

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
    options: PrivateTranslationOptions = {},
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
    let completed = 0;
    let lastSourceId: string | undefined;
    await PrivateTranslationJobRepository.save(
      {
        documentId,
        status: "running",
        completedCount: 0,
        totalCount: translatable.length,
      },
      database,
    );
    listener?.({ completed, total: translatable.length });
    try {
      for (const unit of translatable) {
        if (options.signal?.aborted) throw new DOMException("Tradução cancelada.", "AbortError");
        const request = {
          sourceKind: "private-segment" as const,
          sourceId: unit.id,
          sourceLanguage: unit.language,
          targetLanguage: "pt-BR",
          text: unit.text,
        };
        const translation =
          (await LocalTranslationService.findCached(request, database)) ??
          (await LocalTranslationService.translate(
            request,
            database,
            options.signal ? { signal: options.signal } : {},
          ));
        translations.push(translation);
        completed += 1;
        lastSourceId = unit.id;
        await PrivateTranslationJobRepository.save(
          {
            documentId,
            status: completed === translatable.length ? "complete" : "running",
            completedCount: completed,
            totalCount: translatable.length,
            lastSourceId,
          },
          database,
        );
        listener?.({ completed, total: translatable.length, sourceId: unit.id });
      }
      return translations;
    } catch (cause) {
      const cancelled =
        options.signal?.aborted || (cause instanceof DOMException && cause.name === "AbortError");
      await PrivateTranslationJobRepository.save(
        {
          documentId,
          status: cancelled ? "paused" : "failed",
          completedCount: completed,
          totalCount: translatable.length,
          ...(lastSourceId ? { lastSourceId } : {}),
          ...(!cancelled ? { error: cause instanceof Error ? cause.message : String(cause) } : {}),
        },
        database,
      );
      if (cancelled)
        throw new Error("Tradução pausada. Ao retomar, unidades já traduzidas serão reutilizadas.");
      throw cause;
    }
  },

  async review(
    translationId: string,
    translatedText: string,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    await LocalTranslationRepository.review(translationId, translatedText, database);
  },
};
