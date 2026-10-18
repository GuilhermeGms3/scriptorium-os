import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { SourcePagePreview } from "../common/source-page-preview";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { StudySourceService } from "../../lib/application/study-source-service";
import { LocalTranslationService } from "../../lib/application/local-translation-service";
import { StudyNotebookRepository } from "../../lib/repositories/study-notebook-repository";
import { studySourceHref } from "../../lib/domain/study-notebook";
import type { ReadingSource } from "../../lib/application/reading-source";
import { SourceReaderContext } from "./source-reader-context";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { errorMessage } from "../../lib/utils";
import { useStudyDraftGuard } from "../../hooks/use-study-draft-guard";
import { passageRefKey } from "../../lib/domain/scripture";
import { notifyKnowledgeMutation } from "../../lib/workspace-runtime/workspace-events";

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
  const { studies, refreshUserData } = useWorkbench();
  const [groupId, setGroupId] = useState(reading.studyId ?? studies[0]?.id ?? "");
  const [newGroup, setNewGroup] = useState("");
  const [color, setColor] = useState("#b9a574");
  const [customColor, setCustomColor] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<string>();
  const [translation, setTranslation] = useState<string>();
  const [translating, setTranslating] = useState(false);
  const [showPage, setShowPage] = useState(Boolean(reading.caption));
  const noteForm = useRef<HTMLFormElement>(null);
  const sourceText = useRef<HTMLElement>(null);
  const source = reading.source;
  const query = useWorkspaceQuery(
    ["source-reader", source],
    () => StudySourceService.read(source),
    { refreshOnKnowledgeChange: true },
  );
  const group = studies.find((item) => item.id === groupId);
  const candidateUrl = query.data?.externalUrl ?? reading.externalUrl;
  const externalUrl =
    candidateUrl && /^https?:\/\//iu.test(candidateUrl) ? candidateUrl : undefined;
  async function save() {
    setBusy(true);
    setError(undefined);
    try {
      const target = groupId || (await StudyNotebookRepository.createGroup(newGroup, color));
      const savedId = await StudyNotebookRepository.saveNote({
        title: title.trim() || reading.caption || source.title,
        body,
        studyId: target,
        source,
        ...(customColor ? { color } : {}),
        ...(reading.links ? { links: reading.links } : {}),
      });
      await refreshUserData();
      notifyKnowledgeMutation();
      setGroupId(target);
      setSavedNoteId(savedId);
      setSaved(true);
      onDirty(false);
      setBody("");
      setTitle("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
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
          <a href={studySourceHref(source)}>
            {source.kind === "bibliographic"
              ? "Abrir referência na Biblioteca"
              : "Abrir na Biblioteca · trecho destacado"}
          </a>
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
      <div className="grid min-h-0 min-w-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_300px]">
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
              <p className="my-3 meta-label">
                {reading.excerpt
                  ? "Fragmento citado"
                  : query.data.metadataOnly
                    ? "Registro bibliográfico"
                    : `Texto original · ${query.data.language}`}
              </p>
              <p className="whitespace-pre-wrap break-words font-serif text-base leading-relaxed">
                {(reading.excerpt ?? query.data.text) ||
                  "Esta página não possui texto extraído. Consulte a imagem original."}
              </p>
              {source.kind !== "bibliographic" && query.data.language.startsWith("en") && (
                <Button
                  className="mt-4"
                  variant="outline"
                  size="sm"
                  disabled={translating || !query.data.text}
                  onClick={() => {
                    setTranslating(true);
                    setError(undefined);
                    void LocalTranslationService.translate({
                      sourceKind:
                        source.kind === "private-document"
                          ? "private-segment"
                          : "primary-text-unit",
                      sourceId:
                        source.unitId ??
                        `${source.kind === "private-document" ? source.documentId : source.workId}:page`,
                      sourceLanguage: query.data.language,
                      text: query.data.text,
                    })
                      .then((result) => setTranslation(result.translatedText))
                      .catch((cause) => setError(errorMessage(cause)))
                      .finally(() => setTranslating(false));
                  }}
                >
                  {translating ? "Traduzindo…" : "Traduzir para português"}
                </Button>
              )}
              {translation && (
                <section className="mt-4 border-l-2 border-primary pl-4">
                  <p className="meta-label">Tradução automática · original preservado</p>
                  <p className="mt-2 whitespace-pre-wrap font-serif leading-relaxed">
                    {translation}
                  </p>
                </section>
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
        <form
          ref={noteForm}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="flex min-w-0 flex-col gap-3 border-t border-border pt-4 lg:sticky lg:top-0 lg:self-start lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
        >
          <h3 className="font-serif text-lg font-semibold">Guardar nos estudos</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start lg:hidden"
            onClick={() => sourceText.current?.scrollIntoView({ block: "start" })}
          >
            Voltar à fonte
          </Button>
          <p className="text-xs text-muted-foreground">
            Sua nota mantém a referência à fonte e à página. O texto do livro não é copiado
            automaticamente.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Grupo de estudo
            <select
              className="h-9 min-w-0 rounded border border-input bg-background px-2"
              value={groupId}
              onChange={(event) => {
                setGroupId(event.target.value);
                onDirty(true);
                setSaved(false);
              }}
            >
              <option value="">Criar novo grupo…</option>
              {studies.map((study) => (
                <option key={study.id} value={study.id}>
                  {study.title}
                </option>
              ))}
            </select>
          </label>
          {!groupId && (
            <label className="flex flex-col gap-1 text-sm">
              Nome do grupo
              <Input
                value={newGroup}
                onChange={(event) => {
                  setNewGroup(event.target.value);
                  onDirty(true);
                }}
                required
                maxLength={500}
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            Título da nota
            <Input
              value={title}
              placeholder={reading.caption ?? "Minha observação"}
              maxLength={500}
              onChange={(event) => {
                setTitle(event.target.value);
                onDirty(true);
                setSaved(false);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Sua nota
            <Textarea
              value={body}
              className="min-h-40"
              required
              maxLength={200000}
              onChange={(event) => {
                setBody(event.target.value);
                onDirty(true);
                setSaved(false);
              }}
              placeholder="O que esta fonte acrescenta ao meu estudo?"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={customColor}
              onChange={(event) => {
                setCustomColor(event.target.checked);
                onDirty(true);
              }}
            />
            Cor própria da nota
          </label>
          {(customColor || !groupId) && (
            <label className="flex items-center gap-2 text-sm">
              {customColor ? "Cor da nota" : "Cor do grupo"}
              <input
                aria-label="Escolher cor"
                type="color"
                value={color}
                onChange={(event) => {
                  setColor(event.target.value);
                  onDirty(true);
                }}
              />
            </label>
          )}
          {group && !customColor && (
            <p className="text-xs text-muted-foreground">A nota herda a cor de {group.title}.</p>
          )}
          <Button disabled={busy || !body.trim() || (!groupId && !newGroup.trim())}>
            {busy ? "Salvando…" : "Salvar nota"}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm">
              Nota salva.{" "}
              <Link
                to="/notes"
                search={{ group: groupId, ...(savedNoteId ? { note: savedNoteId } : {}) }}
                className="underline"
              >
                Abrir nota
              </Link>
            </p>
          )}
        </form>
      </div>
    </>
  );
}
