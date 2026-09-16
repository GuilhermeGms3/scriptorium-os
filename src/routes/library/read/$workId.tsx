import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Clipboard, NotebookPen } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteStatus, setNoteStatus] = useState<string>();

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

  return (
    <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)]">
      <aside className="overflow-y-auto border-r border-border p-3">
        <p className="meta-label">Conteúdo</p>
        <h1 className="mt-1 font-serif text-lg font-semibold">{document.title}</h1>
        <p className="mt-1 text-[11px] text-muted-foreground">{document.canonicalTitle}</p>
        <p className="mt-2 text-[10px] text-muted-foreground">{document.editionTitle}</p>
        <nav className="mt-4 space-y-1" aria-label="Seções da obra">
          {document.units.map((unit) => (
            <button
              key={unit.id}
              type="button"
              onClick={() => setSelectedId(unit.id)}
              className={`block w-full rounded px-2 py-1.5 text-left text-xs ${unit.id === selected?.id ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              Seção {unit.address?.section ?? unit.sequence}
            </button>
          ))}
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
            Esta edição histórica está em inglês. Os controles do Scriptorium permanecem em
            português e o texto-fonte não é traduzido silenciosamente.
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
            <p className="whitespace-pre-line font-serif text-[17px] leading-8">{selected.text}</p>
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
