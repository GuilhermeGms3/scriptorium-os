import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BibliographicSource } from "../../lib/domain/bibliography";
import { LibraryRepository, type SourceDetails } from "../../lib/repositories/library-repository";
import { ResourceDetails } from "./resource-details";
import { ResourceRow } from "./resource-row";

type Collections = Awaited<ReturnType<typeof LibraryRepository.listCollections>>;

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
  const [sources, setSources] = useState<BibliographicSource[]>([]);
  const [collections, setCollections] = useState<Collections>([]);
  const [collectionId, setCollectionId] = useState<string>();
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSourceId);
  const [details, setDetails] = useState<SourceDetails | null>(null);
  const [query, setQuery] = useState("");
  const [newCollection, setNewCollection] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const reportCount = useRef(onCountChange);
  useEffect(() => {
    reportCount.current = onCountChange;
  }, [onCountChange]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [nextSources, nextCollections] = await Promise.all([
        LibraryRepository.listSources(collectionId ? { collectionId } : {}),
        LibraryRepository.listCollections(),
      ]);
      setSources(nextSources);
      setCollections(nextCollections);
      if (!collectionId) reportCount.current?.(nextSources.length);
      setSelectedId((current) =>
        current && nextSources.some((source) => source.id === current)
          ? current
          : nextSources[0]?.id,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);
  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }
    let active = true;
    void LibraryRepository.getSourceDetails(selectedId)
      .then((value) => {
        if (active) setDetails(value);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      active = false;
    };
  }, [selectedId]);
  const refreshDetails = useCallback(async () => {
    if (selectedId) setDetails(await LibraryRepository.getSourceDetails(selectedId));
  }, [selectedId]);

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
    const id = await LibraryRepository.createCollection(newCollection);
    if (selectedId) await LibraryRepository.addSourceToCollection(selectedId, id);
    setNewCollection("");
    setCollectionId(id);
    await refresh();
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
          Todas <span className="font-mono text-xs">{sources.length}</span>
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
            Criar{selectedId ? " e adicionar" : ""}
          </button>
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
            {error}
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
              active={source.id === selectedId}
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
        ) : (
          <p className="p-5 text-sm italic text-muted-foreground">Selecione uma referência.</p>
        )}
      </aside>
    </div>
  );
}
