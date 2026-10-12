import { z } from "zod";
import { KnowledgeProposalPayloadSchema } from "../domain/document-knowledge";
import type { KnowledgeTraceItem, TraceRow } from "../domain/knowledge-trace";
import { KnowledgeTraceRepository } from "../repositories/knowledge-trace-repository";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";

const EvidenceSchema = z.object({
  quote: z.string().optional(),
  sourceSchemeConfirmed: z.boolean().optional(),
  policy: z.string().optional(),
  decisions: z
    .array(z.object({ rationale: z.string().optional(), evidenceQuote: z.string().optional() }))
    .optional(),
});

/** Explain stored evidence; never invent a contextual rationale for a legacy citation. */
export function explainKnowledgeTrace(row: TraceRow): KnowledgeTraceItem {
  const payload = KnowledgeProposalPayloadSchema.parse(JSON.parse(row.payload_json) as unknown);
  if (payload.kind !== "passage-relation")
    throw new Error("Registro não é uma ligação de passagem.");
  const evidence = EvidenceSchema.safeParse(JSON.parse(row.evidence_json ?? "{}") as unknown);
  const data = evidence.success ? evidence.data : {};
  const visible =
    row.review_status === "accepted" ||
    (row.review_status !== "rejected" && row.publication === "machine-visible");
  const state = visible
    ? "visible"
    : row.review_status === "rejected" || row.publication === "revoked"
      ? "blocked"
      : "pending";
  const inferred = row.origin === "inferred" || row.method.startsWith("local-llm:");
  const explanation: string[] = [];
  if (inferred) {
    for (const decision of data.decisions ?? [])
      if (decision.rationale) explanation.push(decision.rationale);
    if (!explanation.length)
      explanation.push(
        "Associação inferida. Este registro não preservou uma justificativa contextual detalhada.",
      );
  } else {
    explanation.push(
      `O analisador registrou a referência “${payload.rawReference}” no contexto desta unidade. Detectar uma citação não prova que o trecho seja um comentário exegético.`,
    );
  }
  if (data.sourceSchemeConfirmed === true)
    explanation.push(
      "O processamento registra a numeração da fonte como confirmada pelo operador. Essa confirmação não comprova relevância contextual.",
    );
  if (row.review_note) explanation.push(row.review_note);
  if (row.publication === "exception")
    explanation.push("Encaminhada às exceções para auditoria; não publicada automaticamente.");
  if (row.publication === "withheld")
    explanation.push("A política do pipeline reteve esta ligação.");
  return {
    row,
    payload,
    state,
    stateLabel:
      row.review_status === "accepted"
        ? "Aceita individualmente"
        : row.review_status === "rejected"
          ? "Rejeitada individualmente"
          : row.publication === "revoked"
            ? "Revogada"
            : visible
              ? "Visível pelo pipeline"
              : "Aguardando revisão",
    originLabel: inferred
      ? "Associação contextual inferida"
      : "Referência registrada pelo analisador",
    explanation,
    evidenceQuotes: [
      ...new Set(
        [data.quote, ...(data.decisions ?? []).map((item) => item.evidenceQuote)].filter(
          (value): value is string => !!value,
        ),
      ),
    ],
  };
}

export const KnowledgeTraceService = {
  async detail(id: string, database?: WorkspaceDatabase) {
    const detail = await KnowledgeTraceRepository.detail(id, database);
    const units = detail.row
      ? await DocumentKnowledgeRepository.listUnits(
          detail.row.document_id,
          [detail.row.semantic_unit_id],
          database,
        )
      : [];
    return {
      ...detail,
      item: detail.row ? explainKnowledgeTrace(detail.row) : null,
      unit: units[0] ?? null,
    };
  },
};
