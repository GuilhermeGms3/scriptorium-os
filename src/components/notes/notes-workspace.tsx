import { useEffect, useRef, useState } from "react";
import { FilePlus2, FolderOpen, GitBranch, Link2, PanelLeft, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { EmptyState } from "../layout/empty-state";
import { NoteMap } from "../study/study-notebook";
import { NoteExplorer } from "./note-explorer";
import { NoteLinkPicker } from "./note-link-picker";
import { NoteDocumentEditor, type NoteDraft } from "./note-document-editor";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { StudyNotebookRepository as notebook } from "../../lib/repositories/study-notebook-repository";
import { NoteExplorerRepository } from "../../lib/repositories/note-explorer-repository";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { useStudyDraftGuard } from "../../hooks/use-study-draft-guard";
import { useMediaQuery } from "../../hooks/use-media-query";
import { notifyKnowledgeMutation } from "../../lib/workspace-runtime/workspace-events";
import { cn, errorMessage } from "../../lib/utils";
import { folderPath, wikiReferences, type NoteFolder } from "../../lib/domain/note-document";

export function NotesWorkspace({
  initialGroupId,
  initialNoteId,
}: {
  initialGroupId: string | undefined;
  initialNoteId: string | undefined;
}) {
  const {
    notes,
    studies,
    refreshUserData,
    workspacePersistence,
    workspaceError,
    setPassageContext,
  } = useWorkbench();
  const structure = useWorkspaceQuery(
    ["notes-explorer"],
    () => NoteExplorerRepository.structure(),
    { refreshOnKnowledgeChange: true },
  );
  const [groupId, setGroupId] = useState(initialGroupId ?? "");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<NoteDraft[]>([]);
  const [activeKey, setActiveKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [mobileExplorer, setMobileExplorer] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const wide = useMediaQuery("(min-width: 1280px)");
  const [dialog, setDialog] = useState<{ kind: "group" | "folder"; folder?: NoteFolder } | null>(
    null,
  );
  const [name, setName] = useState("");
  const [color, setColor] = useState("#b9a574");
  const [parentId, setParentId] = useState<string | null>(null);
  const routeOpened = useRef("");
  const preferenceRead = useRef(false);
  useStudyDraftGuard(drafts.some((draft) => draft.dirty));
  useEffect(() => setPassageContext(null), [setPassageContext]);
  useEffect(() => {
    if (preferenceRead.current || workspacePersistence === "loading") return;
    preferenceRead.current = true;
    if (initialGroupId !== undefined) return;
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem("scriptorium.notes.explorer.v1") ?? "null",
      );
      if (
        saved &&
        typeof saved === "object" &&
        "groupId" in saved &&
        typeof saved.groupId === "string" &&
        studies.some((study) => study.id === saved.groupId)
      )
        setGroupId(saved.groupId);
    } catch {
      /* UI preference is optional; note contents remain in SQLite. */
    }
  }, [initialGroupId, studies, workspacePersistence]);
  function chooseGroup(id: string) {
    setGroupId(id);
    try {
      localStorage.setItem("scriptorium.notes.explorer.v1", JSON.stringify({ groupId: id }));
    } catch {
      /* Private browsing may deny preferences. */
    }
  }
  const folders = structure.data?.folders ?? [];
  const placements = structure.data?.placements ?? [];
  const references = structure.data?.references ?? [];
  const active = drafts.find((draft) => draft.key === activeKey);
  const group = studies.find((study) => study.id === (active?.studyId ?? groupId));
  const edges = structure.data?.connections ?? [];
  function openNote(id: string) {
    const note = notes.find((item) => item.id === id);
    if (!note) {
      setError("Esta nota não está mais disponível.");
      return;
    }
    const existing = drafts.find((draft) => draft.id === id);
    if (existing) setActiveKey(existing.key);
    else {
      const studyId =
        note.links.find((link) => link.kind === "study" && link.target === groupId)?.target ??
        note.links.find((link) => link.kind === "study")?.target ??
        groupId ??
        studies[0]?.id ??
        "";
      const key = note.id;
      setDrafts((previous) => [
        ...previous,
        {
          key,
          id: note.id,
          expectedUpdatedAt: note.updatedAt,
          studyId: studyId || studies[0]?.id || "",
          title: note.title,
          body: note.body,
          color: note.color ?? "",
          folderId:
            placements.find((place) => place.noteId === id && place.studyId === studyId)
              ?.folderId ?? null,
          ...(note.source ? { source: note.source } : {}),
          dirty: false,
        },
      ]);
      setActiveKey(key);
    }
    setMapOpen(false);
    setMobileExplorer(false);
  }
  useEffect(() => {
    if (
      !initialNoteId ||
      !structure.data ||
      routeOpened.current === initialNoteId ||
      !notes.some((note) => note.id === initialNoteId)
    )
      return;
    routeOpened.current = initialNoteId;
    openNote(initialNoteId);
    // Route entry only. Local tab selection must not reopen a tab the user has just closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNoteId, notes, structure.data]);
  function createNote() {
    const studyId = groupId || studies[0]?.id;
    if (!studyId) {
      setDialog({ kind: "group" });
      return;
    }
    const key = `draft:${crypto.randomUUID()}`;
    setDrafts((previous) => [
      ...previous,
      {
        key,
        studyId,
        title: "",
        body: "",
        color: "",
        folderId: groupId ? folderId : null,
        dirty: true,
      },
    ]);
    setActiveKey(key);
    setMobileExplorer(false);
    setMapOpen(false);
  }
  function closeTab(key: string) {
    if (busy) return;
    const draft = drafts.find((item) => item.key === key);
    if (draft?.dirty && !window.confirm("Fechar esta nota e descartar as alterações não salvas?"))
      return;
    const next = drafts.filter((item) => item.key !== key);
    setDrafts(next);
    if (activeKey === key) setActiveKey(next.at(-1)?.key ?? "");
  }
  async function refresh() {
    await refreshUserData();
    notifyKnowledgeMutation();
    await structure.refetch();
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!active || busy) return;
    const draft = active;
    await run(async () => {
      if (!draft.studyId) throw new Error("Escolha ou crie um grupo antes de salvar esta nota.");
      const id = await notebook.saveNote({
        ...(draft.id ? { id: draft.id, expectedUpdatedAt: draft.expectedUpdatedAt! } : {}),
        title: draft.title,
        body: draft.body,
        studyId: draft.studyId,
        folderId: draft.folderId,
        ...(draft.color ? { color: draft.color } : {}),
        ...(draft.source ? { source: draft.source } : {}),
      });
      // Read the saved version, not a timestamp guessed by the UI.
      const { StudyRepository } = await import("../../lib/repositories/study-repository");
      await refresh();
      const saved = StudyRepository.listNotes().find((note) => note.id === id);
      if (!saved) throw new Error("Nota salva, mas não foi possível atualizar o editor. Reabra-a.");
      if (
        saved.title !== draft.title.trim() ||
        saved.body !== draft.body ||
        (saved.color ?? "") !== draft.color
      )
        throw new Error(
          "Outra janela alterou esta nota depois do salvamento. Seu rascunho foi mantido; reabra a nota para comparar.",
        );
      setDrafts((previous) =>
        previous.map((item) =>
          item.key === draft.key
            ? { ...item, id, expectedUpdatedAt: saved.updatedAt, dirty: false }
            : item,
        ),
      );
    });
  }
  const currentNotes = notes.filter(
    (note) =>
      !groupId || note.links.some((link) => link.kind === "study" && link.target === groupId),
  );
  const incoming = references
    .filter((ref) => ref.targetId === active?.id)
    .map((ref) => notes.find((note) => note.id === ref.sourceId))
    .filter((note) => note !== undefined);
  const outgoing = active ? wikiReferences(active.body, notes).filter((ref) => ref.targetId) : [];
  const manual = edges.filter(
    (edge) => edge.sourceId === active?.id || edge.targetId === active?.id,
  );
  const graphEdges = [...edges, ...references.map((ref) => ({ ...ref, createdAt: "" }))].filter(
    (edge, index, array) =>
      array.findIndex(
        (other) =>
          (other.sourceId === edge.sourceId && other.targetId === edge.targetId) ||
          (other.sourceId === edge.targetId && other.targetId === edge.sourceId),
      ) === index,
  );
  function explorer() {
    return (
      <NoteExplorer
        studies={studies}
        notes={notes}
        folders={folders}
        placements={placements}
        groupId={groupId}
        folderId={folderId}
        activeId={active?.id}
        onGroup={chooseGroup}
        onFolder={setFolderId}
        onOpen={openNote}
        onNewNote={createNote}
        onNewGroup={() => {
          setName("");
          setDialog({ kind: "group" });
        }}
        onNewFolder={() => {
          setName("");
          setParentId(folderId);
          setDialog({ kind: "folder" });
        }}
        onEditFolder={(folder) => {
          setName(folder.name);
          setParentId(folder.parentId);
          setDialog({ kind: "folder", folder });
        }}
        onColor={(value) => {
          if (groupId)
            void run(async () => {
              await notebook.setGroupColor(groupId, value);
              await refresh();
            });
        }}
      />
    );
  }
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col" aria-label="Espaço de notas">
      {workspacePersistence === "loading" && (
        <p role="status" className="border-b border-border px-4 py-2 text-sm text-muted-foreground">
          Abrindo suas notas…
        </p>
      )}
      {workspacePersistence === "unavailable" && (
        <p
          role="alert"
          className="border-b border-destructive/40 px-4 py-3 text-sm text-destructive"
        >
          O workspace está indisponível. {workspaceError} As notas não foram apagadas.
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="flex shrink-0 items-start justify-between gap-3 border-b border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <span>{error}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setError(undefined)}>
            <X className="size-4" />
          </button>
        </div>
      )}
      {structure.isError && (
        <p role="alert" className="p-3 text-sm text-destructive">
          Não foi possível carregar as pastas. {errorMessage(structure.error)}{" "}
          <button type="button" className="underline" onClick={() => void structure.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      <div className="flex min-h-0 min-w-0 flex-1">
        <aside className="hidden w-64 shrink-0 overflow-hidden border-r border-border lg:block">
          {explorer()}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-1 border-b border-border bg-card/30 px-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              aria-label="Abrir pastas e notas"
              onClick={() => setMobileExplorer(true)}
            >
              <PanelLeft />
            </Button>
            <div className="flex min-w-0 flex-1 overflow-x-auto" aria-label="Notas abertas">
              {drafts.map((draft) => (
                <div
                  key={draft.key}
                  className={cn(
                    "flex max-w-60 shrink-0 items-center border-r border-border",
                    draft.key === activeKey && "border-b-2 border-b-primary bg-background",
                  )}
                >
                  <button
                    type="button"
                    aria-current={draft.key === activeKey ? "page" : undefined}
                    onClick={() => {
                      setActiveKey(draft.key);
                      setMapOpen(false);
                    }}
                    className="max-w-48 truncate px-3 py-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {draft.title || "Nova nota"}
                    {draft.dirty ? " •" : ""}
                  </button>
                  <button
                    type="button"
                    aria-label={`Fechar nota ${draft.title || "sem título"}`}
                    onClick={() => closeTab(draft.key)}
                    className="p-2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Nova nota em uma aba"
              onClick={createNote}
            >
              <FilePlus2 />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ver mapa de notas"
              aria-pressed={mapOpen}
              onClick={() => setMapOpen((value) => !value)}
            >
              <GitBranch />
            </Button>
            {active && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mostrar conexões da nota"
                aria-pressed={detailsOpen}
                onClick={() => setDetailsOpen((value) => !value)}
              >
                <Link2 />
              </Button>
            )}
          </header>
          {mapOpen ? (
            <div className="min-h-0 flex-1 overflow-auto p-5">
              <h2 className="mb-2 font-serif text-2xl">Mapa das notas</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Referências escritas e conexões pessoais. Selecione um ponto para abrir sua página.
              </p>
              <NoteMap
                notes={currentNotes}
                connections={graphEdges}
                color={group?.color ?? "#b9a574"}
                selectedId={active?.id}
                onSelect={openNote}
              />
            </div>
          ) : active ? (
            <NoteDocumentEditor
              key={active.key}
              draft={active}
              group={group}
              groups={studies}
              notes={notes}
              folders={folders}
              busy={busy}
              onChange={(patch) =>
                setDrafts((previous) =>
                  previous.map((draft) =>
                    draft.key === active.key ? { ...draft, ...patch, dirty: true } : draft,
                  ),
                )
              }
              onSave={() => void save()}
              onOpen={openNote}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-6">
              <EmptyState
                icon={FolderOpen}
                title="Um espaço para suas ideias"
                action={
                  <Button onClick={createNote}>
                    <FilePlus2 data-icon="inline-start" />
                    Nova nota
                  </Button>
                }
              >
                Abra uma nota nas pastas ou comece uma página nova. Conecte suas leituras sem perder
                a fonte.
                <p className="mt-4 text-xs text-muted-foreground">
                  / ou [[ para linkar · Ctrl+S para salvar · mapa de conexões no topo
                </p>
              </EmptyState>
            </div>
          )}
          {!active && workspacePersistence === "memory" && (
            <p className="px-5 py-2 text-xs text-destructive">
              Armazenamento temporário: exporte suas notas antes de fechar.
            </p>
          )}
        </div>
        {active && detailsOpen && (
          <aside
            aria-label="Conexões da nota"
            className="hidden w-56 shrink-0 overflow-y-auto border-l border-border bg-card/20 p-4 xl:block"
          >
            {connectionsPanel()}
          </aside>
        )}
      </div>
      <Dialog open={mobileExplorer} onOpenChange={setMobileExplorer}>
        <DialogContent className="flex h-[85dvh] max-w-sm flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Pastas e notas</DialogTitle>
            <DialogDescription>Organize e abra suas páginas.</DialogDescription>
          </DialogHeader>
          {explorer()}
        </DialogContent>
      </Dialog>
      {connecting && active?.id && (
        <NoteLinkPicker
          notes={notes.filter((note) => note.id !== active.id)}
          initialQuery=""
          onClose={() => setConnecting(false)}
          onSelect={(note) => {
            void run(async () => {
              await notebook.connect(active.id!, note.id);
              await refresh();
              setConnecting(false);
            });
          }}
        />
      )}
      <Dialog open={detailsOpen && !wide} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conexões da nota</DialogTitle>
            <DialogDescription>Vínculos registrados no seu caderno.</DialogDescription>
          </DialogHeader>
          {connectionsPanel()}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "group"
                ? "Novo grupo de notas"
                : dialog?.folder
                  ? "Organizar pasta"
                  : "Nova pasta"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "group"
                ? "Reúna suas notas por assunto. A cor será herdada por notas sem cor própria."
                : "Pastas organizam as páginas dentro do grupo, sem copiar nem apagar notas."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                if (dialog?.kind === "group") {
                  const id = await notebook.createGroup(name, color);
                  chooseGroup(id);
                  setFolderId(null);
                } else if (dialog?.folder)
                  await NoteExplorerRepository.updateFolder(dialog.folder.id, name, parentId);
                else if (groupId) {
                  const id = await NoteExplorerRepository.createFolder(groupId, parentId, name);
                  setFolderId(id);
                }
                await refresh();
                setDialog(null);
                setName("");
              });
            }}
          >
            <label className="flex flex-col gap-2 text-sm">
              Nome
              <Input
                required
                maxLength={dialog?.kind === "group" ? 500 : 120}
                value={name}
                disabled={busy}
                onChange={(event) => setName(event.target.value)}
                placeholder={dialog?.kind === "group" ? "Ex.: Teologia bíblica" : "Ex.: Gênesis"}
              />
            </label>
            {dialog?.kind === "group" ? (
              <label className="flex items-center gap-3 text-sm">
                Cor do grupo
                <input
                  type="color"
                  value={color}
                  disabled={busy}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-input"
                />
              </label>
            ) : (
              <label className="flex flex-col gap-2 text-sm">
                Dentro de
                <select
                  className="rounded border border-input bg-background p-2"
                  value={parentId ?? ""}
                  disabled={busy}
                  onChange={(event) => setParentId(event.target.value || null)}
                >
                  <option value="">Raiz do grupo</option>
                  {folders
                    .filter(
                      (folder) => folder.studyId === groupId && folder.id !== dialog?.folder?.id,
                    )
                    .map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folderPath(folder.id, folders)}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Salvando…" : dialog?.folder ? "Salvar pasta" : "Criar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );

  function connectionsPanel() {
    return (
      <div className="flex flex-col gap-5 text-sm">
        <section>
          <h2 className="font-semibold">Referências recebidas</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {incoming.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className="text-left text-primary underline underline-offset-4"
                  onClick={() => {
                    openNote(note.id);
                    setDetailsOpen(false);
                  }}
                >
                  {note.title}
                </button>
              </li>
            ))}
          </ul>
          {!incoming.length && (
            <p className="mt-2 text-xs text-muted-foreground">
              Nenhuma outra nota aponta para esta página ainda.
            </p>
          )}
        </section>
        <section>
          <h2 className="font-semibold">Links nesta nota</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {outgoing.map((ref, index) => (
              <li key={index}>
                <button
                  type="button"
                  className="text-left text-primary underline underline-offset-4"
                  onClick={() => openNote(ref.targetId!)}
                >
                  {ref.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">Conexões manuais</h2>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={!active?.id || busy}
            onClick={() => setConnecting(true)}
          >
            Conectar outra nota
          </Button>
          {manual.map((edge) => {
            const id = edge.sourceId === active?.id ? edge.targetId : edge.sourceId;
            return (
              <div key={id} className="mt-2 flex items-center gap-1">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-primary underline"
                  onClick={() => openNote(id)}
                >
                  {notes.find((note) => note.id === id)?.title ?? "Nota indisponível"}
                </button>
                <button
                  type="button"
                  aria-label="Desligar conexão manual"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await notebook.disconnect(edge.sourceId, edge.targetId);
                      await refresh();
                    })
                  }
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
          <p className="mt-2 text-xs text-muted-foreground">
            As conexões manuais anteriores são mantidas. Use Inserir link para criar referências no
            documento.
          </p>
        </section>
      </div>
    );
  }
}
