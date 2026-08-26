/**
 * KnowledgeEntityCard / EntityTree — entity presentation for the graph.
 * Relations are rendered as typed, described edges, never bare links.
 */

import {
  BookText,
  Boxes,
  CalendarClock,
  FileStack,
  Landmark,
  MapPin,
  ScrollText,
  Type,
  User,
} from "lucide-react";
import type { EntityType, KnowledgeEntity } from "../../lib/domain/knowledge";
import {
  ENTITY_TYPE_LABELS,
  KnowledgeRepository,
} from "../../lib/repositories/knowledge-repository";
import { cn } from "../../lib/utils";

export const ENTITY_ICONS: Record<EntityType, typeof User> = {
  person: User,
  place: MapPin,
  event: CalendarClock,
  passage: BookText,
  work: ScrollText,
  concept: Boxes,
  word: Type,
  manuscript: FileStack,
  "historical-source": Landmark,
};

export function EntityChip({
  entity,
  active,
  onClick,
}: {
  entity: KnowledgeEntity;
  active?: boolean;
  onClick?: () => void;
}) {
  const Icon = ENTITY_ICONS[entity.type];
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate">
        {entity.originalForm ? (
          <span className="original-text">{entity.originalForm}</span>
        ) : (
          entity.name
        )}
      </span>
      <span className="shrink-0 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
        {ENTITY_TYPE_LABELS[entity.type]}
      </span>
    </button>
  );
}

/** Tree view: entity with its typed relations, as in the brief's ASCII sketch. */
export function EntityTree({
  entity,
  onSelect,
}: {
  entity: KnowledgeEntity;
  onSelect: (id: string) => void;
}) {
  const relations = KnowledgeRepository.relationsOf(entity.id);
  const Icon = ENTITY_ICONS[entity.type];

  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
        <h2 className="font-serif text-lg font-semibold">
          {entity.originalForm ? (
            <span className="original-text">{entity.originalForm}</span>
          ) : (
            entity.name
          )}
        </h2>
        <span className="rounded border border-border px-1.5 py-px font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
          {ENTITY_TYPE_LABELS[entity.type]}
        </span>
      </div>

      {entity.description && (
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{entity.description}</p>
      )}

      <ul className="mt-3 border-l border-border pl-0 font-mono text-[13px]">
        {relations.length === 0 && (
          <li className="pl-4 text-xs text-muted-foreground italic">No relations recorded.</li>
        )}
        {relations.map((rel, i) => {
          const otherId = rel.fromId === entity.id ? rel.toId : rel.fromId;
          const other = KnowledgeRepository.getEntity(otherId);
          if (!other) return null;
          const last = i === relations.length - 1;
          return (
            <li key={rel.id} className="relative pl-5">
              <span className="absolute left-0 top-2.5 h-px w-4 bg-border" aria-hidden />
              {last && <span className="absolute bottom-0 left-0 top-3 w-px bg-background" aria-hidden />}
              <div className="flex flex-wrap items-baseline gap-x-2 py-1">
                <button
                  onClick={() => onSelect(other.id)}
                  className="font-sans text-[13px] underline-offset-2 hover:underline"
                >
                  {other.originalForm ? (
                    <span className="original-text">{other.originalForm}</span>
                  ) : (
                    other.name
                  )}
                </button>
                <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
                  {rel.relation}
                </span>
                {rel.evidenceType && <EvidenceTag kind={rel.evidenceType} />}
                {typeof rel.confidence === "number" && (
                  <span className="text-[10px] text-muted-foreground">
                    conf {rel.confidence.toFixed(2)}
                  </span>
                )}
              </div>
              {rel.description && (
                <p className="pb-1 font-sans text-xs text-muted-foreground">{rel.description}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function EvidenceTag({ kind }: { kind: string }) {
  return (
    <span className="rounded-sm border border-border bg-muted/60 px-1 py-px font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
      {kind}
    </span>
  );
}
