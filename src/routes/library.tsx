import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, FileUp, LockKeyhole, RefreshCw, Search, X } from "lucide-react";
import { LibraryRepository, type SourceDetails } from "../lib/repositories/library-repository";
import type { BibliographicSource } from "../lib/domain/bibliography";
import {
  SourceImportService,
  type BibliographicImportFormat,
  type ImportReport,
} from "../lib/application/source-import-service";
import { ResourceRow } from "../components/library/resource-row";
import { ResourceDetails } from "../components/library/resource-details";
import { useWorkbench } from "../lib/workbench/workbench-context";
import {
  PrimarySourceRepository,
  type PrimarySourceWorkSummary,
} from "../lib/repositories/primary-source-repository";
import {
  PrivateDocumentImportService,
  type PrivateDocumentImportProgress,
  type PrivateDocumentImportResult,
} from "../lib/application/private-document-import-service";
import { NAG_HAMMADI_CODICES, NAG_HAMMADI_RIGHTS_NOTE } from "../lib/content/nag-hammadi-catalog";

interface LibrarySearch {
  source?: string;
}
export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch =>
    typeof search["source"] === "string" ? { source: search["source"] } : {},
  head: () => ({ meta: [{ title: "Biblioteca acadêmica — Scriptorium" }] }),
  component: Outlet,
});

export function LibraryPage() {
  const { source: sourceParam } = Route.useSearch();
  const { setPassageContext, workspacePersistence } = useWorkbench();
  const [sources, setSources] = useState<BibliographicSource[]>([]);
  const [collections, setCollections] = useState<
    Awaited<ReturnType<typeof LibraryRepository.listCollections>>
  >([]);
  const [collectionId, setCollectionId] = useState<string>();
  const [selectedId, setSelectedId] = useState<string | undefined>(sourceParam);
  const [details, setDetails] = useState<SourceDetails | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [primaryWorks, setPrimaryWorks] = useState<PrimarySourceWorkSummary[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [newCollection, setNewCollection] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [nextSources, nextCollections] = await Promise.all([
        LibraryRepository.listSources(collectionId ? { collectionId } : {}),
        LibraryRepository.listCollections(),
      ]);
      setPrimaryWorks(await PrimarySourceRepository.listWorks());
      setSources(nextSources);
      setCollections(nextCollections);
      setSelectedId((current) =>
        current && nextSources.some((source) => source.id === current)
          ? current
          : nextSources[0]?.id,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => setPassageContext(null), [setPassageContext]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }
    let active = true;
    void LibraryRepository.getSourceDetails(selectedId)
      .then((value) => {
        if (active) setDetails(value);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      active = false;
    };
  }, [selectedId]);
  const refreshDetails = useCallback(async () => {
    if (selectedId) setDetails(await LibraryRepository.getSourceDetails(selectedId));
  }, [selectedId]);

  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase().trim();
    return normalized
      ? sources.filter((source) =>
          `${source.title} ${source.sourceType} ${Object.values(source.identifiers).join(" ")}`
            .toLocaleLowerCase()
            .includes(normalized),
        )
      : sources;
  }, [query, sources]);
  const primaryWorksByDiscipline = useMemo(() => {
    const groups = new Map<string, PrimarySourceWorkSummary[]>();
    for (const work of primaryWorks) {
      groups.set(work.disciplineLabel, [...(groups.get(work.disciplineLabel) ?? []), work]);
    }
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "pt-BR"));
  }, [primaryWorks]);
  const installedPrimaryWorkIds = useMemo(
    () => new Set(primaryWorks.map((work) => work.id)),
    [primaryWorks],
  );
  const createCollection = async () => {
    if (!newCollection.trim()) return;
    const id = await LibraryRepository.createCollection(newCollection);
    if (selectedId) await LibraryRepository.addSourceToCollection(selectedId, id);
    setNewCollection("");
    setCollectionId(id);
    await refresh();
  };

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
        <div>
          <p className="meta-label">Biblioteca acadêmica</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold">Fontes, obras e citações</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            SQLite{" "}
            {workspacePersistence === "opfs"
              ? "persistente em OPFS"
              : workspacePersistence === "loading"
                ? "inicializando…"
                : "em modo degradado"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-xs"
          >
            <RefreshCw className="size-3.5" /> Atualizar
          </button>
          <button
            type="button"
            onClick={() => setShowImport((value) => !value)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs text-primary-foreground"
          >
            <FileUp className="size-3.5" /> Importar
          </button>
        </div>
      </header>
      {showImport && <ImportPanel onClose={() => setShowImport(false)} onImported={refresh} />}
      <div className="grid min-h-0 flex-1 md:grid-cols-[190px_1fr] xl:grid-cols-[190px_1fr_340px]">
        <aside className="hidden overflow-y-auto border-r border-border p-2 md:block">
          <p className="meta-label px-2 py-1">Coleções</p>
          <button
            onClick={() => setCollectionId(undefined)}
            className={`block w-full rounded px-2 py-1.5 text-left text-xs ${!collectionId ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
          >
            Todas <span className="float-right font-mono text-[9px]">{sources.length}</span>
          </button>
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => setCollectionId(collection.id)}
              className={`block w-full rounded px-2 py-1.5 text-left text-xs ${collectionId === collection.id ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              {collection.name}
              <span className="float-right font-mono text-[9px]">{collection.itemCount}</span>
            </button>
          ))}
          <div className="mt-3 border-t border-border pt-3">
            <label className="meta-label px-2" htmlFor="new-library-collection">
              Nova coleção
            </label>
            <input
              id="new-library-collection"
              value={newCollection}
              onChange={(event) => setNewCollection(event.target.value)}
              placeholder="Nome"
              className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs"
            />
            <button
              type="button"
              onClick={() => void createCollection()}
              disabled={!newCollection.trim()}
              className="mt-1 h-8 w-full rounded bg-primary text-xs text-primary-foreground disabled:opacity-50"
            >
              Criar{selectedId ? " e adicionar" : ""}
            </button>
          </div>
        </aside>
        <main className="min-w-0 overflow-y-auto border-r border-border">
          <label className="flex h-10 items-center gap-2 border-b border-border px-3">
            <Search className="size-3.5 text-muted-foreground" />
            <span className="sr-only">Pesquisar biblioteca</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Título, tipo ou identificador…"
              className="w-full bg-transparent text-xs outline-none"
            />
          </label>
          {primaryWorks.length > 0 && !query.trim() && (
            <section className="border-b border-border p-3">
              <p className="meta-label">Textos primários instalados · {primaryWorks.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Obras agrupadas pelo uso acadêmico principal; uma mesma obra poderá receber
                múltiplos assuntos quando a taxonomia da biblioteca for ampliada.
              </p>
              <div className="mt-3 space-y-3">
                {primaryWorksByDiscipline.map(([discipline, works]) => (
                  <section key={discipline}>
                    <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {discipline}
                    </h2>
                    <div className="mt-1 grid gap-1 sm:grid-cols-2">
                      {works.map((work) => (
                        <a
                          key={`${work.editionId}:${work.id}`}
                          href={`/library/read/${encodeURIComponent(work.id)}`}
                          className="rounded border border-border px-2.5 py-2 text-xs hover:bg-accent/50"
                        >
                          <span className="block font-medium">{work.title}</span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">
                            {work.editionTitle}
                          </span>
                        </a>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}
          {!query.trim() && (
            <section className="border-b border-border p-3">
              <details>
                <summary className="cursor-pointer list-none">
                  <span className="meta-label">Catálogo documental · Nag Hammadi</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    13 códices · 52 testemunhos textuais · 1 texto-fonte instalado
                  </span>
                </summary>
                <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
                  {NAG_HAMMADI_RIGHTS_NOTE}
                </p>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {NAG_HAMMADI_CODICES.map(({ codex, tractates }) => (
                    <section key={codex} className="rounded border border-border p-2.5">
                      <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Códice {codex}
                      </h2>
                      <ol className="mt-1.5 space-y-1">
                        {tractates.map((tractate) => {
                          const installed = Boolean(
                            tractate.installedWorkId &&
                            installedPrimaryWorkIds.has(tractate.installedWorkId),
                          );
                          const content = (
                            <>
                              <span>
                                {tractate.order}. {tractate.title}
                              </span>
                              <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                                {installed ? "texto copta" : "catalogado"}
                              </span>
                            </>
                          );
                          return (
                            <li key={tractate.id}>
                              {installed && tractate.installedWorkId ? (
                                <a
                                  href={`/library/read/${encodeURIComponent(tractate.installedWorkId)}`}
                                  className="flex items-baseline justify-between gap-2 text-xs text-primary hover:underline"
                                >
                                  {content}
                                </a>
                              ) : (
                                <span className="flex items-baseline justify-between gap-2 text-xs">
                                  {content}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  ))}
                </div>
              </details>
            </section>
          )}
          {loading ? (
            <p className="p-6 text-sm italic text-muted-foreground">Abrindo índice local…</p>
          ) : error ? (
            <p role="alert" className="p-6 text-sm text-destructive">
              {error}
            </p>
          ) : filtered.length ? (
            filtered.map((source) => (
              <ResourceRow
                key={source.id}
                source={source}
                authorNames={
                  details?.source.id === source.id
                    ? details.authors.map((author) => author.canonicalName)
                    : []
                }
                active={source.id === selectedId}
                onSelect={() => setSelectedId(source.id)}
              />
            ))
          ) : (
            <p className="p-6 text-sm italic text-muted-foreground">Nenhuma fonte encontrada.</p>
          )}
          {details && (
            <div className="border-t border-border xl:hidden">
              <ResourceDetails details={details} onChanged={refreshDetails} />
            </div>
          )}
        </main>
        <aside className="hidden overflow-y-auto xl:block">
          {details ? (
            <ResourceDetails details={details} onChanged={refreshDetails} />
          ) : (
            <p className="p-5 text-xs italic text-muted-foreground">Selecione uma fonte.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function ImportPanel({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const [format, setFormat] = useState<BibliographicImportFormat>("csl-json");
  const [input, setInput] = useState("");
  const [report, setReport] = useState<ImportReport>();
  const [busy, setBusy] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfProgress, setPdfProgress] = useState<PrivateDocumentImportProgress>();
  const [pdfResults, setPdfResults] = useState<PrivateDocumentImportResult[]>([]);
  const [pdfError, setPdfError] = useState<string>();
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
  const importPdfs = async () => {
    if (!pdfFiles.length) return;
    setBusy(true);
    setPdfError(undefined);
    setPdfResults([]);
    const imported: PrivateDocumentImportResult[] = [];
    try {
      for (const file of pdfFiles) {
        setPdfProgress({ phase: "validating", message: `Preparando ${file.name}…` });
        imported.push(await PrivateDocumentImportService.importPdf(file, setPdfProgress));
        setPdfResults([...imported]);
      }
      setPdfFiles([]);
      await onImported();
    } catch (cause) {
      setPdfError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="Importação bibliográfica"
      className="border-b border-border bg-muted/20 px-5 py-4 md:px-6"
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Importar para a biblioteca</h2>
            <p className="text-xs text-muted-foreground">
              Documentos privados permanecem neste dispositivo; registros bibliográficos guardam
              somente metadados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar importação"
            className="rounded p-1 hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
        <section className="mt-4 rounded border border-border bg-background p-3">
          <div className="flex items-start gap-2">
            <LockKeyhole className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <h3 className="text-xs font-medium">PDF privado com texto pesquisável</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                O arquivo original vai para o OPFS e o texto é indexado por página no workspace.
                Nada é enviado a servidor nem incluído nos pacotes públicos.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded border border-input px-3 text-xs hover:bg-accent">
              <FileText className="size-3.5" /> Selecionar PDFs
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                disabled={busy}
                onChange={(event) => setPdfFiles(Array.from(event.target.files ?? []))}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              disabled={!pdfFiles.length || busy}
              onClick={() => void importPdfs()}
              className="h-9 rounded bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
            >
              {busy
                ? "Processando…"
                : `Indexar ${pdfFiles.length || ""} PDF${pdfFiles.length === 1 ? "" : "s"}`}
            </button>
            {pdfFiles.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {pdfFiles.map((file) => file.name).join(" · ")}
              </span>
            )}
          </div>
          {pdfProgress && (
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              {pdfProgress.message}
            </p>
          )}
          {pdfError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {pdfError}
            </p>
          )}
          {pdfResults.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {pdfResults.map((result) => (
                <li key={result.documentId}>
                  {result.title}: {result.textPageCount}/{result.pageCount} páginas{" "}
                  {result.duplicate ? "já indexadas" : "indexadas"}.
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> Metadados bibliográficos
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr_auto]">
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as BibliographicImportFormat)}
            className="h-9 rounded border border-input bg-background px-2 text-xs"
          >
            <option value="csl-json">CSL-JSON</option>
            <option value="bibtex">BibTeX básico</option>
            <option value="ris">RIS</option>
          </select>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Cole o registro bibliográfico…"
            className="min-h-24 rounded border border-input bg-background p-2 font-mono text-xs"
          />
          <button
            type="button"
            disabled={
              !input.trim() ||
              busy ||
              Boolean(preview?.issues.some((issue) => issue.severity === "error"))
            }
            onClick={() => void runImport()}
            className="h-9 rounded bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Importando…" : `Importar ${preview?.candidates.length ?? 0}`}
          </button>
        </div>
        {preview?.issues.map((issue, index) => (
          <p
            key={`${issue.code}-${index}`}
            className={`mt-2 text-xs ${issue.severity === "error" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {issue.code}: {issue.message}
          </p>
        ))}
        {report && (
          <p role="status" className="mt-2 text-xs">
            {report.imported} importadas · {report.duplicates} duplicadas · {report.invalid}{" "}
            inválidas.
          </p>
        )}
      </div>
    </section>
  );
}
