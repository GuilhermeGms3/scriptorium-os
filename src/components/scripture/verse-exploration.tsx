import { useRef, type PointerEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Languages,
  NotebookPen,
  ScrollText,
  Compass,
} from "lucide-react";
import {
  EXPLORATION_AREA_LABELS,
  type VerseExplorationBlock,
} from "../../lib/domain/verse-exploration";
import "./verse-exploration.css";

const AREA_ICONS = {
  language: Languages,
  context: Compass,
  interpretation: ScrollText,
  investigation: NotebookPen,
};

export function ExplorationLegend() {
  return (
    <div className="exploration-legend" aria-label="Áreas dos caminhos">
      {Object.entries(EXPLORATION_AREA_LABELS).map(([area, label]) => (
        <span key={area} data-area={area}>
          <i aria-hidden="true" />
          {label}
        </span>
      ))}
      <span className="ml-auto">
        Arraste os caminhos para explorar{" "}
        <ArrowRight className="inline size-3" aria-hidden="true" />
      </span>
    </div>
  );
}

export function VerseExplorationRow({
  verse,
  blocks,
  onOpen,
  children,
}: {
  verse: number;
  blocks: readonly VerseExplorationBlock[];
  onOpen: (block: VerseExplorationBlock, verse: number) => void;
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);
  function move(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || event.pointerType !== "mouse") return;
    if (!(event.buttons & 1)) {
      drag.current = null;
      return;
    }
    const distance = event.clientX - start.x;
    if (!start.moved && Math.abs(distance) < 7) return;
    start.moved = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.scrollLeft = start.scroll - distance;
  }
  return (
    <section className="exploration-row" aria-label={`Caminhos do versículo ${verse}`}>
      <div className="exploration-verse">{children}</div>
      {blocks.length ? (
        <div className="exploration-path">
          <div
            className="exploration-rail"
            ref={rail}
            tabIndex={0}
            role="group"
            aria-label={`Aprofundamentos do versículo ${verse}: ${blocks.length} blocos`}
            onPointerDown={(event) => {
              if (event.button === 0 && event.pointerType === "mouse")
                drag.current = {
                  x: event.clientX,
                  scroll: event.currentTarget.scrollLeft,
                  moved: false,
                };
            }}
            onPointerMove={move}
            onPointerUp={() => {
              if (drag.current && !drag.current.moved) drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onClickCapture={(event) => {
              if (drag.current?.moved) {
                event.preventDefault();
                event.stopPropagation();
                drag.current = null;
              }
            }}
            onKeyDown={(event) => {
              if (
                event.target !== event.currentTarget ||
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              event.currentTarget.scrollTo({
                left:
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? event.currentTarget.scrollWidth
                      : event.currentTarget.scrollLeft + (event.key === "ArrowRight" ? 260 : -260),
              });
            }}
          >
            <ol
              className="exploration-chain"
              aria-label="Sequência de consulta; conexões organizam a leitura"
            >
              {blocks.map((block) => {
                const Icon = AREA_ICONS[block.area];
                return (
                  <li key={block.id} data-area={block.area}>
                    <span className="exploration-connector" aria-hidden="true">
                      <ArrowRight />
                    </span>
                    <button
                      type="button"
                      className="exploration-block"
                      onClick={() => onOpen(block, verse)}
                    >
                      <span className="exploration-category">
                        <Icon aria-hidden="true" />
                        {block.category}
                      </span>
                      <span className="exploration-title">{block.title}</span>
                      <span className="exploration-preview">{block.preview}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          {blocks.length > 1 && (
            <div
              className="exploration-navigation"
              aria-label={`Mover caminhos do versículo ${verse}`}
            >
              <button
                type="button"
                aria-label={`Caminhos anteriores do versículo ${verse}`}
                onClick={() => rail.current?.scrollBy({ left: -280 })}
              >
                <ChevronLeft />
              </button>
              <span>{blocks.length} aprofundamentos</span>
              <button
                type="button"
                aria-label={`Próximos caminhos do versículo ${verse}`}
                onClick={() => rail.current?.scrollBy({ left: 280 })}
              >
                <ChevronRight />
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="exploration-empty">Sem aprofundamento vinculado a este versículo.</p>
      )}
    </section>
  );
}
