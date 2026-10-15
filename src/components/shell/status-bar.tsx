/**
 * StatusBar — contextual status: active passage, editions, data locality.
 */

import { AlertTriangle, Database, Globe, Wifi } from "lucide-react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { t } from "../../lib/i18n";
import { useCurrentOrigin } from "../../lib/workspace-runtime/use-secure-context";

export function StatusBar() {
  const { passageContext, wordSelection, workspacePersistence, workspaceError } = useWorkbench();
  const origin = useCurrentOrigin();

  return (
    <footer className="hidden h-6 shrink-0 items-center gap-4 border-t border-border bg-muted/40 px-3 text-xs text-muted-foreground md:flex">
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
      {workspacePersistence === "unavailable" && workspaceError && (
        <span
          className="flex min-w-0 items-center gap-1.5 text-amber-700 dark:text-amber-400"
          role="alert"
          title={workspaceError}
        >
          <AlertTriangle className="size-3 shrink-0" />
          <span className="truncate">{workspaceError}</span>
        </span>
      )}
      {origin && (
        <span
          className="flex items-center gap-1.5"
          title={
            workspacePersistence === "installation"
              ? "Acervo compartilhado pela instalação local, independente deste navegador."
              : "No modo navegador, livros e estudos pertencem a este endereço (protocolo, nome e porta)."
          }
        >
          <Globe className="size-3" aria-hidden="true" /> {origin}
        </span>
      )}
      <span className="hidden items-center gap-1.5 lg:flex">
        <Database className="size-3" />{" "}
        {workspacePersistence === "installation"
          ? "Acervo da instalação"
          : t("shell.localWorkspace")}
      </span>
      <span className="hidden items-center gap-1.5 lg:flex">
        <Wifi className="size-3" /> {t("shell.offlineDemo")}
      </span>
    </footer>
  );
}
