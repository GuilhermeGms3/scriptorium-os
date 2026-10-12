/**
 * Address the development server serves (`npm run dev`). Browsers expose `crypto.subtle` only in a
 * secure context, and OPFS data belongs to one exact origin (protocol, host and port).
 */
export const SECURE_APP_ADDRESS = "http://127.0.0.1:5173";

/** The part of the browser runtime this module depends on; injectable for tests. */
export interface CryptoRuntime {
  isSecureContext?: boolean;
  crypto?: { subtle?: Pick<SubtleCrypto, "digest"> };
}

export class InsecureContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsecureContextError";
  }
}

export function insecureContextMessage(operation = "A importação"): string {
  return `Abra o Scriptorium em ${SECURE_APP_ADDRESS}. ${operation} precisa de um endereço seguro.`;
}

/** Null when hashing works here; otherwise the message to show before importing or backing up. */
export function secureContextProblem(
  runtime: CryptoRuntime = globalThis as CryptoRuntime,
  operation?: string,
): string | null {
  return runtime.isSecureContext === false || !runtime.crypto?.subtle
    ? insecureContextMessage(operation)
    : null;
}

/** SHA-256 as lowercase hex, the single helper behind every checksum of the application. */
export async function sha256Hex(
  data: string | ArrayBuffer | Uint8Array,
  options: { operation?: string; runtime?: CryptoRuntime } = {},
): Promise<string> {
  const runtime = options.runtime ?? (globalThis as CryptoRuntime);
  const problem = secureContextProblem(runtime, options.operation);
  if (problem) throw new InsecureContextError(problem);
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const digest = await runtime.crypto!.subtle!.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}
