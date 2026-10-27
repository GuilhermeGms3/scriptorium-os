import { useEffect, useRef, useState, type ReactNode } from "react";
import { centeredReadingIndicatorSlots } from "../../lib/domain/reading-sections";
import { useReadingScrollspy } from "../../hooks/use-reading-scrollspy";
import "./reading-section-indicators.css";

export interface ReadingNavigation {
  title: string;
  count: number;
  active: number;
  label: (index: number) => string;
  choose: (index: number) => void;
}

function SectionIndicators({ title, count, active, label, choose }: ReadingNavigation) {
  const root = useRef<HTMLElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const [capacity, setCapacity] = useState(7);
  useEffect(() => {
    if (pendingFocus.current !== active) return;
    root.current
      ?.querySelector<HTMLButtonElement>(`[data-section-index="${active}"]`)
      ?.focus({ preventScroll: true });
    pendingFocus.current = null;
  }, [active, capacity]);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const resize = new ResizeObserver(() =>
      setCapacity(Math.max(1, Math.min(9, Math.floor(node.clientHeight / 28)))),
    );
    resize.observe(node);
    return () => resize.disconnect();
  }, []);
  if (!count) return null;
  return (
    <nav
      ref={root}
      className="reading-indicator-group"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(event) => {
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : event.key === "ArrowDown"
                ? Math.min(count - 1, active + 1)
                : event.key === "ArrowUp"
                  ? Math.max(0, active - 1)
                  : null;
        if (next === null) return;
        event.preventDefault();
        pendingFocus.current = next;
        root.current?.focus({ preventScroll: true });
        choose(next);
        if (next === active) {
          root.current
            ?.querySelector<HTMLButtonElement>(`[data-section-index="${next}"]`)
            ?.focus({ preventScroll: true });
          pendingFocus.current = null;
        }
      }}
    >
      <span className="reading-indicator-kind" title={title} aria-hidden="true">
        {title === "Páginas"
          ? "p."
          : title === "Unidades"
            ? "§"
            : title === "Versículos"
              ? "v."
              : "¶"}
      </span>
      <div className="reading-indicator-points">
        {centeredReadingIndicatorSlots(count, active, capacity).map((index, slot) =>
          index === null ? (
            <span
              key={`empty:${slot}`}
              className="reading-indicator-placeholder"
              aria-hidden="true"
            />
          ) : (
            <button
              key={index}
              type="button"
              data-section-index={index}
              aria-label={`Navegar: ${label(index)}`}
              aria-current={active === index ? "location" : undefined}
              title={label(index)}
              onClick={() => choose(index)}
            >
              <span className="reading-indicator-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="reading-indicator-stroke" aria-hidden="true" />
            </button>
          ),
        )}
      </div>
      <span
        className="reading-indicator-position"
        aria-hidden="true"
        title={`${label(active)} · ${count} no total`}
      >
        {active + 1}/{count}
      </span>
    </nav>
  );
}

/** Reserved left gutter, independent of the content's scroll and of any right-hand inspector. */
export function ReadingSectionLayout({
  children,
  title = "Trechos",
  navigation,
  collapseBelowDesktop = false,
  scrollerAttribute = false,
}: {
  children: ReactNode;
  title?: string;
  navigation?: ReadingNavigation;
  collapseBelowDesktop?: boolean;
  scrollerAttribute?: boolean;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const spy = useReadingScrollspy(scroll);
  const controlledIndex = navigation?.active;
  useEffect(() => {
    if (controlledIndex !== undefined && window.matchMedia("(min-width: 1024px)").matches)
      scroll.current?.scrollTo({ top: 0 });
  }, [controlledIndex]);
  return (
    <div
      className={`reading-sections-layout${collapseBelowDesktop ? " reading-sections-desktop" : ""}`}
    >
      <aside className="reading-indicator-rail" aria-label="Indicadores de leitura">
        {navigation && <SectionIndicators {...navigation} />}
        {spy.labels.length > 0 && (
          <SectionIndicators
            title={title}
            count={spy.labels.length}
            active={spy.active}
            label={(index) => spy.labels[index] ?? `Trecho ${index + 1}`}
            choose={spy.choose}
          />
        )}
      </aside>
      <div
        ref={scroll}
        className="reading-sections-content"
        {...(scrollerAttribute ? { "data-reading-scroller": "" } : {})}
      >
        {children}
      </div>
    </div>
  );
}
