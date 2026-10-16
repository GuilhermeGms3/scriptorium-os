import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  connectKnowledgeRefresh,
  workspaceQueryKey,
} from "../lib/workspace-runtime/workspace-queries";

export interface WorkspaceQueryOptions {
  enabled?: boolean;
  /** Reload when the private library changes: imports, processing, reviews. */
  refreshOnKnowledgeChange?: boolean;
  /** While a new key loads, keep showing the previous answer instead of an empty state. */
  keepPrevious?: boolean;
}

/**
 * Reads from the local workspace. Each key keeps its own answer, so a slow earlier request never
 * overwrites a newer one; failures reach the screen instead of leaving it loading forever; nothing
 * retries silently (the database is local, a second attempt would fail the same way).
 */
export function useWorkspaceQuery<T>(
  key: readonly unknown[],
  load: () => Promise<T>,
  {
    enabled = true,
    refreshOnKnowledgeChange = false,
    keepPrevious = false,
  }: WorkspaceQueryOptions = {},
): UseQueryResult<T> {
  return useQuery({
    queryKey: workspaceQueryKey(key),
    // Boxed: React Query refuses `undefined`, which several repositories return for "not found".
    queryFn: async () => ({ value: await load() }),
    select: (box: { value: T }) => box.value,
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { refreshOnKnowledgeChange },
    ...(keepPrevious ? { placeholderData: keepPreviousData } : {}),
  });
}

/** Mounted once, under the QueryClientProvider. */
export function WorkspaceQueryRefresh(): null {
  const client = useQueryClient();
  useEffect(() => connectKnowledgeRefresh(client, window), [client]);
  return null;
}

/** The value, once it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
