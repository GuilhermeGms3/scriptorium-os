import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";
export interface StudyLibraryBook {
  id: string;
  title: string;
  authors: string[];
  pages: number;
  textPages: number;
  profile: string;
  profileReviewed: boolean;
  nodes: number;
  units: number;
  analysisStatus: string;
}
export const StudyLibraryRepository = {
  async inventory(database?: WorkspaceDatabase): Promise<StudyLibraryBook[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const [documents, authors] = await Promise.all([
      db.query(
        "SELECT d.id,d.title,d.page_count,d.text_page_count,p.profile,p.review_status,i.node_count,i.unit_count,i.status FROM private_documents d LEFT JOIN private_document_profiles p ON p.document_id=d.id LEFT JOIN document_knowledge_indexes i ON i.document_id=d.id ORDER BY d.title,d.id",
      ),
      db.query(
        "SELECT d.id,a.canonical_name FROM private_documents d JOIN source_authors sa ON sa.source_id=d.source_id JOIN authors a ON a.id=sa.author_id ORDER BY a.canonical_name",
      ),
    ]);
    const byDocument = new Map<string, string[]>();
    for (const row of authors) {
      const key = String(row["id"]);
      const list = byDocument.get(key) ?? [];
      list.push(String(row["canonical_name"]));
      byDocument.set(key, list);
    }
    return documents.map((row) => ({
      id: String(row["id"]),
      title: String(row["title"]),
      authors: byDocument.get(String(row["id"])) ?? [],
      pages: Number(row["page_count"]),
      textPages: Number(row["text_page_count"]),
      profile: String(row["profile"] ?? "unknown"),
      profileReviewed: row["review_status"] === "accepted",
      nodes: Number(row["node_count"] ?? 0),
      units: Number(row["unit_count"] ?? 0),
      analysisStatus: String(row["status"] ?? "not-indexed"),
    }));
  },
};
