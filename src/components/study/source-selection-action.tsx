import { useState } from "react";
import { Button } from "../ui/button";
import { captureSourceSelection } from "../../lib/domain/source-selection";
import type { StudySource } from "../../lib/domain/study-notebook";
import { useSourceReader } from "./source-reader-context";

export function SourceSelectionAction({
  source,
  elementId,
}: {
  source: StudySource;
  elementId: string;
}) {
  const open = useSourceReader();
  const [status, setStatus] = useState("");
  return (
    <div className="my-4 flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          const root = document.getElementById(elementId);
          const selection = root ? captureSourceSelection(root) : null;
          if (!selection) {
            setStatus(
              "Selecione um trecho do texto original antes de anotar (até 20 mil caracteres).",
            );
            return;
          }
          setStatus("");
          open({ source: source.kind === "bibliographic" ? source : { ...source, selection } });
        }}
      >
        Anotar trecho selecionado
      </Button>
      <Button variant="ghost" onClick={() => open({ source })}>
        Abrir caderno de leitura
      </Button>
      {status && (
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      )}
    </div>
  );
}
