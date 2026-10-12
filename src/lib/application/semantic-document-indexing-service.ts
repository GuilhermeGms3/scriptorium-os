import {
  SEMANTIC_ENGINE_VERSION,
  analyzePrivateDocumentPage,
} from "../semantic-engine/deterministic-semantic-analyzer";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { SemanticContentRepository } from "../repositories/semantic-content-repository";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";

export interface SemanticIndexProgress {
  page: number;
  pageCount: number;
  segmentCount: number;
  passageLinkCount: number;
  message: string;
}

export interface SemanticIndexResult {
  documentId: string;
  segmentCount: number;
  passageLinkCount: number;
  duplicate: boolean;
}

/**
 * @deprecated Compatibility-only writer for workspaces created before schema 13.
 * New application flows use DocumentKnowledgePipelineService; accepted legacy
 * results are migrated by 013_canonical_document_knowledge.sql.
 */
export const SemanticDocumentIndexingService = {
  async indexDocument(
    documentId: string,
    listener?: (progress: SemanticIndexProgress) => void,
    database?: WorkspaceDatabase,
  ): Promise<SemanticIndexResult> {
    const document = await PrivateDocumentRepository.getDocument(documentId, database);
    if (!document) throw new Error("Documento privado não encontrado.");
    const existing = await SemanticContentRepository.getIndexSummary(documentId, database);
    if (
      existing?.status === "ready" &&
      existing.engineVersion === SEMANTIC_ENGINE_VERSION &&
      existing.sourceChecksum === document.checksum
    ) {
      return {
        documentId,
        segmentCount: existing.segmentCount,
        passageLinkCount: existing.passageLinkCount,
        duplicate: true,
      };
    }
    await SemanticContentRepository.beginIndex(
      documentId,
      SEMANTIC_ENGINE_VERSION,
      document.checksum,
      database,
    );
    let segmentCount = 0;
    let passageLinkCount = 0;
    try {
      for (let offset = 0; offset < document.pageCount; offset += 40) {
        const pages = await PrivateDocumentRepository.listPages(
          documentId,
          { offset, limit: 40 },
          database,
        );
        for (const page of pages) {
          const bundles = page.text ? await analyzePrivateDocumentPage(document, page) : [];
          await SemanticContentRepository.storePageBundles(bundles, database);
          segmentCount += bundles.length;
          passageLinkCount += bundles.reduce((sum, item) => sum + item.passageLinks.length, 0);
          listener?.({
            page: page.pageIndex + 1,
            pageCount: document.pageCount,
            segmentCount,
            passageLinkCount,
            message: `Analisando página ${page.pageIndex + 1} de ${document.pageCount}…`,
          });
        }
      }
      await SemanticContentRepository.completeIndex(
        documentId,
        segmentCount,
        passageLinkCount,
        database,
      );
      return { documentId, segmentCount, passageLinkCount, duplicate: false };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      await SemanticContentRepository.failIndex(documentId, message, database);
      throw cause;
    }
  },
};
