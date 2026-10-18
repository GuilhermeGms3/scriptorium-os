import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import type { Note, NoteLink } from "../../lib/domain/study";
import type { NoteConnection } from "../../lib/domain/study-notebook";
import { StudyNotebookRepository } from "../../lib/repositories/study-notebook-repository";
import { StudyRepository } from "../../lib/repositories/study-repository";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { useSourceReader } from "./source-reader-context";
import { errorMessage } from "../../lib/utils";
import { useStudyDraftGuard } from "../../hooks/use-study-draft-guard";
import { notifyKnowledgeMutation } from "../../lib/workspace-runtime/workspace-events";

const DEFAULT_COLOR = "#b9a574";
export function StudyNotebook({
  studyId,
  contextLinks = [],
  initialNoteId,
  initialDraft,
  focused = false,
  onDirtyChange,
}: {
  studyId?: string;
  contextLinks?: NoteLink[];
  initialNoteId?: string;
  initialDraft?: { title: string; body: string };
  focused?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { studies, notes, refreshUserData, workspacePersistence } = useWorkbench();
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupColor, setGroupColor] = useState(DEFAULT_COLOR);
  const [selectedNote, setSelectedNote] = useState<string | undefined>(initialNoteId);
  const [editorSession, setEditorSession] = useState(0);
  const [filter, setFilter] = useState("");
  const [dirty, setDirty] = useState(Boolean(initialDraft));
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useStudyDraftGuard(dirty);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const groupId = studyId ?? (selectedGroup || studies[0]?.id);
  const group = studies.find((item) => item.id === groupId);
  const groupNotes = notes.filter(
    (note) =>
      note.links.some((link) => link.kind === "study" && link.target === groupId) &&
      (!focused ||
        !contextLinks.length ||
        group?.items.some((item) =>
          contextLinks.some(
            (link) =>
              link.kind === "concept" && item.kind === "concept" && item.refId === link.target,
          ),
        ) ||
        note.links.some((link) =>
          contextLinks.some(
            (context) => context.kind === link.kind && context.target === link.target,
          ),
        )),
  );
  const visibleNotes = groupNotes.filter((note) =>
    `${note.title} ${note.body}`
      .toLocaleLowerCase("pt-BR")
      .includes(filter.toLocaleLowerCase("pt-BR")),
  );
  const connections = useWorkspaceQuery(
    ["note-connections", groupId],
    () => StudyNotebookRepository.connections(groupId!),
    { enabled: Boolean(groupId), refreshOnKnowledgeChange: true },
  );
  async function mutation(action: () => Promise<unknown>) {
    setError(undefined);
    setBusy(true);
    try {
      await action();
      await refreshUserData();
      notifyKnowledgeMutation();
      await connections.refetch();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  function select(id: string | undefined) {
    if (dirty && !window.confirm("Descartar as alterações da nota ainda não salvas?")) return;
    setDirty(false);
    setSelectedNote(id);
    setEditorSession((value) => value + 1);
  }
  const note = groupNotes.find((item) => item.id === selectedNote);
  return (
    <section className="flex min-w-0 flex-col gap-5" aria-label="Caderno de notas conectadas">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="meta-label">Seu caderno</p>
          <h2 className="font-serif text-2xl">Notas conectadas</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Reúna observações por tema e ligue suas ideias. As cores e conexões são suas, não
            conclusões automáticas do motor.
          </p>
        </div>
        {group && (
          <label className="flex items-center gap-2 text-sm">
            Cor do grupo
            <input
              type="color"
              aria-label="Cor do grupo"
              value={group.color ?? DEFAULT_COLOR}
              disabled={busy}
              onChange={(event) =>
                void mutation(() =>
                  StudyNotebookRepository.setGroupColor(group.id, event.target.value),
                )
              }
            />
          </label>
        )}
      </header>
      {!studyId && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            Grupo de estudo
            <select
              aria-label="Grupo do caderno"
              className="h-9 max-w-full rounded border border-input bg-background px-2"
              value={groupId ?? ""}
              onChange={(event) => {
                if (dirty && !window.confirm("Descartar as alterações da nota?")) return;
                setSelectedGroup(event.target.value);
                setSelectedNote(undefined);
                setDirty(false);
              }}
            >
              <option value="" disabled>
                Escolha um grupo
              </option>
              {studies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (
                dirty &&
                !window.confirm("Descartar as alterações da nota antes de criar outro grupo?")
              )
                return;
              setDirty(false);
              void mutation(async () => {
                const id = await StudyNotebookRepository.createGroup(groupTitle, groupColor);
                setSelectedGroup(id);
                setSelectedNote(undefined);
                setGroupTitle("");
              });
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              Novo grupo
              <Input
                aria-label="Nome do novo grupo"
                value={groupTitle}
                maxLength={500}
                onChange={(event) => setGroupTitle(event.target.value)}
                placeholder="Ex.: Geografia de Gênesis"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Cor
              <input
                aria-label="Cor do novo grupo"
                type="color"
                value={groupColor}
                onChange={(event) => setGroupColor(event.target.value)}
              />
            </label>
            <Button variant="outline" disabled={busy || !groupTitle.trim()}>
              Criar grupo
            </Button>
          </form>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {workspacePersistence === "loading" ? (
        <p role="status">Abrindo seus estudos…</p>
      ) : !group ? (
        <p className="text-sm text-muted-foreground">
          Crie um grupo para começar. Você também pode guardar notas enquanto consulta fontes na
          leitura bíblica.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h3 className="text-lg font-medium">
              {group.title}{" "}
              <span className="text-sm text-muted-foreground">
                · {groupNotes.length} {groupNotes.length === 1 ? "nota" : "notas"}
              </span>
            </h3>
            <Button variant="outline" size="sm" onClick={() => select(undefined)}>
              Nova nota
            </Button>
          </div>
          {connections.error && (
            <p role="alert">
              Não foi possível carregar as ligações.{" "}
              <Button variant="outline" size="sm" onClick={() => void connections.refetch()}>
                Tentar novamente
              </Button>
            </p>
          )}
          <NoteMap
            notes={
              focused
                ? groupNotes.filter((item, index) =>
                    selectedNote
                      ? item.id === selectedNote ||
                        (connections.data ?? []).some(
                          (edge) =>
                            (edge.sourceId === selectedNote && edge.targetId === item.id) ||
                            (edge.targetId === selectedNote && edge.sourceId === item.id),
                        )
                      : index < 12,
                  )
                : groupNotes
            }
            connections={connections.data ?? []}
            color={group.color ?? DEFAULT_COLOR}
            selectedId={selectedNote}
            onSelect={select}
          />
          <div
            className={
              focused
                ? "flex min-w-0 flex-col gap-5"
                : "grid min-w-0 gap-5 xl:grid-cols-[minmax(200px,1fr)_minmax(0,2fr)]"
            }
          >
            <nav aria-label="Notas do grupo" className="flex min-w-0 flex-col gap-3">
              <Input
                aria-label="Filtrar notas"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Encontrar uma nota…"
              />
              {focused ? (
                <label className="text-sm">
                  <span className="sr-only">Abrir nota do tema</span>
                  <select
                    aria-label="Abrir nota do tema"
                    className="h-10 w-full max-w-full border border-input bg-background px-3"
                    value={selectedNote ?? ""}
                    onChange={(event) => select(event.target.value || undefined)}
                  >
                    <option value="">Nova nota</option>
                    {visibleNotes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
                  {visibleNotes.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={item.id === selectedNote}
                        className="flex w-full items-center gap-2 rounded border border-border px-3 py-2 text-left text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => select(item.id)}
                      >
                        <span
                          aria-hidden="true"
                          className="size-3 shrink-0 rounded-full border border-foreground/30"
                          style={{ backgroundColor: item.color ?? group.color ?? DEFAULT_COLOR }}
                        />
                        <span className="min-w-0 truncate">{item.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!visibleNotes.length && (
                <p className="text-sm text-muted-foreground">
                  {groupNotes.length
                    ? "Nenhuma nota corresponde ao filtro."
                    : "Nenhuma nota neste grupo. Crie a primeira ao lado."}
                </p>
              )}
            </nav>
            <NotebookEditor
              key={`${group.id}:${note?.id ?? "new"}:${editorSession}`}
              note={note}
              groupId={group.id}
              notes={groupNotes}
              connections={connections.data ?? []}
              contextLinks={contextLinks}
              {...(initialDraft && editorSession === 0 ? { initialDraft } : {})}
              onConnectionsChanged={async () => {
                await connections.refetch();
              }}
              onSaved={async (id) => {
                await refreshUserData();
                notifyKnowledgeMutation();
                await connections.refetch();
                setDirty(false);
                setSelectedNote(id);
              }}
              onDirty={setDirty}
              onSelect={select}
            />
          </div>
        </>
      )}
    </section>
  );
}

export function NoteMap({
  notes,
  connections,
  color,
  selectedId,
  onSelect,
}: {
  notes: Note[];
  connections: NoteConnection[];
  color: string;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  // Stable order, bounded rendering and no physics loop. The list still exposes every note.
  const shown = [...notes].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 120);
  const positions = new Map(
    shown.map((note, index) => {
      const angle = index * 2.399963229728653;
      const radius = 80 + 14 * Math.sqrt(index);
      return [
        note.id,
        { x: 400 + Math.cos(angle) * radius * 1.4, y: 250 + Math.sin(angle) * radius },
      ];
    }),
  );
  return (
    <figure className="overflow-x-auto rounded border border-border bg-muted/20">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span>Mapa das suas notas · selecione um ponto para ler e conectar</span>
        <span>
          {notes.length > 120
            ? "120 pontos exibidos; todas as notas estão na lista"
            : `${notes.length} ${notes.length === 1 ? "ponto" : "pontos"}`}
        </span>
      </figcaption>
      {shown.length ? (
        <svg
          viewBox="0 0 800 500"
          className="max-h-96 min-h-56 w-full min-w-[560px]"
          role="group"
          aria-label="Mapa de conexões entre notas"
        >
          {connections.map((edge) => {
            const a = positions.get(edge.sourceId);
            const b = positions.get(edge.targetId);
            return a && b ? (
              <line
                key={`${edge.sourceId}:${edge.targetId}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="currentColor"
                className="text-muted-foreground"
                strokeWidth="1.5"
                opacity="0.6"
              />
            ) : null;
          })}
          {shown.map((note) => {
            const point = positions.get(note.id)!;
            return (
              <g
                key={note.id}
                role="button"
                tabIndex={0}
                aria-label={`Ler nota: ${note.title}`}
                aria-pressed={selectedId === note.id}
                className="group cursor-pointer outline-none"
                onClick={() => onSelect(note.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(note.id);
                  }
                }}
              >
                <title>{note.title}</title>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={30}
                  fill="transparent"
                  stroke="none"
                  strokeWidth={2}
                  className="group-focus-visible:stroke-ring"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={selectedId === note.id ? 12 : 8}
                  fill={note.color ?? color}
                  stroke="currentColor"
                  strokeWidth={selectedId === note.id ? 3 : 1}
                />
                <text
                  x={point.x}
                  y={point.y + 26}
                  textAnchor="middle"
                  fill="currentColor"
                  stroke="none"
                  fontSize="16"
                >
                  {note.title.length > 25 ? `${note.title.slice(0, 24)}…` : note.title}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="p-8 text-center text-sm text-muted-foreground">
          Suas notas aparecem aqui como pontos. Ao conectá-las, o mapa desenha as ligações.
        </p>
      )}
    </figure>
  );
}

function NotebookEditor({
  note,
  groupId,
  notes,
  connections,
  onSaved,
  onConnectionsChanged,
  onDirty,
  onSelect,
  contextLinks,
  initialDraft,
}: {
  note: Note | undefined;
  groupId: string;
  notes: Note[];
  connections: NoteConnection[];
  onSaved: (id: string) => Promise<void>;
  onConnectionsChanged: () => Promise<void>;
  onDirty: (value: boolean) => void;
  onSelect: (id: string) => void;
  contextLinks: NoteLink[];
  initialDraft?: { title: string; body: string };
}) {
  const openSource = useSourceReader();
  const [title, setTitle] = useState(note?.title ?? initialDraft?.title ?? "");
  const [body, setBody] = useState(note?.body ?? initialDraft?.body ?? "");
  const [color, setColor] = useState(note?.color ?? DEFAULT_COLOR);
  const [ownColor, setOwnColor] = useState(Boolean(note?.color));
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  // Retain the version from the time this editor opened, even if another tab refreshes caches.
  const [version, setVersion] = useState(note?.updatedAt);
  const edges = connections.filter(
    (edge) => edge.sourceId === note?.id || edge.targetId === note?.id,
  );
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
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const id = await StudyNotebookRepository.saveNote({
              ...(note ? { id: note.id, expectedUpdatedAt: version! } : {}),
              title,
              body,
              studyId: groupId,
              ...(ownColor ? { color } : {}),
              ...(note?.source ? { source: note.source } : {}),
              links: [...(note?.links ?? []), ...contextLinks],
            });
            await onSaved(id);
            setVersion(StudyRepository.listNotes().find((item) => item.id === id)?.updatedAt);
            setStatus("Nota salva.");
          });
        }}
      >
        <h3 className="font-serif text-lg">{note ? "Editar nota" : "Nova nota"}</h3>
        <label className="flex flex-col gap-1 text-sm">
          Título
          <Input
            aria-label="Título da nota"
            required
            maxLength={500}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              onDirty(true);
              setStatus(undefined);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Conteúdo
          <Textarea
            aria-label="Conteúdo da nota"
            className="min-h-40"
            value={body}
            maxLength={200000}
            onChange={(event) => {
              setBody(event.target.value);
              onDirty(true);
              setStatus(undefined);
            }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ownColor}
              onChange={(event) => {
                setOwnColor(event.target.checked);
                onDirty(true);
              }}
            />
            Cor própria (senão, herda do grupo)
          </label>
          {ownColor && (
            <input
              aria-label="Cor da nota"
              type="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value);
                onDirty(true);
              }}
            />
          )}
        </div>
        {note?.source && (
          <Button
            type="button"
            variant="outline"
            className="justify-start whitespace-normal text-left"
            onClick={() =>
              openSource({ source: note.source!, studyId: groupId, links: note.links })
            }
          >
            Consultar fonte: {note.source.title}
            {note.source.kind === "private-document" ? ` · p. ${note.source.page}` : ""}
          </Button>
        )}
        {note?.links.some((link) => link.kind === "concept") && (
          <div className="flex flex-col gap-2">
            <p className="meta-label">Temas ligados a esta nota</p>
            <div className="flex flex-wrap gap-2">
              {note.links
                .filter((link) => link.kind === "concept")
                .map((link) =>
                  link.target.startsWith("study-guide:") ? (
                    <Link
                      key={link.target}
                      to="/study/guide/$topic"
                      params={{ topic: link.target.slice("study-guide:".length) }}
                      className="rounded border border-input px-3 py-2 text-sm text-primary hover:bg-accent"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <Link
                      key={link.target}
                      to="/study"
                      search={{ entity: link.target }}
                      className="rounded border border-input px-3 py-2 text-sm text-primary hover:bg-accent"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
            </div>
          </div>
        )}
        <Button className="self-start" disabled={busy || !title.trim()}>
          {busy ? "Salvando…" : "Salvar nota"}
        </Button>
        {status && (
          <p role="status" className="text-sm">
            {status}
          </p>
        )}
      </form>
      {note && (
        <section
          className="flex flex-col gap-3 border-t border-border pt-4"
          aria-label="Ligações da nota"
        >
          <h4 className="text-sm font-medium">Ligar a outra nota</h4>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Nota para conectar"
              className="h-9 min-w-0 max-w-full flex-1 rounded border border-input bg-background px-2 text-sm"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              <option value="">Escolha uma nota…</option>
              {notes
                .filter((item) => item.id !== note.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
            </select>
            <Button
              variant="outline"
              disabled={!target || busy}
              onClick={() =>
                void run(async () => {
                  await StudyNotebookRepository.connect(note.id, target);
                  await onConnectionsChanged();
                  setTarget("");
                })
              }
            >
              Conectar
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {edges.map((edge) => {
              const otherId = edge.sourceId === note.id ? edge.targetId : edge.sourceId;
              const other = notes.find((item) => item.id === otherId);
              return (
                <li key={otherId} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={!other}
                    className="truncate text-left text-sm underline"
                    onClick={() => onSelect(otherId)}
                  >
                    {other?.title ?? "Nota de outro grupo"}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await StudyNotebookRepository.disconnect(note.id, otherId);
                        await onConnectionsChanged();
                      })
                    }
                  >
                    Desligar
                  </Button>
                </li>
              );
            })}
          </ul>
          {!edges.length && (
            <p className="text-xs text-muted-foreground">
              Ainda não há conexões. A ligação aparece nos dois sentidos.
            </p>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
