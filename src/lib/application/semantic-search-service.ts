import { z } from "zod";
import { PipelineCandidateSchema, pipelineRequest } from "../semantic-engine/local-pipeline-client";
import { passageLabel } from "../i18n";
import type { SearchHit } from "./search-workspace";

export const SemanticSearchResponseSchema = z.object({
  hits: z
    .array(
      z.object({
        candidate: PipelineCandidateSchema,
        score: z.number().finite(),
        lexicalRank: z.number().int().positive().nullable().optional(),
        semanticRank: z.number().int().positive().nullable().optional(),
      }),
    )
    .max(50),
  retrieval: z.string(),
  embeddingConfigured: z.boolean(),
});

export function semanticSearchHits(
  response: z.infer<typeof SemanticSearchResponseSchema>,
  editionId: string,
): SearchHit[] {
  return response.hits.map(({ candidate }) => {
    if (candidate.editionId !== editionId)
      throw new Error("O serviço retornou uma edição diferente da solicitada.");
    return {
      id: candidate.id,
      group: "Escrituras",
      label: `${passageLabel({ workId: candidate.passage.workId, bookId: candidate.passage.bookId, chapter: candidate.passage.chapter, verseStart: candidate.passage.verseStart, versificationSchemeId: candidate.passage.versificationSchemeId })} · ${candidate.editionId}`,
      detail: candidate.text,
      to: `/scripture/${encodeURIComponent(candidate.passage.bookId)}/${candidate.passage.chapter}?edition=${encodeURIComponent(candidate.editionId)}#verse-${candidate.passage.verseStart}`,
    };
  });
}

export async function searchByMeaning(query: string, editionId: string, signal?: AbortSignal) {
  const response = await pipelineRequest(
    "search",
    SemanticSearchResponseSchema,
    { query, editionId, limit: 24 },
    signal,
  );
  return {
    hits: semanticSearchHits(response, editionId),
    semantic: response.embeddingConfigured,
    retrieval: response.retrieval,
  };
}
