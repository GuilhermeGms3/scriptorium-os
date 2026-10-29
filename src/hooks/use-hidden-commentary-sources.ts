import { useCallback, useEffect, useState } from "react";

const HIDDEN_SOURCES_KEY = "scriptorium.commentary-hidden-sources.v1";

function readHidden(): Set<string> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(HIDDEN_SOURCES_KEY) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

/**
 * The sources the reader switched off, remembered across chapters and visits. Hiding (rather than
 * choosing) means a book added later shows up on its own.
 */
export function useHiddenCommentarySources(): [
  ReadonlySet<string>,
  (next: ReadonlySet<string>) => void,
] {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => setHidden(readHidden()), []);
  const update = useCallback((next: ReadonlySet<string>) => {
    setHidden(next);
    try {
      window.localStorage.setItem(HIDDEN_SOURCES_KEY, JSON.stringify([...next]));
    } catch {
      // Not remembered in this browser; the choice still holds for this visit.
    }
  }, []);
  return [hidden, update];
}
