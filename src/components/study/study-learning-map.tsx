import { Link } from "@tanstack/react-router";
import { Check, Compass } from "lucide-react";
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
import { guideIdForNode, JOURNEY_GUIDE_IDS } from "../../lib/content/study-guides";
import type { Study } from "../../lib/domain/study";

const JOURNEY_STYLE: Readonly<Record<StudyJourneyId, { node: string; line: string; dot: string }>> =
  {
    biblia: {
      node: "border-amber-500/50 bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-100",
      line: "stroke-amber-500/65",
      dot: "bg-amber-500",
    },
    teologia: {
      node: "border-violet-500/50 bg-violet-100 text-violet-950 dark:bg-violet-950/70 dark:text-violet-100",
      line: "stroke-violet-500/65",
      dot: "bg-violet-500",
    },
    historia: {
      node: "border-teal-500/50 bg-teal-100 text-teal-950 dark:bg-teal-950/70 dark:text-teal-100",
      line: "stroke-teal-500/65",
      dot: "bg-teal-500",
    },
    literatura: {
      node: "border-rose-500/50 bg-rose-100 text-rose-950 dark:bg-rose-950/70 dark:text-rose-100",
      line: "stroke-rose-500/65",
      dot: "bg-rose-500",
    },
  };

export function StudyLearningMap({ studies }: { studies: readonly Study[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [focusedJourneyId, setFocusedJourneyId] = useState("");
  const nodeLookup = useMemo(() => new Map(STUDY_MAP_NODES.map((node) => [node.id, node])), []);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport)
      viewport.scrollTo({
        left: Math.max(0, 520 - viewport.clientWidth / 2),
        top: Math.max(0, 355 - viewport.clientHeight / 2),
      });
  }, []);
  return (
    <div className="grid min-h-[690px] border-y border-border bg-card lg:grid-cols-[210px_minmax(0,1fr)]">
      <nav
        className="border-b border-border bg-sidebar/55 p-3 lg:border-b-0 lg:border-r"
        aria-label="Jornadas de estudo"
      >
        <p className="meta-label">Jornadas</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Abra um guia para começar a estudar.
        </p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {STUDY_JOURNEYS.map((journey) => (
            <li key={journey.id}>
              <Link
                to="/study/guide/$topic"
                params={{ topic: JOURNEY_GUIDE_IDS[journey.id] }}
                className="block border border-transparent px-2.5 py-2 hover:bg-accent focus-visible:outline focus-visible:outline-2"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={clsx("size-2 shrink-0 rounded-full", JOURNEY_STYLE[journey.id].dot)}
                  />
                  <span className="flex-1 text-xs font-medium">{journey.title}</span>
                </span>
                <span className="mt-1 block pl-4 text-[10px] text-muted-foreground">
                  {journeyStartCount(journey, studies)} investigações iniciadas
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Todos os nós abrem roteiros. A marca ✓ indica uma investigação iniciada, não domínio ou
          conclusão do assunto.
        </p>
      </nav>
      <section className="min-w-0 overflow-hidden" aria-label="Mapa da formação">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2">
          <div>
            <p className="meta-label">Mapa da formação</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Compass className="mr-1 inline size-3.5" /> Clique em um tema para abrir seu guia de
              estudo.
            </p>
          </div>
          <label className="text-xs text-muted-foreground">
            Destacar ramo{" "}
            <select
              value={focusedJourneyId}
              onChange={(event) => setFocusedJourneyId(event.target.value)}
              className="ml-2 h-8 max-w-48 border border-input bg-background px-2"
            >
              <option value="">Todos</option>
              {STUDY_JOURNEYS.map((journey) => (
                <option key={journey.id} value={journey.id}>
                  {journey.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          ref={viewportRef}
          className="h-[520px] overflow-auto bg-[radial-gradient(circle_at_center,var(--color-border)_0.7px,transparent_0.8px)] bg-[size:22px_22px] lg:h-[638px]"
        >
          <div className="relative mx-auto h-[700px] w-[1040px]">
            <svg className="absolute inset-0 size-full" viewBox="0 0 1040 700" aria-hidden="true">
              {STUDY_MAP_EDGES.map((edge) => {
                const from = nodeLookup.get(edge.from);
                const to = nodeLookup.get(edge.to);
                if (!from || !to) return null;
                const journeyId = to.journeyId ?? from.journeyId;
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
                      focusedJourneyId && journeyId !== focusedJourneyId
                        ? "opacity-10"
                        : "opacity-70",
                    )}
                    strokeWidth="1.5"
                    strokeDasharray={to.kind === "path" ? "4 4" : undefined}
                  />
                );
              })}
            </svg>
            {STUDY_MAP_NODES.map((node) => (
              <MapNodeLink
                key={node.id}
                node={node}
                studies={studies}
                muted={Boolean(
                  focusedJourneyId && node.kind !== "origin" && node.journeyId !== focusedJourneyId,
                )}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function MapNodeLink({
  node,
  studies,
  muted,
}: {
  node: StudyMapNode;
  studies: readonly Study[];
  muted: boolean;
}) {
  const path = node.pathId ? studyPathById(node.pathId) : undefined;
  const started = path && studyPathProgress(path, studies).state === "started";
  const size = node.kind === "origin" ? 94 : node.kind === "journey" ? 82 : 68;
  return (
    <Link
      to="/study/guide/$topic"
      params={{ topic: guideIdForNode(node) }}
      aria-label={`Abrir guia: ${node.title}${started ? ", investigação iniciada" : ""}`}
      style={{
        left: node.x,
        top: node.y,
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
      }}
      className={clsx(
        "absolute z-10 flex items-center justify-center rounded-full border p-2 text-center transition-all hover:-translate-y-[calc(50%+2px)] hover:shadow-md focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
        node.kind === "origin"
          ? "border-foreground/40 bg-foreground text-background"
          : node.journeyId && JOURNEY_STYLE[node.journeyId].node,
        muted ? "opacity-25" : "opacity-100",
      )}
    >
      <span className="leading-tight">
        {started && <Check className="mx-auto mb-0.5 size-3" aria-hidden="true" />}
        <span
          className={clsx(
            "block",
            node.kind === "path" ? "text-[10px]" : "text-[11px] font-medium",
          )}
        >
          {node.shortTitle}
        </span>
      </span>
    </Link>
  );
}
