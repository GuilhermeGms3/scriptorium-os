import type { DocumentKnowledgeExport, KnowledgeProposal } from "../domain/document-knowledge";
import type { PrivateDocumentPage } from "../domain/private-document";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import {
  DeterministicDocumentKnowledgeAnalyzer,
  type DocumentKnowledgeAnalyzer,
  type DocumentKnowledgeAnalyzerCheckpoint,
} from "../semantic-engine/document-knowledge-analyzer";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";

const MAX_ANALYZABLE_CHARACTERS = 50_000_000;
const ANALYSIS_BATCH_SIZE = 50;

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

/** Text checksum suffix of a unit id (`…:unit:<ordinal>:<checksum12>`). */
function unitChecksum(unitId: string): string {
  return unitId.split(":").at(-1) ?? unitId;
}

/**
 * A human decision must survive an analyzer upgrade. When the new analysis no longer emits
 * a reviewed proposal's id (its payload changed: a fixed qualifier, a better classification),
 * the review is kept and re-attached to the unit that still has the same text checksum.
 * Reviews whose text is gone (the page was re-extracted differently) cannot be re-anchored.
 */
function carryOverOrphanedReviews(
  emittedProposalIds: ReadonlySet<string>,
  unitIds: Iterable<string>,
  previous: Map<string, KnowledgeProposal>,
): KnowledgeProposal[] {
  const unitByChecksum = new Map([...unitIds].map((unitId) => [unitChecksum(unitId), unitId]));
  return [...previous.values()].flatMap((reviewed) => {
    if (reviewed.reviewStatus === "machine-proposed" || emittedProposalIds.has(reviewed.id))
      return [];
    const unitId = unitByChecksum.get(unitChecksum(reviewed.semanticUnitId));
    return unitId ? [{ ...reviewed, semanticUnitId: unitId }] : [];
  });
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
      let preservedReviewCount = 0;
      let analyzedNodeCount = 0;
      let analyzedUnitCount = 0;
      let analyzedProposalCount = 0;

      if (analyzer.analyzeBatch) {
        const savedProgress = await DocumentKnowledgeRepository.getProgress(documentId, database);
        const canResume =
          !options.force &&
          existing !== null &&
          (existing.status === "failed" || existing.status === "processing") &&
          existing.analyzerId === analyzer.id &&
          existing.analyzerVersion === analyzer.version &&
          existing.sourceChecksum === document.checksum &&
          existing.checkpointPage > 0 &&
          savedProgress?.analyzerCheckpoint !== undefined;
        let offset = canResume ? existing.checkpointPage : 0;
        let analyzerCheckpoint: DocumentKnowledgeAnalyzerCheckpoint | undefined = canResume
          ? savedProgress.analyzerCheckpoint
          : undefined;
        const emittedProposalIds = new Set<string>();
        const analyzedUnitIds: string[] = [];

        if (canResume) await DocumentKnowledgeRepository.resume(documentId, database);
        else
          await DocumentKnowledgeRepository.begin(
            documentId,
            analyzer.id,
            analyzer.version,
            document.checksum,
            database,
          );

        while (offset < document.pageCount) {
          const pages = await PrivateDocumentRepository.listPages(
            documentId,
            { offset, limit: ANALYSIS_BATCH_SIZE },
            database,
          );
          if (!pages.length)
            throw new Error(
              `O documento informa ${document.pageCount} páginas, mas a página ${offset + 1} não está disponível.`,
            );
          listener?.({
            phase: "loading",
            current: offset,
            total: document.pageCount,
            message: `Lendo páginas ${offset + 1}–${offset + pages.length} de ${document.pageCount}…`,
          });
          listener?.({
            phase: "structure",
            current: offset,
            total: document.pageCount,
            message: "Reconstruindo capítulos, seções e unidades semânticas…",
          });
          const batch = await analyzer.analyzeBatch(document, pages, analyzerCheckpoint);
          if (batch.checkpoint.processedCharacters > MAX_ANALYZABLE_CHARACTERS)
            throw new Error(
              "O texto extraído ultrapassa o limite de 50 milhões de caracteres para uma análise local.",
            );
          const proposals = batch.proposals.map((proposal) => preserveReview(proposal, previous));
          preservedReviewCount += proposals.filter(
            (proposal) => proposal.reviewStatus !== "machine-proposed",
          ).length;

          listener?.({
            phase: "persisting",
            current: offset,
            total: document.pageCount,
            message: "Gravando este lote no workspace privado…",
          });
          await DocumentKnowledgeRepository.storeNodes(batch.nodes, database);
          await DocumentKnowledgeRepository.storeUnits(batch.units, database);
          await DocumentKnowledgeRepository.storeProposals(proposals, database);
          for (const proposal of proposals) emittedProposalIds.add(proposal.id);
          for (const unit of batch.units) analyzedUnitIds.push(unit.id);

          offset += pages.length;
          analyzerCheckpoint = batch.checkpoint;
          analyzedNodeCount += batch.nodes.length;
          analyzedUnitCount += batch.units.length;
          analyzedProposalCount += proposals.length;
          await DocumentKnowledgeRepository.updateProgress(
            documentId,
            {
              stage: "proposals",
              checkpointPage: offset,
              current: offset,
              total: document.pageCount,
              message: `${offset} de ${document.pageCount} páginas analisadas e persistidas.`,
              analyzerCheckpoint,
            },
            database,
          );
        }

        // Reviews whose proposal the new analyzer no longer emits are re-attached once every
        // batch is known. On a resumed run, proposals stored by earlier batches count as emitted.
        if (canResume)
          for (const stored of await allProposals(documentId, undefined, database)) {
            emittedProposalIds.add(stored.id);
            analyzedUnitIds.push(stored.semanticUnitId);
          }
        const carried = carryOverOrphanedReviews(emittedProposalIds, analyzedUnitIds, previous);
        if (carried.length) {
          await DocumentKnowledgeRepository.storeProposals(carried, database);
          preservedReviewCount += carried.length;
          analyzedProposalCount += carried.length;
        }
      } else {
        const pages = await loadPages(documentId, document.pageCount, listener, database);
        listener?.({ phase: "structure", message: "Reconstruindo capítulos e seções…" });
        const analysis = await analyzer.analyze(document, pages);
        listener?.({ phase: "proposals", message: "Preparando propostas auditáveis…" });
        const proposals = [
          ...analysis.proposals.map((proposal) => preserveReview(proposal, previous)),
          ...carryOverOrphanedReviews(
            new Set(analysis.proposals.map((proposal) => proposal.id)),
            analysis.units.map((unit) => unit.id),
            previous,
          ),
        ];
        preservedReviewCount = proposals.filter(
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
        analyzedNodeCount = analysis.nodes.length;
        analyzedUnitCount = analysis.units.length;
        analyzedProposalCount = proposals.length;
      }

      await DocumentKnowledgeRepository.complete(
        documentId,
        {
          nodeCount: analyzedNodeCount,
          unitCount: analyzedUnitCount,
          proposalCount: analyzedProposalCount,
          checkpointPage: document.pageCount,
        },
        database,
      );
      const persisted = await DocumentKnowledgeRepository.getSummary(documentId, database);
      listener?.({ phase: "complete", message: "Livro desmontado e pronto para revisão." });
      return {
        documentId,
        nodeCount: persisted?.nodeCount ?? analyzedNodeCount,
        unitCount: persisted?.unitCount ?? analyzedUnitCount,
        proposalCount: persisted?.proposalCount ?? analyzedProposalCount,
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
