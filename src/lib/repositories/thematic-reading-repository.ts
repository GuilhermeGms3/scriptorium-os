import { KnowledgeProposalPayloadSchema } from "../domain/document-knowledge";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";
import type { TopicReading } from "../application/study-topic-service";

const roleLabels = {
  question: "Questão",
  objection: "Objeção — não é a conclusão do autor",
  counterpoint: "Em contrário",
  response: "Resposta do autor",
  reply: "Resposta à objeção",
  section: "Seção",
  entry: "Verbete",
};

/** Explicit documentary assignments only: a keyword hit never becomes this kind of reading. */
export async function thematicReadings(
  topicId: string,
  database?: WorkspaceDatabase,
): Promise<TopicReading[]> {
  const db = database ?? (await getWorkspaceDatabase());
  const rows = await db.query(
    `WITH readings AS (SELECT p.id,p.payload_json,p.semantic_unit_id,d.id document_id,d.title,d.language,
    row_number() OVER (PARTITION BY d.id ORDER BY
      CASE json_extract(p.payload_json,'$.studyContext.role') WHEN 'response' THEN 0 WHEN 'section' THEN 0 ELSE 1 END,
      (SELECT min(page_index) FROM semantic_unit_spans WHERE unit_id=p.semantic_unit_id),p.id) source_order,
    (SELECT min(page_index)+1 FROM semantic_unit_spans WHERE unit_id=p.semantic_unit_id) page
    FROM knowledge_proposals p JOIN private_documents d ON d.id=p.document_id
    WHERE p.proposal_kind='topic-assignment' AND p.method='documentary-thematic:v1' AND p.review_status<>'rejected'
    AND json_type(p.payload_json,'$.studyContext.headword') IS NULL
    AND EXISTS(SELECT 1 FROM json_each(p.payload_json,'$.studyContext.topicIds') t WHERE t.value=?)
    ) SELECT * FROM readings ORDER BY source_order,title,page,id LIMIT 81`,
    [topicId],
  );
  return rows.flatMap((row) => {
    let payload: unknown;
    try {
      payload = JSON.parse(String(row["payload_json"])) as unknown;
    } catch {
      return [];
    }
    const parsed = KnowledgeProposalPayloadSchema.safeParse(payload);
    if (
      !parsed.success ||
      parsed.data.kind !== "topic-assignment" ||
      !parsed.data.studyContext ||
      !row["page"]
    )
      return [];
    const context = parsed.data.studyContext;
    return [
      {
        id: String(row["id"]),
        title: String(row["title"]),
        locator: `${context.locator} · ${roleLabels[context.role]}`,
        excerpt: "",
        language: String(row["language"] ?? "und"),
        origin: "private-curated" as const,
        guidance: `${context.author} · ${context.tradition}. Associação documental automática, não revisão teológica. ${context.rationale} ${context.limitations.join(" ")}`,
        source: {
          kind: "private-document" as const,
          documentId: String(row["document_id"]),
          unitId: String(row["semantic_unit_id"]),
          page: Number(row["page"]),
          title: String(row["title"]),
        },
      },
    ];
  });
}
