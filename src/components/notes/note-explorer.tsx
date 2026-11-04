import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Settings2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import type { Note, Study } from "../../lib/domain/study";
import type { NoteFolder, NotePlacement } from "../../lib/domain/note-document";

export function NoteExplorer({
  studies,
  notes,
  folders,
  placements,
  groupId,
  folderId,
  activeId,
  onGroup,
  onFolder,
  onOpen,
  onNewNote,
  onNewGroup,
  onNewFolder,
  onEditFolder,
  onColor,
}: {
  studies: readonly Study[];
  notes: readonly Note[];
  folders: NoteFolder[];
  placements: NotePlacement[];
  groupId: string;
  folderId: string | null;
  activeId: string | undefined;
  onGroup: (id: string) => void;
  onFolder: (id: string | null) => void;
  onOpen: (id: string) => void;
  onNewNote: () => void;
  onNewGroup: () => void;
  onNewFolder: () => void;
  onEditFolder: (folder: NoteFolder) => void;
  onColor: (color: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const group = studies.find((study) => study.id === groupId);
  const groupNotes = notes.filter(
    (note) =>
      !groupId || note.links.some((link) => link.kind === "study" && link.target === groupId),
  );
  const filtered = groupNotes.filter((note) =>
    `${note.title} ${note.body}`
      .toLocaleLowerCase("pt-BR")
      .includes(filter.toLocaleLowerCase("pt-BR")),
  );
  const locations = new Map(
    placements
      .filter((place) => place.studyId === groupId)
      .map((place) => [place.noteId, place.folderId]),
  );
  function noteRow(note: Note) {
    return (
      <li key={note.id}>
        <button
          type="button"
          aria-current={activeId === note.id ? "page" : undefined}
          onClick={() => onOpen(note.id)}
          className={cn(
            "flex min-h-9 w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            activeId === note.id && "bg-accent font-medium",
          )}
        >
          <FileText className="size-4 shrink-0" style={{ color: note.color ?? group?.color }} />
          <span className="truncate">{note.title || "Sem título"}</span>
        </button>
      </li>
    );
  }
  function branch(parent: string | null, depth = 0): React.ReactNode {
    return folders
      .filter((folder) => folder.studyId === groupId && folder.parentId === parent)
      .map((folder) => {
        const open = !collapsed.has(folder.id);
        return (
          <li key={folder.id}>
            <div
              className={cn(
                "group flex min-h-9 items-center gap-0.5 rounded hover:bg-accent",
                folderId === folder.id && "bg-accent",
              )}
            >
              <button
                type="button"
                aria-label={`${open ? "Recolher" : "Expandir"} pasta ${folder.name}`}
                aria-expanded={open}
                className="p-1 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() =>
                  setCollapsed((previous) => {
                    const next = new Set(previous);
                    if (open) next.add(folder.id);
                    else next.delete(folder.id);
                    return next;
                  })
                }
              >
                {open ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
              <button
                type="button"
                aria-pressed={folderId === folder.id}
                onClick={() => onFolder(folder.id)}
                className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring"
              >
                {open ? (
                  <FolderOpen className="size-4 shrink-0" />
                ) : (
                  <Folder className="size-4 shrink-0" />
                )}
                <span className="truncate">{folder.name}</span>
              </button>
              <button
                type="button"
                aria-label={`Organizar pasta ${folder.name}`}
                onClick={() => onEditFolder(folder)}
                className="p-1.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Settings2 className="size-3.5" />
              </button>
            </div>
            {open && depth < 100 && (
              <ul className="ml-3 border-l border-border pl-2">
                {branch(folder.id, depth + 1)}
                {groupNotes.filter((note) => locations.get(note.id) === folder.id).map(noteRow)}
              </ul>
            )}
          </li>
        );
      });
  }
  return (
    <nav aria-label="Explorador de notas" className="flex h-full min-h-0 flex-col bg-card/40">
      <header className="flex items-center justify-between gap-2 px-4 py-4">
        <h1 className="font-serif text-2xl font-semibold">Notas</h1>
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            title="Nova nota"
            aria-label="Nova nota"
            onClick={onNewNote}
          >
            <Plus />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Nova pasta"
            aria-label="Nova pasta"
            disabled={!groupId}
            onClick={onNewFolder}
          >
            <FolderPlus />
          </Button>
        </div>
      </header>
      <div className="flex flex-col gap-3 px-3 pb-4">
        <label className="sr-only" htmlFor="notes-group">
          Grupo de notas
        </label>
        <div className="flex items-center gap-2">
          {group && (
            <input
              type="color"
              aria-label="Cor do grupo"
              value={group.color ?? "#b9a574"}
              onChange={(event) => onColor(event.target.value)}
              className="h-8 w-9 shrink-0 cursor-pointer rounded border border-input bg-transparent"
            />
          )}
          <select
            id="notes-group"
            value={groupId}
            onChange={(event) => {
              onGroup(event.target.value);
              onFolder(null);
            }}
            className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="">Todas as notas</option>
            {studies.map((study) => (
              <option key={study.id} value={study.id}>
                {study.title}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={onNewGroup}>
          <Plus data-icon="inline-start" />
          Novo grupo
        </Button>
        <Input
          aria-label="Buscar nas notas"
          placeholder="Buscar nas notas…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
        {groupId && !filter && (
          <button
            type="button"
            aria-pressed={folderId === null}
            className="mb-2 flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => onFolder(null)}
          >
            Raiz do grupo · criar aqui
          </button>
        )}
        <ul className="flex flex-col gap-0.5">
          {groupId && !filter ? (
            <>
              {branch(null)}
              {groupNotes.filter((note) => !locations.has(note.id)).map(noteRow)}
            </>
          ) : (
            filtered.map(noteRow)
          )}
        </ul>
        {!filtered.length && (
          <p className="px-2 py-5 text-sm leading-relaxed text-muted-foreground">
            {filter
              ? "Nenhuma nota encontrada neste grupo."
              : "Suas páginas aparecerão aqui. Crie uma nota para começar."}
          </p>
        )}
      </div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {groupNotes.length} notas ·{" "}
        {folderId ? "Novas notas na pasta selecionada" : "Organização pessoal"}
      </p>
    </nav>
  );
}
