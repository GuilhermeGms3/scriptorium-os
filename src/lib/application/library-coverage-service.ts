import { SEMANTIC_DOMAINS, type SemanticDomain } from "../domain/semantic-content";
import type { LibraryCoverageReport } from "../domain/library-pipeline";
import { getWorkspaceDatabase } from "../workspace-runtime/workspace-database";
import { DocumentProcessingRepository } from "../repositories/document-processing-repository";

export const LibraryCoverageService = {
  async report(): Promise<LibraryCoverageReport> {
    const db = await getWorkspaceDatabase();
    const [workspaceId, documents, connections, proposals, domainRows, targetRows, profileRows] =
      await Promise.all([
        DocumentProcessingRepository.workspaceIdentity(db),
        db.query(`SELECT count(*) total,
        sum(CASE WHEN text_page_count=page_count THEN 1 ELSE 0 END) text_ready,
        sum(CASE WHEN text_page_count>0 AND text_page_count<page_count THEN 1 ELSE 0 END) partially_text_ready,
        sum(CASE WHEN text_page_count=0 THEN 1 ELSE 0 END) scanned_only,
        sum(page_count-text_page_count) missing_text_pages,
        sum(CASE WHEN text_page_count=0 OR (page_count-text_page_count)>=3 THEN 1 ELSE 0 END) ocr_pending,
        sum(CASE WHEN EXISTS(SELECT 1 FROM document_knowledge_indexes i WHERE i.document_id=private_documents.id AND i.status='ready') THEN 1 ELSE 0 END) structured,
        sum(CASE WHEN EXISTS(SELECT 1 FROM pipeline_decisions d JOIN knowledge_proposals p ON p.id=d.proposal_id WHERE p.document_id=private_documents.id AND d.publication='machine-visible') THEN 1 ELSE 0 END) linked,
        sum(CASE WHEN EXISTS(SELECT 1 FROM document_knowledge_indexes i WHERE i.document_id=private_documents.id AND i.status='failed') THEN 1 ELSE 0 END) failed
        FROM private_documents`),
        db.query(`SELECT
        sum(CASE WHEN origin='explicit' AND publication='machine-visible' THEN 1 ELSE 0 END) explicit_visible,
        sum(CASE WHEN origin='inferred' AND publication='machine-visible' THEN 1 ELSE 0 END) inferred_visible,
        sum(CASE WHEN publication='exception' AND audit_status='pending' THEN 1 ELSE 0 END) awaiting_sample,
        sum(CASE WHEN publication='withheld' THEN 1 ELSE 0 END) withheld,
        sum(CASE WHEN publication='revoked' THEN 1 ELSE 0 END) revoked
        FROM pipeline_decisions`),
        db.query(`SELECT count(*) total,
        sum(CASE WHEN review_status='accepted' THEN 1 ELSE 0 END) accepted,
        sum(CASE WHEN review_status='machine-proposed' THEN 1 ELSE 0 END) machine_proposed,
        sum(CASE WHEN review_status='rejected' THEN 1 ELSE 0 END) rejected
        FROM knowledge_proposals`),
        db.query(`SELECT json_extract(p.payload_json,'$.domain') domain,count(*) proposal_count,
        count(DISTINCT CASE WHEN p.review_status='accepted' OR d.publication='machine-visible' THEN p.document_id END) visible_sources
        FROM knowledge_proposals p LEFT JOIN pipeline_decisions d ON d.proposal_id=p.id
        WHERE p.proposal_kind='topic-assignment' GROUP BY domain`),
        db.query(`WITH visible AS (
          SELECT p.payload_json FROM knowledge_proposals p
          LEFT JOIN pipeline_decisions d ON d.proposal_id=p.id
          WHERE p.proposal_kind='passage-relation'
            AND (p.review_status='accepted' OR d.publication='machine-visible')
        ), targets(book_id,chapter,verse_start) AS (
          SELECT json_extract(payload_json,'$.passage.bookId'),
                 json_extract(payload_json,'$.passage.chapter'),
                 json_extract(payload_json,'$.passage.verseStart') FROM visible
          UNION ALL
          SELECT json_extract(target.value,'$.bookId'),json_extract(target.value,'$.chapter'),
                 json_extract(target.value,'$.verseStart')
          FROM visible,json_each(visible.payload_json,'$.additionalPassages') target
        ) SELECT count(DISTINCT book_id) books,
          count(DISTINCT book_id || ':' || chapter) chapters,
          count(DISTINCT book_id || ':' || chapter || ':' || verse_start) verses FROM targets`),
        db.query(`SELECT profile,count(*) document_count
        FROM private_document_profiles GROUP BY profile ORDER BY document_count DESC,profile`),
      ]);
    const document = documents[0] ?? {};
    const connection = connections[0] ?? {};
    const proposal = proposals[0] ?? {};
    const targets = targetRows[0] ?? {};
    const byDomain = new Map(domainRows.map((row) => [String(row["domain"]), row]));
    const domains = SEMANTIC_DOMAINS.map((domain) => {
      const row = byDomain.get(domain);
      return {
        domain: domain as SemanticDomain,
        proposalCount: Number(row?.["proposal_count"] ?? 0),
        visibleSourceCount: Number(row?.["visible_sources"] ?? 0),
      };
    });
    const gaps = domains
      .filter((entry) => entry.visibleSourceCount === 0)
      .map((entry) => entry.domain);
    return {
      generatedAt: new Date().toISOString(),
      workspace: {
        id: workspaceId,
        origin: typeof window === "undefined" ? "runtime local" : window.location.origin,
        persistence: db.persistence,
      },
      documents: {
        total: Number(document["total"] ?? 0),
        textReady: Number(document["text_ready"] ?? 0),
        partiallyTextReady: Number(document["partially_text_ready"] ?? 0),
        scannedOnly: Number(document["scanned_only"] ?? 0),
        missingTextPages: Number(document["missing_text_pages"] ?? 0),
        ocrPending: Number(document["ocr_pending"] ?? 0),
        structured: Number(document["structured"] ?? 0),
        linked: Number(document["linked"] ?? 0),
        failed: Number(document["failed"] ?? 0),
      },
      connections: {
        explicitVisible: Number(connection["explicit_visible"] ?? 0),
        inferredVisible: Number(connection["inferred_visible"] ?? 0),
        awaitingSample: Number(connection["awaiting_sample"] ?? 0),
        withheld: Number(connection["withheld"] ?? 0),
        revoked: Number(connection["revoked"] ?? 0),
        distinctBooks: Number(targets["books"] ?? 0),
        distinctChapters: Number(targets["chapters"] ?? 0),
        distinctVerses: Number(targets["verses"] ?? 0),
      },
      proposals: {
        total: Number(proposal["total"] ?? 0),
        accepted: Number(proposal["accepted"] ?? 0),
        machineProposed: Number(proposal["machine_proposed"] ?? 0),
        rejected: Number(proposal["rejected"] ?? 0),
      },
      domains,
      profiles: profileRows.map((row) => ({
        profile: String(row["profile"]),
        documentCount: Number(row["document_count"]),
      })),
      gaps,
    };
  },
};
