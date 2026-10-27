import { useCallback, useEffect, useRef } from "react";
import { printJobs, printNow, type PrintJob } from "./print-jobs";

/**
 * Lets the screen print a clean document, from its button or from Ctrl+P. `job` is read only at
 * print time, so it always prints what the screen shows then; null while there is nothing to print.
 */
export function usePrintJob(job: PrintJob | null): () => void {
  const latest = useRef(job);
  useEffect(() => {
    latest.current = job;
  });
  const available = job !== null;
  useEffect(() => {
    if (!available) return;
    return printJobs.register(() => latest.current);
  }, [available]);
  return useCallback(() => printNow(), []);
}
