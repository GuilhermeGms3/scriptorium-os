import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import {
  connectKnowledgeRefresh,
  KNOWLEDGE_CHANGED_EVENT,
  workspaceQueryKey,
} from "./workspace-queries";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const target = new EventTarget();
  const disconnect = connectKnowledgeRefresh(client, target, 5);
  cleanups.push(() => client.clear(), disconnect);
  const changed = () => target.dispatchEvent(new Event(KNOWLEDGE_CHANGED_EVENT));
  const watch = <T>(key: string, load: () => Promise<T>, live = true) => {
    const observer = new QueryObserver(client, {
      queryKey: workspaceQueryKey([key]),
      queryFn: load,
      meta: { refreshOnKnowledgeChange: live },
    });
    cleanups.push(observer.subscribe(() => undefined));
  };
  return { client, changed, watch, disconnect };
}

describe("refreshing workspace reads when the library changes", () => {
  it("refreshes once for a burst of changes, and only the reads that asked for it", async () => {
    const { changed, watch } = setup();
    let live = 0;
    let fixed = 0;
    watch("live", async () => ++live);
    watch("fixed", async () => ++fixed, false);
    await sleep(1);
    for (let index = 0; index < 10; index += 1) changed();
    await sleep(30);
    expect(live).toBe(2);
    expect(fixed).toBe(1);
  });

  it("never starts a read twice, and refreshes it as soon as it finishes", async () => {
    const { client, changed, watch } = setup();
    const pending: Array<(value: number) => void> = [];
    watch("slow", () => new Promise<number>((resolve) => pending.push(resolve)));
    await sleep(1);
    expect(pending).toHaveLength(1);
    changed();
    await sleep(20);
    expect(pending).toHaveLength(1);
    pending[0]?.(1);
    await sleep(20);
    expect(pending).toHaveLength(2);
    pending[1]?.(2);
    await sleep(5);
    expect(client.getQueryData(workspaceQueryKey(["slow"]))).toBe(2);
  });

  it("stops listening once disconnected", async () => {
    const { changed, watch, disconnect } = setup();
    let calls = 0;
    watch("live", async () => ++calls);
    await sleep(1);
    disconnect();
    changed();
    await sleep(20);
    expect(calls).toBe(1);
  });
});
