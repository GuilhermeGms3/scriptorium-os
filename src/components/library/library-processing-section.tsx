import { ChevronRight, Cog } from "lucide-react";
import { useEffect, useState } from "react";
import {
  LibraryCoverageService,
  type LibraryQuickSummary,
} from "../../lib/application/library-coverage-service";
import { LibraryPipelineOverview } from "./library-pipeline-overview";
import { processingSummaryLine } from "./processing-summary";

/**
 * Batch processing of the whole library, folded by default: one line says where things stand;
 * the full pipeline and coverage open only when asked (and only then are they computed).
 */
export function LibraryProcessingSection({ refreshKey }: { refreshKey: number }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<LibraryQuickSummary>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void LibraryCoverageService.quickSummary().then(
      (value) => {
        if (active) setSummary(value);
      },
      (cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <section aria-labelledby="library-processing-title" className="rounded-md border border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="library-processing-panel"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Cog className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span id="library-processing-title" className="block font-serif text-lg font-semibold">
            Processamento
          </span>
          <span className="block text-sm text-muted-foreground">
            {error
              ? `Estado indisponível: ${error}`
              : summary
                ? processingSummaryLine(summary)
                : "Calculando o estado dos livros…"}
          </span>
        </span>
        <ChevronRight
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id="library-processing-panel" className="border-t border-border">
          <LibraryPipelineOverview />
        </div>
      )}
    </section>
  );
}
