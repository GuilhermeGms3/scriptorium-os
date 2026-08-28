/** Knowledge Bridge rendered from Knowledge Core relations, not a parallel chain fixture. */
import { ArrowDown } from "lucide-react";
import type { TextAnchor } from "../../lib/domain/knowledge";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { KnowledgeRepository } from "../../lib/repositories/knowledge-repository";
import { ScriptureRepository } from "../../lib/repositories/scripture-repository";
import { EvidenceTag } from "./knowledge-entity";
import { bookLabel, relationLabel, reviewStatusLabel, t } from "../../lib/i18n";

function anchorLabel(anchor: TextAnchor): string {
  if (anchor.type === "entity")
    return KnowledgeRepository.getEntity(anchor.entityId)?.name ?? anchor.entityId;
  if (anchor.type === "lemma") return anchor.lemmaId.split(":").slice(1).join(":");
  if (anchor.type === "passage") {
    const bookData = ScriptureRepository.getBook(anchor.ref.bookId);
    const book = bookLabel(anchor.ref.bookId, bookData?.name);
    return `${book} ${anchor.ref.chapter}${anchor.ref.verseStart ? `:${anchor.ref.verseStart}` : ""}`;
  }
  if (anchor.type === "token") return anchor.tokenId;
  if (anchor.type === "text-unit") return anchor.textUnitId;
  return anchor.workId;
}

export function KnowledgeBridge({ onSelect }: { onSelect?: (id: string) => void }) {
  const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle({
    bookId: "john",
    chapter: 1,
    verseStart: 1,
    verseEnd: 5,
  });
  const relations = bundle?.relations.status === "available" ? bundle.relations.data : [];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="meta-label">{t("knowledge.bridge")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("knowledge.bridgeDescription")}</p>

      <ol className="mt-3.5 space-y-2">
        {relations.map((relation) => (
          <li
            key={relation.id}
            className="rounded-md border border-border bg-background px-2.5 py-2"
          >
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <AnchorButton anchor={relation.from} onSelect={onSelect} />
              <ArrowDown className="size-3 -rotate-90 text-muted-foreground" />
              <span className="font-mono text-[9px] uppercase text-muted-foreground">
                {relationLabel(relation.relation.value)}
              </span>
              <ArrowDown className="size-3 -rotate-90 text-muted-foreground" />
              <AnchorButton anchor={relation.to} onSelect={onSelect} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {relation.evidence.map((evidence) => (
                <EvidenceTag key={`${relation.id}:${evidence.kind}`} kind={evidence.kind} />
              ))}
              <span className="font-mono text-[9px] uppercase text-muted-foreground">
                {relation.sourceFragmentIds.length
                  ? reviewStatusLabel(relation.reviewStatus)
                  : t("knowledge.noSource")}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
        {t("knowledge.bridgeDisclaimer")}
      </p>
    </div>
  );
}

function AnchorButton({
  anchor,
  onSelect,
}: {
  anchor: TextAnchor;
  onSelect?: ((id: string) => void) | undefined;
}) {
  if (anchor.type === "entity") {
    return (
      <button
        onClick={() => onSelect?.(anchor.entityId)}
        className="underline-offset-2 hover:underline"
      >
        {anchorLabel(anchor)}
      </button>
    );
  }
  return (
    <span className={anchor.type === "lemma" ? "original-text text-base" : ""}>
      {anchorLabel(anchor)}
    </span>
  );
}
