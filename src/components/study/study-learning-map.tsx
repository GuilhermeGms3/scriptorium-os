import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleDot,
  Compass,
  Library,
  LockKeyhole,
  Network,
  Route,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  STUDY_JOURNEYS,
  STUDY_MAP_EDGES,
  STUDY_MAP_NODES,
  journeyStartCount,
  studyPathById,
  studyPathProgress,
  type StudyJourneyId,
  type StudyMapNode,
} from "../../lib/content/study-learning-map";
import type { Study } from "../../lib/domain/study";

const JOURNEY_STYLE: Readonly<
  Record<StudyJourneyId, { node: string; active: string; line: string; dot: string }>
> = {
  biblia: {
    node: "border-amber-500/50 bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-100",
    active: "border-amber-500 bg-amber-100/60 dark:bg-amber-950/35",
    line: "stroke-amber-500/65",
    dot: "bg-amber-500",
  },
  teologia: {
    node: "border-violet-500/50 bg-violet-100 text-violet-950 dark:bg-violet-950/70 dark:text-violet-100",
    active: "border-violet-500 bg-violet-100/60 dark:bg-violet-950/35",
    line: "stroke-violet-500/65",
    dot: "bg-violet-500",
  },
  historia: {
    node: "border-teal-500/50 bg-teal-100 text-teal-950 dark:bg-teal-950/70 dark:text-teal-100",
    active: "border-teal-500 bg-teal-100/60 dark:bg-teal-950/35",
    line: "stroke-teal-500/65",
    dot: "bg-teal-500",
  },
  literatura: {
    node: "border-rose-500/50 bg-rose-100 text-rose-950 dark:bg-rose-950/70 dark:text-rose-100",
    active: "border-rose-500 bg-rose-100/60 dark:bg-rose-950/35",
    line: "stroke-rose-500/65",
    dot: "bg-rose-500",
  },
};

interface StudyLearningMapProps {
  studies: readonly Study[];
  onStartPath: (title: string) => Promise<void>;
}

export function StudyLearningMap({ studies, onStartPath }: StudyLearningMapProps) {
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("study-origin");
  const [focusedJourneyId, setFocusedJourneyId] = useState<StudyJourneyId | null>(null);
  const [startingPathId, setStartingPathId] = useState<string>();
  const selectedNode =
    STUDY_MAP_NODES.find((node) => node.id === selectedNodeId) ?? STUDY_MAP_NODES[0]!;

  const nodeLookup = useMemo(() => new Map(STUDY_MAP_NODES.map((node) => [node.id, node])), []);

  useEffect(() => {
    const viewport = canvasViewportRef.current;
    const origin = nodeLookup.get("study-origin");
    if (!viewport || !origin) return;
    viewport.scrollTo({
      left: Math.max(0, origin.x - viewport.clientWidth / 2),
      top: Math.max(0, origin.y - viewport.clientHeight / 2),
    });
  }, [nodeLookup]);

  const startPath = async (pathId: string, title: string) => {
    setStartingPathId(pathId);
    try {
      await onStartPath(title);
    } finally {
      setStartingPathId(undefined);
    }
  };

  return (
    <div className="grid min-h-[690px] border-y border-border bg-card lg:grid-cols-[210px_minmax(560px,1fr)_260px]">
      <nav
        className="border-b border-border bg-sidebar/55 p-3 lg:border-b-0 lg:border-r"
        aria-label="Jornadas de estudo"
      >
        <div className="flex items-center justify-between gap-3 lg:block">
          <div>
            <p className="meta-label">Jornadas</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Escolha um ramo para destacar seu percurso.
            </p>
          </div>
          {focusedJourneyId && (
            <button
              type="button"
              onClick={() => setFocusedJourneyId(null)}
              className="shrink-0 text-[11px] text-primary hover:underline lg:mt-2"
            >
              Mostrar tudo
            </button>
          )}
        </div>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {STUDY_JOURNEYS.map((journey) => {
            const pathCount = STUDY_MAP_NODES.filter(
              (node) => node.kind === "path" && node.journeyId === journey.id,
            ).length;
            const startedCount = journeyStartCount(journey, studies);
            const active = focusedJourneyId === journey.id;
            return (
              <li key={journey.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFocusedJourneyId(active ? null : journey.id);
                    setSelectedNodeId(`journey:${journey.id}`);
                  }}
                  className={clsx(
                    "w-full border px-2.5 py-2 text-left transition-colors hover:bg-accent",
                    active ? JOURNEY_STYLE[journey.id].active : "border-transparent",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "size-2 shrink-0 rounded-full",
                        JOURNEY_STYLE[journey.id].dot,
                      )}
                    />
                    <span className="min-w-0 flex-1 text-xs font-medium">{journey.title}</span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {startedCount}/{pathCount}
                    </span>
                  </span>
                  <span className="mt-1 block pl-4 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {journey.eyebrow}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 hidden border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground lg:block">
          <p className="flex items-center gap-1.5">
            <CircleDot className="size-3" /> Disponível no acervo
          </p>
          <p className="mt-1.5 flex items-center gap-1.5">
            <Check className="size-3" /> Investigação iniciada
          </p>
          <p className="mt-1.5 flex items-center gap-1.5">
            <LockKeyhole className="size-3" /> Acervo insuficiente
          </p>
        </div>
      </nav>

      <section className="min-w-0 overflow-hidden" aria-label="Mapa da formação">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div>
            <p className="meta-label">Mapa da formação</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Relações pedagógicas — não são afirmações de verdade ou dependências dogmáticas.
            </p>
          </div>
          <div className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:flex">
            <Compass className="size-3.5" /> selecione um nó
          </div>
        </div>
        <div
          ref={canvasViewportRef}
          className="h-[520px] overflow-auto bg-[radial-gradient(circle_at_center,var(--color-border)_0.7px,transparent_0.8px)] bg-[size:22px_22px] lg:h-[638px]"
        >
          <div className="relative h-[700px] min-w-[1040px]">
            <svg className="absolute inset-0 size-full" viewBox="0 0 1040 700" aria-hidden="true">
              {STUDY_MAP_EDGES.map((edge) => {
                const from = nodeLookup.get(edge.from);
                const to = nodeLookup.get(edge.to);
                if (!from || !to) return null;
                const journeyId = to.journeyId ?? from.journeyId;
                const muted = focusedJourneyId !== null && journeyId !== focusedJourneyId;
                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className={clsx(
                      "transition-opacity",
                      journeyId ? JOURNEY_STYLE[journeyId].line : "stroke-border",
                      muted ? "opacity-10" : "opacity-70",
                    )}
                    strokeWidth="1.5"
                    strokeDasharray={to.kind === "path" ? "4 4" : undefined}
                  />
                );
              })}
            </svg>

            {STUDY_MAP_NODES.map((node) => (
              <MapNodeButton
                key={node.id}
                node={node}
                studies={studies}
                selected={selectedNode.id === node.id}
                muted={
                  focusedJourneyId !== null &&
                  node.kind !== "origin" &&
                  node.journeyId !== focusedJourneyId
                }
                onSelect={() => {
                  setSelectedNodeId(node.id);
                  if (node.journeyId) setFocusedJourneyId(node.journeyId);
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <NodeInspector
        node={selectedNode}
        studies={studies}
        startingPathId={startingPathId}
        onFocusJourney={(journeyId) => setFocusedJourneyId(journeyId)}
        onStartPath={startPath}
      />
    </div>
  );
}

function MapNodeButton({
  node,
  studies,
  selected,
  muted,
  onSelect,
}: {
  node: StudyMapNode;
  studies: readonly Study[];
  selected: boolean;
  muted: boolean;
  onSelect: () => void;
}) {
  const path = node.pathId ? studyPathById(node.pathId) : undefined;
  const progress = path ? studyPathProgress(path, studies) : undefined;
  const isGap = progress?.state === "collection-gap";
  const isStarted = progress?.state === "started";
  const journeyStyle = node.journeyId ? JOURNEY_STYLE[node.journeyId] : undefined;
  const nodeSize = node.kind === "origin" ? 94 : node.kind === "journey" ? 82 : 68;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${node.title}${isStarted ? ", investigação iniciada" : isGap ? ", acervo insuficiente" : ", disponível"}`}
      onClick={onSelect}
      style={{
        left: node.x,
        top: node.y,
        width: nodeSize,
        height: nodeSize,
        transform: "translate(-50%, -50%)",
      }}
      className={clsx(
        "absolute z-10 flex items-center justify-center rounded-full border p-2 text-center transition-all",
        "hover:-translate-y-[calc(50%+2px)] hover:shadow-md focus-visible:z-20",
        node.kind === "origin"
          ? "border-foreground/40 bg-foreground text-background"
          : journeyStyle?.node,
        isGap && "border-dashed grayscale-[0.65]",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        muted ? "opacity-25" : "opacity-100",
      )}
    >
      <span className="leading-tight">
        {isStarted && <Check className="mx-auto mb-0.5 size-3" aria-hidden="true" />}
        {isGap && <LockKeyhole className="mx-auto mb-0.5 size-3" aria-hidden="true" />}
        <span
          className={clsx(
            "block",
            node.kind === "path" ? "text-[10px]" : "text-[11px] font-medium",
          )}
        >
          {node.shortTitle}
        </span>
      </span>
    </button>
  );
}

function NodeInspector({
  node,
  studies,
  startingPathId,
  onFocusJourney,
  onStartPath,
}: {
  node: StudyMapNode;
  studies: readonly Study[];
  startingPathId: string | undefined;
  onFocusJourney: (journeyId: StudyJourneyId) => void;
  onStartPath: (pathId: string, title: string) => Promise<void>;
}) {
  const path = node.pathId ? studyPathById(node.pathId) : undefined;
  const progress = path ? studyPathProgress(path, studies) : undefined;

  return (
    <aside
      className="border-t border-border bg-background p-4 lg:border-l lg:border-t-0"
      aria-live="polite"
    >
      <p className="meta-label">
        {node.kind === "origin"
          ? "Ponto de partida"
          : node.kind === "journey"
            ? "Jornada"
            : "Etapa"}
      </p>
      <h2 className="mt-2 font-serif text-xl font-semibold leading-tight">{node.title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{node.description}</p>

      {node.kind === "origin" && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium">Como funciona</p>
          <ol className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-mono">01</span>
              <span>Escolha uma jornada.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono">02</span>
              <span>Abra uma etapa sustentada pelo acervo.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono">03</span>
              <span>Reúna passagens, fontes e conclusões.</span>
            </li>
          </ol>
        </div>
      )}

      {node.kind === "journey" && node.journeyId && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {journeyStartCount(
              STUDY_JOURNEYS.find((journey) => journey.id === node.journeyId)!,
              studies,
            )}{" "}
            etapas iniciadas. Isso mede atividade registrada, não domínio do assunto.
          </p>
          <button
            type="button"
            onClick={() => onFocusJourney(node.journeyId!)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Route className="size-3.5" /> Destacar esta jornada
          </button>
        </div>
      )}

      {path && progress && (
        <div className="mt-5 space-y-4 border-t border-border pt-4">
          <div>
            <p className="meta-label">Estado real</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
              {progress.state === "started" ? (
                <>
                  <Check className="size-3.5 text-emerald-600" /> Investigação iniciada
                </>
              ) : progress.state === "collection-gap" ? (
                <>
                  <LockKeyhole className="size-3.5 text-muted-foreground" /> Acervo insuficiente
                </>
              ) : (
                <>
                  <CircleDot className="size-3.5 text-primary" /> Disponível para começar
                </>
              )}
            </p>
            {progress.state === "started" && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {progress.collectedItems} materiais reunidos no seu workspace.
              </p>
            )}
          </div>

          <div>
            <p className="meta-label">Fontes de partida</p>
            {path.resources.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {path.resources.map((resource) => (
                  <li key={resource.workId}>
                    <Link
                      to="/library/read/$workId"
                      params={{ workId: resource.workId }}
                      className="group flex items-start gap-2 text-xs hover:text-primary"
                    >
                      <BookOpen className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                      <span>{resource.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Ainda não há uma coleção especializada suficiente para orientar esta etapa.
              </p>
            )}
          </div>

          {progress.study ? (
            <Link
              to="/study/$slug"
              params={{ slug: progress.study.slug }}
              className="inline-flex w-full items-center justify-between border border-input px-3 py-2 text-xs font-medium hover:bg-accent"
            >
              Continuar investigação <ArrowRight className="size-3.5" />
            </Link>
          ) : progress.state === "available" ? (
            <button
              type="button"
              disabled={startingPathId === path.id}
              onClick={() => void onStartPath(path.id, path.title)}
              className="inline-flex w-full items-center justify-between bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {startingPathId === path.id ? "Preparando workspace…" : "Iniciar esta etapa"}
              <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <Link
              to="/library"
              className="inline-flex w-full items-center justify-between border border-input px-3 py-2 text-xs font-medium hover:bg-accent"
            >
              Procurar fontes <Library className="size-3.5" />
            </Link>
          )}
        </div>
      )}

      <Link
        to="/knowledge"
        className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <Network className="size-3.5" /> Abrir mapa livre de conhecimento
      </Link>
    </aside>
  );
}
