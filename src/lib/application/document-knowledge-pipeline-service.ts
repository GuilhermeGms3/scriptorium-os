import type { DocumentKnowledgeExport, KnowledgeProposal } from "../domain/document-knowledge";
import type { PrivateDocumentPage } from "../domain/private-document";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import {
  DeterministicDocumentKnowledgeAnalyzer,
  type DocumentKnowledgeAnalyzer,
} from "../semantic-engine/document-knowledge-analyzer";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";

const MAX_ANALYZABLE_CHARACTERS = 50_000_000;

export interface DocumentKnowledgeProgress {
  phase: "loading" | "structure" | "proposals" | "persisting" | "complete";
  current?: number;
  total?: number;
  message: string;
}

export interface DocumentKnowledgePipelineResult {
  documentId: string;
  nodeCount: number;
  unitCount: number;
  proposalCount: number;
  preservedReviewCount: number;
  duplicate: boolean;
}

async function loadPages(
  documentId: string,
  pageCount: number,
  listener: ((progress: DocumentKnowledgeProgress) => void) | undefined,
  database: WorkspaceDatabase | undefined,
  persistProgress: boolean,
): Promise<PrivateDocumentPage[]> {
  const pages: PrivateDocumentPage[] = [];
  let characters = 0;
  for (let offset = 0; offset < pageCount; offset += 100) {
    const batch = await PrivateDocumentRepository.listPages(
      documentId,
      { offset, limit: 100 },
      database,
    );
    for (const page of batch) {
      characters += page.text.length;
      if (characters > MAX_ANALYZABLE_CHARACTERS)
        throw new Error(
          "O texto extraído ultrapassa o limite de 50 milhões de caracteres para uma análise local.",
        );
      pages.push(page);
    }
    listener?.({
      phase: "loading",
      current: pages.length,
      total: pageCount,
      message: `Preparando ${pages.length} de ${pageCount} páginas…`,
    });
    if (persistProgress)
      await DocumentKnowledgeRepository.updateProgress(
        documentId,
        {
          stage: "structure",
          checkpointPage: pages.length,
          current: pages.length,
          total: pageCount,
          message: `Preparando ${pages.length} de ${pageCount} páginas…`,
        },
        database,
      );
  }
  return pages;
}

function preserveReview(
  proposal: KnowledgeProposal,
  previous: Map<string, KnowledgeProposal>,
): KnowledgeProposal {
  const reviewed = previous.get(proposal.id);
  if (!reviewed || reviewed.reviewStatus === "machine-proposed") return proposal;
  return {
    ...proposal,
    payload: reviewed.payload,
    reviewStatus: reviewed.reviewStatus,
    ...(reviewed.reviewedAt ? { reviewedAt: reviewed.reviewedAt } : {}),
    ...(reviewed.reviewNote ? { reviewNote: reviewed.reviewNote } : {}),
    createdAt: reviewed.createdAt,
    updatedAt: reviewed.updatedAt,
  };
}

async function allProposals(
  documentId: string,
  reviewStatus: KnowledgeProposal["reviewStatus"] | undefined,
  database: WorkspaceDatabase | undefined,
): Promise<KnowledgeProposal[]> {
  const result: KnowledgeProposal[] = [];
  for (let offset = 0; ; offset += 2_000) {
    const batch = await DocumentKnowledgeRepository.listProposals(
      documentId,
      { ...(reviewStatus ? { reviewStatus } : {}), limit: 2_000, offset },
      database,
    );
    result.push(...batch);
    if (batch.length < 2_000) return result;
  }
}

export const DocumentKnowledgePipelineService = {
  async analyzeDocument(
    documentId: string,
    listener?: (progress: DocumentKnowledgeProgress) => void,
    database?: WorkspaceDatabase,
    options: { force?: boolean; analyzer?: DocumentKnowledgeAnalyzer } = {},
  ): Promise<DocumentKnowledgePipelineResult> {
    const analyzer = options.analyzer ?? DeterministicDocumentKnowledgeAnalyzer;
    const document = await PrivateDocumentRepository.getDocument(documentId, database);
    if (!document) throw new Error("Documento privado não encontrado.");
    const existing = await DocumentKnowledgeRepository.getSummary(documentId, database);
    if (
      existing?.status === "ready" &&
      existing.analyzerId === analyzer.id &&
      existing.analyzerVersion === analyzer.version &&
      existing.sourceChecksum === document.checksum &&
      !options.force
    ) {
      return {
        documentId,
        nodeCount: existing.nodeCount,
        unitCount: existing.unitCount,
        proposalCount: existing.proposalCount,
        preservedReviewCount: 0,
        duplicate: true,
      };
    }

    const previous = new Map(
      (await allProposals(documentId, undefined, database)).map((proposal) => [
        proposal.id,
        proposal,
      ]),
    );
    try {
      const canExposeCheckpoint = existing?.status !== "ready";
      if (canExposeCheckpoint)
        await DocumentKnowledgeRepository.prepare(
          documentId,
          analyzer.id,
          analyzer.version,
          document.checksum,
          database,
        );
      const pages = await loadPages(
        documentId,
        document.pageCount,
        listener,
        database,
        canExposeCheckpoint,
      );
      listener?.({ phase: "structure", message: "Reconstruindo capítulos e seções…" });
      const analysis = await analyzer.analyze(document, pages);
      if (canExposeCheckpoint)
        await DocumentKnowledgeRepository.updateProgress(
          documentId,
          {
            stage: "proposals",
            checkpointPage: document.pageCount,
            current: analysis.units.length,
            total: analysis.units.length,
            message: "Estrutura e unidades reconstruídas.",
          },
          database,
        );
      listener?.({ phase: "proposals", message: "Preparando propostas auditáveis…" });
      const proposals = analysis.proposals.map((proposal) => preserveReview(proposal, previous));
      const preservedReviewCount = proposals.filter(
        (proposal) => proposal.reviewStatus !== "machine-proposed",
      ).length;

      listener?.({ phase: "persisting", message: "Gravando no workspace privado…" });
      await DocumentKnowledgeRepository.begin(
        documentId,
        analyzer.id,
        analyzer.version,
        document.checksum,
        database,
      );
      await DocumentKnowledgeRepository.storeNodes(analysis.nodes, database);
      await DocumentKnowledgeRepository.storeUnits(analysis.units, database);
      await DocumentKnowledgeRepository.storeProposals(proposals, database);
      await DocumentKnowledgeRepository.complete(
        documentId,
        {
          nodeCount: analysis.nodes.length,
          unitCount: analysis.units.length,
          proposalCount: proposals.length,
          checkpointPage: document.pageCount,
        },
        database,
      );
      const persisted = await DocumentKnowledgeRepository.getSummary(documentId, database);
      listener?.({ phase: "complete", message: "Livro desmontado e pronto para revisão." });
      return {
        documentId,
        nodeCount: persisted?.nodeCount ?? analysis.nodes.length,
        unitCount: persisted?.unitCount ?? analysis.units.length,
        proposalCount: persisted?.proposalCount ?? proposals.length,
        preservedReviewCount,
        duplicate: false,
      };
    } catch (cause) {
      const summary = await DocumentKnowledgeRepository.getSummary(documentId, database);
      if (summary?.status === "processing")
        await DocumentKnowledgeRepository.fail(
          documentId,
          cause instanceof Error ? cause.message : String(cause),
          database,
        );
      throw cause;
    }
  },

  async exportAccepted(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<DocumentKnowledgeExport> {
    const document = await PrivateDocumentRepository.getDocument(documentId, database);
    if (!document) throw new Error("Documento privado não encontrado.");
    const proposals = await allProposals(documentId, "accepted", database);
    const evidenceUnits = await DocumentKnowledgeRepository.listUnits(
      documentId,
      proposals.map((proposal) => proposal.semanticUnitId),
      database,
    );
    return {
      format: "scriptorium-private-knowledge-export-v1",
      exportedAt: new Date().toISOString(),
      localOnly: true,
      requiresRightsReview: true,
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
