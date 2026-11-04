/** Private workspace mutations; never initialize browser storage during SSR. */
export function notifyKnowledgeMutation(): void {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("scriptorium:knowledge-changed"));
}
