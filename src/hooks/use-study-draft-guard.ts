import { useBlocker } from "@tanstack/react-router";

/** Covers internal routes and browser reload/close. Never persist a draft as a published note. */
export function useStudyDraftGuard(dirty: boolean): void {
  useBlocker({
    enableBeforeUnload: dirty,
    shouldBlockFn: () => {
      if (!dirty) return false;
      if (!window.confirm("Sair e descartar as alterações da nota ainda não salvas?")) return true;
      return false;
    },
  });
}
