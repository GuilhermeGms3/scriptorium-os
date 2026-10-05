import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, Pause, Play, RefreshCw } from "lucide-react";
import { LibraryCoverageService } from "../../lib/application/library-coverage-service";
import { LibraryKnowledgeOrchestrator } from "../../lib/application/library-knowledge-orchestrator";
import type {
  LibraryCoverageReport,
  LibraryPipelineProgress,
} from "../../lib/domain/library-pipeline";
import { ScriptureRepository } from "../../lib/repositories/scripture-repository";

const DOMAIN_LABELS: Record<string, string> = {
  exegesis: "Exegese",
  hermeneutics: "Hermenêutica",
  theology: "Teologia",
  "historical-context": "Contexto histórico",
  "social-history": "História social",
  archaeology: "Arqueologia",
  geography: "Geografia",
  "textual-criticism": "Crítica textual",
  linguistics: "Linguística",
  patristics: "Patrística",
  liturgy: "Liturgia",
  tradition: "Tradição",
  soteriology: "Soteriologia",
  eschatology: "Escatologia",
  "religious-currents": "Correntes religiosas",
  "philosophy-of-religion": "Filosofia da religião",
  science: "Ciência",
  other: "Outros",
};

export function LibraryPipelineOverview() {
  const editions = ScriptureRepository.listEditions().filter((edition) =>
    edition.language.startsWith("pt"),
  );
  const [editionId, setEditionId] = useState(editions[0]?.id ?? "");
  const [report, setReport] = useState<LibraryCoverageReport>();
  const [progress, setProgress] = useState<LibraryPipelineProgress>();
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<string>();
  const [useLlm, setUseLlm] = useState(true);
  const [recoverEmptyPages, setRecoverEmptyPages] = useState(true);
  const [contextual, setContextual] = useState(true);
  const [sourceSchemeConfirmed, setSourceSchemeConfirmed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => setReport(await LibraryCoverageService.report()), []);
  useEffect(() => {
    void refresh().catch((cause) =>
      setError(cause instanceof Error ? cause.message : String(cause)),
    );
    const reload = () => void refresh();
    window.addEventListener("scriptorium:knowledge-changed", reload);
    return () => {
      controller.current?.abort();
      window.removeEventListener("scriptorium:knowledge-changed", reload);
    };
  }, [refresh]);
  const run = async () => {
    if (!editionId || controller.current) return;
    setError(undefined);
    setResult(undefined);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const completed = await LibraryKnowledgeOrchestrator.run(
        {
          editionId,
          useLlm,
          recoverEmptyPages,
          analyzer: contextual ? "contextual" : "deterministic",
          ocrLanguage: "por+eng",
          sourceSchemeConfirmed,
        },
        setProgress,
        abort.signal,
      );
      setResult(
        `${completed.completedDocuments}/${completed.totalDocuments} livros concluídos; ${completed.failedDocuments} com exceção registrada.`,
      );
    } catch (cause) {
      setError(
        abort.signal.aborted
          ? "Fila pausada. Execute novamente para retomar os livros que não foram concluídos."
          : cause instanceof Error
            ? cause.message
            : String(cause),
      );
    } finally {
      controller.current = null;
      setProgress(undefined);
      await refresh();
    }
  };
  const busy = Boolean(progress);
  return (
    <section
      className="border-b border-border bg-muted/10 px-5 py-4 md:px-6"
      aria-labelledby="library-pipeline-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="meta-label">Motor privado da biblioteca</p>
            <h2 id="library-pipeline-title" className="mt-1 font-serif text-lg font-semibold">
              Desmontagem, conexão e cobertura
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Processa todos os PDFs locais com retomada. O texto permanece no dispositivo;
              inferências são retidas em lotes até a amostra ser auditada.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded border border-input px-3 text-xs"
          >
            <RefreshCw className="size-3.5" /> Atualizar cobertura
          </button>
        </div>
        {report && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["PDFs", report.documents.total],
              ["Estruturados", report.documents.structured],
              ["Com conexões", report.documents.linked],
              ["OCR pendente", report.documents.ocrPending],
              ["Versículos alcançados", report.connections.distinctVerses],
              ["Aguardando amostra", report.connections.awaitingSample],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded border border-border bg-background px-3 py-2"
              >
                <p className="font-mono text-[9px] uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded border border-border bg-background p-3">
          <label className="text-xs">
            Edição de referência{" "}
            <select
              value={editionId}
              onChange={(event) => setEditionId(event.target.value)}
              disabled={busy}
              className="ml-1 rounded border border-input bg-background p-1.5"
            >
              {editions.map((edition) => (
                <option key={edition.id} value={edition.id}>
                  {edition.abbreviation}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={contextual}
              disabled={busy}
              onChange={(event) => setContextual(event.target.checked)}
            />{" "}
            Contexto por autor/citação
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={useLlm}
              disabled={busy}
              onChange={(event) => setUseLlm(event.target.checked)}
            />{" "}
            Conexões com LLM local
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={recoverEmptyPages}
              disabled={busy}
              onChange={(event) => setRecoverEmptyPages(event.target.checked)}
            />{" "}
            Tentar OCR
          </label>
          <label className="flex max-w-md items-start gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={sourceSchemeConfirmed}
              disabled={busy}
              onChange={(event) => setSourceSchemeConfirmed(event.target.checked)}
            />
            <span>
              Confirmei que estes livros usam a numeração da edição escolhida. Se desmarcado,
              referências explícitas divergentes ficam nas exceções.
            </span>
          </label>
          {busy ? (
            <button
              type="button"
              onClick={() => controller.current?.abort()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded border border-input px-3 text-xs"
            >
              <Pause className="size-3.5" /> Pausar
            </button>
          ) : (
            <button
              type="button"
              disabled={!editionId}
              onClick={() => void run()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
            >
              <Play className="size-3.5" /> Processar ou retomar biblioteca
            </button>
          )}
        </div>
        {progress && (
          <p role="status" className="mt-2 text-xs">
            Livro {progress.documentIndex}/{progress.totalDocuments}
            {progress.documentTitle ? ` · ${progress.documentTitle}` : ""}: {progress.message}
          </p>
        )}
        {result && (
          <p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            {result}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
        {report && (
          <details className="mt-3 text-xs">
            <summary className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground">
              <BarChart3 className="size-3.5" /> Ver lacunas por área
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.domains.map((entry) => (
                <span
                  key={entry.domain}
                  className={`rounded border px-2 py-1 ${entry.visibleSourceCount ? "border-border" : "border-amber-500/40 text-amber-700 dark:text-amber-300"}`}
                >
                  {DOMAIN_LABELS[entry.domain] ?? entry.domain}: {entry.visibleSourceCount} fonte(s)
                </span>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
