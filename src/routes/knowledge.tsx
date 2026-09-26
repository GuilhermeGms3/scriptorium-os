import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useWorkbench } from "../lib/workbench/workbench-context";
import {
  KnowledgeQueryService,
  type ExplorerEntity,
  type KnowledgeExplorerBundle,
} from "../lib/application/knowledge-query-service";
import { EvidenceTag } from "../components/knowledge/knowledge-entity";
import { formatNumber, reviewStatusLabel, supportLevelLabel, t } from "../lib/i18n";
import { LibraryRepository } from "../lib/repositories/library-repository";
import type { Citation } from "../lib/domain/bibliography";
import type { KnowledgeClaim } from "../lib/domain/knowledge";
import { ArgumentRepository } from "../lib/repositories/argument-repository";
import { knowledgeLabel, knowledgeSourceLinks } from "../lib/content/knowledge-presentation";

interface KnowledgeSearch {
  entity?: string;
  claim?: string;
}

export const Route = createFileRoute("/knowledge")({
  validateSearch: (search: Record<string, unknown>): KnowledgeSearch => ({
    ...(typeof search["entity"] === "string" ? { entity: search["entity"] } : {}),
    ...(typeof search["claim"] === "string" ? { claim: search["claim"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: t("knowledge.metaTitle") },
      { name: "description", content: t("knowledge.metaDescription") },
    ],
  }),
  component: KnowledgePage,
});

function entityId(item: ExplorerEntity): string {
  return item.entity.id;
}
function entityName(item: ExplorerEntity): string {
  const canonical = item.kind === "knowledge" ? item.entity.name : item.entity.labels.canonicalName;
  return knowledgeLabel(item.entity.id, canonical);
}
function entityKind(item: ExplorerEntity): string {
  return item.kind === "knowledge" ? item.entity.type : item.entity.kind;
}

const KIND_LABELS: Record<string, string> = {
  person: "Pessoas",
  place: "Lugares",
  event: "Eventos",
  passage: "Passagens",
  work: "Obras",
  concept: "Conceitos",
  word: "Palavras",
  manuscript: "Manuscritos",
  "historical-source": "Fontes históricas",
  "theological-topic": "Áreas da teologia",
  doctrine: "Doutrinas",
  tradition: "Tradições",
  school: "Escolas de pensamento",
  method: "Métodos de estudo",
  "epistemic-stance": "Posturas de análise",
  "interpretive-framework": "Sistemas de interpretação",
  position: "Posições teológicas",
  theory: "Teorias e hipóteses",
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replaceAll("-", " ");
}

function KnowledgePage() {
  const { entity: requestedId, claim: requestedClaimId } = Route.useSearch();
  const navigate = useNavigate({ from: "/knowledge" });
  const { setPassageContext } = useWorkbench();
  const [entities, setEntities] = useState<ExplorerEntity[]>([]);
  const [bundle, setBundle] = useState<KnowledgeExplorerBundle | null>(null);
  const [focusedClaim, setFocusedClaim] = useState<KnowledgeClaim | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => setPassageContext(null), [setPassageContext]);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    void KnowledgeQueryService.listEntities()
      .then(async (loaded) => {
        if (!active) return;
        setEntities(loaded);
        let selectedId =
          requestedId && loaded.some((item) => entityId(item) === requestedId)
            ? requestedId
            : entityId(loaded[0]!);
        let selectedBundle = await KnowledgeQueryService.getExplorerBundle(selectedId);
        if (!selectedBundle) throw new Error(`Knowledge entity ${selectedId} is unavailable.`);
        const requestedClaim = requestedClaimId
          ? await ArgumentRepository.getClaim(requestedClaimId)
          : null;
        if (
          requestedClaimId &&
          !selectedBundle.claims.some((claim) => claim.id === requestedClaimId)
        ) {
          for (const item of loaded) {
            const candidate = await KnowledgeQueryService.getExplorerBundle(entityId(item));
            if (candidate?.claims.some((claim) => claim.id === requestedClaimId)) {
              selectedId = entityId(item);
              selectedBundle = candidate;
              break;
            }
          }
        }
        if (active) {
          setBundle(selectedBundle);
          setFocusedClaim(requestedClaim);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [requestedId, requestedClaimId]);

  const grouped = useMemo(() => {
    const map = new Map<string, ExplorerEntity[]>();
    for (const item of entities)
      map.set(entityKind(item), [...(map.get(entityKind(item)) ?? []), item]);
    return [...map.entries()];
  }, [entities]);
  const select = (id: string) => navigate({ search: { entity: id } });

  return (
    <div className="flex h-full min-w-0">
      <aside
        className="hidden w-60 shrink-0 overflow-y-auto border-r border-border py-2 md:block"
        aria-label="Entidades do conhecimento"
      >
        {grouped.map(([kind, items]) => (
          <div key={kind} className="mb-3 px-2">
            <p className="meta-label px-1 py-1">{kindLabel(kind)}</p>
            {items.map((item) => (
              <button
                key={entityId(item)}
                onClick={() => select(entityId(item))}
                className={`block w-full rounded px-2 py-1.5 text-left text-xs ${bundle?.selected.entity.id === entityId(item) ? "bg-accent font-medium" : "hover:bg-muted"}`}
              >
                {entityName(item)}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <header className="border-b border-border pb-3">
          <p className="meta-label">{t("knowledge.section")}</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
            {t("knowledge.explorer")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Explore temas, doutrinas, métodos, tradições e debates. Cada item reúne somente as
            afirmações, fontes e argumentos realmente ligados a ele.
          </p>
        </header>

        <label className="mt-4 block md:hidden">
          <span className="meta-label">{t("knowledge.entity")}</span>
          <select
            value={bundle?.selected.entity.id ?? ""}
            onChange={(event) => select(event.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {entities.map((item) => (
              <option key={entityId(item)} value={entityId(item)}>
                {entityName(item)} — {kindLabel(entityKind(item))}
              </option>
            ))}
          </select>
        </label>

        {status === "loading" && (
          <p className="mt-8 text-sm text-muted-foreground">Carregando grafo SQLite…</p>
        )}
        {status === "error" && (
          <p role="alert" className="mt-8 rounded-md border border-destructive/40 p-3 text-sm">
            O índice de conhecimento está indisponível ou precisa ser reconstruído.
          </p>
        )}
        {status === "ready" && bundle && (
          <ExplorerContent bundle={bundle} focusedClaim={focusedClaim} />
        )}
      </main>
    </div>
  );
}

function ExplorerContent({
  bundle,
  focusedClaim,
}: {
  bundle: KnowledgeExplorerBundle;
  focusedClaim: KnowledgeClaim | null;
}) {
  const [citations, setCitations] = useState<Citation[]>([]);
  useEffect(() => {
    let active = true;
    const claimIds = [
      ...bundle.claims.map((claim) => claim.id),
      ...(focusedClaim ? [focusedClaim.id] : []),
    ];
    void LibraryRepository.listCitationsForClaims(claimIds).then((items) => {
      if (active) setCitations(items);
    });
    return () => {
      active = false;
    };
  }, [bundle.claims, focusedClaim]);
  const selected = bundle.selected;
  const canonicalTitle =
    selected.kind === "knowledge" ? selected.entity.name : selected.entity.labels.canonicalName;
  const title = knowledgeLabel(selected.entity.id, canonicalTitle);
  const description = selected.entity.description;
  const sourceLinks = knowledgeSourceLinks(selected.entity.id);
  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="meta-label">{kindLabel(entityKind(selected))}</p>
          <h2 className="mt-1 font-serif text-xl font-semibold">{title}</h2>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
          <details className="mt-2 text-[10px] text-muted-foreground">
            <summary className="cursor-pointer">Detalhes técnicos</summary>
            <p className="mt-1 font-mono">{selected.entity.id}</p>
          </details>
        </div>
        <section className="mt-6">
          <h2 className="meta-label">{t("knowledge.claims")}</h2>
          {!bundle.claims.length && (
            <p className="mt-2 text-sm italic text-muted-foreground">
              Nenhuma afirmação diretamente relacionada.
            </p>
          )}
          <ul className="mt-2 space-y-2">
            {focusedClaim && !bundle.claims.some((claim) => claim.id === focusedClaim.id) && (
              <li className="rounded-md border border-primary/40 bg-primary/5 p-2.5">
                <p className="text-[13px]">{focusedClaim.proposition}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  Claim selecionada · {focusedClaim.id}
                </p>
              </li>
            )}
            {bundle.claims.map((claim) => (
              <li key={claim.id} className="rounded-md border border-border bg-muted/30 p-2.5">
                <p className="text-[13px]">{claim.proposition}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2">
                  <EvidenceTag kind={claim.kind} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {formatNumber(claim.anchors.length)} âncoras ·{" "}
                    {supportLevelLabel(claim.supportLevel)} ·{" "}
                    {reviewStatusLabel(claim.reviewStatus)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      </section>
      <aside className="space-y-4">
        <RelationCard
          title="Argumentos"
          items={bundle.arguments.map((argument) => argument.title ?? argument.id)}
        />
        <RelationCard
          title="Citações acadêmicas"
          items={citations.map(
            (citation) =>
              `${citation.contentKind}: ${citation.originalText ?? citation.note ?? citation.locator?.canonicalLocator ?? citation.locator?.pageStart ?? citation.id}`,
          )}
        />
        {sourceLinks.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="meta-label">Fontes instaladas para investigar</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Associação editorial de estudo; a presença da fonte não comprova automaticamente uma
              doutrina.
            </p>
            <ul className="mt-2 space-y-1.5">
              {sourceLinks.map((source) => (
                <li key={source.workId}>
                  <Link
                    to="/library/read/$workId"
                    params={{ workId: source.workId }}
                    className="block rounded bg-muted/40 p-2 text-xs hover:bg-accent"
                  >
                    <span className="font-medium">{source.label}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {source.role}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <RelationCard
          title="Teorias concorrentes"
          items={bundle.relatedTheories.map((theory) => theory.labels.canonicalName)}
        />
        <RelationCard
          title="Relações argumentativas"
          items={bundle.argumentRelations.map(
            (relation) => `${relation.relationType}: ${relation.fromId} → ${relation.toId}`,
          )}
        />
        <RelationCard
          title="Relações ontológicas"
          items={bundle.ontologyRelations.map(
            (relation) =>
              `${relation.relationType}: ${relation.fromEntityId} → ${relation.toEntityId}`,
          )}
        />
        <RelationCard
          title="Relações de conhecimento"
          items={bundle.knowledgeRelations.map((relation) => relation.relation.value)}
        />
      </aside>
    </div>
  );
}

function RelationCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="meta-label">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-1.5 text-xs">
          {items.map((item, index) => (
            <li key={`${item}:${index}`} className="rounded bg-muted/40 p-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs italic text-muted-foreground">Nenhuma relação registrada.</p>
      )}
    </section>
  );
}
