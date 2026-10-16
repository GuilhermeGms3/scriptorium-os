import { ChevronRight, Cog } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BookReadingService } from "../../lib/application/book-reading-service";
import type { PrivateDocument, PrivateDocumentPage } from "../../lib/domain/private-document";
import { PrivateLinkCard } from "../scripture/private-verse-knowledge";
import { BookContext } from "./book-context";
import { DocumentKnowledgeWorkbench } from "./document-knowledge-workbench";
import { DocumentProfileControl } from "./document-profile-control";
import { documentProcessingStatusLine } from "./document-processing-status";
import { PageTranslation } from "./page-translation";
import type { PageLinks } from "./use-page-links";

export type DocumentPanelTab = "links" | "structure" | "translation" | "about";

type BookContextValue = Awaited<ReturnType<typeof BookReadingService.context>>;

function PageLinksTab({ links }: { links: PageLinks }) {
  if (links.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        As ligações desta página não puderam ser carregadas: {links.error}
      </p>
    );
  if (links.items === undefined)
    return <p className="text-sm italic text-muted-foreground">Procurando referências…</p>;
  if (!links.analyzed)
    return (
      <p className="text-sm text-muted-foreground">
        Este livro ainda não foi desmontado. Abra “Processamento”, logo abaixo, e use “Desmontar
        livro” para encontrar as referências bíblicas.
      </p>
    );
  if (!links.items.length)
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma referência bíblica foi encontrada nesta página.
      </p>
    );
  return (
    <div className="space-y-2">
      {links.items.map((item) => (
        <PrivateLinkCard key={item.id} item={item} context="book-reader" />
      ))}
    </div>
  );
}

function StructureTab({
  context,
  pageIndex,
  onNavigatePage,
}: {
  context: BookContextValue | undefined;
  pageIndex: number;
  onNavigatePage: (pageIndex: number) => void;
}) {
  const nodes = (context?.nodes ?? []).filter((node) => node.kind !== "book");
  const current = [...nodes].reverse().find((node) => node.pageStart <= pageIndex);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Detectada pelo motor a partir dos títulos do livro; não é um sumário editorial.
      </p>
      {!context ? (
        <p className="text-sm italic text-muted-foreground">Carregando a estrutura…</p>
      ) : !nodes.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhum capítulo ou seção foi detectado ainda.
        </p>
      ) : (
        <nav aria-label="Estrutura do livro" className="space-y-0.5">
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => onNavigatePage(node.pageStart)}
              aria-current={node.id === current?.id ? "location" : undefined}
              className={`block w-full rounded-md border-l-2 px-2.5 py-1.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${node.id === current?.id ? "border-primary bg-accent/60 font-medium" : "border-border"}`}
            >
              {node.title ?? node.kind}{" "}
              <span className="text-xs text-muted-foreground">· p. {node.pageStart + 1}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function TranslationTab({
  document,
  page,
}: {
  document: PrivateDocument;
  page: PrivateDocumentPage | null | undefined;
}) {
  if (!page) return <p className="text-sm italic text-muted-foreground">Carregando a página…</p>;
  if (!document.language)
    return (
      <p className="text-sm text-muted-foreground">
        O idioma deste livro não foi identificado, por isso a tradução automática não é oferecida.
      </p>
    );
  if (document.language.startsWith("pt"))
    return <p className="text-sm text-muted-foreground">Esta página já está em português.</p>;
  if (!page.text.trim())
    return (
      <p className="text-sm text-muted-foreground">
        Esta página não tem texto para traduzir (ainda precisa de OCR).
      </p>
    );
  return <PageTranslation id={page.id} text={page.text} language={document.language} />;
}

/**
 * Everything around the page being read, in four tabs, with the technical tools folded at the
 * end so they never compete with reading.
 */
export function DocumentSidePanel({
  document,
  page,
  pageIndex,
  links,
  context,
  contextError,
  word,
  onWord,
  tab,
  onTabChange,
  onNavigatePage,
}: {
  document: PrivateDocument;
  page: PrivateDocumentPage | null | undefined;
  pageIndex: number;
  links: PageLinks;
  context: BookContextValue | undefined;
  contextError: string | undefined;
  word: string;
  onWord: (word: string) => void;
  tab: DocumentPanelTab;
  onTabChange: (tab: DocumentPanelTab) => void;
  onNavigatePage: (pageIndex: number) => void;
}) {
  const [processingOpen, setProcessingOpen] = useState(false);
  const pending = (links.items ?? []).filter((item) => item.reviewState === "pending").length;
  return (
    <div className="flex min-h-full flex-col">
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as DocumentPanelTab)}
        className="flex-1 p-4"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="links" className="gap-1.5 text-sm">
            Ligações
            {pending > 0 && (
              <span className="rounded-full border border-dashed border-amber-500/70 px-1.5 text-xs text-amber-700 dark:text-amber-400">
                {pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="structure" className="text-sm">
            Estrutura
          </TabsTrigger>
          <TabsTrigger value="translation" className="text-sm">
            Tradução
          </TabsTrigger>
          <TabsTrigger value="about" className="text-sm">
            Sobre o livro
          </TabsTrigger>
        </TabsList>
        <TabsContent value="links" className="mt-4">
          <h2 className="sr-only">Ligações desta página</h2>
          <PageLinksTab links={links} />
        </TabsContent>
        <TabsContent value="structure" className="mt-4">
          <h2 className="sr-only">Estrutura do livro</h2>
          <StructureTab context={context} pageIndex={pageIndex} onNavigatePage={onNavigatePage} />
        </TabsContent>
        <TabsContent value="translation" className="mt-4">
          <h2 className="sr-only">Tradução desta página</h2>
          <TranslationTab document={document} page={page} />
        </TabsContent>
        <TabsContent value="about" className="mt-4 space-y-4">
          <h2 className="sr-only">Sobre o livro</h2>
          <DocumentProfileControl document={document} />
          <BookContext
            context={context}
            contextError={contextError}
            word={word}
            onWord={onWord}
            embedded
          />
        </TabsContent>
      </Tabs>

      <section aria-labelledby="document-processing-title" className="border-t border-border">
        <button
          type="button"
          aria-expanded={processingOpen}
          aria-controls="document-processing-panel"
          onClick={() => setProcessingOpen((value) => !value)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <Cog className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span id="document-processing-title" className="block text-sm font-medium">
              Processamento
            </span>
            <span className="block text-xs text-muted-foreground">
              {documentProcessingStatusLine(context ? context.summary : undefined)}
            </span>
          </span>
          <ChevronRight
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${processingOpen ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        </button>
        {processingOpen && (
          <div id="document-processing-panel" className="px-4 pb-4">
            <p className="text-xs text-muted-foreground">
              Desmontar, OCR, auditoria e reprocessamento. Nada aqui é necessário para ler o livro.
            </p>
            <DocumentKnowledgeWorkbench
              documentId={document.id}
              {...(document.language ? { documentLanguage: document.language } : {})}
              onNavigatePage={onNavigatePage}
            />
          </div>
        )}
      </section>
    </div>
  );
}
