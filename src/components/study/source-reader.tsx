import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { AppLink } from "../common/app-link";
import { SourcePagePreview } from "../common/source-page-preview";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { StudySourceService } from "../../lib/application/study-source-service";
import { PageTranslation } from "../library/page-translation";
import { SourceNoteEditor } from "./source-note-editor";
import {
  captureSourceSelection,
  sourceSelectionMatches,
  type SourceSelection,
} from "../../lib/domain/source-selection";
import { studySourceHref } from "../../lib/domain/study-notebook";
import type { ReadingSource } from "../../lib/application/reading-source";
import { SourceReaderContext } from "./source-reader-context";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { errorMessage } from "../../lib/utils";
import { useStudyDraftGuard } from "../../hooks/use-study-draft-guard";
import { passageRefKey } from "../../lib/domain/scripture";

export function SourceReaderProvider({ children }: { children: ReactNode }) {
  const { passageContext, setInspectorOpen } = useWorkbench();
  const [reading, setReading] = useState<ReadingSource>();
  const [dirty, setDirty] = useState(false);
  const origin = useRef<HTMLElement | null>(null);
  const location = useLocation({ select: (current) => current.href });
  const openedAt = useRef(location);
  useEffect(() => {
    if (reading && openedAt.current !== location) {
      setReading(undefined);
      setDirty(false);
    }
  }, [location, reading]);
  useEffect(() => {
    if (!reading) return;
    // On narrow screens the inspector is itself a modal. Do not stack it above this reader
    // when opening a source or rotating the device while a source is already open.
    const media = window.matchMedia("(max-width: 1279px)");
    const closeDrawer = () => {
      if (media.matches) setInspectorOpen(false);
    };
    closeDrawer();
    media.addEventListener("change", closeDrawer);
    return () => media.removeEventListener("change", closeDrawer);
  }, [reading, setInspectorOpen]);
  useStudyDraftGuard(dirty);
  function open(source: ReadingSource) {
    if (dirty && !window.confirm("Descartar a nota ainda não salva?")) return;
    openedAt.current = location;
    origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (window.matchMedia("(max-width: 1279px)").matches) setInspectorOpen(false);
    setDirty(false);
    const ref = passageContext?.ref;
    setReading(
      ref
        ? {
            ...source,
            links: [
              ...(source.links ?? []),
              {
                kind: "passage",
                target: passageRefKey(ref),
                label: "Passagem de estudo",
                anchor: { type: "passage", ref },
              },
            ],
          }
        : source,
    );
  }
  return (
    <SourceReaderContext.Provider value={open}>
      {children}
      <Dialog
        open={Boolean(reading)}
        onOpenChange={(value) => {
          if (!value && (!dirty || window.confirm("Descartar a nota ainda não salva?"))) {
            setReading(undefined);
            setDirty(false);
          }
        }}
      >
        <DialogContent
          className="flex h-[92svh] max-h-[92svh] w-[calc(100%-1rem)] max-w-6xl flex-col overflow-hidden p-4 sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            origin.current?.focus();
          }}
        >
          {reading && (
            <SourceReading
              key={JSON.stringify(reading.source)}
              reading={reading}
              onDirty={setDirty}
            />
          )}
        </DialogContent>
      </Dialog>
    </SourceReaderContext.Provider>
  );
}

function SourceReading({
  reading,
  onDirty,
}: {
  reading: ReadingSource;
  onDirty: (dirty: boolean) => void;
}) {
  const [showPage, setShowPage] = useState(Boolean(reading.caption));
  const [selectionStatus, setSelectionStatus] = useState("");
  const [selection, setSelection] = useState<SourceSelection | undefined>(
    reading.source.kind !== "bibliographic" ? reading.source.selection : undefined,
  );
  const noteForm = useRef<HTMLDivElement>(null);
  const sourceText = useRef<HTMLElement>(null);
  const originalText = useRef<HTMLParagraphElement>(null);
  const source = reading.source;
  const query = useWorkspaceQuery(
    ["source-reader", source],
    () => StudySourceService.read(source),
    { refreshOnKnowledgeChange: true },
  );
  const candidateUrl = query.data?.externalUrl ?? reading.externalUrl;
  const externalUrl =
    candidateUrl && /^https?:\/\//iu.test(candidateUrl) ? candidateUrl : undefined;
  return (
    <>
      <DialogHeader className="shrink-0 pr-7">
        <DialogTitle>{reading.caption ?? source.title}</DialogTitle>
        <DialogDescription>
          {source.title}
          {source.kind === "private-document"
            ? ` · página ${source.page}`
            : source.kind === "primary-text"
              ? " · fonte primária"
              : " · referência bibliográfica"}
          . Consulte sem sair da passagem.
        </DialogDescription>
      </DialogHeader>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <AppLink href={studySourceHref(source)}>
            {source.kind === "bibliographic"
              ? "Abrir referência na Biblioteca"
              : "Abrir na Biblioteca · trecho destacado"}
          </AppLink>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="lg:hidden"
          onClick={() => {
            noteForm.current?.scrollIntoView({ block: "start" });
            noteForm.current?.querySelector("textarea")?.focus();
          }}
        >
          Escrever uma nota
        </Button>
      </div>
      <div className="grid min-h-0 min-w-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section ref={sourceText} className="min-w-0" aria-label="Conteúdo da fonte">
          {reading.context && (
            <p className="mb-3 text-xs text-muted-foreground">{reading.context}</p>
          )}
          {source.kind === "private-document" && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                aria-expanded={showPage}
                onClick={() => setShowPage((value) => !value)}
              >
                {showPage ? "Recolher página original" : "Ver página original"}
              </Button>
              {showPage && (
                <SourcePagePreview
                  documentId={source.documentId}
                  page={source.page}
                  caption={reading.caption ?? source.title}
                />
              )}
            </div>
          )}
          {query.isPending && <p role="status">Carregando trecho original…</p>}
          {query.error && (
            <div role="alert">
              <p>{errorMessage(query.error)}</p>
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}
          {query.data && (
            <>
              {query.data.metadataOnly && reading.excerpt && (
                <blockquote className="my-3 whitespace-pre-wrap border-l-2 border-primary/40 pl-3 font-serif">
                  {reading.excerpt}
                </blockquote>
              )}
              <p className="my-3 meta-label">
                {query.data.metadataOnly
                  ? "Registro bibliográfico"
                  : `Texto original · ${query.data.language}`}
              </p>
              <p
                ref={originalText}
                className="whitespace-pre-wrap break-words font-serif text-base leading-relaxed"
              >
                {selection && sourceSelectionMatches(query.data.text, selection) ? (
                  <>
                    {query.data.text.slice(0, selection.start)}
                    <mark>{selection.quote}</mark>
                    {query.data.text.slice(selection.end)}
                  </>
                ) : (
                  query.data.text ||
                  "Esta página não possui texto extraído. Consulte a imagem original."
                )}
              </p>
              {!query.data.metadataOnly && (
                <Button
                  className="my-3"
                  size="sm"
                  variant="outline"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const captured = originalText.current
                      ? captureSourceSelection(originalText.current)
                      : null;
                    if (captured) {
                      setSelection(captured);
                      setSelectionStatus("");
                    } else {
                      setSelectionStatus("Selecione primeiro um trecho do texto original acima.");
                    }
                  }}
                >
                  Marcar seleção para a nota
                </Button>
              )}
              {selectionStatus && (
                <p role="status" className="my-2 text-sm">
                  {selectionStatus}
                </p>
              )}
              {selection && (
                <p className="my-2 text-xs text-muted-foreground">
                  {sourceSelectionMatches(query.data.text, selection)
                    ? "Seleção vinculada à nota; o destaque reaparece ao consultar sua fonte."
                    : "O texto original mudou: seleção anterior preservada, mas não destacada nesta versão."}
                </p>
              )}
              {source.kind !== "bibliographic" && (
                <PageTranslation
                  id={
                    source.unitId ??
                    `${source.kind === "private-document" ? source.documentId + ":page:" + source.page : source.workId}`
                  }
                  text={query.data.text}
                  language={query.data.language}
                  sourceKind={
                    source.kind === "private-document" ? "private-segment" : "primary-text-unit"
                  }
                />
              )}
            </>
          )}
          {externalUrl && (
            <Button className="ml-2 mt-5" variant="outline" asChild>
              <a href={externalUrl} target="_blank" rel="noreferrer">
                Consultar site da fonte
              </a>
            </Button>
          )}
        </section>
        <div ref={noteForm} className="min-w-0">
          <SourceNoteEditor
            reading={reading}
            source={
              source.kind !== "bibliographic" && selection ? { ...source, selection } : source
            }
            onDirty={onDirty}
          />
        </div>
      </div>
    </>
  );
}
