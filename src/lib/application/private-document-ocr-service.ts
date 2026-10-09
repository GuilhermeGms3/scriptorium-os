import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { PrivateDocumentStorage } from "../private-documents/private-document-storage";
import { OcrPageSchema, pipelineRequest } from "../semantic-engine/local-pipeline-client";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";
import { getWorkspaceDatabase } from "../workspace-runtime/workspace-database";

/** Recover empty pages only: never shift existing evidence spans or overwrite reviewed text. */
export const PrivateDocumentOcrService = {
  async recover(
    documentId: string,
    progress: (message: string) => void,
    signal: AbortSignal,
    language = "por+eng",
  ): Promise<void> {
    const db = await getWorkspaceDatabase();
    const document = await PrivateDocumentRepository.getDocument(documentId, db);
    if (!document) throw new Error("Documento não encontrado.");
    const file = await PrivateDocumentStorage.read(document.checksum);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      isEvalSupported: false,
    });
    const pdf = await task.promise;
    try {
      for (let offset = 0; offset < document.pageCount; offset += 100) {
        const pages = await PrivateDocumentRepository.listPages(
          documentId,
          { offset, limit: 100 },
          db,
        );
        for (const stored of pages) {
          signal.throwIfAborted();
          if (stored.text.trim()) continue;
          progress(`OCR: página ${stored.pageIndex + 1} de ${document.pageCount}…`);
          const page = await pdf.getPage(stored.pageIndex + 1);
          const viewport = page.getViewport({ scale: 1.7 });
          if (viewport.width * viewport.height > 20_000_000)
            throw new Error("Página grande demais para OCR seguro.");
          const canvas = window.document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, viewport }).promise;
          const imageBase64 = canvas.toDataURL("image/png").split(",")[1];
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
          const result = await pipelineRequest(
            "ocr",
            OcrPageSchema,
            { imageBase64, language },
            signal,
          );
          if (
            result.blocks.some(
              (block) =>
                block.endOffset > result.text.length ||
                block.endOffset <= block.startOffset ||
                block.bbox[2] < block.bbox[0] ||
                block.bbox[3] < block.bbox[1],
            )
          )
            throw new Error("OCR devolveu coordenadas/offsets inválidos.");
          if (!result.text.trim()) continue;
          // Atomic text+layout; the FTS trigger updates the search index.
          await db.transaction([
            {
              sql: "UPDATE private_document_pages SET text=?,character_count=?,extraction_method='ocr',quality_json=? WHERE id=? AND text=''",
              bind: [
                result.text,
                result.text.length,
                JSON.stringify({
                  hasText: true,
                  itemCount: result.blocks.length,
                  machineExtracted: true,
                }),
                stored.id,
              ],
            },
            {
              sql: "INSERT OR REPLACE INTO document_page_layouts VALUES(?,?,?,?,?,?)",
              bind: [
                stored.id,
                document.checksum,
                result.method,
                result.revision,
                JSON.stringify({ coordinateSpace: "normalized-top-left", blocks: result.blocks }),
                new Date().toISOString(),
              ],
            },
            {
              sql: "UPDATE private_documents SET text_page_count=(SELECT count(*) FROM private_document_pages WHERE document_id=? AND text<>''),extraction_method='mixed' WHERE id=?",
              bind: [documentId, documentId],
            },
            {
              sql: "UPDATE document_knowledge_indexes SET status='failed',error='OCR acrescentou texto; reconstrua a análise preservando revisões.' WHERE document_id=?",
              bind: [documentId],
            },
            { sql: "DELETE FROM pipeline_jobs WHERE document_id=?", bind: [documentId] },
          ]);
          notifyKnowledgeMutation();
        }
      }
    } finally {
      await task.destroy();
    }
  },
};
