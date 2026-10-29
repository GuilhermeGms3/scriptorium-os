import type { DocumentKnowledgeIndexSummary } from "../../lib/domain/document-knowledge";

const number = (value: number) => value.toLocaleString("pt-BR");

/** Where the book stands in one sentence, shown on the folded "Processamento" section. */
export function documentProcessingStatusLine(
  summary: DocumentKnowledgeIndexSummary | null | undefined,
): string {
  if (summary === undefined) return "Verificando o estado do livro…";
  if (summary === null) return "Ainda não desmontado. Abra para usar “Desmontar livro”.";
  if (summary.status === "processing")
    return `Desmontagem em andamento (até a página ${number(summary.checkpointPage)}).`;
  if (summary.status === "failed")
    return "A última desmontagem não terminou. Abra para ver o motivo e retomar.";
  return `Desmontado em ${number(summary.unitCount)} trechos · ${number(summary.proposalCount)} propostas para revisão.`;
}
