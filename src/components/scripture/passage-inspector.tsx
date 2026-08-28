/** Passage inspector backed by the PassageKnowledgeBundle. */
import * as Tabs from "@radix-ui/react-tabs";
import { Link } from "@tanstack/react-router";
import type { TextAnchor } from "../../lib/domain/knowledge";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { SourceReferenceCard } from "../common/source-reference";
import {
  bookLabel,
  formatNumber,
  passageLabel,
  reviewStatusLabel,
  statusLabel,
  t,
} from "../../lib/i18n";

const TABS = [
  { id: "overview", label: t("scripture.tab.overview") },
  { id: "cross-references", label: t("scripture.tab.crossReferences") },
  { id: "language", label: t("scripture.tab.language") },
  { id: "history", label: t("scripture.tab.history") },
  { id: "literature", label: t("scripture.tab.literature") },
  { id: "notes", label: t("scripture.tab.notes") },
  { id: "sources", label: t("scripture.tab.sources") },
] as const;

function passageAnchor(anchor: TextAnchor): Extract<TextAnchor, { type: "passage" }> | null {
  return anchor.type === "passage" ? anchor : null;
}

export function PassageInspector() {
  const { passageContext } = useWorkbench();
  const bundle = passageContext
    ? ScriptureKnowledgeEngine.getPassageKnowledgeBundle(passageContext.ref)
    : null;
  const label = passageContext ? passageLabel(passageContext.ref) : t("shell.noPassage");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="meta-label">{t("scripture.inspector.passage")}</p>
        <p className="mt-1 font-serif text-lg font-semibold">{label}</p>
        {bundle?.provenance.isDemo && (
          <p className="mt-1 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
            {t("scripture.bundleDemo")}
          </p>
        )}
      </div>

      <Tabs.Root defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <Tabs.List
          className="flex gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5"
          aria-label={t("scripture.inspector.sections")}
        >
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="shrink-0 rounded px-2 py-1 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-foreground"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <Tabs.Content value="overview" className="space-y-4">
            <section>
              <h3 className="meta-label">{t("scripture.analysis")}</h3>
              <p className="mt-1 text-sm text-muted-foreground italic">
                {bundle?.analyses.status === "available"
                  ? t("scripture.analysisCount", {
                      count: formatNumber(bundle.analyses.data.length),
                    })
                  : bundle
                    ? statusLabel(bundle.analyses.status)
                    : t("scripture.openPassageBundle")}
              </p>
            </section>
            <section>
              <h3 className="meta-label">{t("scripture.keyTerms")}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {bundle?.lemmas.status === "available" ? (
                  bundle.lemmas.data.map((lemma) => {
                    const entity =
                      bundle.entities.status === "available"
                        ? bundle.entities.data.find((item) => item.originalForm === lemma.lemma)
                        : undefined;
                    return entity ? (
                      <Link
                        key={lemma.id}
                        to="/knowledge"
                        search={{ entity: entity.id }}
                        className="original-text rounded border border-border bg-muted/50 px-2 py-0.5 text-sm hover:bg-accent"
                      >
                        {lemma.lemma}
                      </Link>
                    ) : (
                      <span
                        key={lemma.id}
                        className="original-text rounded border border-border px-2 py-0.5 text-sm"
                      >
                        {lemma.lemma}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    {bundle ? statusLabel(bundle.lemmas.status) : t("scripture.noPassageSelected")}
                  </span>
                )}
              </div>
            </section>
          </Tabs.Content>

          <Tabs.Content value="cross-references">
            {bundle?.crossReferences.status === "available" ? (
              <ul className="space-y-2 text-sm">
                {bundle.crossReferences.data.map((relation) => {
                  const candidates = [
                    passageAnchor(relation.from),
                    passageAnchor(relation.to),
                  ].filter(
                    (anchor): anchor is Extract<TextAnchor, { type: "passage" }> => anchor !== null,
                  );
                  const target =
                    candidates.find((anchor) => anchor.ref.bookId !== passageContext?.ref.bookId) ??
                    candidates[0];
                  if (!target) return null;
                  return (
                    <li key={relation.id} className="border-l border-border pl-2.5">
                      <Link
                        to="/scripture/$book/$chapter"
                        params={{ book: target.ref.bookId, chapter: String(target.ref.chapter) }}
                        className="font-mono text-xs underline-offset-2 hover:underline"
                      >
                        {passageLabel(target.ref)}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {relation.description ?? relation.relation.value}
                      </p>
                      <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">
                        {relation.sourceFragmentIds.length
                          ? reviewStatusLabel(relation.reviewStatus)
                          : t("knowledge.noSource")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {bundle
                  ? statusLabel(bundle.crossReferences.status)
                  : t("scripture.noPassageSelected")}
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="language">
            <p className="text-sm text-muted-foreground italic">
              {bundle?.originals.status === "available"
                ? t("scripture.originalCount", {
                    count: formatNumber(bundle.originals.data.length),
                  })
                : bundle
                  ? statusLabel(bundle.originals.status)
                  : t("scripture.noPassageSelected")}
            </p>
          </Tabs.Content>

          <Tabs.Content value="history">
            <p className="text-sm text-muted-foreground italic">
              {bundle?.analyses.status === "available"
                ? t("scripture.historyAvailable")
                : bundle
                  ? statusLabel(bundle.analyses.status)
                  : t("scripture.noPassageSelected")}
            </p>
          </Tabs.Content>

          <Tabs.Content value="literature">
            <p className="text-sm text-muted-foreground italic">
              {bundle && bundle.sources.resources.length > 0
                ? t("scripture.literatureCount", {
                    count: formatNumber(bundle.sources.resources.length),
                  })
                : t("scripture.literatureAwaiting")}
            </p>
          </Tabs.Content>

          <Tabs.Content value="notes">
            {bundle && bundle.user.notes.length > 0 ? (
              <ul className="space-y-2">
                {bundle.user.notes.map((note) => (
                  <li key={note.id} className="rounded-md border border-border bg-muted/30 p-2.5">
                    <p className="text-sm font-medium">{note.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {note.body || "—"}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">
                      {t("provenance.user-provided")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t("scripture.noNotesForPassage")}
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="sources" className="space-y-3">
            {bundle?.sources.references.map((source) => {
              const fragment = bundle.sources.fragments.find((item) => item.sourceId === source.id);
              const resource = bundle.sources.resources.find(
                (item) => item.id === source.resourceId,
              );
              return (
                <SourceReferenceCard
                  key={source.id}
                  source={source}
                  fragment={fragment}
                  resource={resource}
                />
              );
            })}
            {bundle && bundle.sources.references.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                {t("scripture.noSourceReferences")}
              </p>
            )}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
