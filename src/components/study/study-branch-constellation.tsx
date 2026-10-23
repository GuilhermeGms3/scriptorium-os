import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ExplorerEntity } from "../../lib/application/knowledge-query-service";
import { studyEntityTitle } from "../../lib/content/study-knowledge";
import { describeStudyEntity, notesForTopic } from "../../lib/application/study-topic-service";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { Button } from "../ui/button";

export function StudyBranchConstellation({
  title,
  entities,
  onSelect,
}: {
  title: string;
  entities: readonly ExplorerEntity[];
  onSelect: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const { notes, studies } = useWorkbench();
  const pages = Math.ceil(entities.length / 8);
  const actualPage = Math.min(page, Math.max(0, pages - 1));
  const visible = entities.slice(actualPage * 8, actualPage * 8 + 8);
  const positions = visible.map((_, index) => {
    const angle = (index / visible.length) * Math.PI * 2 - Math.PI / 2;
    return { x: 400 + Math.cos(angle) * 275, y: 240 + Math.sin(angle) * 158 };
  });
  if (!entities.length)
    return <p className="py-8 text-sm text-muted-foreground">Nenhum tema corresponde à busca.</p>;
  return (
    <div className="branch-constellation">
      <div className="topic-orbit-scroll">
        <div className="topic-orbit-board">
          <svg viewBox="0 0 800 480" aria-hidden="true">
            <ellipse
              cx="400"
              cy="240"
              rx="275"
              ry="158"
              fill="none"
              className="topic-orbit-track"
            />
            {positions.map((point, index) => (
              <line
                key={index}
                x1="400"
                y1="240"
                x2={point.x}
                y2={point.y}
                className="topic-orbit-track"
              />
            ))}
          </svg>
          <div className="topic-orbit-center">
            <span className="meta-label">Núcleo de estudo</span>
            <strong>{title}</strong>
          </div>
          {visible.map((entity, index) => {
            const point = positions[index]!;
            const count = notesForTopic(describeStudyEntity(entity), studies, notes).length;
            return (
              <button
                key={entity.entity.id}
                className="topic-orbit-node"
                style={{ left: `${point.x / 8}%`, top: `${point.y / 4.8}%` }}
                onClick={() => onSelect(entity.entity.id)}
              >
                <span className="topic-orb" />
                <span>{studyEntityTitle(entity)}</span>
                {count > 0 && (
                  <small>
                    {count} {count === 1 ? "nota" : "notas"}
                  </small>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="topic-pager">
        <Button
          variant="ghost"
          size="sm"
          disabled={actualPage === 0}
          onClick={() => setPage(actualPage - 1)}
        >
          <ArrowLeft className="mr-2 size-4" /> Anteriores
        </Button>
        <span>
          {actualPage * 8 + 1}–{Math.min((actualPage + 1) * 8, entities.length)} de{" "}
          {entities.length} temas · organização do acervo
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={actualPage >= pages - 1}
          onClick={() => setPage(actualPage + 1)}
        >
          Próximos <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
