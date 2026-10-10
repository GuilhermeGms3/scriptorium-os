import { hasAvailableData } from "../domain/availability";
import type { KnowledgeProposal, KnowledgeProposalPayload } from "../domain/document-knowledge";
import { bookLabel, passageLabel } from "../i18n";
import type { PassageKnowledgeBundle } from "../domain/knowledge-bundle";
import type { PassageRef } from "../domain/scripture";
import type {
  PassageCoverageArea,
  PassageCoverageEntry,
  WorkspacePassageKnowledgeItem,
  WorkspacePassageKnowledgeLayer,
} from "../domain/workspace-passage-knowledge";
import {
  PASSAGE_COVERAGE_AREAS,
  semanticDomainCoverage,
} from "../domain/workspace-passage-knowledge";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { LocalTranslationRepository } from "../repositories/local-translation-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";
import { getWorkspaceDatabase } from "../workspace-runtime/workspace-database";

type PassageRelationProposal = KnowledgeProposal & {
  payload: Extract<KnowledgeProposalPayload, { kind: "passage-relation" }>;
};
type DocumentPassage = PassageRelationProposal["payload"]["passage"];

/** Where a person reviewed a link; recorded in the review note. */
export type PassageLinkReviewContext = "bible-reader" | "book-reader";

const REVIEW_PLACE: Record<PassageLinkReviewContext, string> = {
  "bible-reader": "no leitor da Bíblia",
  "book-reader": "na leitura do livro",
};

function claimCoverage(proposal: KnowledgeProposal): PassageCoverageArea[] {
  if (proposal.payload.kind !== "claim") return [];
  switch (proposal.payload.claimKind) {
    case "textual-observation":
    case "textual-critical-analysis":
      return ["textual-criticism"];
    case "linguistic-analysis":
      return ["linguistics"];
    case "historical-source-observation":
    case "historical-reconstruction":
      return ["historical-context"];
    case "exegetical-interpretation":
      return ["exegesis"];
    case "theological-interpretation":
      return ["theology"];
    case "reception-history":
    case "mystical-tradition":
      return ["reception-history", "tradition"];
    default:
      return [];
  }
}

function privateAreas(
  entries: readonly { documentId: string; proposals: readonly KnowledgeProposal[] }[],
): Map<PassageCoverageArea, Set<string>> {
  const result = new Map<PassageCoverageArea, Set<string>>();
  const add = (area: PassageCoverageArea, documentId: string) => {
    const sources = result.get(area) ?? new Set<string>();
    sources.add(documentId);
    result.set(area, sources);
  };
  for (const entry of entries) {
    for (const proposal of entry.proposals) {
      if (proposal.payload.kind === "topic-assignment") {
        const area = semanticDomainCoverage(proposal.payload.domain);
        if (area) add(area, entry.documentId);
      }
      for (const area of claimCoverage(proposal)) add(area, entry.documentId);
      if (
        (proposal.payload.kind === "claim" || proposal.payload.kind === "argument") &&
        proposal.payload.perspectiveProfileIds.length
      )
        add("tradition", entry.documentId);
    }
  }
  return result;
}

/** Human label of a link target, e.g. "João 3:16"; a book-wide target is just the book. */
export function passageLinkLabel(passage: DocumentPassage): string {
  if (passage.chapter === undefined) return bookLabel(passage.bookId);
  return passageLabel({
    bookId: passage.bookId,
    chapter: passage.chapter,
    ...(passage.verseStart !== undefined ? { verseStart: passage.verseStart } : {}),
    ...(passage.verseEnd !== undefined ? { verseEnd: passage.verseEnd } : {}),
  });
}

export interface PassageLinkTarget {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}

function curatedAreas(bundle: PassageKnowledgeBundle | null): Set<PassageCoverageArea> {
  const result = new Set<PassageCoverageArea>();
  if (!bundle) return result;
  if (bundle.texts.length) result.add("text");
  if (hasAvailableData(bundle.variants)) result.add("textual-criticism");
  if (hasAvailableData(bundle.linguistics) || hasAvailableData(bundle.linguisticAnnotations))
    result.add("linguistics");
  if (hasAvailableData(bundle.viewpoints)) result.add("tradition");
  if (hasAvailableData(bundle.analyses)) {
    for (const analysis of bundle.analyses.data) {
      if (analysis.lensId === "exegetical") result.add("exegesis");
      if (analysis.lensId === "hermeneutical") result.add("hermeneutics");
      if (analysis.lensId === "historical") result.add("historical-context");
      if (analysis.lensId === "reception-history") result.add("reception-history");
      if (analysis.lensId === "history-of-religions") result.add("religious-currents");
    }
  }
  if (hasAvailableData(bundle.claims)) {
    for (const claim of bundle.claims.data) {
      if (claim.kind === "exegetical-interpretation") result.add("exegesis");
      if (claim.kind === "theological-interpretation") result.add("theology");
      if (claim.kind === "reception-history" || claim.kind === "mystical-tradition")
        result.add("reception-history");
    }
  }
  return result;
}

function passageRelations(proposals: readonly KnowledgeProposal[]): PassageRelationProposal[] {
  return proposals.filter(
    (proposal): proposal is PassageRelationProposal => proposal.payload.kind === "passage-relation",
  );
}

/** Resolves passage relations into reader items with their evidence unit, context and state. */
async function buildItems(
  relations: readonly PassageRelationProposal[],
  db: WorkspaceDatabase,
): Promise<WorkspacePassageKnowledgeItem[]> {
  const machineVisibleIds = await DocumentKnowledgeRepository.listMachineVisibleProposalIds(
    relations
      .filter((proposal) => proposal.reviewStatus === "machine-proposed")
      .map((proposal) => proposal.id),
    db,
  );
  const proposals = await DocumentKnowledgeRepository.listVisibleContextProposalsForUnits(
    relations.map((proposal) => proposal.semanticUnitId),
    relations
      .filter(
        (proposal) => proposal.reviewStatus === "accepted" || machineVisibleIds.has(proposal.id),
      )
      .map((proposal) => proposal.semanticUnitId),
    db,
  );
  const proposalsByUnit = new Map<string, KnowledgeProposal[]>();
  for (const proposal of proposals) {
    const values = proposalsByUnit.get(proposal.semanticUnitId) ?? [];
    values.push(proposal);
    proposalsByUnit.set(proposal.semanticUnitId, values);
  }

  const items: WorkspacePassageKnowledgeItem[] = [];
  const documentIds = [...new Set(relations.map((proposal) => proposal.documentId))];
  for (const documentId of documentIds) {
    const documentRelations = relations.filter((proposal) => proposal.documentId === documentId);
    const [document, units, authorRows] = await Promise.all([
      PrivateDocumentRepository.getDocument(documentId, db),
      DocumentKnowledgeRepository.listUnits(
        documentId,
        documentRelations.map((proposal) => proposal.semanticUnitId),
        db,
      ),
      db.query(
        `SELECT a.canonical_name FROM authors a JOIN source_authors sa ON sa.author_id=a.id
         JOIN private_documents d ON d.source_id=sa.source_id WHERE d.id=? ORDER BY sa.ordinal`,
        [documentId],
      ),
    ]);
    if (!document) continue;
    const unitsById = new Map(units.map((unit) => [unit.id, unit]));
    const [nodes, translations] = await Promise.all([
      DocumentKnowledgeRepository.listNodesByIds(
        documentId,
        units.flatMap((unit) => (unit.documentNodeId ? [unit.documentNodeId] : [])),
        db,
      ),
      LocalTranslationRepository.listForSources(
        "private-segment",
        units.map((unit) => unit.id),
        db,
      ),
    ]);
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const authors = authorRows.map((row) => String(row["canonical_name"]));
    const translationsBySource = new Map(
      translations.map((translation) => [translation.sourceId, translation]),
    );
    for (const relation of documentRelations) {
      const unit = unitsById.get(relation.semanticUnitId);
      if (!unit) continue;
      const unitProposals = proposalsByUnit.get(unit.id) ?? [relation];
      const sectionTitle = unit.documentNodeId
        ? nodesById.get(unit.documentNodeId)?.title
        : undefined;
      items.push({
        id: relation.id,
        reviewState:
          relation.reviewStatus === "accepted"
            ? "confirmed"
            : machineVisibleIds.has(relation.id)
              ? "auto-visible"
              : "pending",
        document: {
          id: document.id,
          sourceId: document.sourceId,
          title: document.title,
          ...(document.language ? { language: document.language } : {}),
        },
        unit,
        passageRelation: relation,
        proposals: unitProposals,
        translation: translationsBySource.get(unit.id) ?? null,
        pages: [...new Set(unit.spans.map((span) => span.pageIndex))],
        context: {
          ...(sectionTitle ? { sectionTitle } : {}),
          authors,
          attributions: unitProposals.flatMap((proposal) =>
            proposal.payload.kind === "attribution"
              ? [`${proposal.payload.agentLabel}: ${proposal.payload.statement}`]
              : [],
          ),
          citations: unitProposals.flatMap((proposal) =>
            proposal.payload.kind === "citation" ? [proposal.payload.quotedText] : [],
          ),
          methods: [
            ...new Set([
              unit.method,
              relation.method,
              ...unitProposals.map((proposal) => proposal.method),
            ]),
          ],
          perspectiveProfileIds: [
            ...new Set(
              unitProposals.flatMap((proposal) =>
                proposal.payload.kind === "claim" || proposal.payload.kind === "argument"
                  ? proposal.payload.perspectiveProfileIds
                  : [],
              ),
            ),
          ],
        },
      });
    }
  }
  return items;
}

export const WorkspacePassageKnowledgeService = {
  /**
   * Private-library knowledge for a passage. With `includePending`, links still awaiting any
   * decision are returned too, as `reviewState: "pending"`; they never count as private coverage.
   */
  async load(
    passage: PassageRef,
    curatedBundle: PassageKnowledgeBundle | null,
    database?: WorkspaceDatabase,
    options: { includePending?: boolean } = {},
  ): Promise<WorkspacePassageKnowledgeLayer> {
    const db = database ?? (await getWorkspaceDatabase());
    const items = await buildItems(
      passageRelations(
        await DocumentKnowledgeRepository.listVisiblePassageRelations(
          passage,
          db,
          true,
          options.includePending ?? false,
        ),
      ),
      db,
    );

    const pendingItems = items.filter((item) => item.reviewState === "pending");
    const unconfirmedProposals =
      await DocumentKnowledgeRepository.listPendingCoverageProposalsForUnits(
        pendingItems.map((item) => item.unit.id),
        db,
      );
    const curated = curatedAreas(curatedBundle);
    const local = privateAreas(
      items
        .filter((item) => item.reviewState !== "pending")
        .map((item) => ({ documentId: item.document.id, proposals: item.proposals })),
    );
    const inReview = privateAreas(
      pendingItems.map((item) => ({
        documentId: item.document.id,
        proposals: [
          ...item.proposals,
          ...unconfirmedProposals.filter((proposal) => proposal.semanticUnitId === item.unit.id),
        ],
      })),
    );
    const coverage: PassageCoverageEntry[] = PASSAGE_COVERAGE_AREAS.map((area) => {
      const status = curated.has(area)
        ? "available"
        : local.has(area)
          ? "private"
          : inReview.has(area)
            ? "in-review"
            : "missing";
      return {
        area,
        status,
        sourceCount:
          status === "in-review"
            ? (inReview.get(area)?.size ?? 0)
            : (local.get(area)?.size ?? (curated.has(area) ? 1 : 0)),
      };
    });
    return { items, coverage };
  },

  /** Links detected on one physical page of a private book, in reading order, for review. */
  async loadDocumentPage(
    documentId: string,
    pageIndex: number,
    database?: WorkspaceDatabase,
  ): Promise<WorkspacePassageKnowledgeItem[]> {
    const db = database ?? (await getWorkspaceDatabase());
    return buildItems(
      passageRelations(
        await DocumentKnowledgeRepository.listPassageRelationsForPage(documentId, pageIndex, db),
      ),
      db,
    );
  },

  /** Confirms a detected link as it stands. */
  async confirmLink(
    id: string,
    database?: WorkspaceDatabase,
    context: PassageLinkReviewContext = "bible-reader",
  ): Promise<void> {
    await DocumentKnowledgeRepository.reviewProposal(
      id,
      "accepted",
      { note: `Confirmada ${REVIEW_PLACE[context]}` },
      database,
    );
  },

  /** Rejects a detected link: the passage of the book does not fit any verse. */
  async rejectLink(
    id: string,
    database?: WorkspaceDatabase,
    context: PassageLinkReviewContext = "bible-reader",
  ): Promise<void> {
    await DocumentKnowledgeRepository.reviewProposal(
      id,
      "rejected",
      { note: `Rejeitada ${REVIEW_PLACE[context]}` },
      database,
    );
  },

  /**
   * Points the link at the verse a person chose and confirms it. The original rawReference is
   * kept as evidence of what the book says; every previous target is replaced.
   */
  async moveLink(
    relation: PassageRelationProposal,
    target: PassageLinkTarget,
    database?: WorkspaceDatabase,
    context: PassageLinkReviewContext = "bible-reader",
  ): Promise<void> {
    const positive = (value: number | undefined) =>
      value !== undefined && Number.isInteger(value) && value > 0;
    if (!target.bookId || !positive(target.chapter) || !positive(target.verseStart))
      throw new Error("Escolha um livro, um capítulo e um versículo válidos.");
    if (target.verseEnd !== undefined && !positive(target.verseEnd))
      throw new Error("O versículo final precisa ser um número inteiro positivo.");
    if (target.verseEnd !== undefined && target.verseEnd < target.verseStart)
      throw new Error("O versículo final não pode vir antes do inicial.");
    const verseEnd =
      target.verseEnd !== undefined && target.verseEnd > target.verseStart
        ? target.verseEnd
        : undefined;
    const passage: DocumentPassage = {
      workId: `work:${target.bookId}`,
      bookId: target.bookId,
      chapter: target.chapter,
      verseStart: target.verseStart,
      ...(verseEnd !== undefined ? { verseEnd } : {}),
      versificationSchemeId: relation.payload.passage.versificationSchemeId,
    };
    await DocumentKnowledgeRepository.reviewProposal(
      relation.id,
      "accepted",
      {
        payload: {
          ...relation.payload,
          passage,
          relationScope: verseEnd !== undefined ? "range" : "verse",
          additionalPassages: [],
        },
        note: `Movida ${REVIEW_PLACE[context]}: de ${passageLinkLabel(relation.payload.passage)} para ${passageLinkLabel(passage)}`,
      },
      database,
    );
  },
};
