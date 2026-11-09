import { useEffect, useState } from "react";
import { secureContextProblem } from "./secure-context";

/**
 * Client-only checks. Both start as null so server markup and the first client render agree; the
 * browser value arrives right after mounting.
 */
export function useSecureContextProblem(operation?: string): string | null {
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => setProblem(secureContextProblem(undefined, operation)), [operation]);
  return problem;
}

/** Origin that owns this browser's OPFS data, e.g. "http://127.0.0.1:5173". */
export function useCurrentOrigin(): string | null {
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}
