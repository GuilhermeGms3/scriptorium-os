import type {
  LibraryPipelineOptions,
  LibraryPipelineProgress,
  LibraryPipelineResult,
} from "../domain/library-pipeline";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { notifyKnowledgeMutation } from "../workspace-runtime/workspace-events";
import { getWorkspaceDatabase } from "../workspace-runtime/workspace-database";
import { DocumentKnowledgePipelineService } from "./document-knowledge-pipeline-service";
import { LocalKnowledgePipelineService } from "./local-knowledge-pipeline-service";
import { PrivateDocumentOcrService } from "./private-document-ocr-service";

async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message.slice(0, 1_000) : String(cause).slice(0, 1_000);
}

/** Coordinates the existing canonical per-document services; it does not own document knowledge. */
export const LibraryKnowledgeOrchestrator = {
  async run(
    options: LibraryPipelineOptions,
    listener: (progress: LibraryPipelineProgress) => void,
    signal: AbortSignal,
  ): Promise<LibraryPipelineResult> {
    const db = await getWorkspaceDatabase();
    const documents = await PrivateDocumentRepository.listDocuments({ limit: 1_000 }, db);
    if (!documents.length) throw new Error("Nenhum PDF privado foi importado.");
    const configurationKey = await sha256(JSON.stringify(options));
    const runId = `library-pipeline:${configurationKey}`;
    const startedAt = new Date().toISOString();
    await db.execute(
      `INSERT INTO library_pipeline_runs(
        id,configuration_key,configuration_json,status,total_documents,completed_documents,
        failed_documents,started_at,updated_at,completed_at,error
      ) VALUES(?,?,?,'running',?,0,0,?,?,NULL,NULL)
      ON CONFLICT(id) DO UPDATE SET status='running',total_documents=excluded.total_documents,
        updated_at=excluded.updated_at,completed_at=NULL,error=NULL`,
      [runId, configurationKey, JSON.stringify(options), documents.length, startedAt, startedAt],
    );
    for (const [ordinal, document] of documents.entries())
      await db.execute(
        `INSERT INTO library_pipeline_documents(
          run_id,document_id,ordinal,stage,status,source_checksum,result_json,error,updated_at
        ) VALUES(?,?,?,'queued','pending',?,'{}',NULL,?)
        ON CONFLICT(run_id,document_id) DO UPDATE SET ordinal=excluded.ordinal,
          source_checksum=excluded.source_checksum,
          stage=CASE WHEN library_pipeline_documents.status='complete' AND library_pipeline_documents.source_checksum=excluded.source_checksum THEN library_pipeline_documents.stage ELSE 'queued' END,
          status=CASE WHEN library_pipeline_documents.status='complete' AND library_pipeline_documents.source_checksum=excluded.source_checksum THEN 'complete' ELSE 'pending' END,
          error=NULL,updated_at=excluded.updated_at`,
        [runId, document.id, ordinal, document.checksum, startedAt],
      );

    listener({
      documentIndex: 0,
      totalDocuments: documents.length,
      stage: "queued",
      message: "Preparando uma única vez o índice bíblico usado por toda a biblioteca…",
    });
    try {
      await LocalKnowledgePipelineService.indexEdition(
        options.editionId,
        (message) =>
          listener({
            documentIndex: 0,
            totalDocuments: documents.length,
            stage: "queued",
            message,
          }),
        signal,
      );
    } catch (cause) {
      await db.execute(
        "UPDATE library_pipeline_runs SET status=?,error=?,updated_at=? WHERE id=?",
        [
          signal.aborted ? "paused" : "failed",
          errorMessage(cause),
          new Date().toISOString(),
          runId,
        ],
      );
      throw cause;
    }

    const failures: LibraryPipelineResult["failures"] = [];
    let completedDocuments = 0;
    for (const [index, initialDocument] of documents.entries()) {
      signal.throwIfAborted();
      const previous = (
        await db.query(
          "SELECT status,source_checksum FROM library_pipeline_documents WHERE run_id=? AND document_id=?",
          [runId, initialDocument.id],
        )
      )[0];
      if (
        previous?.["status"] === "complete" &&
        previous["source_checksum"] === initialDocument.checksum
      ) {
        completedDocuments += 1;
        continue;
      }
      const update = async (stage: LibraryPipelineProgress["stage"], message: string) => {
        await db.execute(
          "UPDATE library_pipeline_documents SET stage=?,status='running',updated_at=? WHERE run_id=? AND document_id=?",
          [stage, new Date().toISOString(), runId, initialDocument.id],
        );
        listener({
          documentId: initialDocument.id,
          documentTitle: initialDocument.title,
          documentIndex: index + 1,
          totalDocuments: documents.length,
          stage,
          message,
        });
      };
      try {
        let document = initialDocument;
        if (options.recoverEmptyPages && document.textPageCount < document.pageCount) {
          await update("ocr", `Recuperando páginas vazias de ${document.title}…`);
          await PrivateDocumentOcrService.recover(
            document.id,
            (message) =>
              listener({
                documentId: document.id,
                documentTitle: document.title,
                documentIndex: index + 1,
                totalDocuments: documents.length,
                stage: "ocr",
                message,
              }),
            signal,
            options.ocrLanguage,
          );
          document = (await PrivateDocumentRepository.getDocument(document.id, db)) ?? document;
        }
        await update("structure", `Desmontando e contextualizando ${document.title}…`);
        const analyzer =
          options.analyzer === "contextual"
            ? (await import("../semantic-engine/python-document-knowledge-analyzer"))
                .PythonDocumentKnowledgeAnalyzer
            : undefined;
        const analysis = await DocumentKnowledgePipelineService.analyzeDocument(
          document.id,
          (progress) =>
            listener({
              documentId: document.id,
              documentTitle: document.title,
              documentIndex: index + 1,
              totalDocuments: documents.length,
              stage: "structure",
              message: progress.message,
            }),
          db,
          analyzer ? { analyzer } : {},
        );
        await update("linking", `Conectando unidades de ${document.title} às passagens…`);
        await LocalKnowledgePipelineService.run(
          document.id,
          options.editionId,
          options.useLlm,
          (message) =>
            listener({
              documentId: document.id,
              documentTitle: document.title,
              documentIndex: index + 1,
              totalDocuments: documents.length,
              stage: "linking",
              message,
            }),
          signal,
          options.sourceSchemeConfirmed,
        );
        await db.execute(
          `UPDATE library_pipeline_documents SET stage='complete',status='complete',result_json=?,error=NULL,updated_at=?
           WHERE run_id=? AND document_id=?`,
          [JSON.stringify(analysis), new Date().toISOString(), runId, document.id],
        );
        completedDocuments += 1;
      } catch (cause) {
        if (signal.aborted) {
          await db.execute(
            "UPDATE library_pipeline_runs SET status='paused',updated_at=? WHERE id=?",
            [new Date().toISOString(), runId],
          );
          throw cause;
        }
        const message = errorMessage(cause);
        failures.push({ documentId: initialDocument.id, title: initialDocument.title, message });
        await db.execute(
          `UPDATE library_pipeline_documents SET stage='failed',status='failed',error=?,updated_at=?
           WHERE run_id=? AND document_id=?`,
          [message, new Date().toISOString(), runId, initialDocument.id],
        );
      }
      await db.execute(
        "UPDATE library_pipeline_runs SET completed_documents=?,failed_documents=?,updated_at=? WHERE id=?",
        [completedDocuments, failures.length, new Date().toISOString(), runId],
      );
      notifyKnowledgeMutation();
    }
    const completedAt = new Date().toISOString();
    await db.execute(
      `UPDATE library_pipeline_runs SET status=?,completed_documents=?,failed_documents=?,updated_at=?,completed_at=? WHERE id=?`,
      [
        failures.length ? "partial" : "complete",
        completedDocuments,
        failures.length,
        completedAt,
        completedAt,
        runId,
      ],
    );
    notifyKnowledgeMutation();
    return {
      runId,
      totalDocuments: documents.length,
      completedDocuments,
      failedDocuments: failures.length,
      failures,
    };
  },
};
