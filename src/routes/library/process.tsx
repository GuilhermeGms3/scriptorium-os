import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, DatabaseZap, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { LibraryPipelineOverview } from "../../components/library/library-pipeline-overview";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { ImportPanel } from "../library";

export const Route = createFileRoute("/library/process")({
  head: () => ({ meta: [{ title: "Importar e processar — Scriptorium" }] }),
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
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="meta-label">Oficina da biblioteca</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold">
              Importar, desmontar e conectar
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Área operacional para PDFs, OCR, estrutura documental, ligações bíblicas, revisão e
              auditoria. O catálogo da Biblioteca permanece dedicado a encontrar e ler obras.
            </p>
          </div>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded border border-border px-2 py-1">
              <ShieldCheck className="size-3" /> dados privados locais
            </span>
            <span className="inline-flex items-center gap-1 rounded border border-border px-2 py-1">
              <DatabaseZap className="size-3" /> pipeline retomável
            </span>
          </div>
        </div>
      </header>

      <ImportPanel onImported={async () => undefined} />

      <section className="border-t border-border">
        <LibraryPipelineOverview />
      </section>
    </div>
  );
}
