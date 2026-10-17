import { useSyncExternalStore } from "react";

/** Whether a CSS media query matches; false during server rendering. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Wide enough to read the text and keep the study panel open beside it. */
export const WIDE_READING_QUERY = "(min-width: 1280px)";
