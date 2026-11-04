import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/lib/utils";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { LibraryRepository } from "../../lib/repositories/library-repository";
import { ResourceDetails } from "./resource-details";
import { ResourceRow } from "./resource-row";

/** Bibliographic records and the reader's collections, with the selected record's details. */
export function ReferencesSection({
  refreshKey,
  initialSourceId,
  onCountChange,
}: {
  refreshKey: number;
  initialSourceId?: string;
  onCountChange?: (count: number) => void;
}) {
  const [collectionId, setCollectionId] = useState<string>();
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSourceId);
  const [query, setQuery] = useState("");
  const [newCollection, setNewCollection] = useState("");
  const [actionError, setActionError] = useState<string>();
  const reportCount = useRef(onCountChange);
  useEffect(() => {
    reportCount.current = onCountChange;
  }, [onCountChange]);

  // Each collection keeps its own answer: switching quickly can no longer show the wrong list.
  const allSources = useWorkspaceQuery(["library-sources", "all", refreshKey], () =>
    LibraryRepository.listSources(),
  );
  const collectionSources = useWorkspaceQuery(
    ["library-sources", collectionId, refreshKey],
    () => LibraryRepository.listSources(collectionId ? { collectionId } : {}),
    { enabled: collectionId !== undefined },
  );
  const collectionsQuery = useWorkspaceQuery(["library-collections", refreshKey], () =>
    LibraryRepository.listCollections(),
  );
  const listQuery = collectionId ? collectionSources : allSources;
  const sources = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const collections = collectionsQuery.data ?? [];
  const loading = listQuery.isPending;
  const error = listQuery.error ?? collectionsQuery.error;
  useEffect(() => {
    if (allSources.data) reportCount.current?.(allSources.data.length);
  }, [allSources.data]);
  // The chosen record while it is in the list shown; otherwise the first one.
  const activeId =
    selectedId && sources.some((source) => source.id === selectedId) ? selectedId : sources[0]?.id;
  const detailsQuery = useWorkspaceQuery(
    ["library-source-details", activeId],
    () => LibraryRepository.getSourceDetails(activeId ?? ""),
    { enabled: activeId !== undefined },
  );
  const details = activeId ? (detailsQuery.data ?? null) : null;
  const refreshDetails = async () => {
    await detailsQuery.refetch();
  };

  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase().trim();
    return normalized
      ? sources.filter((source) =>
          `${source.title} ${source.sourceType} ${Object.values(source.identifiers).join(" ")}`
            .toLocaleLowerCase()
            .includes(normalized),
        )
      : sources;
  }, [query, sources]);

  const createCollection = async () => {
    if (!newCollection.trim()) return;
    setActionError(undefined);
    try {
      const id = await LibraryRepository.createCollection(newCollection);
      if (activeId) await LibraryRepository.addSourceToCollection(activeId, id);
      setNewCollection("");
      setCollectionId(id);
      await collectionsQuery.refetch();
    } catch (cause) {
      setActionError(errorMessage(cause));
    }
  };

  return (
    <div className="grid min-h-[24rem] overflow-hidden rounded-md border border-border md:grid-cols-[200px_1fr] xl:grid-cols-[200px_1fr_340px]">
      <aside className="border-b border-border p-2 md:border-b-0 md:border-r">
        <p className="meta-label px-2 py-1">Coleções</p>
        <button
          type="button"
          onClick={() => setCollectionId(undefined)}
          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${!collectionId ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
        >
          Todas <span className="font-mono text-xs">{allSources.data?.length ?? "…"}</span>
        </button>
        {collections.map((collection) => (
          <button
            type="button"
            key={collection.id}
            onClick={() => setCollectionId(collection.id)}
            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${collectionId === collection.id ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
          >
            {collection.name}
            <span className="font-mono text-xs">{collection.itemCount}</span>
          </button>
        ))}
        <div className="mt-3 border-t border-border pt-3">
          <label className="meta-label px-2" htmlFor="new-library-collection">
            Nova coleção
          </label>
          <input
            id="new-library-collection"
            value={newCollection}
            onChange={(event) => setNewCollection(event.target.value)}
            placeholder="Nome"
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void createCollection()}
            disabled={!newCollection.trim()}
            className="mt-1 h-9 w-full rounded-md bg-primary text-sm text-primary-foreground disabled:opacity-50"
          >
            Criar{activeId ? " e adicionar" : ""}
          </button>
          {actionError && (
            <p role="alert" className="mt-1 px-2 text-xs text-destructive">
              {actionError}
            </p>
          )}
        </div>
      </aside>
      <div className="min-w-0 md:border-r-0 xl:border-r xl:border-border">
        <label className="flex h-10 items-center gap-2 border-b border-border px-3 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Procurar nas referências</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, tipo ou identificador…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        {loading ? (
          <p className="p-6 text-sm italic text-muted-foreground">Abrindo índice local…</p>
        ) : error ? (
          <p role="alert" className="p-6 text-sm text-destructive">
            {errorMessage(error)}
          </p>
        ) : filtered.length ? (
          filtered.map((source) => (
            <ResourceRow
              key={source.id}
              source={source}
              authorNames={
                details?.source.id === source.id
                  ? details.authors.map((author) => author.canonicalName)
                  : []
              }
              active={source.id === activeId}
              onSelect={() => setSelectedId(source.id)}
            />
          ))
        ) : (
          <p className="p-6 text-sm italic text-muted-foreground">Nenhuma referência encontrada.</p>
        )}
        {details && (
          <div className="border-t border-border xl:hidden">
            <ResourceDetails details={details} onChanged={refreshDetails} />
          </div>
        )}
      </div>
      <aside className="hidden overflow-y-auto xl:block">
        {details ? (
          <ResourceDetails details={details} onChanged={refreshDetails} />
        ) : detailsQuery.error ? (
          <p role="alert" className="p-5 text-sm text-destructive">
            Os detalhes não puderam ser carregados: {errorMessage(detailsQuery.error)}
          </p>
        ) : (
          <p className="p-5 text-sm italic text-muted-foreground">Selecione uma referência.</p>
        )}
      </aside>
    </div>
  );
}
