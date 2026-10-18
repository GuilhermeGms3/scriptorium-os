import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { KnowledgeQueryService } from "../../lib/application/knowledge-query-service";
import { ArgumentRepository } from "../../lib/repositories/argument-repository";
import { StudyTopicWorkspace } from "./study-topic-workspace";
import { describeStudyEntity } from "../../lib/application/study-topic-service";

export function StudyKnowledgeDetail({
  entityId,
  claimId,
}: {
  entityId?: string;
  claimId?: string;
}) {
  const query = useWorkspaceQuery(
    ["study-knowledge-detail", entityId ?? null, claimId ?? null],
    async () => {
      const claim = claimId ? await ArgumentRepository.getClaim(claimId) : null;
      let bundle = entityId ? await KnowledgeQueryService.getExplorerBundle(entityId) : null;
      if (claimId && !bundle) {
        const entities = await KnowledgeQueryService.listEntities();
        for (const item of entities) {
          const candidate = await KnowledgeQueryService.getExplorerBundle(item.entity.id);
          if (candidate?.claims.some((entry) => entry.id === claimId)) {
            bundle = candidate;
            break;
          }
        }
      }
      return { bundle, claim };
    },
  );
  if (query.isPending)
    return (
      <p role="status" className="py-8 text-sm text-muted-foreground">
        Consultando fontes e relações…
      </p>
    );
  if (query.error)
    return (
      <p role="alert" className="py-6 text-sm text-destructive">
        Não foi possível abrir este tema.{" "}
        <button className="underline" onClick={() => void query.refetch()}>
          Tentar novamente
        </button>
      </p>
    );
  if (!query.data?.bundle)
    return (
      <p className="py-6 text-sm text-muted-foreground">
        Este registro não foi encontrado no índice instalado.
      </p>
    );
  return (
    <StudyTopicWorkspace
      key={query.data.bundle.selected.entity.id}
      topic={describeStudyEntity(query.data.bundle.selected)}
      bundle={query.data.bundle}
      focusedClaim={query.data.claim}
    />
  );
}
