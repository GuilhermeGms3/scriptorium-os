import { useEffect, useRef } from "react";

/** GSAP is deferred to this study surface; content remains usable without animation. */
export function useStudyReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let revert = () => {};
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void import("gsap")
          .then(({ gsap }) => {
            if (cancelled) return;
            const context = gsap.context(() => {
              gsap.fromTo(
                "[data-study-path]",
                { strokeDashoffset: 1 },
                { strokeDashoffset: 0, duration: 1.1, stagger: 0.04, ease: "power2.out" },
              );
              gsap.fromTo(
                "[data-study-enter]",
                { opacity: 0 },
                { opacity: 1, duration: 0.6, stagger: 0.06, ease: "power2.out" },
              );
            }, element);
            revert = () => context.revert();
          })
          .catch(() => {
            /* The diagram and course remain visible if optional motion cannot load. */
          });
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      revert();
    };
  }, []);
  return ref;
}
