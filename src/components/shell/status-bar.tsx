/**
 * StatusBar — contextual status: active passage, editions, data locality.
 */

import { Database, Wifi } from "lucide-react";
import { useWorkbench } from "../../lib/workbench/workbench-context";

export function StatusBar() {
  const { passageContext, wordSelection } = useWorkbench();

  return (
    <footer className="hidden h-6 shrink-0 items-center gap-4 border-t border-border bg-muted/40 px-3 font-mono text-[11px] text-muted-foreground md:flex">
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        {passageContext ?? "No passage open"}
      </span>
      {wordSelection && (
        <span>
          selected:{" "}
          <span className="original-text text-foreground">{wordSelection.token.lemma}</span>{" "}
          · {wordSelection.token.morphology.code ?? wordSelection.token.morphology.partOfSpeech}
        </span>
      )}
      <span className="flex-1" />
      <span className="hidden items-center gap-1.5 lg:flex">
        <Database className="size-3" /> Local workspace
      </span>
      <span className="hidden items-center gap-1.5 lg:flex">
        <Wifi className="size-3" /> Offline-ready (demo data)
      </span>
    </footer>
  );
}
