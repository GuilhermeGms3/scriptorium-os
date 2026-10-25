import { useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { STUDY_SKILL_NODES, studyNodeState } from "../../lib/content/study-skill-tree";
import { STUDY_MAP_EDGES } from "../../lib/content/study-learning-map";
import { useStudyReveal } from "../../hooks/use-study-reveal";

export function StudySkillTree({
  completed,
  ready,
  open,
}: {
  completed: ReadonlySet<string>;
  ready: boolean;
  open: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string>();
  const ref = useStudyReveal();
  const byId = new Map(STUDY_SKILL_NODES.map((node) => [node.id, node]));
  const current = selected ? byId.get(selected) : undefined;
  const status = (id: string) =>
    !ready && id !== "study-origin" ? "locked" : studyNodeState(id, completed);
  function choose(id: string) {
    setSelected(id);
    if (status(id) !== "locked") open(id);
  }
  return (
    <div className="study-skill-surface" ref={ref}>
      <div className="study-skill-legend">
        <span>Disponível</span>
        <span>Pré-requisito</span>
      </div>
      <div
        className="study-skill-viewport"
        tabIndex={0}
        aria-label="Árvore de formação; diagrama horizontal"
      >
        <div className="study-skill-canvas">
          <svg
            viewBox="0 0 1080 760"
            preserveAspectRatio="none"
            className="study-skill-lines"
            aria-hidden="true"
          >
            {STUDY_MAP_EDGES.map((edge) => {
              const from = byId.get(edge.from)!;
              const to = byId.get(edge.to)!;
              return (
                <path
                  key={`${edge.from}:${edge.to}`}
                  data-study-path=""
                  pathLength={1}
                  strokeDasharray="1"
                  data-lit={completed.has(edge.from) && status(edge.to) !== "locked"}
                  d={`M${from.x} ${from.y} C${from.x + 110} ${from.y},${to.x - 110} ${to.y},${to.x} ${to.y}`}
                />
              );
            })}
          </svg>
          {STUDY_SKILL_NODES.map((node) => {
            const state = status(node.id);
            const label =
              state === "completed"
                ? "Concluído"
                : state === "available"
                  ? "Disponível"
                  : "Não liberado";
            return (
              <button
                key={node.id}
                type="button"
                className="study-skill-node"
                data-state={state}
                data-kind={node.kind}
                data-selected={selected === node.id}
                data-study-enter=""
                style={{ left: `${node.x / 10.8}%`, top: `${node.y / 7.6}%` }}
                onClick={() => choose(node.id)}
                aria-disabled={state === "locked"}
                aria-label={`${node.shortTitle} — ${label}`}
                title={`${node.shortTitle} · ${label}`}
              >
                <span className="study-skill-orb">
                  {state === "completed" ? <Check /> : <BookOpen />}
                </span>
                <span className="study-skill-name">{node.shortTitle}</span>
              </button>
            );
          })}
        </div>
      </div>
      <label className="study-skill-selector">
        Conceito
        <select value={selected ?? ""} onChange={(event) => choose(event.target.value)}>
          <option value="" disabled>
            Selecionar conceito
          </option>
          {STUDY_SKILL_NODES.map((node) => (
            <option key={node.id} value={node.id}>
              {node.shortTitle} ·{" "}
              {status(node.id) === "locked"
                ? "Pré-requisito"
                : status(node.id) === "completed"
                  ? "Concluído"
                  : "Disponível"}
            </option>
          ))}
        </select>
      </label>
      {current && status(current.id) === "locked" && (
        <p className="study-skill-prerequisite" role="status">
          Pré-requisito:{" "}
          {STUDY_MAP_EDGES.filter((edge) => edge.to === current.id)
            .map((edge) => byId.get(edge.from)?.shortTitle)
            .join(" e ")}
          . Conclua o percurso anterior para liberar este conceito.
        </p>
      )}
    </div>
  );
}
