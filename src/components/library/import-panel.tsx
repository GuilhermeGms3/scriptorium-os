import { useState } from "react";
import { FileText, LockKeyhole, X } from "lucide-react";
import {
  SourceImportService,
  type BibliographicImportFormat,
  type ImportReport,
} from "../../lib/application/source-import-service";
import {
  PrivateDocumentImportService,
  type PrivateDocumentImportProgress,
  type PrivateDocumentImportResult,
} from "../../lib/application/private-document-import-service";
import { useSecureContextProblem } from "../../lib/workspace-runtime/use-secure-context";
import { SecureContextNotice } from "../common/secure-context-notice";

/** Private PDFs with a text layer: the original and its text stay in the active storage. */
export function PdfImportCard({ onImported }: { onImported: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfProgress, setPdfProgress] = useState<PrivateDocumentImportProgress>();
  const [pdfResults, setPdfResults] = useState<PrivateDocumentImportResult[]>([]);
  const [pdfErrors, setPdfErrors] = useState<Array<{ filename: string; message: string }>>([]);
  const importProblem = useSecureContextProblem();
  const importPdfs = async () => {
    if (!pdfFiles.length) return;
    setBusy(true);
    setPdfErrors([]);
    setPdfResults([]);
    const imported: PrivateDocumentImportResult[] = [];
    const failures: Array<{ filename: string; message: string }> = [];
    try {
      for (const file of pdfFiles) {
        setPdfProgress({ phase: "validating", message: `Preparando ${file.name}…` });
        try {
          imported.push(await PrivateDocumentImportService.importPdf(file, setPdfProgress));
          setPdfResults([...imported]);
        } catch (cause) {
          failures.push({
            filename: file.name,
            message: cause instanceof Error ? cause.message : String(cause),
          });
          setPdfErrors([...failures]);
        }
      }
      setPdfFiles([]);
      if (imported.length) await onImported();
      setPdfProgress({
        phase: "complete",
        message: `${imported.length} PDF${imported.length === 1 ? "" : "s"} indexado${imported.length === 1 ? "" : "s"}; ${failures.length} exige${failures.length === 1 ? "" : "m"} OCR ou correção.`,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-md border border-border bg-background p-4">
      {importProblem && (
        <div className="mb-3">
          <SecureContextNotice problem={importProblem} />
        </div>
      )}
      <div className="flex items-start gap-2">
        <LockKeyhole className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-medium">PDF privado com texto pesquisável</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            O original e o texto extraído ficam no armazenamento ativo: pasta da instalação no modo
            Docker/local, ou OPFS no modo navegador. PDFs privados não entram nos pacotes públicos.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-accent has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          <FileText className="size-4" aria-hidden="true" /> Selecionar PDFs
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            disabled={busy || Boolean(importProblem)}
            onChange={(event) => setPdfFiles(Array.from(event.target.files ?? []))}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          disabled={!pdfFiles.length || busy || Boolean(importProblem)}
          onClick={() => void importPdfs()}
          className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy
            ? "Processando…"
            : `Indexar ${pdfFiles.length || ""} PDF${pdfFiles.length === 1 ? "" : "s"}`}
        </button>
        {pdfFiles.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {pdfFiles.map((file) => file.name).join(" · ")}
          </span>
        )}
      </div>
      {pdfProgress && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {pdfProgress.message}
        </p>
      )}
      {pdfErrors.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1 text-sm text-destructive">
          {pdfErrors.map((failure) => (
            <li key={failure.filename}>
              {failure.filename}: {failure.message}
            </li>
          ))}
        </ul>
      )}
      {pdfResults.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {pdfResults.map((result) => (
            <li key={result.documentId}>
              {result.title}: {result.textPageCount}/{result.pageCount} páginas{" "}
              {result.duplicate ? "já indexadas" : "indexadas"} · idioma {result.language} ·{" "}
              {result.textLayerStatus === "complete"
                ? "camada textual completa"
                : "camada textual parcial; páginas vazias exigem OCR"}
              .
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** CSL-JSON, BibTeX or RIS records: only metadata enters the library. */
export function BibliographicImportForm({ onImported }: { onImported: () => Promise<void> }) {
  const [format, setFormat] = useState<BibliographicImportFormat>("csl-json");
  const [input, setInput] = useState("");
  const [report, setReport] = useState<ImportReport>();
  const [busy, setBusy] = useState(false);
  const importProblem = useSecureContextProblem();
  const preview = input.trim() ? SourceImportService.preview(format, input) : null;
  const runImport = async () => {
    setBusy(true);
    try {
      const next = await SourceImportService.import(format, input);
      setReport(next);
      if (next.imported) await onImported();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="Importação bibliográfica">
      <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
        <label className="sr-only" htmlFor="bibliographic-format">
          Formato do registro
        </label>
        <select
          id="bibliographic-format"
          value={format}
          onChange={(event) => setFormat(event.target.value as BibliographicImportFormat)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="csl-json">CSL-JSON</option>
          <option value="bibtex">BibTeX básico</option>
          <option value="ris">RIS</option>
        </select>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Cole o registro bibliográfico…"
          aria-label="Registro bibliográfico"
          className="min-h-24 rounded-md border border-input bg-background p-2 font-mono text-xs"
        />
        <button
          type="button"
          disabled={
            !input.trim() ||
            busy ||
            Boolean(importProblem) ||
            Boolean(preview?.issues.some((issue) => issue.severity === "error"))
          }
          onClick={() => void runImport()}
          className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Importando…" : `Importar ${preview?.candidates.length ?? 0}`}
        </button>
      </div>
      {preview?.issues.map((issue, index) => (
        <p
          key={`${issue.code}-${index}`}
          className={`mt-2 text-sm ${issue.severity === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {issue.code}: {issue.message}
        </p>
      ))}
      {report && (
        <p role="status" className="mt-2 text-sm">
          {report.imported} importadas · {report.duplicates} duplicadas · {report.invalid}{" "}
          inválidas.
        </p>
      )}
    </section>
  );
}

/** Both imports together, as the library workshop shows them. */
export function ImportPanel({
  onClose,
  onImported,
}: {
  onClose?: () => void;
  onImported: () => Promise<void>;
}) {
  return (
    <section
      aria-label="Importar para a biblioteca"
      className="border-b border-border bg-muted/20 px-5 py-4 md:px-6"
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium">Importar para a biblioteca</h2>
            <p className="text-sm text-muted-foreground">
              Documentos privados permanecem neste dispositivo; registros bibliográficos guardam
              somente metadados.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar importação"
              className="rounded p-1 hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="mt-4">
          <PdfImportCard onImported={onImported} />
        </div>
        <div className="my-4 flex items-center gap-3 meta-label">
          <span className="h-px flex-1 bg-border" /> Metadados bibliográficos
          <span className="h-px flex-1 bg-border" />
        </div>
        <BibliographicImportForm onImported={onImported} />
      </div>
    </section>
  );
}
