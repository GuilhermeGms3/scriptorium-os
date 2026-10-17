import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type {
  ExplorerEntity,
  KnowledgeExplorerBundle,
} from "../../lib/application/knowledge-query-service";
import { EvidenceTag } from "../knowledge/knowledge-entity";
import {
  argumentRelationLabel,
  formatNumber,
  reviewStatusLabel,
  supportLevelLabel,
  t,
} from "../../lib/i18n";
import { LibraryRepository } from "../../lib/repositories/library-repository";
import { EmptyState } from "../layout/empty-state";
import type { Citation } from "../../lib/domain/bibliography";
import type { KnowledgeClaim } from "../../lib/domain/knowledge";
import {
  argumentLabel,
  knowledgeLabel,
  knowledgeSourceLinks,
} from "../../lib/content/knowledge-presentation";

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

export function ExplorerContent({
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
  const claimsById = new Map(
    [...bundle.claims, ...bundle.argumentClaims].map((claim) => [claim.id, claim]),
  );
  const argumentsById = new Map(bundle.arguments.map((argument) => [argument.id, argument]));
  const ontologyById = new Map(
    [...(selected.kind === "ontology" ? [selected.entity] : []), ...bundle.relatedTheories].map(
      (entity) => [entity.id, entity],
    ),
  );
  const graphLabel = (kind: string, id: string): string => {
    if (kind === "claim") return claimsById.get(id)?.proposition ?? id;
    if (kind === "argument") {
      const argument = argumentsById.get(id);
      return argumentLabel(id, argument?.title);
    }
    if (kind === "theory") return knowledgeLabel(id, id);
    return id;
  };
  const hasRelatedMaterial = Boolean(
    bundle.arguments.length ||
    bundle.supportingArguments.length ||
    bundle.opposingArguments.length ||
    bundle.evidence.length ||
    bundle.perspectives.length ||
    citations.length ||
    sourceLinks.length ||
    bundle.relatedTheories.length ||
    bundle.argumentRelations.length ||
    bundle.objections.length ||
    bundle.responses.length ||
    bundle.ontologyRelations.length ||
    bundle.knowledgeRelations.length,
  );
  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="meta-label">{kindLabel(entityKind(selected))}</p>
          <h2 className="mt-1 font-serif text-xl font-semibold">{title}</h2>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
          <details className="mt-2 text-xs text-muted-foreground">
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
                <p className="text-sm">{focusedClaim.proposition}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Claim selecionada · {focusedClaim.id}
                </p>
              </li>
            )}
            {bundle.claims.map((claim) => (
              <li key={claim.id} className="rounded-md border border-border bg-muted/30 p-2.5">
                <p className="text-sm">{claim.proposition}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2">
                  <EvidenceTag kind={claim.kind} />
                  <span className="font-mono text-xs text-muted-foreground">
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
        {bundle.arguments.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="meta-label">Argumentos</h3>
            <div className="mt-2 space-y-2">
              {bundle.arguments.map((argument) => (
                <article key={argument.id} className="rounded bg-muted/40 p-2.5 text-xs">
                  <h4 className="font-medium">{argumentLabel(argument.id, argument.title)}</h4>
                  <p className="mt-1 text-muted-foreground">
                    <strong>Conclusão:</strong>{" "}
                    {claimsById.get(argument.conclusionClaimId)?.proposition ??
                      argument.conclusionClaimId}
                  </p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-muted-foreground">
                    {argument.premiseClaimIds.map((claimId) => (
                      <li key={claimId}>{claimsById.get(claimId)?.proposition ?? claimId}</li>
                    ))}
                  </ol>
                  {argument.notes && <p className="mt-1 text-muted-foreground">{argument.notes}</p>}
                </article>
              ))}
            </div>
          </section>
        )}
        <RelationCard
          title="Argumentos favoráveis"
          items={bundle.supportingArguments.map((argument) =>
            argumentLabel(argument.id, argument.title),
          )}
        />
        <RelationCard
          title="Argumentos contrários"
          items={bundle.opposingArguments.map((argument) =>
            argumentLabel(argument.id, argument.title),
          )}
        />
        <RelationCard
          title="Evidências"
          items={bundle.evidence.map((evidence) => evidence.label)}
        />
        <RelationCard
          title="Perspectivas declaradas"
          items={bundle.perspectives.map((profile) => profile.label)}
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
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
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
                    <span className="mt-0.5 block text-xs text-muted-foreground">
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
          items={bundle.relatedTheories.map((theory) =>
            knowledgeLabel(theory.id, theory.labels.canonicalName),
          )}
        />
        <RelationCard
          title="Relações argumentativas"
          items={bundle.argumentRelations.map(
            (relation) =>
              `${graphLabel(relation.fromKind, relation.fromId)} ${argumentRelationLabel(relation.relationType)} ${graphLabel(relation.toKind, relation.toId)}`,
          )}
        />
        <RelationCard
          title="Objeções"
          items={bundle.objections.map(
            (relation) =>
              `${graphLabel(relation.fromKind, relation.fromId)} ${argumentRelationLabel(relation.relationType)} ${graphLabel(relation.toKind, relation.toId)}`,
          )}
        />
        <RelationCard
          title="Respostas"
          items={bundle.responses.map(
            (relation) =>
              `${graphLabel(relation.fromKind, relation.fromId)} ${argumentRelationLabel(relation.relationType)} ${graphLabel(relation.toKind, relation.toId)}`,
          )}
        />
        <RelationCard
          title="Relações ontológicas"
          items={bundle.ontologyRelations.map(
            (relation) =>
              `${knowledgeLabel(relation.fromEntityId, ontologyById.get(relation.fromEntityId)?.labels.canonicalName ?? relation.fromEntityId)} ${argumentRelationLabel(relation.relationType)} ${knowledgeLabel(relation.toEntityId, ontologyById.get(relation.toEntityId)?.labels.canonicalName ?? relation.toEntityId)}`,
          )}
        />
        <RelationCard
          title="Relações de conhecimento"
          items={bundle.knowledgeRelations.map((relation) =>
            argumentRelationLabel(relation.relation.value),
          )}
        />
        {!hasRelatedMaterial && (
          <EmptyState title="Ainda sem conexões publicadas">
            Esta entidade existe na taxonomia, mas ainda não possui argumentos, evidências ou fontes
            relacionadas. O Scriptorium não preenche essas relações com conteúdo fictício.
          </EmptyState>
        )}
      </aside>
    </div>
  );
}

function RelationCard({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="meta-label">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-xs">
        {items.map((item, index) => (
          <li key={`${item}:${index}`} className="rounded bg-muted/40 p-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
