import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  KnowledgeRepository,
  type KnowledgeSearchHit,
} from "../../lib/repositories/knowledge-repository";

export function EntityRelationPicker({
  allowedKinds,
  relationship,
  onRelationshipChange,
  onSelect,
}: {
  allowedKinds?: KnowledgeSearchHit["kind"][];
  relationship: "supports" | "challenges" | "qualifies";
  onRelationshipChange: (value: "supports" | "challenges" | "qualifies") => void;
  onSelect: (hit: KnowledgeSearchHit | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchHit[]>([]);
  const [selected, setSelected] = useState<KnowledgeSearchHit | null>(null);
  const allowedKindsKey = allowedKinds?.join("|") ?? "*";
  useEffect(() => {
    let active = true;
    const permittedKinds = allowedKindsKey === "*" ? null : allowedKindsKey.split("|");
    const timer = window.setTimeout(() => {
      if (!query.trim()) return setResults([]);
      void KnowledgeRepository.search(query, 12).then((hits) => {
        if (active)
          setResults(
            permittedKinds ? hits.filter((hit) => permittedKinds.includes(hit.kind)) : hits,
          );
      });
    }, 160);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, allowedKindsKey]);
  return (
    <fieldset className="space-y-2 rounded border border-border p-2">
      <legend className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Relacionar a…
      </legend>
      <label className="flex h-8 items-center gap-2 rounded border border-input bg-background px-2">
        <Search className="size-3 text-muted-foreground" />
        <span className="sr-only">Pesquisar entidade relacionada</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquise claims, teorias, argumentos…"
          className="w-full bg-transparent text-xs outline-none"
        />
      </label>
      {results.length > 0 && (
        <ul className="max-h-36 overflow-y-auto rounded border border-border bg-background p-1">
          {results.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(hit);
                  setQuery(hit.label);
                  setResults([]);
                  onSelect(hit);
                }}
                className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                <span className="block font-medium">{hit.label}</span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  {hit.kind.replaceAll("-", " ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <p className="text-[10px] text-muted-foreground">Selecionado: {selected.label}</p>
      )}
      <label className="block text-[10px] text-muted-foreground">
        Relação
        <select
          value={relationship}
          onChange={(event) => onRelationshipChange(event.target.value as typeof relationship)}
          className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs"
        >
          <option value="supports">apoia</option>
          <option value="challenges">contesta</option>
          <option value="qualifies">qualifica</option>
        </select>
      </label>
    </fieldset>
  );
}
