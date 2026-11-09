import { useEffect, useRef } from "react";

/** Short local construction; cleanup also restores the final readable state. */
export function useStudyPointMotion(identity: string, position: number) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(position);
  useEffect(() => {
    const element = ref.current;
    const direction = position < previous.current ? -1 : 1;
    previous.current = position;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || preference.matches) return;
    const animation = element.animate(
      [
        { opacity: 0, transform: `translate(${direction * 28}px, 6px)` },
        { opacity: 1, transform: "translate(0, 0)" },
      ],
      { duration: 460, easing: "cubic-bezier(.22,.7,.25,1)" },
    );
    const children = Array.from(
      element.querySelectorAll(".course-section, .topic-lesson-text > p, .course-module-heading"),
    ).slice(0, 8);
    const sections = children.map((child, index) =>
      child.animate(
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 380, delay: 45 * index, fill: "backwards", easing: "ease-out" },
      ),
    );
    const stop = () => {
      animation.cancel();
      sections.forEach((section) => section.cancel());
    };
    const onPreference = () => {
      if (preference.matches) stop();
    };
    preference.addEventListener("change", onPreference);
    return () => {
      preference.removeEventListener("change", onPreference);
      stop();
    };
  }, [identity, position]);
  return ref;
}
