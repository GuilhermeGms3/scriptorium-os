/**
 * KnowledgeBridge — a visual chain explaining HOW two entities connect.
 * Each hop carries a relation label and an evidence classification.
 */

import { ArrowDown } from "lucide-react";
import { KnowledgeRepository } from "../../lib/repositories/knowledge-repository";
import { ENTITY_ICONS, EvidenceTag } from "./knowledge-entity";

export function KnowledgeBridge({ onSelect }: { onSelect?: (id: string) => void }) {
  const chain = KnowledgeRepository.demoBridgeChain();

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="meta-label">Knowledge Bridge · demo</p>
      <p className="mt-1 text-xs text-muted-foreground">
        How John 1:1 connects to Genesis — every hop is typed and classified by evidence, so the
        path can be audited rather than trusted blindly.
      </p>

      <ol className="mt-3.5">
        {chain.map((hop) => {
          const entity = KnowledgeRepository.getEntity(hop.entityId);
          if (!entity) return null;
          const Icon = ENTITY_ICONS[entity.type];
          return (
            <li key={hop.entityId}>
              <button
                onClick={() => onSelect?.(entity.id)}
                className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-accent"
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">
                  {entity.originalForm ? (
                    <span className="original-text text-base">{entity.originalForm}</span>
                  ) : (
                    entity.name
                  )}
                </span>
              </button>
              {hop.edge && (
                <div className="flex items-center gap-2 py-1 pl-3">
                  <ArrowDown className="size-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{hop.edge.relation}</span>
                  <EvidenceTag kind={hop.edge.evidenceType} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
        Demo bridge. Real bridges will require a source for each edge; unsourced links stay marked
        as hypotheses.
      </p>
    </div>
  );
}
