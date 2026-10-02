import { z } from "zod";
import type { LocalTranslation } from "../domain/semantic-content";
import { LocalTranslationRepository } from "../repositories/local-translation-repository";
import type { WorkspaceDatabase } from "../workspace-runtime/workspace-database";

const TranslationResponseSchema = z.object({
  translatedText: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  modelRevision: z.string().optional(),
});

const TranslationModelInfoSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  modelRevision: z
    .string()
    .min(1)
    .refine((value) => value !== "main", {
      message: "O tradutor deve informar uma revisão imutável do modelo.",
    }),
});

export interface LocalTranslationRequest {
  sourceKind: LocalTranslation["sourceKind"];
  sourceId: string;
  sourceLanguage: string;
  targetLanguage?: string;
  text: string;
}

export interface LocalTranslationOptions {
  signal?: AbortSignal;
  infoTimeoutMs?: number;
  translationTimeoutMs?: number;
}

function abortScope(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): {
  signal: AbortSignal;
  dispose: () => void;
  timedOut: () => boolean;
} {
  const controller = new AbortController();
  let timeoutReached = false;
  const forwardAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", forwardAbort, { once: true });
  if (signal?.aborted) forwardAbort();
  const timeout = globalThis.setTimeout(() => {
    timeoutReached = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => {
      globalThis.clearTimeout(timeout);
      signal?.removeEventListener("abort", forwardAbort);
    },
    timedOut: () => timeoutReached,
  };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function endpoint(): string {
  const configured = import.meta.env["VITE_SEMANTIC_ENGINE_URL"];
  return typeof configured === "string" && configured.trim()
    ? configured.replace(/\/$/, "")
    : "http://127.0.0.1:8018";
}

export const LocalTranslationService = {
  async findCached(
    request: LocalTranslationRequest,
    database?: WorkspaceDatabase,
  ): Promise<LocalTranslation | null> {
    const text = request.text.normalize("NFC").trim();
    if (!text) return null;
    return LocalTranslationRepository.findCached(
      {
        sourceKind: request.sourceKind,
        sourceId: request.sourceId,
        targetLanguage: request.targetLanguage ?? "pt-BR",
        sourceChecksum: await sha256(text),
      },
      database,
    );
  },

  async translate(
    request: LocalTranslationRequest,
    database?: WorkspaceDatabase,
    options: LocalTranslationOptions = {},
  ): Promise<LocalTranslation> {
    const text = request.text.normalize("NFC").trim();
    if (!text) throw new Error("Não há texto para traduzir.");
    if (text.length > 50_000)
      throw new Error("O trecho excede o limite local de 50.000 caracteres.");
    const targetLanguage = request.targetLanguage ?? "pt-BR";
    const sourceChecksum = await sha256(text);
    const fallbackCached = await LocalTranslationRepository.findCached(
      {
        sourceKind: request.sourceKind,
        sourceId: request.sourceId,
        targetLanguage,
        sourceChecksum,
      },
      database,
    );

    const infoScope = abortScope(options.signal, options.infoTimeoutMs ?? 30_000);
    let info: z.infer<typeof TranslationModelInfoSchema>;
    try {
      const infoResponse = await fetch(`${endpoint()}/v1/info`, { signal: infoScope.signal });
      if (!infoResponse.ok)
        throw new Error(`Identidade do tradutor indisponível (${infoResponse.status}).`);
      info = TranslationModelInfoSchema.parse(await infoResponse.json());
    } catch (cause) {
      if (options.signal?.aborted) throw new DOMException("Tradução cancelada.", "AbortError");
      if (fallbackCached) return fallbackCached;
      if (infoScope.timedOut())
        throw new Error("A identificação do tradutor local excedeu 30 segundos.");
      throw new Error("O tradutor local não respondeu.");
    } finally {
      infoScope.dispose();
    }

    const exactCached = await LocalTranslationRepository.findCached(
      {
        sourceKind: request.sourceKind,
        sourceId: request.sourceId,
        targetLanguage,
        sourceChecksum,
        model: info.model,
        modelRevision: info.modelRevision,
      },
      database,
    );
    if (exactCached) return exactCached;

    const translationTimeoutMs = options.translationTimeoutMs ?? 600_000;
    const translationScope = abortScope(options.signal, translationTimeoutMs);
    let response: Response;
    try {
      response = await fetch(`${endpoint()}/v1/translate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLanguage: request.sourceLanguage,
          targetLanguage,
        }),
        signal: translationScope.signal,
      });
    } catch (cause) {
      if (options.signal?.aborted) throw new DOMException("Tradução cancelada.", "AbortError");
      if (fallbackCached) return fallbackCached;
      if (translationScope.timedOut())
        throw new Error(
          `O tradutor local excedeu ${Math.round(translationTimeoutMs / 1_000)} segundos.`,
        );
      throw cause;
    } finally {
      translationScope.dispose();
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Tradutor local indisponível (${response.status})${detail ? `: ${detail.slice(0, 240)}` : "."}`,
      );
    }
    const result = TranslationResponseSchema.parse(await response.json());
    const modelRevision = result.modelRevision ?? info.modelRevision;
    const timestamp = new Date().toISOString();
    const idSeed = `${request.sourceKind}:${request.sourceId}:${targetLanguage}:${sourceChecksum}:${result.provider}:${result.model}:${modelRevision}`;
    const value: LocalTranslation = {
      id: `translation:${await sha256(idSeed)}`,
      sourceKind: request.sourceKind,
      sourceId: request.sourceId,
      sourceLanguage: request.sourceLanguage,
      targetLanguage,
      sourceChecksum,
      translatedText: result.translatedText,
      provider: result.provider,
      model: result.model,
      modelRevision,
      reviewStatus: "machine-generated",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await LocalTranslationRepository.save(value, database);
    return value;
  },
};
