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

export interface LocalTranslationRequest {
  sourceKind: LocalTranslation["sourceKind"];
  sourceId: string;
  sourceLanguage: string;
  targetLanguage?: string;
  text: string;
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
  ): Promise<LocalTranslation> {
    const text = request.text.normalize("NFC").trim();
    if (!text) throw new Error("Não há texto para traduzir.");
    if (text.length > 50_000)
      throw new Error("O trecho excede o limite local de 50.000 caracteres.");
    const targetLanguage = request.targetLanguage ?? "pt-BR";
    const sourceChecksum = await sha256(text);
    const cached = await LocalTranslationRepository.findCached(
      {
        sourceKind: request.sourceKind,
        sourceId: request.sourceId,
        targetLanguage,
        sourceChecksum,
      },
      database,
    );
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 120_000);
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
        signal: controller.signal,
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError")
        throw new Error("O tradutor local excedeu o tempo limite de 120 segundos.");
      throw new Error("O tradutor local não respondeu.");
    } finally {
      globalThis.clearTimeout(timeout);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Tradutor local indisponível (${response.status})${detail ? `: ${detail.slice(0, 240)}` : "."}`,
      );
    }
    const result = TranslationResponseSchema.parse(await response.json());
    const timestamp = new Date().toISOString();
    const idSeed = `${request.sourceKind}:${request.sourceId}:${targetLanguage}:${sourceChecksum}:${result.model}`;
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
      ...(result.modelRevision ? { modelRevision: result.modelRevision } : {}),
      reviewStatus: "machine-generated",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await LocalTranslationRepository.save(value, database);
    return value;
  },
};
