import type { ReactNode } from "react";

/** What a screen prints: a document made for paper, never a picture of the screen and its menus. */
export interface PrintJob {
  /** Suggested name of the PDF file, e.g. "Estudo — A graça em Romanos". */
  title: string;
  render: () => ReactNode;
}

interface Entry {
  id: number;
  read: () => PrintJob | null;
}

/**
 * The screens that can print right now. The one registered last wins, so a screen opened over
 * another prints itself. Kept outside React: registration happens in effects, never on the server.
 */
export function createPrintJobs() {
  let entries: Entry[] = [];
  let nextId = 1;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    register(read: () => PrintJob | null): () => void {
      const entry = { id: nextId++, read };
      entries = [...entries, entry];
      notify();
      return () => {
        entries = entries.filter((candidate) => candidate !== entry);
        notify();
      };
    },
    current(): { id: number; job: PrintJob } | undefined {
      for (let index = entries.length - 1; index >= 0; index--) {
        const entry = entries[index]!;
        const job = entry.read();
        if (job) return { id: entry.id, job };
      }
      return undefined;
    },
    has(id: number): boolean {
      return entries.some((entry) => entry.id === id);
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const printJobs = createPrintJobs();

/** Set by the mounted PrintHost: renders the current screen's document before the page prints. */
let preparePrint: (() => void) | null = null;

export function setPrintPreparer(prepare: (() => void) | null): void {
  preparePrint = prepare;
}

/** Prints the screen's document: what the "Imprimir ou salvar PDF" buttons call. */
export function printNow(): void {
  preparePrint?.();
  window.print();
}
