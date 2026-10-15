import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookPlus, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkbench } from "../lib/workbench/workbench-context";
import {
  PrimarySourceRepository,
  type PrimarySourceWorkSummary,
} from "../lib/repositories/primary-source-repository";
import type { PrivateDocument } from "../lib/domain/private-document";
import type { DocumentProfileKind } from "../lib/domain/document-profile";
import { PrivateDocumentRepository } from "../lib/repositories/private-document-repository";
import { DocumentProcessingRepository } from "../lib/repositories/document-processing-repository";
import { useCurrentOrigin } from "../lib/workspace-runtime/use-secure-context";
import { PageContainer } from "../components/layout/page-container";
import { PageHeader } from "../components/layout/page-header";
import { PrivateBooksSection } from "../components/library/private-books-section";
import { PrimaryWorksSection } from "../components/library/primary-works-section";
import { NagHammadiSection } from "../components/library/nag-hammadi-section";
import { ReferencesSection } from "../components/library/references-section";
import { BibliographicImportForm } from "../components/library/import-panel";
import { LibraryProcessingSection } from "../components/library/library-processing-section";

interface LibrarySearch {
  source?: string;
}
type CatalogTab = "primary" | "nag-hammadi" | "references" | "bibliographic-import";

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch =>
    typeof search["source"] === "string" ? { source: search["source"] } : {},
  head: () => ({ meta: [{ title: "Biblioteca acadêmica — Scriptorium" }] }),
  component: Outlet,
});

const STORAGE_DESCRIPTIONS = {
  installation: "Acervo da instalação, compartilhado entre navegadores deste computador.",
  opfs: "Acervo guardado neste navegador.",
  loading: "Abrindo o acervo…",
  memory: "Armazenamento temporário: o que for adicionado agora pode se perder ao fechar.",
  unavailable: "O acervo não pôde ser aberto.",
} as const;

/**
 * The library: the reader's own books first, then the installed catalog and bibliographic
 * records in tabs, and batch processing folded at the end.
 */
export function LibraryPage() {
  const { source: sourceParam } = Route.useSearch();
  const { setPassageContext, workspacePersistence } = useWorkbench();
  const origin = useCurrentOrigin();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [privateDocuments, setPrivateDocuments] = useState<PrivateDocument[]>([]);
  const [storedProfiles, setStoredProfiles] = useState<ReadonlyMap<string, DocumentProfileKind>>(
    () => new Map(),
  );
  const [primaryWorks, setPrimaryWorks] = useState<PrimarySourceWorkSummary[]>([]);
  const [referenceCount, setReferenceCount] = useState<number>();
  const [tab, setTab] = useState<CatalogTab>(sourceParam ? "references" : "primary");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [documents, profiles, works] = await Promise.all([
        PrivateDocumentRepository.listDocuments(),
        DocumentProcessingRepository.listProfiles(),
        PrimarySourceRepository.listWorks(),
      ]);
      setPrivateDocuments(documents);
      setStoredProfiles(new Map(profiles.map((entry) => [entry.documentId, entry.profile])));
      setPrimaryWorks(works);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => setPassageContext(null), [setPassageContext]);
  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);
  const installedWorkIds = useMemo(
    () => new Set(primaryWorks.map((work) => work.id)),
    [primaryWorks],
  );
  const reload = useCallback(async () => setRefreshKey((value) => value + 1), []);

  return (
    <PageContainer width="wide" className="space-y-8">
      <PageHeader
        eyebrow="Biblioteca acadêmica"
        title="Biblioteca"
        description={STORAGE_DESCRIPTIONS[workspacePersistence]}
        actions={
          <>
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="size-4" aria-hidden="true" /> Atualizar
            </button>
            <Link
              to="/library/process"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BookPlus className="size-4" aria-hidden="true" /> Adicionar livro
            </Link>
          </>
        }
      />

      <PrivateBooksSection
        documents={privateDocuments}
        storedProfiles={storedProfiles}
        loading={loading}
        {...(error ? { error } : {})}
        {...(origin ? { origin } : {})}
        emptyHint={
          workspacePersistence === "installation"
            ? "Adicione seus PDFs ou transfira o acervo completo do navegador onde estão os seus livros."
            : "Seus livros podem estar em outro endereço (por exemplo, localhost:8080). Abra-o, exporte o backup e importe aqui, ou adicione os PDFs de novo."
        }
      />

      <section aria-labelledby="library-catalog-title" className="space-y-3">
        <h2 id="library-catalog-title" className="font-serif text-lg font-semibold">
          Catálogo e referências
        </h2>
        <Tabs value={tab} onValueChange={(value) => setTab(value as CatalogTab)}>
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="primary" className="text-sm">
              Fontes primárias · {primaryWorks.length}
            </TabsTrigger>
            <TabsTrigger value="nag-hammadi" className="text-sm">
              Nag Hammadi · 52
            </TabsTrigger>
            <TabsTrigger value="references" className="text-sm">
              Referências e coleções{referenceCount !== undefined ? ` · ${referenceCount}` : ""}
            </TabsTrigger>
            <TabsTrigger value="bibliographic-import" className="text-sm">
              Importação bibliográfica
            </TabsTrigger>
          </TabsList>
          <TabsContent value="primary" className="mt-4">
            <PrimaryWorksSection works={primaryWorks} />
          </TabsContent>
          <TabsContent value="nag-hammadi" className="mt-4">
            <NagHammadiSection installedWorkIds={installedWorkIds} />
          </TabsContent>
          <TabsContent value="references" className="mt-4" forceMount hidden={tab !== "references"}>
            <ReferencesSection
              refreshKey={refreshKey}
              {...(sourceParam ? { initialSourceId: sourceParam } : {})}
              onCountChange={setReferenceCount}
            />
          </TabsContent>
          <TabsContent value="bibliographic-import" className="mt-4 max-w-4xl space-y-2">
            <p className="text-sm text-muted-foreground">
              Cole registros em CSL-JSON, BibTeX ou RIS. Só os metadados entram na biblioteca.
            </p>
            <BibliographicImportForm onImported={reload} />
          </TabsContent>
        </Tabs>
      </section>

      <LibraryProcessingSection refreshKey={refreshKey} />
    </PageContainer>
  );
}
