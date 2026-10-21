import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, Link2, Pencil, Save } from "lucide-react";
import { Button } from "../ui/button";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { NoteMarkdown } from "./note-markdown";
import { NoteLinkPicker } from "./note-link-picker";
import {
  folderPath,
  wikiLink,
  wikiReferences,
  type NoteFolder,
} from "../../lib/domain/note-document";
import type { Note, Study } from "../../lib/domain/study";
import type { StudySource } from "../../lib/domain/study-notebook";
import { useSourceReader } from "../study/source-reader-context";
import { formatNoteSelection, type NoteFormat } from "../../lib/domain/note-format";

export interface NoteDraft {
  key: string;
  id?: string;
  expectedUpdatedAt?: string;
  studyId: string;
  title: string;
  body: string;
  color: string;
  folderId: string | null;
  source?: StudySource;
  dirty: boolean;
}
export function NoteDocumentEditor({
  draft,
  group,
  groups,
  notes,
  folders,
  busy,
  onChange,
  onSave,
  onOpen,
  showSourceLink = true,
  saveDisabled = false,
}: {
  draft: NoteDraft;
  group: Study | undefined;
  groups: readonly Study[];
  notes: readonly Note[];
  folders: NoteFolder[];
  busy: boolean;
  onChange: (patch: Partial<NoteDraft>) => void;
  onSave: () => void;
  onOpen: (id: string) => void;
  showSourceLink?: boolean;
  saveDisabled?: boolean;
}) {
  const editorId = useId();
  const [mode, setMode] = useState("write");
  const [picker, setPicker] = useState<{ start: number; end: number; query: string } | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = editor.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [draft.body, mode]);
  useEffect(() => {
    const element = editor.current;
    if (!element) return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [mode]);
  const openSource = useSourceReader();
  const unresolved = wikiReferences(draft.body, notes).filter((ref) => !ref.targetId);
  function formatSelection(format: NoteFormat) {
    const element = editor.current;
    const result = formatNoteSelection(
      draft.body,
      element?.selectionStart ?? draft.body.length,
      element?.selectionEnd ?? draft.body.length,
      format,
    );
    onChange({ body: result.body });
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(result.start, result.end);
    });
  }
  function openPicker() {
    const element = editor.current;
    setPicker({
      start: element?.selectionStart ?? draft.body.length,
      end: element?.selectionEnd ?? draft.body.length,
      query: "",
    });
  }
  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          if (!busy && !saveDisabled && draft.dirty && draft.title.trim()) onSave();
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {group?.title ?? "Escolha um grupo"} /{" "}
          {folderPath(draft.folderId, folders) || "Sem pasta"}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <ToggleGroup
            type="single"
            size="sm"
            value={mode}
            onValueChange={(value) => {
              if (value) setMode(value);
            }}
            aria-label="Modo da nota"
          >
            <ToggleGroupItem value="write">
              <Pencil className="size-4" /> Escrever
            </ToggleGroupItem>
            <ToggleGroupItem value="read">
              <BookOpen className="size-4" /> Ler
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="ghost" size="sm" onClick={openPicker}>
            <Link2 data-icon="inline-start" /> Inserir link
          </Button>
          <Button
            size="sm"
            disabled={busy || saveDisabled || !draft.dirty || !draft.title.trim()}
            onClick={onSave}
          >
            <Save data-icon="inline-start" />
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 md:px-10 md:py-9">
        <article className="mx-auto flex min-h-full max-w-3xl flex-col gap-5">
          <label className="sr-only" htmlFor={`${editorId}-title`}>
            Título da nota
          </label>
          {mode === "write" ? (
            <input
              id={`${editorId}-title`}
              autoFocus={!draft.id}
              maxLength={500}
              value={draft.title}
              disabled={busy}
              placeholder="Título da nota"
              onChange={(event) => onChange({ title: event.target.value })}
              className="w-full border-0 bg-transparent font-serif text-3xl font-semibold outline-none placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring md:text-4xl"
            />
          ) : (
            <h1 className="font-serif text-3xl font-semibold md:text-4xl">
              {draft.title || "Sem título"}
            </h1>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <label className="inline-flex items-center gap-1.5">
              Grupo
              <select
                aria-label="Grupo da nota"
                value={draft.studyId}
                disabled={busy}
                onChange={(event) => onChange({ studyId: event.target.value, folderId: null })}
                className="max-w-52 rounded border border-input bg-background p-1.5 text-foreground"
              >
                <option value="" disabled>
                  Escolha um grupo
                </option>
                {groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5">
              Pasta
              <select
                aria-label="Pasta da nota"
                value={draft.folderId ?? ""}
                disabled={busy}
                onChange={(event) => onChange({ folderId: event.target.value || null })}
                className="max-w-52 rounded border border-input bg-background p-1.5 text-foreground"
              >
                <option value="">Sem pasta</option>
                {folders
                  .filter((folder) => folder.studyId === draft.studyId)
                  .map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folderPath(folder.id, folders)}
                    </option>
                  ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={Boolean(draft.color)}
                disabled={busy}
                onChange={(event) =>
                  onChange({ color: event.target.checked ? (group?.color ?? "#b9a574") : "" })
                }
              />
              Cor própria
            </label>
            {draft.color && (
              <input
                type="color"
                aria-label="Cor da nota"
                value={draft.color}
                disabled={busy}
                onChange={(event) => onChange({ color: event.target.value })}
                className="h-7 w-9 cursor-pointer rounded border border-input bg-transparent"
              />
            )}
            {draft.source && showSourceLink && (
              <button
                type="button"
                className="text-primary underline underline-offset-4"
                onClick={() => openSource({ source: draft.source! })}
              >
                Consultar fonte · {draft.source.title}
                {draft.source.kind === "private-document" ? ` · p. ${draft.source.page}` : ""}
              </button>
            )}
          </div>
          {mode === "write" ? (
            <>
              <div
                className="flex flex-wrap items-center gap-1 border-y border-border py-1 text-xs text-muted-foreground"
                aria-label="Formatação da nota"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => formatSelection("heading")}
                >
                  Título
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => formatSelection("bold")}
                >
                  Negrito
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => formatSelection("list")}
                >
                  Lista
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => formatSelection("italic")}
                >
                  Itálico
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => formatSelection("quote")}
                >
                  Citação
                </Button>
                <span className="px-2">Digite / ou [[ para linkar</span>
              </div>
              <label className="sr-only" htmlFor={`${editorId}-body`}>
                Conteúdo da nota
              </label>
              <textarea
                id={`${editorId}-body`}
                ref={editor}
                value={draft.body}
                maxLength={200000}
                disabled={busy}
                placeholder={
                  "Comece a escrever aqui…\n\nUse # para títulos, **negrito** e [[ para conectar suas ideias."
                }
                className="min-h-[55dvh] w-full flex-1 resize-none overflow-hidden border-0 bg-transparent font-serif text-lg leading-[1.85] outline-none placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring"
                onChange={(event) => {
                  const body = event.target.value;
                  onChange({ body });
                  const caret = event.target.selectionStart;
                  const prefix = body.slice(0, caret);
                  if (prefix.endsWith("[[")) setPicker({ start: caret - 2, end: caret, query: "" });
                  else if (/(^|\s)\/$/.test(prefix))
                    setPicker({ start: caret - 1, end: caret, query: "" });
                }}
              />
            </>
          ) : (
            <NoteMarkdown body={draft.body} notes={notes} onOpen={onOpen} />
          )}
          {unresolved.length > 0 && (
            <p role="status" className="text-xs text-muted-foreground">
              {unresolved.length} referência(s) sem destino único. Use Inserir link para escolher a
              nota; não criaremos conexões por adivinhação.
            </p>
          )}
        </article>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-2 text-xs text-muted-foreground">
        <span role="status">
          {busy
            ? "Salvando no workspace…"
            : draft.dirty
              ? "Alterações não salvas · Ctrl+S para salvar"
              : draft.id
                ? "Alterações salvas no workspace"
                : "Novo documento · escreva e salve sua nota"}
        </span>
        <span>
          {draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0} palavras · Markdown
        </span>
      </footer>
      {picker && (
        <NoteLinkPicker
          notes={notes.filter((note) => note.id !== draft.id)}
          initialQuery={picker.query}
          onClose={() => {
            setPicker(null);
            requestAnimationFrame(() => editor.current?.focus());
          }}
          onSelect={(note) => {
            const link = wikiLink(note);
            onChange({
              body: draft.body.slice(0, picker.start) + link + draft.body.slice(picker.end),
            });
            const caret = picker.start + link.length;
            setPicker(null);
            setMode("write");
            requestAnimationFrame(() => {
              editor.current?.focus();
              editor.current?.setSelectionRange(caret, caret);
            });
          }}
        />
      )}
    </div>
  );
}
