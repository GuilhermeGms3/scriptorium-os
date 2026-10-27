import type { Edition } from "../../lib/domain/scripture";

export const MAX_COMPARED = 4;
const STORAGE_KEY = "scriptorium.parallel-editions.v1";
/** First comparison offered: a modern Portuguese paraphrase and the classic English text. */
const DEFAULT_COMPANIONS = ["nova-biblia-viva", "king-james-version"];

/**
 * Which editions to compare: the reader's last choice when it still applies, otherwise the one
 * being read and the default companions. Ten columns side by side could not be read.
 */
export function initialComparison(
  editions: readonly Edition[],
  currentId: string,
  remembered: readonly string[] | null,
): string[] {
  const available = new Set(editions.map((edition) => edition.id));
  const kept = (remembered ?? []).filter((id) => available.has(id)).slice(0, MAX_COMPARED);
  if (kept.length) return kept;
  const companions = editions
    .filter(
      (edition) => edition.id !== currentId && DEFAULT_COMPANIONS.includes(edition.corpusId ?? ""),
    )
    .map((edition) => edition.id);
  const chosen = [currentId, ...companions].filter((id) => available.has(id));
  // Fewer editions than the defaults: the first ones listed.
  for (const edition of editions)
    if (chosen.length < 3 && !chosen.includes(edition.id)) chosen.push(edition.id);
  return chosen.slice(0, MAX_COMPARED);
}

export function rememberedComparison(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : null;
  } catch {
    return null;
  }
}

/** Remembered for the next chapter; a browser that keeps nothing still compares now. */
export function rememberComparison(ids: readonly string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Not remembered in this browser; it still applies now.
  }
}
