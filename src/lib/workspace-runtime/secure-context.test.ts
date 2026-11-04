import { describe, expect, it } from "vitest";
import {
  InsecureContextError,
  SECURE_APP_ADDRESS,
  insecureContextMessage,
  secureContextProblem,
  sha256Hex,
} from "./secure-context";

const subtle = globalThis.crypto.subtle;

describe("secure context helper", () => {
  it("hashes like the previous per-module helpers in a secure context", async () => {
    const runtime = { isSecureContext: true, crypto: { subtle } };
    expect(secureContextProblem(runtime)).toBeNull();
    expect(await sha256Hex("abc", { runtime })).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(await sha256Hex(new TextEncoder().encode("abc"), { runtime })).toBe(
      await sha256Hex("abc", { runtime }),
    );
    expect(await sha256Hex(new TextEncoder().encode("abc").buffer, { runtime })).toBe(
      await sha256Hex("abc", { runtime }),
    );
  });

  it("explains how to open the app when the context is not secure", async () => {
    const runtime = { isSecureContext: false, crypto: { subtle } };
    expect(secureContextProblem(runtime)).toBe(
      "Abra o Scriptorium em http://127.0.0.1:5173. A importação precisa de um endereço seguro.",
    );
    await expect(sha256Hex("abc", { runtime })).rejects.toThrow(InsecureContextError);
    await expect(sha256Hex("abc", { runtime })).rejects.toThrow(insecureContextMessage());
  });

  it("explains the same when crypto.subtle is missing, instead of failing on digest", async () => {
    for (const runtime of [{ crypto: {} }, {}]) {
      expect(secureContextProblem(runtime)).toBe(insecureContextMessage());
      await expect(sha256Hex("abc", { runtime })).rejects.toThrow(
        `Abra o Scriptorium em ${SECURE_APP_ADDRESS}.`,
      );
    }
  });

  it("names the operation that needs the secure address", () => {
    expect(insecureContextMessage("O backup")).toBe(
      "Abra o Scriptorium em http://127.0.0.1:5173. O backup precisa de um endereço seguro.",
    );
  });
});
