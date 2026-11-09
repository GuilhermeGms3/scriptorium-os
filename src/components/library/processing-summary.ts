import type { LibraryQuickSummary } from "../../lib/application/library-coverage-service";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "31 livros · 1 estruturado · 6 precisam de OCR". */
export function processingSummaryLine(summary: LibraryQuickSummary): string {
  return [
    plural(summary.total, "livro", "livros"),
    plural(summary.structured, "estruturado", "estruturados"),
    summary.ocrPending === 1 ? "1 precisa de OCR" : `${summary.ocrPending} precisam de OCR`,
  ].join(" · ");
}
