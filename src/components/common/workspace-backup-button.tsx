import { AlertTriangle, Download } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResearchWorkspaceService } from "../../lib/application/research-workspace-service";

function saveFile(content: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function includesPrivateTranslations(content: string): boolean {
  const parsed = JSON.parse(content) as { manifest?: { privateTranslationsIncluded?: unknown } };
  return parsed.manifest?.privateTranslationsIncluded === true;
}

/**
 * Downloads the workspace backup. When the backup carries reviewed translations of private pages,
 * the researcher is warned before the file is saved.
 */
export function WorkspaceBackupButton({
  fileName,
  disabled,
  className,
  onDownloaded,
  onError,
}: {
  fileName: string;
  disabled?: boolean;
  className?: string;
  onDownloaded: () => void;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState<string>();
  const [preparing, setPreparing] = useState(false);

  const start = async () => {
    setPreparing(true);
    try {
      const content = await ResearchWorkspaceService.exportJson();
      if (includesPrivateTranslations(content)) setPending(content);
      else {
        saveFile(content, fileName);
        onDownloaded();
      }
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPreparing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || preparing}
        onClick={() => void start()}
        className={className}
      >
        <Download className="size-3.5" /> {preparing ? "Preparando backup…" : "Baixar backup"}
      </button>
      <AlertDialog
        open={pending !== undefined}
        onOpenChange={(open) => {
          if (!open) setPending(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-700 dark:text-amber-400" />O backup inclui
              traduções dos seus livros privados
            </AlertDialogTitle>
            <AlertDialogDescription>
              O texto das páginas e as citações dos livros não entram no arquivo, mas as traduções
              revisadas de trechos privados entram, como você as salvou. Guarde o arquivo em um
              local seguro e não o compartilhe se esses livros não puderem ser redistribuídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending !== undefined) saveFile(pending, fileName);
                setPending(undefined);
                onDownloaded();
              }}
            >
              Baixar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
