import { getWorkspaceDatabase } from "../workspace-runtime/workspace-database";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { classifyDocumentProfile } from "./document-profile-classifier";

export const BookReadingService = {
  async context(documentId: string) {
    const db = await getWorkspaceDatabase();
    const [nodes, summary, topics] = await Promise.all([
      DocumentKnowledgeRepository.listNodes(documentId, db),
      DocumentKnowledgeRepository.getSummary(documentId, db),
      db.query(
        `SELECT json_extract(payload_json,'$.domain') AS domain,count(*) AS occurrences
        FROM knowledge_proposals WHERE document_id=? AND proposal_kind='topic-assignment'
        GROUP BY domain ORDER BY occurrences DESC LIMIT 15`,
        [documentId],
      ),
    ]);
    return {
      nodes,
      summary,
      topics: topics.map((row) => ({
        domain: String(row["domain"]),
        occurrences: Number(row["occurrences"]),
      })),
    };
  },
  async dictionary(query: string) {
    if (!query.trim()) return [];
    const documents = (await PrivateDocumentRepository.listDocuments()).filter((document) =>
      ["dictionary", "lexicon", "encyclopedia"].includes(
        classifyDocumentProfile(document.title).profile,
      ),
    );
    return (
      await Promise.all(
        documents.slice(0, 12).map((document) =>
          PrivateDocumentRepository.search(query.slice(0, 100), {
            documentId: document.id,
            limit: 2,
          }),
        ),
      )
    )
      .flat()
      .slice(0, 12);
  },
};
