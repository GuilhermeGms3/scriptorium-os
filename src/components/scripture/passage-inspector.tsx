/** Passage inspector backed by the PassageKnowledgeBundle. */
import * as Tabs from "@radix-ui/react-tabs";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Argument } from "../../lib/domain/argument";
import type { TextAnchor } from "../../lib/domain/knowledge";
import type { PassageKnowledgeBundle } from "../../lib/domain/knowledge-bundle";
import { knowledgeLabel } from "../../lib/content/knowledge-presentation";
import type { ResearchQuestion } from "../../lib/domain/research";
import type { SemanticPassageLink } from "../../lib/domain/semantic-content";
import { passageRefsOverlap } from "../../lib/domain/scripture";
import { StudyRepository } from "../../lib/repositories/study-repository";
import { SemanticContentRepository } from "../../lib/repositories/semantic-content-repository";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { hasAvailableData } from "../../lib/domain/availability";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { SourceReferenceCard } from "../common/source-reference";
import {
  bookLabel,
  claimKindLabel,
  formatNumber,
  passageLabel,
  reviewStatusLabel,
  statusLabel,
  supportLevelLabel,
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
  { id: "research", label: "Pesquisa" },
] as const;

function passageAnchor(anchor: TextAnchor): Extract<TextAnchor, { type: "passage" }> | null {
  return anchor.type === "passage" ? anchor : null;
}

function primarySourceAnchor(anchor: TextAnchor):
  | (Extract<TextAnchor, { type: "canonical-text" }> & {
      anchor: Extract<TextAnchor, { type: "canonical-text" }>["anchor"] & { startUnitId: string };
    })
  | null {
  if (anchor.type !== "canonical-text" || !anchor.anchor.startUnitId) return null;
  return {
    ...anchor,
    anchor: { ...anchor.anchor, startUnitId: anchor.anchor.startUnitId },
  };
}

function ViewpointArguments({ label, items }: { label: string; items: Argument[] }) {
  return (
    <div className="mt-2">
      <p className="font-mono text-[9px] tracking-wider text-muted-foreground uppercase">{label}</p>
      {items.length ? (
        <ul className="mt-1 space-y-0.5">
          {items.map((argument) => (
            <li key={argument.id} className="text-xs">
              {knowledgeLabel(argument.id, argument.title ?? argument.id)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-0.5 text-xs text-muted-foreground italic">Nenhum argumento registrado.</p>
      )}
    </div>
  );
}

/** Claims grouped by the perspective a cited source attributes them to; never inferred. */
function PassageViewpoints({ bundle }: { bundle: PassageKnowledgeBundle | null }) {
  if (!bundle || !hasAvailableData(bundle.viewpoints)) {
    return (
      <p className="mt-1 text-sm text-muted-foreground italic">
        {bundle ? statusLabel(bundle.viewpoints.status) : t("scripture.noPassageSelected")}
      </p>
    );
  }
  return (
    <ul className="mt-2 space-y-2">
      {bundle.viewpoints.data.map((viewpoint) => (
        <li
          key={viewpoint.profile?.id ?? "unassigned"}
          className="rounded-md border border-border p-2.5"
        >
          <p className="text-sm font-medium">
            {viewpoint.profile
              ? knowledgeLabel(viewpoint.profile.id, viewpoint.profile.label)
              : "Sem perspectiva atribuída"}
          </p>
          {viewpoint.profile?.description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {viewpoint.profile.description}
            </p>
          )}
          <ul className="mt-2 space-y-1.5">
            {viewpoint.claims.map((claim) => (
              <li key={claim.id} className="border-l border-border pl-2.5">
                <p className="text-xs leading-relaxed">{claim.proposition}</p>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground uppercase">
                  {claimKindLabel(claim.kind)} · {supportLevelLabel(claim.supportLevel)}
                </p>
              </li>
            ))}
          </ul>
          <ViewpointArguments label="Argumentos a favor" items={viewpoint.supportingArguments} />
          <ViewpointArguments label="Argumentos contra" items={viewpoint.opposingArguments} />
        </li>
      ))}
    </ul>
  );
}

export function PassageInspector() {
  const { passageContext } = useWorkbench();
  const [researchQuestions, setResearchQuestions] = useState<ResearchQuestion[]>([]);
  const [semanticSources, setSemanticSources] = useState<SemanticPassageLink[]>([]);
  useEffect(() => {
    let active = true;
    if (!passageContext) {
      setResearchQuestions([]);
      return;
    }
    void StudyRepository.listResearchQuestions().then((questions) => {
      if (!active) return;
      setResearchQuestions(
        questions.filter((question) =>
          question.links.some(
            (link) =>
              link.targetKind === "passage" &&
              link.anchor?.kind === "passage" &&
              link.anchor.passage?.bookId !== undefined &&
              link.anchor.passage.chapter !== undefined &&
              passageRefsOverlap(
                {
                  workId: link.anchor.passage.workId,
                  bookId: link.anchor.passage.bookId,
                  chapter: link.anchor.passage.chapter,
                  ...(link.anchor.passage.verseStart !== undefined
                    ? { verseStart: link.anchor.passage.verseStart }
                    : {}),
                  ...(link.anchor.passage.verseEnd !== undefined
                    ? { verseEnd: link.anchor.passage.verseEnd }
                    : {}),
                  versificationSchemeId: link.anchor.passage.versificationSchemeId,
                },
                passageContext.ref,
              ),
          ),
        ),
      );
    });
    return () => {
      active = false;
    };
  }, [passageContext]);
  useEffect(() => {
    let active = true;
    if (!passageContext) {
      setSemanticSources([]);
      return;
    }
    void SemanticContentRepository.listLinksForPassage(passageContext.ref, {
      reviewStatus: "accepted",
      limit: 50,
    }).then(
      (links) => {
        if (active) setSemanticSources(links);
      },
      () => {
        if (active) setSemanticSources([]);
      },
    );
    return () => {
      active = false;
    };
  }, [passageContext]);
  const bundle = passageContext
    ? ScriptureKnowledgeEngine.getPassageKnowledgeBundle(passageContext.ref)
    : null;
  const label = passageContext ? passageLabel(passageContext.ref) : t("shell.noPassage");
  const historicalAnalyses =
    bundle && hasAvailableData(bundle.analyses)
      ? bundle.analyses.data.filter(
          (analysis) => analysis.lensId === "historical" || analysis.lensId === "reception-history",
        )
      : [];
  const primarySourceRelations =
    bundle && hasAvailableData(bundle.relations)
      ? bundle.relations.data.flatMap((relation) => {
          const source = primarySourceAnchor(relation.from) ?? primarySourceAnchor(relation.to);
          const isPassageRelation =
            relation.from.type === "passage" || relation.to.type === "passage";
          return source && isPassageRelation ? [{ relation, source }] : [];
        })
      : [];

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
                {bundle && hasAvailableData(bundle.analyses)
                  ? t("scripture.analysisCount", {
                      count: formatNumber(bundle.analyses.data.length),
                    })
                  : bundle
                    ? statusLabel(bundle.analyses.status)
                    : t("scripture.openPassageBundle")}
              </p>
            </section>
            <section>
              <h3 className="meta-label">Afirmações ligadas à passagem</h3>
              {bundle && hasAvailableData(bundle.claims) ? (
                <ul className="mt-2 space-y-2">
                  {bundle.claims.data.map((claim) => (
                    <li key={claim.id} className="rounded-md border border-border p-2.5">
                      <p className="text-sm leading-relaxed">{claim.proposition}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[9px] uppercase text-muted-foreground">
                        <span>{claimKindLabel(claim.kind)}</span>
                        <span>·</span>
                        <span>{reviewStatusLabel(claim.reviewStatus)}</span>
                        <span>·</span>
                        <span>{supportLevelLabel(claim.supportLevel)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground italic">
                  {bundle ? statusLabel(bundle.claims.status) : t("scripture.noPassageSelected")}
                </p>
              )}
            </section>
            <section>
              <h3 className="meta-label">Leituras por perspectiva</h3>
              <PassageViewpoints bundle={bundle} />
            </section>
            <section>
              <h3 className="meta-label">{t("scripture.keyTerms")}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {bundle && hasAvailableData(bundle.lemmas) ? (
                  bundle.lemmas.data.map((lemma) => {
                    const entity = hasAvailableData(bundle.entities)
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
            {bundle && hasAvailableData(bundle.crossReferences) ? (
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
              {bundle && hasAvailableData(bundle.originals)
                ? t("scripture.originalCount", {
                    count: formatNumber(bundle.originals.data.length),
                  })
                : bundle
                  ? statusLabel(bundle.originals.status)
                  : t("scripture.noPassageSelected")}
            </p>
          </Tabs.Content>

          <Tabs.Content value="history">
            {historicalAnalyses.length > 0 || primarySourceRelations.length > 0 ? (
              <div className="space-y-4">
                {historicalAnalyses.map((analysis) => (
                  <article key={analysis.id} className="rounded-md border border-border p-3">
                    <p className="meta-label">
                      {analysis.lensId === "reception-history"
                        ? "História da recepção"
                        : "Contexto histórico"}
                    </p>
                    <h3 className="mt-1 font-serif text-base font-semibold">{analysis.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {analysis.summary}
                    </p>
                    <p className="mt-2 font-mono text-[9px] uppercase text-muted-foreground">
                      {reviewStatusLabel(analysis.reviewStatus)} ·{" "}
                      {claimKindLabel(analysis.interpretationKind)}
                    </p>
                  </article>
                ))}
                {primarySourceRelations.map(({ relation, source }) => (
                  <article key={relation.id} className="border-l-2 border-primary/40 pl-3">
                    <p className="meta-label">Fonte primária relacionada</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {relation.description}
                    </p>
                    <Link
                      to="/library/read/$workId"
                      params={{ workId: source.anchor.workId }}
                      search={{ unit: source.anchor.startUnitId }}
                      className="mt-2 inline-flex rounded border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      Abrir exatamente este trecho
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {bundle ? statusLabel(bundle.analyses.status) : t("scripture.noPassageSelected")}
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="literature">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground italic">
                {bundle && bundle.sources.references.length > 0
                  ? t("scripture.literatureCount", {
                      count: formatNumber(bundle.sources.references.length),
                    })
                  : t("scripture.literatureAwaiting")}
              </p>
              {semanticSources.length > 0 && (
                <section>
                  <p className="meta-label">Trechos confirmados da biblioteca privada</p>
                  <ul className="mt-2 space-y-2">
                    {semanticSources.map((link) => (
                      <li key={link.id} className="rounded border border-border bg-muted/30 p-2.5">
                        <p className="text-xs font-medium">{link.rawReference}</p>
                        <p className="mt-1 font-mono text-[9px] text-muted-foreground uppercase">
                          Página {link.pageIndex + 1} · vínculo revisado
                        </p>
                        <a
                          href={`/library/document/${encodeURIComponent(link.documentId)}?page=${link.pageIndex + 1}`}
                          className="mt-1 inline-block text-[10px] underline underline-offset-2"
                        >
                          Abrir trecho local
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
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
              return <SourceReferenceCard key={source.id} source={source} fragment={fragment} />;
            })}
            {bundle && bundle.sources.references.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                {t("scripture.noSourceReferences")}
              </p>
            )}
          </Tabs.Content>
          <Tabs.Content value="research">
            {researchQuestions.length ? (
              <ul className="space-y-2">
                {researchQuestions.map((question) => (
                  <li key={question.id} className="rounded border border-border bg-muted/30 p-2.5">
                    <p className="text-xs font-medium">{question.question}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">
                      {question.status}
                    </p>
                    <Link
                      to="/study"
                      className="mt-1 inline-block text-[10px] underline underline-offset-2"
                    >
                      Abrir workspace
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Nenhuma pergunta de pesquisa ancorada nesta passagem.
              </p>
            )}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
