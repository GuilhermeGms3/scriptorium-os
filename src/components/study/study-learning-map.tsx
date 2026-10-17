import { Link } from "@tanstack/react-router";
import { Check, Compass, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  STUDY_JOURNEYS,
  STUDY_MAP_NODES,
  journeyStartCount,
  studyPathById,
  studyPathProgress,
} from "../../lib/content/study-learning-map";
import { guideIdForNode, JOURNEY_GUIDE_IDS } from "../../lib/content/study-guides";
import { groupStudyKnowledge, studyEntityTitle } from "../../lib/content/study-knowledge";
import { KnowledgeQueryService } from "../../lib/application/knowledge-query-service";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import type { Study } from "../../lib/domain/study";

const BRANCH_CENTERS = {
  biblia: { x: 390, y: 205 },
  teologia: { x: 890, y: 205 },
  historia: { x: 390, y: 525 },
  literatura: { x: 890, y: 525 },
} as const;
const CENTER = { x: 640, y: 365 };

export function StudyLearningMap({
  studies,
  onSelectEntity,
}: {
  studies: readonly Study[];
  onSelectEntity: (id: string) => void;
}) {
  const [focused, setFocused] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [query, setQuery] = useState("");
  const catalog = useWorkspaceQuery(["knowledge-entities"], () =>
    KnowledgeQueryService.listEntities(),
  );
  const groups = useMemo(() => groupStudyKnowledge(catalog.data ?? []), [catalog.data]);
  const selected = groups.find((group) => group.id === selectedGroup);
  const entries =
    selected?.entities.filter((item) =>
      studyEntityTitle(item).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
    ) ?? [];
  const leaves = STUDY_JOURNEYS.flatMap((journey) => {
    const paths = STUDY_MAP_NODES.filter(
      (node) => node.kind === "path" && node.journeyId === journey.id,
    );
    const additions = groups.filter(
      (group) => group.journeyId === journey.id && group.entities.length > 0,
    );
    const count = paths.length + additions.length;
    const left = journey.id === "biblia" || journey.id === "historia";
    const center = BRANCH_CENTERS[journey.id];
    return [
      ...paths.map((node) => ({ key: node.id, title: node.shortTitle, node, group: undefined })),
      ...additions.map((group) => ({ key: group.id, title: group.title, node: undefined, group })),
    ].map((leaf, i) => ({
      ...leaf,
      journeyId: journey.id,
      left,
      x: left ? 235 : 1045,
      y: center.y + (i - (count - 1) / 2) * 41,
    }));
  });
  return (
    <section aria-label="Árvore de estudos e fontes" className="study-atlas">
      <nav aria-label="Ramos de estudo" className="atlas-journeys">
        <button
          type="button"
          aria-pressed={!focused}
          onClick={() => setFocused("")}
          className="atlas-journey-all"
        >
          <Compass className="size-4" /> Visão completa
        </button>
        {STUDY_JOURNEYS.map((journey) => (
          <button
            key={journey.id}
            type="button"
            data-journey={journey.id}
            aria-pressed={focused === journey.id}
            onClick={() => setFocused(focused === journey.id ? "" : journey.id)}
            className="atlas-journey"
          >
            <span className="atlas-dot" />
            <span>{journey.title}</span>
            <span className="sr-only">
              {journeyStartCount(journey, studies)} investigações iniciadas
            </span>
          </button>
        ))}
      </nav>
      <div
        className="atlas-viewport"
        tabIndex={0}
        aria-label="Diagrama de estudo; role horizontalmente em telas menores"
      >
        <div className="atlas-canvas">
          <svg viewBox="0 0 1280 730" className="absolute inset-0 size-full" aria-hidden="true">
            <g className="atlas-orbits" fill="none" stroke="currentColor">
              <circle cx="640" cy="365" r="125" />
              <circle cx="640" cy="365" r="153" strokeDasharray="2 9" />
              <circle cx="640" cy="365" r="181" />
              <path d="M435 365H845M640 160V570" strokeDasharray="2 8" />
            </g>
            {STUDY_JOURNEYS.map((journey) => {
              const p = BRANCH_CENTERS[journey.id];
              return (
                <line
                  key={journey.id}
                  data-journey={journey.id}
                  x1={CENTER.x}
                  y1={CENTER.y}
                  x2={p.x}
                  y2={p.y}
                  className={clsx("atlas-line", focused && focused !== journey.id && "opacity-15")}
                />
              );
            })}
            {leaves.map((leaf) => {
              const p = BRANCH_CENTERS[leaf.journeyId];
              return (
                <path
                  key={leaf.key}
                  data-journey={leaf.journeyId}
                  d={`M${p.x} ${p.y} C${leaf.left ? p.x - 90 : p.x + 90} ${p.y},${leaf.left ? leaf.x + 55 : leaf.x - 55} ${leaf.y},${leaf.x} ${leaf.y}`}
                  className={clsx(
                    "atlas-line",
                    focused && focused !== leaf.journeyId && "opacity-15",
                  )}
                  fill="none"
                />
              );
            })}
          </svg>
          <Link
            to="/study/guide/$topic"
            params={{ topic: "teologia" }}
            className="atlas-origin"
            style={{ left: "50%", top: "50%" }}
            aria-label="Abrir guia: Teologia"
          >
            <span className="meta-label">Estudar e relacionar</span>
            <span>Teologia</span>
            <span className="atlas-origin-star" aria-hidden="true">
              ✦
            </span>
          </Link>
          {STUDY_JOURNEYS.map((journey) => {
            const p = BRANCH_CENTERS[journey.id];
            return (
              <Link
                key={journey.id}
                to="/study/guide/$topic"
                params={{ topic: JOURNEY_GUIDE_IDS[journey.id] }}
                data-journey={journey.id}
                className={clsx("atlas-branch", focused && focused !== journey.id && "opacity-25")}
                style={{ left: `${p.x / 12.8}%`, top: `${p.y / 7.3}%` }}
              >
                <span>{journey.title}</span>
                <span className="atlas-branch-caption">
                  Abrir percurso <ArrowRight className="size-3" />
                </span>
              </Link>
            );
          })}
          {leaves.map((leaf) => {
            const node = leaf.node;
            const path = node?.pathId ? studyPathById(node.pathId) : undefined;
            const started = path && studyPathProgress(path, studies).state === "started";
            const content = (
              <>
                <span className="atlas-leaf-dot">{started && <Check className="size-3" />}</span>
                <span className="atlas-leaf-label">
                  {leaf.title}
                  {leaf.group && <small>{leaf.group.entities.length} registros</small>}
                </span>
              </>
            );
            const common = {
              "data-journey": leaf.journeyId,
              className: clsx(
                "atlas-leaf",
                leaf.left && "atlas-leaf-left",
                focused && focused !== leaf.journeyId && "opacity-25",
              ),
              style: { left: `${leaf.x / 12.8}%`, top: `${leaf.y / 7.3}%` },
            };
            return node ? (
              <Link
                {...common}
                key={leaf.key}
                to="/study/guide/$topic"
                params={{ topic: guideIdForNode(node) }}
                aria-label={`Abrir guia: ${node.title}${started ? ", investigação iniciada" : ""}`}
              >
                {content}
              </Link>
            ) : (
              <button
                {...common}
                key={leaf.key}
                type="button"
                aria-pressed={selectedGroup === leaf.key}
                aria-controls="study-branch-content"
                onClick={() => {
                  setSelectedGroup(leaf.key);
                  setQuery("");
                  requestAnimationFrame(() =>
                    document.getElementById("study-branch-content")?.scrollIntoView({
                      block: "start",
                      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                        ? "instant"
                        : "smooth",
                    }),
                  );
                }}
              >
                {content}
              </button>
            );
          })}
          <p className="atlas-legend">
            Círculos maiores abrem roteiros. Núcleos menores reúnem os registros do acervo.
            <br />✓ Investigação iniciada · linhas indicam organização de estudo.
          </p>
        </div>
      </div>
      <div id="study-branch-content" className="atlas-content">
        {catalog.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Consultando os temas do acervo…
          </p>
        ) : catalog.error ? (
          <p role="alert" className="text-sm text-destructive">
            O catálogo não pôde ser consultado.{" "}
            <button onClick={() => void catalog.refetch()} className="underline">
              Tentar novamente
            </button>
          </p>
        ) : selected ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="meta-label">
                  Acervo conectado ·{" "}
                  {STUDY_JOURNEYS.find((journey) => journey.id === selected.journeyId)?.title}
                </p>
                <h2 className="mt-1 font-serif text-2xl">{selected.title}</h2>
              </div>
              <label className="text-sm">
                <span className="sr-only">Buscar neste núcleo</span>
                <input
                  className="h-10 max-w-full border border-input bg-background px-3"
                  placeholder="Buscar neste núcleo…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Abra um registro para consultar suas fontes e relações. A organização por ramo não
              implica concordância doutrinária.
            </p>
            <ul className="atlas-entity-list">
              {entries.map((item) => (
                <li key={item.entity.id}>
                  <button onClick={() => onSelectEntity(item.entity.id)} className="atlas-entity">
                    <span className="atlas-entity-orb" aria-hidden="true" />
                    <span>
                      <span className="block font-serif text-lg">{studyEntityTitle(item)}</span>
                      {item.entity.description && (
                        <span className="mt-1 block max-w-3xl text-sm leading-relaxed text-muted-foreground">
                          {item.entity.description}
                        </span>
                      )}
                    </span>
                    <ArrowRight className="ml-auto size-4 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
            {!entries.length && (
              <p className="py-5 text-sm text-muted-foreground">
                Nenhum registro com esse nome neste núcleo.
              </p>
            )}
          </>
        ) : (
          <div className="flex items-start gap-4">
            <Compass className="mt-1 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-serif text-xl">Uma pergunta abre um caminho.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Explore um percurso ou escolha um dos núcleos para encontrar doutrinas, tradições,
                obras e ideias já presentes no acervo. Seu caderno continua acessível na aba de
                notas.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
