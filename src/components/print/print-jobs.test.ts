import { describe, expect, it, vi } from "vitest";
import { createPrintJobs } from "./print-jobs";

const job = (title: string) => ({ title, render: () => title });

describe("o que cada tela imprime", () => {
  it("prints the screen registered last, skipping one with nothing to print", () => {
    const jobs = createPrintJobs();
    expect(jobs.current()).toBeUndefined();
    const closeStudy = jobs.register(() => job("Estudo"));
    let noteReady = false;
    const closeNote = jobs.register(() => (noteReady ? job("Nota") : null));
    expect(jobs.current()?.job.title).toBe("Estudo");
    noteReady = true;
    expect(jobs.current()?.job.title).toBe("Nota");
    closeNote();
    expect(jobs.current()?.job.title).toBe("Estudo");
    closeStudy();
    expect(jobs.current()).toBeUndefined();
  });

  it("tells the host when a screen leaves, so its document does not stay behind", () => {
    const jobs = createPrintJobs();
    const listener = vi.fn();
    const unsubscribe = jobs.subscribe(listener);
    const close = jobs.register(() => job("Capítulo"));
    const id = jobs.current()!.id;
    expect(jobs.has(id)).toBe(true);
    close();
    expect(jobs.has(id)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    jobs.register(() => job("Outro"));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
