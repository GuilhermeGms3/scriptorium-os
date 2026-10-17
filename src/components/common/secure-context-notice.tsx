import { AlertTriangle } from "lucide-react";

/** Shown before an import or a backup when the page is not in a secure context. */
export function SecureContextNotice({ problem }: { problem: string | null }) {
  if (!problem) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{problem}</span>
    </p>
  );
}
