import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { EntityType } from "../lib/domain/knowledge";
import {
  ENTITY_TYPE_LABELS,
  KnowledgeRepository,
} from "../lib/repositories/knowledge-repository";
import { useWorkbench } from "../lib/workbench/workbench-context";
import { EntityChip, EntityTree, EvidenceTag } from "../components/knowledge/knowledge-entity";
import { KnowledgeBridge } from "../components/knowledge/knowledge-bridge";

interface KnowledgeSearch {
  entity?: string | undefined;
}

export const Route = createFileRoute("/knowledge")({
  validateSearch: (search: Record<string, unknown>): KnowledgeSearch => ({
    entity: typeof search["entity"] === "string" ? search["entity"] : undefined,
  }),
  head: () => {
    const title = "Knowledge Graph — Scriptorium";
    const description =
      "Explore people, places, events, passages, concepts and words as a typed knowledge graph with evidence-classified relations and Knowledge Bridges.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: KnowledgePage,
});

const TYPE_ORDER: EntityType[] = [
  "person",
  "place",
  "event",
  "passage",
  "work",
  "concept",
  "word",
  "manuscript",
  "historical-source",
];

function KnowledgePage() {
  const { entity: entityId } = Route.useSearch();
  const navigate = useNavigate({ from: "/knowledge" });
  const { setPassageContext } = useWorkbench();
  useEffect(() => setPassageContext(null), [setPassageContext]);

  const entities = KnowledgeRepository.listEntities();
  const selected = KnowledgeRepository.getEntity(entityId ?? "") ?? entities[0]!;
  const claims = KnowledgeRepository.listClaims();

  const select = (id: string) => navigate({ search: { entity: id } });

  return (
    <div className="flex h-full min-w-0">
      {/* Entity index */}
      <div className="hidden w-56 shrink-0 overflow-y-auto border-r border-border py-2 md:block">
        {TYPE_ORDER.map((type) => {
          const group = entities.filter((e) => e.type === type);
          if (group.length === 0) return null;
          return (
            <div key={type} className="mb-2 px-1.5">
              <p className="meta-label px-1.5 pb-0.5">{ENTITY_TYPE_LABELS[type]}</p>
              {group.map((e) => (
                <EntityChip
                  key={e.id}
                  entity={e}
                  active={e.id === selected.id}
                  onClick={() => select(e.id)}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <header className="border-b border-border pb-3">
          <p className="meta-label">Knowledge</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">Graph explorer</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            A small demo graph. Entities are typed and relations carry a description, evidence
            classification and confidence — the shape a real graph engine must honour.
          </p>
        </header>

        {/* Mobile entity picker */}
        <label className="mt-4 block md:hidden">
          <span className="meta-label">Entity</span>
          <select
            value={selected.id}
            onChange={(e) => select(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {ENTITY_TYPE_LABELS[e.type]}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <EntityTree entity={selected} onSelect={select} />

            <section className="mt-6">
              <h2 className="meta-label">Claims referencing this graph</h2>
              <ul className="mt-2 space-y-2">
                {claims.map((c) => (
                  <li key={c.id} className="rounded-md border border-border bg-muted/30 p-2.5">
                    <p className="text-[13px]">{c.proposition}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                      <EvidenceTag kind={c.classification} />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {c.sourceIds.length} source(s)
                        {typeof c.confidence === "number" && ` · conf ${c.confidence.toFixed(2)}`}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </section>

          <aside>
            <KnowledgeBridge onSelect={select} />
          </aside>
        </div>
      </div>
    </div>
  );
}
