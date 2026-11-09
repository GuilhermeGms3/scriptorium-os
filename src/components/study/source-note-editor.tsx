import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { NoteDocumentEditor, type NoteDraft } from "../notes/note-document-editor";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { StudyNotebookRepository } from "../../lib/repositories/study-notebook-repository";
import { NoteExplorerRepository } from "../../lib/repositories/note-explorer-repository";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import type { ReadingSource } from "../../lib/application/reading-source";
import type { StudySource } from "../../lib/domain/study-notebook";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { errorMessage } from "../../lib/utils";

export function SourceNoteEditor({
  reading,
  source,
  onDirty,
}: {
  reading: ReadingSource;
  source: StudySource;
  onDirty: (value: boolean) => void;
}) {
  const navigate = useNavigate();
  const { studies, notes, refreshUserData } = useWorkbench();
  const [draft, setDraft] = useState<NoteDraft>({
    key: "source-draft",
    studyId: reading.studyId ?? "",
    title: reading.caption ?? source.title,
    body: "",
    color: "",
    folderId: null,
    dirty: false,
  });
  const [newGroup, setNewGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [status, setStatus] = useState("");
  const [savedId, setSavedId] = useState<string>();
  const structure = useWorkspaceQuery(
    ["source-note-folders"],
    () => NoteExplorerRepository.structure(),
    { refreshOnKnowledgeChange: true },
  );
  useEffect(() => onDirty(draft.dirty), [draft.dirty, onDirty]);
  async function save() {
    if (
      lock.current ||
      !draft.dirty ||
      !draft.title.trim() ||
      !draft.body.trim() ||
      (!draft.studyId && !newGroup.trim())
    )
      return;
    lock.current = true;
    setBusy(true);
    setStatus("");
    try {
      const group =
        draft.studyId || (await StudyNotebookRepository.createGroup(newGroup, "#b9a574"));
      // Keep the created group even if saving the note subsequently fails.
      setDraft((value) => ({ ...value, studyId: group }));
      const id = await StudyNotebookRepository.saveNote({
        title: draft.title,
        body: draft.body,
        studyId: group,
        source,
        ...(draft.color ? { color: draft.color } : {}),
        ...(reading.links ? { links: reading.links } : {}),
        folderId: draft.folderId,
      });
      setSavedId(id);
      setDraft((value) => ({ ...value, studyId: group, body: "", dirty: false }));
      setStatus("Nota salva com a fonte e a seleção. Abra-a em Notas para continuar editando.");
      try {
        await refreshUserData();
      } catch {
        setStatus(
          "Nota salva. Não foi possível atualizar a lista; reabra Notas para consultá-la. Não é necessário salvar novamente.",
        );
      }
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <aside
      className="flex min-h-[32rem] min-w-0 flex-col border border-border bg-background"
      aria-label="Documento da nota"
    >
      <div className="border-b border-border p-3 text-sm">
        <p className="font-medium">Meu documento de estudo</p>
        <p className="my-2 text-xs text-muted-foreground">
          Escolha o grupo. Use títulos, listas e [[links]]; a origem acompanha a nota.
        </p>
        {!draft.studyId && (
          <label>
            Nome de um novo grupo
            <Input
              value={newGroup}
              maxLength={500}
              onChange={(event) => setNewGroup(event.target.value)}
              placeholder="Ou escolha um grupo existente abaixo"
            />
          </label>
        )}
        {source.kind !== "bibliographic" && source.selection && (
          <p className="my-2 text-xs">
            Trecho marcado: {source.selection.quote.slice(0, 180)}
            {source.selection.quote.length > 180 ? "…" : ""}
          </p>
        )}
        {status && (
          <p role="status" className="my-2 text-sm">
            {status}
          </p>
        )}
        {savedId && (
          <Link className="underline" to="/notes" search={{ group: draft.studyId, note: savedId }}>
            Abrir nota salva
          </Link>
        )}
      </div>
      <NoteDocumentEditor
        draft={draft}
        group={studies.find((group) => group.id === draft.studyId)}
        groups={studies}
        notes={notes}
        folders={structure.data?.folders ?? []}
        busy={busy}
        saveDisabled={!draft.body.trim() || (!draft.studyId && !newGroup.trim())}
        showSourceLink={false}
        onChange={(patch) => {
          setSavedId(undefined);
          setDraft((value) => ({ ...value, ...patch, dirty: true }));
        }}
        onSave={() => void save()}
        onOpen={(id) => {
          void navigate({ to: "/notes", search: { note: id } });
        }}
      />
      {!draft.body.trim() && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          Escreva seu comentário antes de salvar.
        </p>
      )}
      {structure.error && (
        <Button variant="ghost" onClick={() => void structure.refetch()}>
          Tentar carregar as pastas novamente
        </Button>
      )}
    </aside>
  );
}
