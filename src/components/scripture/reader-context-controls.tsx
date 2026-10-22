import type { ReaderContextFilter } from "../../lib/domain/reader-context-filter";
import { Button } from "../ui/button";

/** Advanced reading choices augment the source chips; they do not replace them. */
export function ReaderContextControls({
  value,
  traditions,
  onChange,
}: {
  value: ReaderContextFilter;
  traditions: readonly string[];
  onChange: (value: ReaderContextFilter) => void;
}) {
  const active = Boolean(value.tradition || value.kind !== "all");
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer pointer-coarse:py-3">
        Contexto de leitura{active ? " · filtro ativo" : " · tradição e tipo"}
      </summary>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label>
          Tradição declarada{" "}
          <select
            className="max-w-full rounded border border-input bg-background p-1"
            value={value.tradition}
            onChange={(event) => onChange({ ...value, tradition: event.target.value })}
          >
            <option value="">Todas, incluindo não classificadas</option>
            {traditions.map((tradition) => (
              <option key={tradition}>{tradition}</option>
            ))}
          </select>
        </label>
        <label>
          Tipo de ligação{" "}
          <select
            className="max-w-full rounded border border-input bg-background p-1"
            value={value.kind}
            onChange={(event) =>
              onChange({ ...value, kind: event.target.value as ReaderContextFilter["kind"] })
            }
          >
            <option value="all">Comentários e documentos confessionais</option>
            <option value="commentary">Contextos e comentários</option>
            <option value="confessional">Citações confessionais (não exegese direta)</option>
          </select>
        </label>
        {active && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ tradition: "", kind: "all" })}
          >
            Limpar contexto
          </Button>
        )}
        <p className="w-full text-xs text-muted-foreground">
          Área filtra exegese, hermenêutica e história. Tradição usa apenas classificação declarada
          na fonte; não converte o texto para outra posição.
        </p>
      </div>
    </details>
  );
}
