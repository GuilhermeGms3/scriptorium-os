/** Passage inspector backed by the PassageKnowledgeBundle. */
import { VerseMarkControls } from "./verse-mark-controls";
import * as Tabs from "@radix-ui/react-tabs";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { readerContextMatches } from "../../lib/domain/reader-context-filter";
import type { Argument } from "../../lib/domain/argument";
import type { TextAnchor } from "../../lib/domain/knowledge";
import type { PassageKnowledgeBundle } from "../../lib/domain/knowledge-bundle";
import { knowledgeLabel } from "../../lib/content/knowledge-presentation";
import {
  COVERAGE_LABELS,
  PASSAGE_KNOWLEDGE_GROUPS,
  PASSAGE_KNOWLEDGE_GROUP_LABELS,
  passageKnowledgeGroup,
  type PassageCoverageEntry,
} from "../../lib/domain/workspace-passage-knowledge";
import { InspectorCloseButton } from "../shell/inspector-close-button";
import { ReviewStateBadge } from "./review-state-badge";
import { SEMANTIC_DOMAIN_LABELS, type SemanticDomain } from "../../lib/domain/semantic-content";
import { WorkspacePassageKnowledgeService } from "../../lib/application/workspace-passage-knowledge-service";
import { passageRefsOverlap } from "../../lib/domain/scripture";
import { StudyRepository } from "../../lib/repositories/study-repository";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { hasAvailableData } from "../../lib/domain/availability";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { errorMessage } from "@/lib/utils";
import { SourceReferenceCard } from "../common/source-reference";
import { ChapterSourceContext } from "./chapter-source-context";
import {
  bookLabel,
  claimKindLabel,
  formatNumber,
  passageLabel,
  researchQuestionStatusLabel,
  reviewStatusLabel,
  statusLabel,
  supportLevelLabel,
  t,
} from "../../lib/i18n";

/** Four short tabs: what exists, the text itself, sources and literature, the reader's own notes. */
const TABS = [
  { id: "overview", label: "Visão geral" },
  { id: "text", label: "Texto e língua" },
  { id: "sources", label: "Fontes" },
  { id: "notes", label: "Minhas notas" },
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
      <p className="meta-label tracking-wider text-muted-foreground">{label}</p>
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
                <p className="mt-0.5 meta-label text-muted-foreground">
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
  const openSource = useSourceReader();
  const { passageContext } = useWorkbench();
  const verseSelected = passageContext?.ref.verseStart !== undefined;
  const ref = passageContext?.ref;
  // All questions once (they are few), filtered here: a verse click no longer reloads them all.
  const questionsQuery = useWorkspaceQuery(
    ["research-questions", "all"],
    () => StudyRepository.listResearchQuestions(),
    { enabled: ref !== undefined },
  );
  const researchQuestions = useMemo(
    () =>
      !ref
        ? []
        : (questionsQuery.data ?? []).filter((question) =>
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
                  ref,
                ),
            ),
          ),
    [questionsQuery.data, ref],
  );
  // This synchronous view also contains mutable user notes. A ref-only memo kept freshly
  // saved notes invisible until the reader selected another passage or reloaded.
  const bundle = ref ? ScriptureKnowledgeEngine.getPassageKnowledgeBundle(ref) : null;
  const knowledgeQuery = useWorkspaceQuery(
    ["passage-inspector-knowledge", ref],
    () =>
      ref
        ? WorkspacePassageKnowledgeService.load(ref, bundle, undefined, { includePending: true })
        : Promise.resolve(null),
    { enabled: ref !== undefined, refreshOnKnowledgeChange: true },
  );
  const workspaceKnowledge = knowledgeQuery.data
    ? {
        ...knowledgeQuery.data,
        items: knowledgeQuery.data.items.filter(
          (item) =>
            !passageContext?.contextFilter ||
            readerContextMatches(item, passageContext.contextFilter),
        ),
      }
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
  const hasHistory = historicalAnalyses.length > 0 || primarySourceRelations.length > 0;
  const hasCrossReferences = Boolean(bundle && hasAvailableData(bundle.crossReferences));
  const hasSourceReferences = Boolean(bundle?.sources.references.length);
  const hasLiterature = hasSourceReferences || Boolean(workspaceKnowledge?.items.length);
  const hasNotes = Boolean(bundle?.user.notes.length);
  const hasResearch = researchQuestions.length > 0;
  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "overview") return true;
    if (tab.id === "text") return Boolean(bundle && hasAvailableData(bundle.originals));
    if (tab.id === "sources") return hasCrossReferences || hasLiterature;
    return hasNotes || hasResearch;
  });
  const hasOverviewContent = Boolean(
    (bundle && hasAvailableData(bundle.analyses)) ||
    (bundle && hasAvailableData(bundle.claims)) ||
    (bundle && hasAvailableData(bundle.viewpoints)) ||
    (bundle && hasAvailableData(bundle.lemmas)) ||
    workspaceKnowledge?.items.length ||
    hasHistory,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="meta-label">
            {verseSelected ? "Versículo selecionado" : t("scripture.inspector.passage")}
          </p>
          <p className="mt-1 font-serif text-xl font-semibold">{label}</p>
          {passageContext && !verseSelected && (
            <p className="mt-1 text-xs text-muted-foreground">
              Clique em um versículo para estudá-lo aqui.
            </p>
          )}
          {bundle?.provenance.isDemo && (
            <p className="mt-1 meta-label tracking-wider text-muted-foreground">
              {t("scripture.bundleDemo")}
            </p>
          )}
        </div>
        <InspectorCloseButton />
      </div>
      {ref && ref.verseStart !== undefined && (
        <VerseMarkControls
          verse={{ bookId: ref.bookId, chapter: ref.chapter, verse: ref.verseStart }}
          editionId={passageContext?.editionId}
          className="border-b border-border px-4 py-2"
        />
      )}

      <Tabs.Root defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <Tabs.List
          className="flex gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5"
          aria-label={t("scripture.inspector.sections")}
        >
          {visibleTabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-accent data-[state=active]:font-medium data-[state=active]:text-foreground"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <Tabs.Content value="overview" className="space-y-4">
            {workspaceKnowledge && (
              <ChapterSourceContext
                key={`${ref?.bookId}:${ref?.chapter}:${ref?.verseStart ?? "chapter"}`}
                items={workspaceKnowledge.items}
              />
            )}
            {!hasOverviewContent && (
              <section className="rounded-md border border-dashed border-border p-3">
                <h3 className="text-sm font-medium">
                  Texto disponível, estudo contextual pendente
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Ainda não há análise, afirmação ou trecho de biblioteca publicado para esta
                  seleção. Isso é uma lacuna de conteúdo, não uma falha no texto bíblico.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/study"
                    className="rounded border border-input px-2.5 py-1.5 text-xs hover:bg-accent"
                  >
                    Iniciar um estudo
                  </Link>
                  <Link
                    to="/library"
                    className="rounded border border-input px-2.5 py-1.5 text-xs hover:bg-accent"
                  >
                    Consultar biblioteca
                  </Link>
                </div>
              </section>
            )}
            {bundle && hasAvailableData(bundle.analyses) && (
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
            )}
            {bundle && hasAvailableData(bundle.claims) && (
              <section>
                <h3 className="meta-label">Afirmações ligadas à passagem</h3>
                {bundle && hasAvailableData(bundle.claims) ? (
                  <ul className="mt-2 space-y-2">
                    {bundle.claims.data.map((claim) => (
                      <li key={claim.id} className="rounded-md border border-border p-2.5">
                        <p className="text-sm leading-relaxed">{claim.proposition}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 meta-label text-muted-foreground">
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
            )}
            {bundle && hasAvailableData(bundle.viewpoints) && (
              <section>
                <h3 className="meta-label">Leituras por perspectiva</h3>
                <PassageViewpoints bundle={bundle} />
              </section>
            )}
            {workspaceKnowledge?.items.length ? (
              <section>
                <h3 className="meta-label">Biblioteca conectada</h3>
                <div className="mt-2 rounded-md border border-border p-2.5">
                  <p className="text-xs font-medium">
                    {workspaceKnowledge.items.length}{" "}
                    {workspaceKnowledge.items.length === 1
                      ? "trecho relacionado"
                      : "trechos relacionados"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {workspaceKnowledge.items
                      .slice(0, 3)
                      .map((item) => item.document.title)
                      .filter((title, index, titles) => titles.indexOf(title) === index)
                      .join(" · ")}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Abra a aba Fontes para ver fonte, página, contexto e estado de revisão.
                  </p>
                </div>
              </section>
            ) : null}
            {workspaceKnowledge && <CoverageSummary coverage={workspaceKnowledge.coverage} />}
            {knowledgeQuery.error && (
              <p role="alert" className="text-xs text-destructive">
                A biblioteca privada não pôde ser carregada: {errorMessage(knowledgeQuery.error)}
              </p>
            )}
            {bundle && hasAvailableData(bundle.lemmas) && (
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
                          to="/study"
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
                      {bundle
                        ? statusLabel(bundle.lemmas.status)
                        : t("scripture.noPassageSelected")}
                    </span>
                  )}
                </div>
              </section>
            )}
            {hasHistory && (
              <section className="space-y-3">
                <h3 className="meta-label">História e recepção</h3>
                {historicalAnalyses.length > 0 || primarySourceRelations.length > 0 ? (
                  <div className="space-y-4">
                    {historicalAnalyses.map((analysis) => (
                      <article key={analysis.id} className="rounded-md border border-border p-3">
                        <p className="meta-label">
                          {analysis.lensId === "reception-history"
                            ? "História da recepção"
                            : "Contexto histórico"}
                        </p>
                        <h3 className="mt-1 font-serif text-base font-semibold">
                          {analysis.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {analysis.summary}
                        </p>
                        <p className="mt-2 meta-label text-muted-foreground">
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
                        <button
                          type="button"
                          onClick={() =>
                            openSource({
                              source: {
                                kind: "primary-text",
                                workId: source.anchor.workId,
                                ...(source.anchor.startUnitId
                                  ? { unitId: source.anchor.startUnitId }
                                  : {}),
                                title: "Fonte primária relacionada",
                              },
                              context: relation.description,
                            })
                          }
                          className="mt-2 inline-flex rounded border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                        >
                          Ler este trecho e anotar
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {bundle
                      ? statusLabel(bundle.analyses.status)
                      : t("scripture.noPassageSelected")}
                  </p>
                )}
              </section>
            )}
          </Tabs.Content>

          <Tabs.Content value="text">
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

          <Tabs.Content value="sources" className="space-y-6">
            {hasLiterature && (
              <section className="space-y-3">
                <h3 className="meta-label">Literatura e biblioteca</h3>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground italic">
                    {bundle && bundle.sources.references.length > 0
                      ? t("scripture.literatureCount", {
                          count: formatNumber(bundle.sources.references.length),
                        })
                      : t("scripture.literatureAwaiting")}
                  </p>
                  {workspaceKnowledge && workspaceKnowledge.items.length > 0 && (
                    <section>
                      {PASSAGE_KNOWLEDGE_GROUPS.map((group) => {
                        const groupItems = workspaceKnowledge.items.filter(
                          (item) => passageKnowledgeGroup(item) === group,
                        );
                        if (!groupItems.length) return null;
                        const grouped = workspaceKnowledge.items.some(
                          (item) => passageKnowledgeGroup(item) !== "library",
                        );
                        return (
                          <div key={group}>
                            {grouped && (
                              <h4 className="meta-label mt-3">
                                {PASSAGE_KNOWLEDGE_GROUP_LABELS[group]}
                              </h4>
                            )}
                            <ul className="mt-2 space-y-3">
                              {groupItems.map((item) => {
                                const claims = item.proposals.filter(
                                  (proposal) => proposal.payload.kind === "claim",
                                );
                                const topics = item.proposals.flatMap((proposal) =>
                                  proposal.payload.kind === "topic-assignment"
                                    ? [proposal.payload.domain]
                                    : [],
                                );
                                const argumentsForUnit = item.proposals.filter(
                                  (proposal) => proposal.payload.kind === "argument",
                                );
                                const citations = item.proposals.filter(
                                  (proposal) => proposal.payload.kind === "citation",
                                );
                                const entities = item.proposals.filter(
                                  (proposal) => proposal.payload.kind === "entity",
                                );
                                return (
                                  <li
                                    key={item.id}
                                    className={
                                      item.reviewState === "pending"
                                        ? "rounded-md border-2 border-dashed border-amber-500/60 bg-amber-500/5 p-3"
                                        : "rounded-md border border-border bg-muted/30 p-3"
                                    }
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-medium">{item.document.title}</p>
                                      <ReviewStateBadge state={item.reviewState} />
                                    </div>
                                    <p className="mt-1 meta-label text-muted-foreground">
                                      {item.passageRelation.payload.rawReference} · páginas{" "}
                                      {item.pages.map((page) => page + 1).join(", ")}
                                      {item.reviewState === "pending"
                                        ? " · Ligação detectada, ainda sem revisão"
                                        : item.reviewState === "auto-visible"
                                          ? " · Ligação de máquina, não revisão editorial"
                                          : " · Revisão humana"}
                                    </p>
                                    {claims.map((proposal) =>
                                      proposal.payload.kind === "claim" ? (
                                        <p
                                          key={proposal.id}
                                          className="mt-2 border-l-2 border-primary/40 pl-2 text-xs leading-relaxed"
                                        >
                                          {proposal.payload.proposition}
                                        </p>
                                      ) : null,
                                    )}
                                    {argumentsForUnit.map((proposal) =>
                                      proposal.payload.kind === "argument" ? (
                                        <section
                                          key={proposal.id}
                                          className="mt-2 rounded border border-border/70 bg-background/50 p-2"
                                        >
                                          <p className="meta-label">Argumento</p>
                                          <p className="mt-1 text-xs font-medium">
                                            {proposal.payload.conclusion}
                                          </p>
                                          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                                            {proposal.payload.premises.map((premise) => (
                                              <li key={premise}>{premise}</li>
                                            ))}
                                          </ol>
                                        </section>
                                      ) : null,
                                    )}
                                    {citations.map((proposal) =>
                                      proposal.payload.kind === "citation" ? (
                                        <blockquote
                                          key={proposal.id}
                                          className="mt-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground"
                                        >
                                          “{proposal.payload.quotedText}”
                                        </blockquote>
                                      ) : null,
                                    )}
                                    <p className="mt-2 line-clamp-5 text-xs leading-relaxed text-muted-foreground">
                                      {item.translation?.translatedText ?? item.unit.text}
                                    </p>
                                    {topics.length > 0 && (
                                      <p className="mt-2 meta-label text-muted-foreground">
                                        {topics
                                          .map(
                                            (domain) =>
                                              SEMANTIC_DOMAIN_LABELS[domain as SemanticDomain] ??
                                              domain,
                                          )
                                          .join(" · ")}
                                      </p>
                                    )}
                                    {entities.length > 0 && (
                                      <p className="mt-1 meta-label text-muted-foreground">
                                        Entidades:{" "}
                                        {entities
                                          .flatMap((proposal) =>
                                            proposal.payload.kind === "entity"
                                              ? [proposal.payload.label]
                                              : [],
                                          )
                                          .join(" · ")}
                                      </p>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openSource(passageReadingSource(item))}
                                      className="mt-2 inline-block text-xs underline underline-offset-2"
                                    >
                                      Ler evidência e anotar
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </section>
                  )}
                </div>
              </section>
            )}
            {hasCrossReferences && (
              <section className="space-y-2">
                <h3 className="meta-label">Referências cruzadas</h3>
                {bundle && hasAvailableData(bundle.crossReferences) ? (
                  <ul className="space-y-2 text-sm">
                    {bundle.crossReferences.data.map((relation) => {
                      const candidates = [
                        passageAnchor(relation.from),
                        passageAnchor(relation.to),
                      ].filter(
                        (anchor): anchor is Extract<TextAnchor, { type: "passage" }> =>
                          anchor !== null,
                      );
                      const target =
                        candidates.find(
                          (anchor) => anchor.ref.bookId !== passageContext?.ref.bookId,
                        ) ?? candidates[0];
                      if (!target) return null;
                      return (
                        <li key={relation.id} className="border-l border-border pl-2.5">
                          <Link
                            to="/scripture/$book/$chapter"
                            params={{
                              book: target.ref.bookId,
                              chapter: String(target.ref.chapter),
                            }}
                            className="font-mono text-xs underline-offset-2 hover:underline"
                          >
                            {passageLabel(target.ref)}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {relation.description ?? relation.relation.value}
                          </p>
                          <p className="mt-1 meta-label text-muted-foreground">
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
              </section>
            )}
            {hasSourceReferences && (
              <section className="space-y-3">
                <h3 className="meta-label">Fontes citadas</h3>
                {bundle?.sources.references.map((source) => {
                  const fragment = bundle.sources.fragments.find(
                    (item) => item.sourceId === source.id,
                  );
                  return (
                    <SourceReferenceCard key={source.id} source={source} fragment={fragment} />
                  );
                })}
                {bundle && bundle.sources.references.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    {t("scripture.noSourceReferences")}
                  </p>
                )}
              </section>
            )}
          </Tabs.Content>

          <Tabs.Content value="notes" className="space-y-6">
            <section className="space-y-2">
              <h3 className="meta-label">Notas</h3>
              {bundle && bundle.user.notes.length > 0 ? (
                <ul className="space-y-2">
                  {bundle.user.notes.map((note) => (
                    <li key={note.id} className="rounded-md border border-border bg-muted/30 p-2.5">
                      <p className="text-sm font-medium">{note.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {note.body || "—"}
                      </p>
                      <p className="mt-1 meta-label text-muted-foreground">
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
            </section>
            {hasResearch && (
              <section className="space-y-2">
                <h3 className="meta-label">Perguntas de pesquisa</h3>
                {researchQuestions.length ? (
                  <ul className="space-y-2">
                    {researchQuestions.map((question) => (
                      <li
                        key={question.id}
                        className="rounded border border-border bg-muted/30 p-2.5"
                      >
                        <p className="text-xs font-medium">{question.question}</p>
                        <p className="mt-1 meta-label text-muted-foreground">
                          {researchQuestionStatusLabel(question.status)}
                        </p>
                        <Link
                          to="/study"
                          className="mt-1 inline-block text-xs underline underline-offset-2"
                        >
                          Abrir estudos
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Nenhuma pergunta de pesquisa ancorada nesta passagem.
                  </p>
                )}
              </section>
            )}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

const COVERAGE_STATUS_LABELS: Record<PassageCoverageEntry["status"], string> = {
  available: "disponível",
  private: "na biblioteca",
  "in-review": "por confirmar",
  missing: "sem fonte",
};

/** What exists for the passage in one or two sentences; the area-by-area table stays folded. */
function CoverageSummary({ coverage }: { coverage: readonly PassageCoverageEntry[] }) {
  const names = (entries: readonly PassageCoverageEntry[]) =>
    entries.map((entry) => COVERAGE_LABELS[entry.area].toLocaleLowerCase("pt-BR")).join(", ");
  const available = coverage.filter(
    (entry) => entry.status === "available" || entry.status === "private",
  );
  const inReview = coverage.filter((entry) => entry.status === "in-review");
  const missing = coverage.filter((entry) => entry.status === "missing");
  return (
    <section>
      <h3 className="meta-label">O que existe para esta passagem</h3>
      <p className="mt-1.5 text-sm leading-relaxed">
        {available.length
          ? `Disponível: ${names(available)}.`
          : "Ainda não há estudo com fonte para esta passagem."}
      </p>
      {inReview.length > 0 && (
        <p className="mt-1 text-sm leading-relaxed text-amber-700 dark:text-amber-400">
          Por confirmar na sua biblioteca: {names(inReview)}.
        </p>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          {missing.length
            ? `Ainda sem fontes em ${missing.length} áreas · ver todas`
            : "Ver todas as áreas"}
        </summary>
        <ul className="mt-2 divide-y divide-border rounded-md border border-border">
          {coverage.map((entry) => (
            <li
              key={entry.area}
              className="flex min-h-8 items-center justify-between gap-2 px-2.5 py-1 text-sm pointer-coarse:min-h-11"
            >
              <span>{COVERAGE_LABELS[entry.area]}</span>
              <span
                className={
                  entry.status === "missing"
                    ? "text-xs text-muted-foreground"
                    : entry.status === "in-review"
                      ? "text-xs text-amber-700 dark:text-amber-400"
                      : "text-xs font-medium text-foreground"
                }
              >
                {COVERAGE_STATUS_LABELS[entry.status]}
                {entry.status === "private" ? ` (${entry.sourceCount})` : ""}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
import { passageReadingSource } from "../../lib/application/reading-source";
import { useSourceReader } from "../study/source-reader-context";
