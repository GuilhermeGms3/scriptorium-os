import {
  Check,
  Download,
  FileText,
  ListTree,
  LoaderCircle,
  Network,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DocumentKnowledgePipelineService } from "../../lib/application/document-knowledge-pipeline-service";
import type {
  DocumentKnowledgeAggregate,
  DocumentKnowledgeIndexSummary,
  DocumentNode,
  KnowledgeProposal,
  KnowledgeProposalPayload,
} from "../../lib/domain/document-knowledge";
import { DocumentKnowledgeRepository } from "../../lib/repositories/document-knowledge-repository";

type Tab = "structure" | "proposals" | "aggregate";

const KIND_LABELS: Record<KnowledgeProposal["proposalKind"], string> = {
  claim: "Afirmação",
  argument: "Argumento",
  citation: "Citação",
  entity: "Entidade",
  "passage-relation": "Passagem",
  "topic-assignment": "Assunto",
};

const NODE_LABELS: Record<DocumentNode["kind"], string> = {
  book: "Livro",
  "front-matter": "Abertura",
  part: "Parte",
  chapter: "Capítulo",
  section: "Seção",
  subsection: "Subseção",
  "back-matter": "Encerramento",
  bibliography: "Bibliografia",
};

function proposalText(proposal: KnowledgeProposal): string {
  switch (proposal.payload.kind) {
    case "claim":
      return proposal.payload.proposition;
    case "argument":
      return `${proposal.payload.premises.join("; ")} → ${proposal.payload.conclusion}`;
    case "citation":
      return `“${proposal.payload.quotedText}”`;
    case "entity":
      return proposal.payload.label;
    case "passage-relation":
      return proposal.payload.rawReference;
    case "topic-assignment":
      return proposal.payload.domain;
  }
}

function nodeDepth(node: DocumentNode, byId: Map<string, DocumentNode>): number {
  let depth = 0;
  let current = node.parentId ? byId.get(node.parentId) : undefined;
  while (current && depth < 4) {
    depth += 1;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return depth;
}

export function DocumentKnowledgeWorkbench({
  documentId,
  onNavigatePage,
}: {
  documentId: string;
  onNavigatePage: (pageIndex: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("structure");
  const [summary, setSummary] = useState<DocumentKnowledgeIndexSummary | null>();
  const [nodes, setNodes] = useState<DocumentNode[]>([]);
  const [proposals, setProposals] = useState<KnowledgeProposal[]>([]);
  const [aggregate, setAggregate] = useState<DocumentKnowledgeAggregate>();
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string>();

  const refresh = useCallback(async () => {
    const nextSummary = await DocumentKnowledgeRepository.getSummary(documentId);
    setSummary(nextSummary);
    if (nextSummary?.status !== "ready") {
      setNodes([]);
      setProposals([]);
      setAggregate(undefined);
      return;
    }
    const [nextNodes, nextProposals, nextAggregate] = await Promise.all([
      DocumentKnowledgeRepository.listNodes(documentId),
      DocumentKnowledgeRepository.listProposals(documentId),
      DocumentKnowledgeRepository.aggregate(documentId),
    ]);
    setNodes(nextNodes);
    setProposals(nextProposals);
    setAggregate(nextAggregate);
  }, [documentId]);

  useEffect(() => {
    let active = true;
    void refresh().catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const run = async () => {
    setError(undefined);
    setProgress("Preparando desmontagem…");
    try {
      await DocumentKnowledgePipelineService.analyzeDocument(
        documentId,
        (item) => setProgress(item.message),
        undefined,
        { force: summary?.status === "ready" },
      );
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProgress(undefined);
    }
  };

  const review = async (proposal: KnowledgeProposal, status: "accepted" | "rejected") => {
    setReviewing(proposal.id);
    setError(undefined);
    try {
      let payload: KnowledgeProposalPayload | undefined;
      if (proposal.payload.kind === "claim" && edits[proposal.id]?.trim())
        payload = { ...proposal.payload, proposition: edits[proposal.id]!.trim() };
      await DocumentKnowledgeRepository.reviewProposal(
        proposal.id,
        status,
        payload ? { payload } : {},
      );
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setReviewing(undefined);
    }
  };

  const exportAccepted = async () => {
    setError(undefined);
    try {
      const value = await DocumentKnowledgePipelineService.exportAccepted(documentId);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
      );
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `scriptorium-knowledge-${documentId.replace(/[^a-z0-9-]+/gi, "-")}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const pending = proposals.filter((proposal) => proposal.reviewStatus === "machine-proposed");

  return (
    <section className="mt-6 border-t border-border pt-4" aria-labelledby="book-knowledge-title">
      <div className="flex items-center justify-between gap-2">
        <p id="book-knowledge-title" className="meta-label flex items-center gap-1.5">
          <Network className="size-3" /> Conhecimento do livro
        </p>
        <button
          type="button"
          onClick={() => void run()}
          disabled={Boolean(progress)}
          className="inline-flex h-7 items-center gap-1 rounded border border-input px-2 text-[10px] disabled:opacity-50"
        >
          {progress ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : (
            <Sparkles className="size-3" />
          )}
          {summary?.status === "ready" ? "Reprocessar" : "Desmontar livro"}
        </button>
      </div>

      {progress && <p className="mt-2 text-xs text-muted-foreground">{progress}</p>}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {summary?.status === "failed" && (
        <p className="mt-2 text-xs text-destructive">Falha anterior: {summary.error}</p>
      )}
      {summary?.status !== "ready" ? (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Reconstrua a estrutura, gere unidades citáveis e revise propostas antes de agregá-las.
          Nada entra no knowledge público automaticamente.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 rounded border border-border p-1" role="tablist">
            {(
              [
                ["structure", "Estrutura", ListTree],
                ["proposals", `Revisão ${pending.length}`, FileText],
                ["aggregate", "Agregado", Network],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`inline-flex min-h-8 items-center justify-center gap-1 rounded px-1 text-[10px] ${
                  tab === value ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-3" /> {label}
              </button>
            ))}
          </div>

          {tab === "structure" && (
            <ol className="mt-3 space-y-1" aria-label="Estrutura detectada do livro">
              {nodes.map((node) => (
                <li key={node.id} style={{ paddingLeft: `${nodeDepth(node, byId) * 10}px` }}>
                  <button
                    type="button"
                    onClick={() => onNavigatePage(node.pageStart)}
                    className="w-full rounded px-1.5 py-1 text-left hover:bg-accent/50"
                  >
                    <span className="block truncate text-xs">
                      {node.title ?? NODE_LABELS[node.kind]}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {NODE_LABELS[node.kind]} · p. {node.pageStart + 1} ·{" "}
                      {Math.round(node.confidence * 100)}%
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {tab === "proposals" && (
            <div className="mt-3 space-y-2">
              {!proposals.length ? (
                <p className="text-xs italic text-muted-foreground">Nenhuma proposta detectada.</p>
              ) : (
                proposals.map((proposal) => (
                  <article key={proposal.id} className="rounded border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] uppercase text-muted-foreground">
                        {KIND_LABELS[proposal.proposalKind]} ·{" "}
                        {Math.round(proposal.confidence * 100)}%
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {proposal.reviewStatus}
                      </span>
                    </div>
                    {proposal.payload.kind === "claim" &&
                    proposal.reviewStatus === "machine-proposed" ? (
                      <textarea
                        aria-label="Editar afirmação antes da revisão"
                        value={edits[proposal.id] ?? proposal.payload.proposition}
                        onChange={(event) =>
                          setEdits((current) => ({ ...current, [proposal.id]: event.target.value }))
                        }
                        className="mt-1.5 min-h-20 w-full resize-y rounded border border-input bg-background p-1.5 text-xs leading-relaxed"
                      />
                    ) : (
                      <p className="mt-1.5 text-xs leading-relaxed">{proposalText(proposal)}</p>
                    )}
                    {proposal.reviewStatus === "machine-proposed" && (
                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          disabled={reviewing === proposal.id}
                          onClick={() => void review(proposal, "accepted")}
                          className="inline-flex min-h-8 items-center gap-1 rounded border border-input px-2 text-[10px] disabled:opacity-50"
                        >
                          <Check className="size-3" /> Aceitar
                        </button>
                        <button
                          type="button"
                          disabled={reviewing === proposal.id}
                          onClick={() => void review(proposal, "rejected")}
                          className="inline-flex min-h-8 items-center gap-1 rounded border border-input px-2 text-[10px] disabled:opacity-50"
                        >
                          <X className="size-3" /> Rejeitar
                        </button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          )}

          {tab === "aggregate" && aggregate && (
            <div className="mt-3 space-y-3">
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-muted/50 p-2">
                  <dt className="text-muted-foreground">Estrutura</dt>
                  <dd className="font-mono">{aggregate.nodeCount} nós</dd>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <dt className="text-muted-foreground">Unidades</dt>
                  <dd className="font-mono">{aggregate.unitCount}</dd>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <dt className="text-muted-foreground">Aceitas</dt>
                  <dd className="font-mono">{aggregate.acceptedCount}</dd>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <dt className="text-muted-foreground">Pendentes</dt>
                  <dd className="font-mono">{aggregate.pendingCount}</dd>
                </div>
              </dl>
              {aggregate.acceptedProposals.length ? (
                <ul className="space-y-1.5">
                  {aggregate.acceptedProposals.slice(0, 30).map((proposal) => (
                    <li key={proposal.id} className="border-l border-border pl-2 text-xs">
                      <span className="font-mono text-[9px] uppercase text-muted-foreground">
                        {KIND_LABELS[proposal.proposalKind]}
                      </span>
                      <p className="line-clamp-3">{proposalText(proposal)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  Revise propostas para construir a visão agregada do livro.
                </p>
              )}
              <button
                type="button"
                onClick={() => void exportAccepted()}
                disabled={!aggregate.acceptedCount}
                className="inline-flex min-h-8 items-center gap-1 rounded border border-input px-2 text-[10px] disabled:opacity-50"
              >
                <Download className="size-3" /> Exportar seleção editorial
              </button>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Exportação privada. Publicação exige revisão de direitos e proveniência.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
