import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Clipboard, Languages, LoaderCircle, NotebookPen } from "lucide-react";
import { LocalTranslationService } from "../../../lib/application/local-translation-service";
import type { LocalTranslation } from "../../../lib/domain/semantic-content";
import {
  PrimarySourceRepository,
  type PrimarySourceDocument,
} from "../../../lib/repositories/primary-source-repository";
import { StudyRepository } from "../../../lib/repositories/study-repository";

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
  const [document, setDocument] = useState<PrimarySourceDocument | null>();
  const [selectedId, setSelectedId] = useState<string | undefined>(requestedUnit);
  const [unitQuery, setUnitQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteStatus, setNoteStatus] = useState<string>();
  const [translation, setTranslation] = useState<LocalTranslation | null>();
  const [translationError, setTranslationError] = useState<string>();
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    let active = true;
    void PrimarySourceRepository.getDocument(workId).then((value) => {
      if (!active) return;
      setDocument(value);
      setSelectedId((current) => current ?? value?.units[0]?.id);
    });
    return () => {
      active = false;
    };
  }, [workId]);

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
    if (!selected || document?.language !== "en") {
      setTranslation(null);
      setTranslationError(undefined);
      return;
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
    };
  }, [document?.language, selected]);
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
  const saveNote = async () => {
    if (!selected || !noteBody.trim()) return;
    setNoteStatus("Salvando…");
    await StudyRepository.createNote({
      title:
        noteTitle.trim() ||
        `Nota sobre ${document.title} ${selected.address?.section ?? selected.sequence}`,
      body: noteBody.trim(),
      links: [
        {
          kind: "resource",
          target: selected.id,
          label: selected.displayAddress ?? document.title,
          anchor: {
            type: "canonical-text",
            anchor: {
              kind: "text-unit",
              corpusId: document.corpusId,
              editionId: document.editionId,
              workId: document.id,
              versificationSchemeId: selected.versificationSchemeId,
              startUnitId: selected.id,
            },
          },
        },
      ],
    });
    setNoteTitle("");
    setNoteBody("");
    setNoteStatus("Nota persistida e ancorada à unidade textual.");
  };
  const translateSelected = async () => {
    if (!selected || document.language !== "en") return;
    setTranslating(true);
    setTranslationError(undefined);
    try {
      setTranslation(
        await LocalTranslationService.translate({
          sourceKind: "primary-text-unit",
          sourceId: selected.id,
          sourceLanguage: document.language,
          text: selected.text,
        }),
      );
    } catch (cause) {
      setTranslationError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)]">
      <aside className="overflow-y-auto border-r border-border p-3">
        <p className="meta-label">Conteúdo</p>
        <h1 className="mt-1 font-serif text-lg font-semibold">{document.title}</h1>
        <p className="mt-1 text-[11px] text-muted-foreground">{document.canonicalTitle}</p>
        <p className="mt-2 text-[10px] text-muted-foreground">{document.editionTitle}</p>
        {document.units.length > 40 && (
          <label className="mt-3 block">
            <span className="sr-only">Filtrar seções da obra</span>
            <input
              value={unitQuery}
              onChange={(event) => setUnitQuery(event.target.value)}
              placeholder="Questão, artigo ou trecho…"
              className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
            />
            <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
              {visibleUnits.length} de {document.units.length} unidades exibidas
            </span>
          </label>
        )}
        <nav className="mt-4 space-y-1" aria-label="Seções da obra">
          {visibleUnits.map((unit) => (
            <button
              key={unit.id}
              type="button"
              onClick={() => setSelectedId(unit.id)}
              className={`block w-full rounded px-2 py-1.5 text-left text-xs ${unit.id === selected?.id ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
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
      <main className="min-w-0 overflow-y-auto">
        <header className="border-b border-border px-6 py-4">
          <p className="meta-label flex items-center gap-1.5">
            <BookOpen className="size-3" /> Fonte primária
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">
            {document.title} · Seção {selected?.address?.section ?? selected?.sequence}
          </h2>
          <p className="mt-2 max-w-3xl rounded border border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
            {languageNotice}
          </p>
          <p className="mt-2 max-w-3xl text-[11px] text-muted-foreground">
            Direitos da edição:{" "}
            {document.rights === "Public domain source editions"
              ? "edições-fonte em domínio público"
              : document.rights}
          </p>
        </header>
        {selected && (
          <article className="mx-auto max-w-3xl px-6 py-8">
            <p className="meta-label mb-3">Texto original · {document.language}</p>
            <p className="whitespace-pre-line font-serif text-[17px] leading-8">{selected.text}</p>
            {document.language === "en" && (
              <section className="mt-8 rounded-md border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="meta-label flex items-center gap-1.5">
                      <Languages className="size-3.5" /> Tradução local para português
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tradução automática auxiliar; o original acima permanece canônico.
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
                    <p className="whitespace-pre-line font-serif text-[17px] leading-8">
                      {translation.translatedText}
                    </p>
                    <p className="mt-3 font-mono text-[10px] text-muted-foreground">
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
            <section className="mt-6 border-t border-border pt-5">
              <h3 className="meta-label flex items-center gap-1.5">
                <NotebookPen className="size-3" /> Nota neste trecho
              </h3>
              <input
                aria-label="Título da nota"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Título opcional"
                className="mt-2 h-9 w-full rounded border border-input bg-background px-3 text-sm"
              />
              <textarea
                aria-label="Conteúdo da nota"
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Sua observação…"
                className="mt-2 min-h-28 w-full rounded border border-input bg-background p-3 text-sm"
              />
              <button
                type="button"
                disabled={!noteBody.trim()}
                onClick={() => void saveNote()}
                className="mt-2 rounded bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50"
              >
                Salvar nota ancorada
              </button>
              {noteStatus && (
                <p role="status" className="mt-2 text-xs text-muted-foreground">
                  {noteStatus}
                </p>
              )}
            </section>
          </article>
        )}
      </main>
    </div>
  );
}
