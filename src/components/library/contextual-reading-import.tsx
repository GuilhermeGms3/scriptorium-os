import { useId, useState } from "react";
import { Button } from "../ui/button";
import {
  ContextualReadingPackageSchema,
  type ContextualReadingPackage,
} from "../../lib/domain/contextual-reading";

export function ContextualReadingImport() {
  const id = useId();
  const [batch, setBatch] = useState<ContextualReadingPackage>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <details className="border border-border p-3 text-sm">
      <summary className="cursor-pointer">Incorporar lote de leitura contextual</summary>
      <p className="my-3 text-xs text-muted-foreground">
        Valida fonte, página e evidência antes de incorporar ao leitor e ao Rastro. Não aceita nem
        substitui revisões humanas. Dados permanecem privados neste navegador. Execute com outros
        processamentos pausados.
      </p>
      <label htmlFor={id} className="block text-xs">
        Pacote privado de análise (JSON, até 4 MiB)
      </label>
      <input
        id={id}
        type="file"
        accept="application/json,.json"
        disabled={busy}
        className="my-2 max-w-full text-xs"
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          setBatch(undefined);
          setMessage("");
          setError("");
          if (!file) return;
          try {
            if (file.size > 4 * 1024 * 1024) throw new Error("Lote excede 4 MiB.");
            setBatch(
              ContextualReadingPackageSchema.parse(JSON.parse(await file.text()) as unknown),
            );
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
          }
        }}
      />
      {batch && (
        <div className="space-y-2">
          <p>
            {batch.notes.length} notas · {batch.analyst}
          </p>
          <p className="text-xs text-muted-foreground">{batch.coverage}</p>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              setMessage("");
              try {
                const { ContextualReadingService } =
                  await import("../../lib/application/contextual-reading-service");
                const result = await ContextualReadingService.importJson(JSON.stringify(batch));
                setMessage(
                  `${result.imported} notas incorporadas; ${result.reused} já existentes. Auditoria humana pendente.`,
                );
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : String(cause));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Validando e incorporando…" : "Incorporar notas ao workspace"}
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-3">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 break-words text-destructive">
          {error}
        </p>
      )}
    </details>
  );
}
