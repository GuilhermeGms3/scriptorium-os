import type { SearchResult } from "../domain/search";
import { ScriptureRepository } from "../repositories/scripture-repository";
import { KnowledgeRepository } from "../repositories/knowledge-repository";
import { LibraryRepository } from "../repositories/library-repository";
import { bookLabel, entityTypeLabel } from "../i18n";
import { PrimarySourceRepository } from "../repositories/primary-source-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";

export interface GlobalSearchOptions {
  editionIds?: string[];
  limit?: number;
}

function parseReference(query: string): { bookId: string; chapter: number; verse?: number } | null {
  const match = query
    .trim()
    .toLowerCase()
    .match(/^([\p{L}\d -]+?)\s+(\d+)(?::(\d+))?$/u);
  if (!match) return null;
  const bookQuery = match[1]?.trim();
  const book = ScriptureRepository.listBooks().find((candidate) =>
    [candidate.id, candidate.name, candidate.abbreviation, bookLabel(candidate.id, candidate.name)]
      .map((value) => value.toLowerCase())
      .includes(bookQuery ?? ""),
  );
  if (!book) return null;
  return {
    bookId: book.id,
    chapter: Number(match[2]),
    ...(match[3] ? { verse: Number(match[3]) } : {}),
  };
}

export const GlobalSearchService = {
  async search(query: string, options: GlobalSearchOptions = {}): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const limit = Math.max(1, Math.min(options.limit ?? 30, 100));
    const results: SearchResult[] = [];
    const lemma = /^lemma:(.+)$/i.exec(q)?.[1]?.trim();
    const morphology = /^morph(?:ology)?:([A-Z0-9-]+)$/i.exec(q)?.[1]?.trim();
    const reference = parseReference(q);
    if (reference) {
      const book = ScriptureRepository.getBook(reference.bookId);
      results.push({
        kind: "scripture-passage",
        id: `reference:${reference.bookId}:${reference.chapter}:${reference.verse ?? "chapter"}`,
        label: `${bookLabel(reference.bookId, book?.name)} ${reference.chapter}${reference.verse ? `:${reference.verse}` : ""}`,
        detail: "Referência exata",
        score: 10_000,
        corpusId: "passage-abstraction",
        editionId: "all-enabled",
        workId: `work:${reference.bookId}`,
        address: `${reference.bookId}.${reference.chapter}.${reference.verse ?? "*"}`,
        to: `/scripture/${reference.bookId}/${reference.chapter}`,
      });
    }

    const scripture = await ScriptureRepository.search({
      text: lemma ?? morphology ?? q,
      ...(lemma ? { lemma } : {}),
      ...(morphology ? { morphology } : {}),
      ...(options.editionIds ? { editionIds: options.editionIds } : {}),
      limit,
    });
    for (const hit of scripture) {
      const address = hit.textUnit.address;
      if (!address?.bookId || address.chapter === undefined) continue;
      const book = ScriptureRepository.getBook(address.bookId);
      results.push({
        kind: "scripture-passage",
        id: `text:${hit.textUnit.id}`,
        label:
          hit.textUnit.displayAddress ??
          `${bookLabel(address.bookId, book?.name)} ${address.chapter}:${address.verseStart ?? ""}`,
        detail: hit.snippet,
        score: 1_000 + hit.rank,
        corpusId: hit.textUnit.corpusId,
        editionId: hit.textUnit.editionId,
        workId: hit.textUnit.workId,
        address: hit.textUnit.displayAddress ?? "",
        to: `/scripture/${address.bookId}/${address.chapter}`,
      });
    }

    for (const hit of await PrimarySourceRepository.search(q, limit)) {
      const work = await (
        await import("../corpus-runtime/corpus-package-registry")
      ).corpusPackageRegistry
        .open(hit.textUnit.editionId, hit.textUnit.workId)
        .then((storage) => storage.getWork(hit.textUnit.workId));
      const locator = hit.textUnit.address?.section ?? hit.textUnit.displayAddress ?? "";
      results.push({
        kind: "primary-source-passage",
        id: `primary:${hit.textUnit.id}`,
        label: hit.textUnit.displayAddress ?? `${work?.title ?? hit.textUnit.workId} ${locator}`,
        detail: hit.snippet,
        score: 900 + hit.rank,
        corpusId: hit.textUnit.corpusId,
        editionId: hit.textUnit.editionId,
        workId: hit.textUnit.workId,
        textUnitId: hit.textUnit.id,
        locator,
        to: `/library/read/${encodeURIComponent(hit.textUnit.workId)}?unit=${encodeURIComponent(hit.textUnit.id)}`,
      });
    }

    for (const hit of await PrivateDocumentRepository.search(q, { limit })) {
      results.push({
        kind: "source",
        id: `private-document:${hit.documentId}:${hit.pageIndex}`,
        label: `${hit.title} — página ${hit.pageLabel}`,
        detail: hit.snippet,
        score: 850 - Math.min(Math.abs(hit.rank), 100),
        sourceId: hit.sourceId,
        to: `/library/document/${encodeURIComponent(hit.documentId)}?page=${hit.pageIndex + 1}`,
      });
    }

    for (const hit of await KnowledgeRepository.search(q, limit)) {
      const kind = hit.kind === "knowledge-entity" ? "concept" : "knowledge-record";
      results.push({
        kind,
        id: `knowledge:${hit.id}`,
        label: hit.label,
        detail: hit.detail || hit.kind.replaceAll("-", " "),
        score: hit.label.toLocaleLowerCase().startsWith(q.toLocaleLowerCase()) ? 800 : 600,
        ...(kind === "concept" ? { entityId: hit.id } : { recordKind: hit.kind, recordId: hit.id }),
        to:
          hit.kind === "claim"
            ? `/knowledge?claim=${encodeURIComponent(hit.id)}`
            : `/knowledge?entity=${encodeURIComponent(hit.id)}`,
      } as SearchResult);
    }
    for (const resource of await LibraryRepository.listSources({ query: q })) {
      results.push({
        kind: "source",
        id: `library:${resource.id}`,
        label: resource.title,
        score: resource.title.toLocaleLowerCase().startsWith(q.toLocaleLowerCase()) ? 700 : 500,
        sourceId: resource.id,
        to: `/library?source=${encodeURIComponent(resource.id)}`,
      });
    }
    for (const catalogItem of await LibraryRepository.searchCatalog(q, limit)) {
      results.push(
        catalogItem.kind === "author"
          ? {
              kind: "author",
              id: `author:${catalogItem.id}`,
              label: catalogItem.label,
              ...(catalogItem.detail ? { detail: catalogItem.detail } : {}),
              score: 650,
              authorId: catalogItem.id,
              to: "/library",
            }
          : {
              kind: "work",
              id: `work:${catalogItem.id}`,
              label: catalogItem.label,
              ...(catalogItem.detail ? { detail: catalogItem.detail } : {}),
              score: 640,
              workId: catalogItem.id,
              to: "/library",
            },
      );
    }
    const { getWorkspaceDatabase } = await import("../workspace-runtime/workspace-database");
    const workspace = await getWorkspaceDatabase();
    const workspaceQuery = `"${q.replaceAll('"', '""')}"*`;
    const workspaceHits = await workspace.query(
      "SELECT entity_kind,entity_id,title,body FROM workspace_fts WHERE workspace_fts MATCH ? LIMIT ?",
      [workspaceQuery, limit],
    );
    for (const hit of workspaceHits) {
      const kind = hit["entity_kind"];
      const id = hit["entity_id"];
      const title = hit["title"];
      if (
        typeof kind !== "string" ||
        typeof id !== "string" ||
        typeof title !== "string" ||
        kind === "source"
      )
        continue;
      const common = {
        id: `${kind}:${id}`,
        label: title,
        ...(typeof hit["body"] === "string" ? { detail: hit["body"] } : {}),
        score: 400,
      };
      if (kind === "research-question")
        results.push({ ...common, kind, researchQuestionId: id, to: "/study" });
      else if (kind === "citation")
        results.push({ ...common, kind, citationId: id, to: "/library" });
      else results.push({ ...common, kind: "note", noteId: id, to: "/study" });
    }
    return results
      .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
      .slice(0, limit);
  },
};
