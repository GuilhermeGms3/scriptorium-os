import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import {
  KnowledgeQueryService,
  type KnowledgeExplorerBundle,
} from "../../lib/application/knowledge-query-service";
import { buildTopicGraph } from "../../lib/application/study-topic-graph";
import { studiesForTopic, type StudyTopic } from "../../lib/application/study-topic-service";
import { StudyNotebookRepository } from "../../lib/repositories/study-notebook-repository";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { Button } from "../ui/button";

export function StudyTopicConnections({
  topic,
  bundle,
  onOpenNote,
}: {
  topic: StudyTopic;
  bundle?: KnowledgeExplorerBundle;
  onOpenNote: (groupId: string, noteId?: string) => void;
}) {
  const { notes, studies } = useWorkbench();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const entities = useWorkspaceQuery(["knowledge-entities"], () =>
    KnowledgeQueryService.listEntities(),
  );
  const groups = studiesForTopic(topic, studies, notes);
  const groupIds = groups.map((group) => group.id).sort();
  const connections = useWorkspaceQuery(
    ["topic-note-connections", groupIds],
    async () =>
      (await Promise.all(groupIds.map((id) => StudyNotebookRepository.connections(id)))).flat(),
    { refreshOnKnowledgeChange: true, enabled: groupIds.length > 0 },
  );
  const graph = useMemo(
    () =>
      buildTopicGraph(topic, bundle, entities.data ?? [], studies, notes, connections.data ?? []),
    [topic, bundle, entities.data, studies, notes, connections.data],
  );
  const pages = Math.max(1, Math.ceil((graph.nodes.length - 1) / 10));
  const currentPage = Math.min(page, pages - 1);
  const visible = graph.nodes
    .filter((node) => node.id !== topic.id)
    .slice(currentPage * 10, currentPage * 10 + 10);
  const positions = new Map([
    [topic.id, { x: 400, y: 240 }],
    ...visible.map((node, index) => {
      const angle = (index / visible.length) * Math.PI * 2 - Math.PI / 2;
      return [node.id, { x: 400 + Math.cos(angle) * 270, y: 240 + Math.sin(angle) * 160 }] as const;
    }),
  ]);
  return (
    <section aria-label="Conexões reais do tema">
      <div className="topic-section-heading">
        <p className="meta-label">Do texto às suas ideias</p>
        <h2>Relações que já existem</h2>
        <p>
          Linha contínua: vínculo do catálogo ou percurso editorial. Linha pontilhada: grupo ou
          conexão pessoal. Proximidade visual não representa influência ou concordância.
        </p>
      </div>
      {(entities.isPending || (connections.isPending && groupIds.length > 0)) && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Consultando conexões…
        </p>
      )}
      {(entities.error || connections.error) && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Parte das conexões está indisponível.{" "}
          <button
            className="underline"
            onClick={() => {
              void entities.refetch();
              if (groupIds.length) void connections.refetch();
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      <div className="topic-orbit-scroll">
        <div className="topic-orbit-board">
          <svg viewBox="0 0 800 480" aria-hidden="true">
            <ellipse
              cx="400"
              cy="240"
              rx="270"
              ry="160"
              fill="none"
              className="topic-orbit-track"
            />
            {graph.edges.map((edge, i) => {
              const a = positions.get(edge.from),
                b = positions.get(edge.to);
              return a && b ? (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className="topic-graph-edge"
                  strokeDasharray={edge.kind === "personal" ? "3 6" : undefined}
                >
                  <title>{edge.label}</title>
                </line>
              ) : null;
            })}
          </svg>
          <div className="topic-orbit-center">
            <span className="meta-label">Tema atual</span>
            <strong>{topic.title}</strong>
          </div>
          {visible.map((node) => {
            const point = positions.get(node.id)!;
            const label =
              node.kind === "note"
                ? "Minha nota"
                : node.kind === "group"
                  ? "Meu grupo"
                  : node.kind === "guide"
                    ? "Guia editorial"
                    : "Catálogo";
            return (
              <button
                key={node.id}
                className="topic-orbit-node"
                style={{ left: `${point.x / 8}%`, top: `${point.y / 4.8}%` }}
                onClick={() => {
                  if (node.kind === "entity")
                    void navigate({ to: "/study", search: { entity: node.id } });
                  else if (node.kind === "guide")
                    void navigate({
                      to: "/study/guide/$topic",
                      params: { topic: node.id.slice("study-guide:".length) },
                    });
                  else if (node.kind === "group") onOpenNote(node.id);
                  else {
                    const note = notes.find((item) => item.id === node.id);
                    const group = note?.links.find((link) => link.kind === "study");
                    if (group) onOpenNote(group.target, node.id);
                  }
                }}
              >
                <span
                  className="topic-orb"
                  style={node.color ? { backgroundColor: node.color } : undefined}
                />
                <span>{node.title}</span>
                <small>{label}</small>
              </button>
            );
          })}
        </div>
      </div>
      {!visible.length && !entities.isPending && (
        <p className="text-center text-sm leading-7 text-muted-foreground">
          Este tema ainda não tem relações registradas. Associe um grupo no Caderno para começar sua
          rede.
        </p>
      )}
      <div className="topic-pager">
        <Button
          variant="ghost"
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
        >
          ← Conexões anteriores
        </Button>
        <span>
          {graph.nodes.length - 1} registros nesta rede
          {graph.omittedNotes > 0 ? ` · outras ${graph.omittedNotes} notas no Caderno` : ""}
        </span>
        <Button
          variant="ghost"
          disabled={currentPage >= pages - 1}
          onClick={() => setPage(currentPage + 1)}
        >
          Próximas conexões →
        </Button>
      </div>
      <details className="topic-evidence-details">
        <summary>Por que estas conexões aparecem?</summary>
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          {graph.edges.map((edge, i) => (
            <li key={i}>
              <span>{graph.nodes.find((node) => node.id === edge.from)?.title}</span>
              <span className="mx-2 text-muted-foreground">→ {edge.label} →</span>
              <span>{graph.nodes.find((node) => node.id === edge.to)?.title}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
