/**
 * StatusBar — contextual status: active passage, editions, data locality.
 */

import { AlertTriangle, Database, Wifi } from "lucide-react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { t } from "../../lib/i18n";

export function StatusBar() {
  const { passageContext, wordSelection, workspacePersistence } = useWorkbench();

  return (
    <footer className="hidden h-6 shrink-0 items-center gap-4 border-t border-border bg-muted/40 px-3 font-mono text-[11px] text-muted-foreground md:flex">
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        {passageContext?.label ?? t("shell.noPassage")}
      </span>
      {wordSelection && (
        <span>
          {t("shell.selected")}:{" "}
          <span className="original-text text-foreground">
            {wordSelection.token.lemma ?? wordSelection.token.surface}
          </span>{" "}
          ·{" "}
          {wordSelection.token.morphology?.code ??
            wordSelection.token.morphology?.partOfSpeech ??
            t("scripture.notSupplied")}
        </span>
      )}
      <span className="flex-1" />
      {workspacePersistence === "memory" && (
        <span
          className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400"
          role="status"
        >
          <AlertTriangle className="size-3" /> Armazenamento temporário: notas e estudos podem ser
          perdidos ao fechar.
        </span>
      )}
      <span className="hidden items-center gap-1.5 lg:flex">
        <Database className="size-3" /> {t("shell.localWorkspace")}
      </span>
      <span className="hidden items-center gap-1.5 lg:flex">
        <Wifi className="size-3" /> {t("shell.offlineDemo")}
      </span>
    </footer>
  );
}
