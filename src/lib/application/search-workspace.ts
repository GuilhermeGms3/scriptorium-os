import type { SearchResult } from "../domain/search";
import { t } from "../i18n";
import { GlobalSearchService } from "./global-search-service";

export interface SearchHit {
  id: string;
  group: string;
  label: string;
  detail?: string;
  to?: string;
}

function resultGroup(result: SearchResult): string {
  switch (result.kind) {
    case "scripture-passage":
      return t("search.group.scripture");
    case "primary-source-passage":
      return t("search.group.library");
    case "person":
      return t("search.group.people");
    case "place":
      return t("search.group.places");
    case "concept":
    case "doctrine":
    case "theory":
    case "knowledge-record":
      return t("search.group.concepts");
    case "library-resource":
    case "source":
    case "author":
    case "work":
      return t("search.group.library");
    case "note":
    case "citation":
    case "research-question":
    case "study":
      return t("search.group.notes");
  }
}

export async function searchWorkspace(query: string): Promise<SearchHit[]> {
  return (await GlobalSearchService.search(query, { limit: 24 })).map((result) => ({
    id: result.id,
    group: resultGroup(result),
    label: result.label,
    ...(result.detail ? { detail: result.detail } : {}),
    ...(result.to ? { to: result.to } : {}),
  }));
}
