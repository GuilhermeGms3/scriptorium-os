import { CatchBoundary } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Keeps one failing panel (study panel, quick search, audio player) from taking the whole app
 * down: the panel shows a short message and the page, menus and reading keep working.
 */
export function PanelBoundary({
  where,
  resetKey,
  children,
}: {
  /** Where it happened, with its preposition: "no painel de estudo", "na busca rápida". */
  where: string;
  /** Changing it (for example, the page address) gives the panel a fresh try. */
  resetKey: string | number;
  children: ReactNode;
}) {
  return (
    <CatchBoundary
      getResetKey={() => resetKey}
      onCatch={(error) => console.error(`[problema ${where}]`, error)}
      errorComponent={({ reset }) => (
        <div role="alert" className="m-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p>Houve um problema {where}. O texto e o restante do app continuam funcionando.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 min-h-11 font-medium text-primary underline underline-offset-4"
          >
            Tentar de novo
          </button>
        </div>
      )}
    >
      {children}
    </CatchBoundary>
  );
}
