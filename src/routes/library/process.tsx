import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, DatabaseZap, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { LibraryPipelineOverview } from "../../components/library/library-pipeline-overview";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { ImportPanel } from "../library";
import { InstallationMigration } from "../../components/library/installation-migration";
import { PageHeader } from "../../components/layout/page-header";

export const Route = createFileRoute("/library/process")({
  head: () => ({ meta: [{ title: "Adicionar livros — Scriptorium" }] }),
  component: LibraryProcessingPage,
});

function LibraryProcessingPage() {
  const { setPassageContext } = useWorkbench();
  useEffect(() => setPassageContext(null), [setPassageContext]);

  return (
    <div className="min-h-full overflow-y-auto">
      <header className="border-b border-border px-5 py-4 md:px-6">
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Voltar ao acervo
        </Link>
        <PageHeader
          className="mt-3 border-b-0 pb-0"
          eyebrow="Oficina da biblioteca"
          title="Importar, desmontar e conectar"
          description="Área operacional para PDFs, OCR, estrutura documental, ligações bíblicas, revisão e auditoria. O catálogo da Biblioteca permanece dedicado a encontrar e ler obras."
          actions={
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded border border-border px-2 py-1">
                <ShieldCheck className="size-3" /> dados privados locais
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-border px-2 py-1">
                <DatabaseZap className="size-3" /> pipeline retomável
              </span>
            </div>
          }
        />
      </header>

      <InstallationMigration />
      <ImportPanel onImported={async () => undefined} />

      <section className="border-t border-border">
        <LibraryPipelineOverview />
      </section>
    </div>
  );
}
