import { SourceSelectionAction } from "../../../components/study/source-selection-action";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Clipboard, Languages, LoaderCircle } from "lucide-react";
import { LocalTranslationService } from "../../../lib/application/local-translation-service";
import type { LocalTranslation } from "../../../lib/domain/semantic-content";
import {
  PrimarySourceRepository,
  type PrimarySourceDocument,
} from "../../../lib/repositories/primary-source-repository";
import { errorMessage } from "@/lib/utils";
import { useWorkspaceQuery } from "../../../hooks/use-workspace-query";
import { useIsMobile } from "../../../hooks/use-mobile";

interface ReaderSearch {
  unit?: string;
}

export const Route = createFileRoute("/library/read/$workId")({
  validateSearch: (search: Record<string, unknown>): ReaderSearch =>
    typeof search["unit"] === "string" ? { unit: search["unit"] } : {},
  component: PrimarySourceReader,
});

function PrimarySourceReader() {
  const { workId } = Route.useParams();
  const { unit: requestedUnit } = Route.useSearch();
  const documentQuery = useWorkspaceQuery(["primary-source", workId], () =>
    PrimarySourceRepository.getDocument(workId),
  );
  const document: PrimarySourceDocument | null | undefined = documentQuery.data;
  const [selectedId, setSelectedId] = useState<string | undefined>(requestedUnit);
  const [unitQuery, setUnitQuery] = useState("");
  const isMobile = useIsMobile();
  const [contentsOpen, setContentsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [translation, setTranslation] = useState<LocalTranslation | null>();
  const [translationError, setTranslationError] = useState<string>();
  const [translating, setTranslating] = useState(false);
  const pendingTranslation = useRef<AbortController | null>(null);

  useEffect(() => {
    if (document) setSelectedId((current) => current ?? document.units[0]?.id);
  }, [document]);

  const selected = useMemo(
    () => document?.units.find((unit) => unit.id === selectedId) ?? document?.units[0],
    [document, selectedId],
  );
  const visibleUnits = useMemo(() => {
    if (!document) return [];
    const query = unitQuery.trim().toLocaleLowerCase();
    const matches = query
      ? document.units.filter((unit) =>
          `${unit.address?.section ?? ""} ${unit.displayAddress ?? ""} ${unit.text}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : document.units;
    const limited = matches.slice(0, 140);
    const selectedUnit = document.units.find((unit) => unit.id === selectedId);
    return selectedUnit && !limited.some((unit) => unit.id === selectedUnit.id)
      ? [selectedUnit, ...limited]
      : limited;
  }, [document, selectedId, unitQuery]);

  useEffect(() => {
    const controller = new AbortController();
    pendingTranslation.current = controller;
    setTranslating(false);
    if (!selected || document?.language !== "en") {
      setTranslation(null);
      setTranslationError(undefined);
      return () => controller.abort();
    }
    let active = true;
    setTranslation(undefined);
    setTranslationError(undefined);
    void LocalTranslationService.findCached({
      sourceKind: "primary-text-unit",
      sourceId: selected.id,
      sourceLanguage: document.language,
      text: selected.text,
    }).then(
      (value) => {
        if (active) setTranslation(value);
      },
      () => {
        if (active) setTranslation(null);
      },
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [document?.language, selected]);
  if (documentQuery.error)
    return (
      <div role="alert" className="p-6 text-sm text-destructive">
        <p>Esta obra não pôde ser aberta: {errorMessage(documentQuery.error)}</p>
        <button
          type="button"
          onClick={() => void documentQuery.refetch()}
          className="mt-3 h-9 rounded-md border border-input px-3 text-sm text-foreground hover:bg-accent"
        >
          Tentar novamente
        </button>
      </div>
    );
  if (document === undefined)
    return <p className="p-6 text-sm text-muted-foreground">Abrindo corpus primário…</p>;
  if (!document)
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        Obra não encontrada ou pacote indisponível.
      </p>
    );

  const citation = selected
    ? `${document.title} [${document.canonicalTitle}], § ${selected.address?.section ?? selected.sequence} (${document.editionId}). ${document.attribution}`
    : "";
  const languageNotice =
    document.language === "cop"
      ? "Esta edição contém o texto copta saídico e não inclui tradução. O Scriptorium não gera uma tradução silenciosa nem apresenta uma edição portuguesa moderna como domínio público."
      : document.language === "en"
        ? "Esta edição histórica está em inglês. Os controles do Scriptorium permanecem em português e o texto-fonte não é traduzido silenciosamente."
        : `O texto-fonte está identificado como ${document.language}; a interface permanece em português.`;
  const translateSelected = async () => {
    if (!selected || document.language !== "en") return;
    const controller = pendingTranslation.current;
    if (!controller) return;
    setTranslating(true);
    setTranslationError(undefined);
    try {
      const result = await LocalTranslationService.translate(
        {
          sourceKind: "primary-text-unit",
          sourceId: selected.id,
          sourceLanguage: document.language,
          text: selected.text,
        },
        undefined,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setTranslation(result);
    } catch (cause) {
      if (!controller.signal.aborted)
        setTranslationError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (!controller.signal.aborted) setTranslating(false);
    }
  };

  return (
    // On phones the 220 px section column left the text about 140 px wide; there it folds into a
    // list above the text that closes once a section is chosen.
    <div className="flex h-full min-h-0 flex-col md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      {isMobile ? (
        <details
          open={contentsOpen}
          onToggle={(event) => setContentsOpen(event.currentTarget.open)}
          className="shrink-0 border-b border-border px-4"
        >
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
            Seções da obra · Seção {selected?.address?.section ?? selected?.sequence}
          </summary>
          <div className="max-h-[55dvh] overflow-y-auto pb-3">
            <p className="meta-label">Conteúdo</p>
            <h1 className="mt-1 font-serif text-lg font-semibold">{document.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{document.canonicalTitle}</p>
            <p className="mt-2 text-xs text-muted-foreground">{document.editionTitle}</p>
            {document.units.length > 40 && (
              <label className="mt-3 block">
                <span className="sr-only">Filtrar seções da obra</span>
                <input
                  value={unitQuery}
                  onChange={(event) => setUnitQuery(event.target.value)}
                  placeholder="Questão, artigo ou trecho…"
                  className="h-10 w-full rounded border border-input bg-background px-2 text-sm md:h-8 md:text-xs"
                />
                <span className="mt-1 block font-mono text-xs text-muted-foreground">
                  {visibleUnits.length} de {document.units.length} unidades exibidas
                </span>
              </label>
            )}
            <nav className="mt-4 space-y-1" aria-label="Seções da obra">
              {visibleUnits.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(unit.id);
                    setContentsOpen(false);
                  }}
                  className={`block w-full min-h-11 rounded px-2 py-2.5 text-left text-sm md:min-h-0 md:py-1.5 md:text-xs ${unit.id === selected?.id ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
                >
                  Seção {unit.address?.section ?? unit.sequence}
                </button>
              ))}
              {visibleUnits.length === 0 && (
                <p className="px-2 py-3 text-xs italic text-muted-foreground">
                  Nenhuma seção corresponde ao filtro.
                </p>
              )}
            </nav>
          </div>
        </details>
      ) : (
        <aside className="overflow-y-auto border-r border-border p-3">
          <p className="meta-label">Conteúdo</p>
          <h1 className="mt-1 font-serif text-lg font-semibold">{document.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{document.canonicalTitle}</p>
          <p className="mt-2 text-xs text-muted-foreground">{document.editionTitle}</p>
          {document.units.length > 40 && (
            <label className="mt-3 block">
              <span className="sr-only">Filtrar seções da obra</span>
              <input
                value={unitQuery}
                onChange={(event) => setUnitQuery(event.target.value)}
                placeholder="Questão, artigo ou trecho…"
                className="h-10 w-full rounded border border-input bg-background px-2 text-sm md:h-8 md:text-xs"
              />
              <span className="mt-1 block font-mono text-xs text-muted-foreground">
                {visibleUnits.length} de {document.units.length} unidades exibidas
              </span>
            </label>
          )}
          <nav className="mt-4 space-y-1" aria-label="Seções da obra">
            {visibleUnits.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => {
                  setSelectedId(unit.id);
                  setContentsOpen(false);
                }}
                className={`block w-full min-h-11 rounded px-2 py-2.5 text-left text-sm md:min-h-0 md:py-1.5 md:text-xs ${unit.id === selected?.id ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
              >
                Seção {unit.address?.section ?? unit.sequence}
              </button>
            ))}
            {visibleUnits.length === 0 && (
              <p className="px-2 py-3 text-xs italic text-muted-foreground">
                Nenhuma seção corresponde ao filtro.
              </p>
            )}
          </nav>
        </aside>
      )}
      <section aria-label="Texto da obra" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-border px-4 py-4 md:px-6">
          <p className="meta-label flex items-center gap-1.5">
            <BookOpen className="size-3" /> Fonte primária
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">
            {document.title} · Seção {selected?.address?.section ?? selected?.sequence}
          </h2>
          <p className="mt-2 max-w-3xl rounded border border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
            {languageNotice}
          </p>
          <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
            Direitos da edição:{" "}
            {document.rights === "Public domain source editions"
              ? "edições-fonte em domínio público"
              : document.rights}
          </p>
        </header>
        {selected && (
          <article className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
            {document.language === "en" && (
              <section className="mb-6 rounded-md border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="meta-label flex items-center gap-1.5">
                      <Languages className="size-3.5" /> Tradução local para português
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tradução automática auxiliar; o original abaixo permanece canônico.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void translateSelected()}
                    disabled={translating || translation === undefined || Boolean(translation)}
                    className="inline-flex h-9 items-center gap-2 rounded bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
                  >
                    {translating && <LoaderCircle className="size-3.5 animate-spin" />}
                    {translation ? "Tradução armazenada" : "Traduzir esta seção"}
                  </button>
                </div>
                {translation?.translatedText && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="whitespace-pre-line font-serif text-lg leading-8">
                      {translation.translatedText}
                    </p>
                    <p className="mt-3 font-mono text-xs text-muted-foreground">
                      Gerada por {translation.model} ·{" "}
                      {translation.reviewStatus === "human-reviewed"
                        ? "revisada por humano"
                        : "não revisada"}
                    </p>
                  </div>
                )}
                {translationError && (
                  <p role="alert" className="mt-3 text-xs text-destructive">
                    {translationError} Inicie o perfil Docker “semantic” para usar o modelo local.
                  </p>
                )}
              </section>
            )}
            <p className="meta-label mb-3">Texto original · {document.language}</p>
            <p
              id="primary-source-unit-text"
              className="whitespace-pre-wrap font-serif text-lg leading-8"
            >
              {selected.text}
            </p>
            <section className="mt-10 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="meta-label">Citação estruturada</h3>
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard.writeText(citation).then(() => setCopied(true))
                  }
                  className="inline-flex items-center gap-1 rounded border border-input px-2 py-1 text-xs"
                >
                  {copied ? <Check className="size-3" /> : <Clipboard className="size-3" />}{" "}
                  {copied ? "Copiada" : "Copiar"}
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{citation}</p>
            </section>
            <SourceSelectionAction
              elementId="primary-source-unit-text"
              source={{
                kind: "primary-text",
                workId: document.id,
                unitId: selected.id,
                title: document.title,
              }}
            />
          </article>
        )}
      </section>
    </div>
  );
}
