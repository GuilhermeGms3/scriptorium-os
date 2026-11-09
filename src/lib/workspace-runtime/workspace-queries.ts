import type { Query, QueryClient } from "@tanstack/react-query";

/** Every read from the local workspace lives under this key. */
export const WORKSPACE_QUERY_ROOT = "workspace";
export const KNOWLEDGE_CHANGED_EVENT = "scriptorium:knowledge-changed";
/** Processing emits a change every few dozen units; refresh at most this often. */
export const KNOWLEDGE_REFRESH_INTERVAL_MS = 250;

export function workspaceQueryKey(key: readonly unknown[]): unknown[] {
  return [WORKSPACE_QUERY_ROOT, ...key];
}

function refreshesOnKnowledgeChange(query: Query): boolean {
  return query.meta?.["refreshOnKnowledgeChange"] === true;
}

/**
 * Refreshes the reads that asked for it whenever the private library changes. A read already in
 * flight is never started twice (the workspace runs queries one at a time, so piling them up only
 * delays the screen); it is refreshed again as soon as it finishes, so no change is missed.
 */
export function connectKnowledgeRefresh(
  client: QueryClient,
  target: EventTarget,
  intervalMs = KNOWLEDGE_REFRESH_INTERVAL_MS,
): () => void {
  const cache = client.getQueryCache();
  const waiting = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const invalidate = (query: Query) =>
    void client.invalidateQueries({ queryKey: query.queryKey, exact: true });

  const refresh = () => {
    timer = undefined;
    for (const query of cache.findAll({ queryKey: [WORKSPACE_QUERY_ROOT] })) {
      if (!refreshesOnKnowledgeChange(query)) continue;
      if (query.state.fetchStatus === "fetching") waiting.add(query.queryHash);
      else invalidate(query);
    }
  };
  const schedule = () => {
    timer ??= setTimeout(refresh, intervalMs);
  };
  const unsubscribe = cache.subscribe((event) => {
    if (event.type !== "updated" || !waiting.has(event.query.queryHash)) return;
    if (event.query.state.fetchStatus !== "idle") return;
    waiting.delete(event.query.queryHash);
    invalidate(event.query);
  });

  target.addEventListener(KNOWLEDGE_CHANGED_EVENT, schedule);
  return () => {
    target.removeEventListener(KNOWLEDGE_CHANGED_EVENT, schedule);
    unsubscribe();
    if (timer !== undefined) clearTimeout(timer);
  };
}
