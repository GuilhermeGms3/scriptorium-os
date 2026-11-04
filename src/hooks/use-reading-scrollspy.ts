import { useEffect, useRef, useState, type RefObject } from "react";
import { activeReadingSection } from "../lib/domain/reading-sections";

export function useReadingScrollspy(rootRef: RefObject<HTMLDivElement | null>) {
  const targets = useRef<HTMLElement[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const media = window.matchMedia("(min-width: 1024px)");
    let stop = () => {};
    function connect() {
      stop();
      if (!media.matches || !root) {
        targets.current = [];
        setLabels([]);
        return;
      }
      let frame = 0;
      const measure = () => {
        frame = 0;
        const bounds = root.getBoundingClientRect();
        const toolbar = root.querySelector<HTMLElement>("[data-reading-sticky]");
        const top = bounds.top + (toolbar?.getBoundingClientRect().height ?? 0);
        const atEnd =
          root.scrollHeight > root.clientHeight &&
          root.scrollTop + root.clientHeight >= root.scrollHeight - 2;
        setActive(
          atEnd && targets.current.length
            ? targets.current.length - 1
            : activeReadingSection(
                targets.current.map((target) => target.getBoundingClientRect()),
                top,
                bounds.bottom,
              ),
        );
      };
      const schedule = () => {
        if (!frame) frame = window.requestAnimationFrame(measure);
      };
      const refresh = () => {
        targets.current = [...root.querySelectorAll<HTMLElement>("[data-reading-section]")];
        const next = targets.current.map(
          (target, i) => target.dataset["readingLabel"] ?? `Trecho ${i + 1}`,
        );
        setLabels((previous) =>
          previous.length === next.length && previous.every((label, i) => label === next[i])
            ? previous
            : next,
        );
        schedule();
      };
      const resize = new ResizeObserver(schedule);
      const mutation = new MutationObserver(() => {
        refresh();
        observeContent();
      });
      const observeContent = () => {
        resize.disconnect();
        resize.observe(root);
        for (const child of root.children) resize.observe(child);
      };
      mutation.observe(root, { childList: true, subtree: true });
      root.addEventListener("scroll", schedule, { passive: true });
      observeContent();
      refresh();
      stop = () => {
        root.removeEventListener("scroll", schedule);
        resize.disconnect();
        mutation.disconnect();
        window.cancelAnimationFrame(frame);
      };
    }
    connect();
    media.addEventListener("change", connect);
    return () => {
      stop();
      media.removeEventListener("change", connect);
    };
  }, [rootRef]);
  function choose(index: number) {
    const root = rootRef.current;
    const target = targets.current[index];
    if (!root || !target) return;
    const toolbar = root.querySelector<HTMLElement>("[data-reading-sticky]");
    root.scrollTo({
      top: Math.max(
        0,
        root.scrollTop +
          target.getBoundingClientRect().top -
          root.getBoundingClientRect().top -
          (toolbar?.getBoundingClientRect().height ?? 0) -
          12,
      ),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }
  return { labels, active, choose };
}
