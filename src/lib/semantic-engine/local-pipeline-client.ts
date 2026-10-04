import { z } from "zod";
import { DocumentPassageSchema } from "../domain/document-knowledge";

export const PipelinePassageSchema = DocumentPassageSchema;
export const PipelineSettingsSchema = z.object({
  editionId: z.string().min(1),
  useLlm: z.boolean(),
  sourceSchemeConfirmed: z.boolean(),
});
export const PipelineCandidateSchema = z.object({
  id: z.string().min(1),
  editionId: z.string().min(1),
  text: z.string().min(1),
  passage: PipelinePassageSchema,
});
export const PipelineInfoSchema = z.object({
  version: z.string(),
  ocrAvailable: z.boolean(),
  retrieval: z.string(),
  models: z.object({
    embedding: z.object({
      configured: z.boolean(),
      model: z.string().optional(),
      revision: z.string().optional(),
    }),
    llm: z.object({
      configured: z.boolean(),
      model: z.string().optional(),
      revision: z.string().optional(),
    }),
  }),
});
export const PipelineLinkSchema = z.object({
  unitId: z.string(),
  retrieval: z.string(),
  candidates: z.array(PipelineCandidateSchema).max(8),
  status: z.enum(["needs-review", "abstained"]),
  model: z.string().optional(),
  modelRevision: z.string().optional(),
  decision: z
    .object({
      candidateId: z.string(),
      evidenceQuote: z.string().min(1),
      evidenceStart: z.number().int().nonnegative(),
      evidenceEnd: z.number().int().positive(),
      relationType: z.enum(["discusses", "alludes-to"]),
      rationale: z.string(),
      passage: PipelinePassageSchema,
      editionId: z.string(),
    })
    .nullable(),
});
export const OcrPageSchema = z.object({
  text: z.string().max(200_000),
  method: z.string(),
  revision: z.string(),
  blocks: z
    .array(
      z.object({
        startOffset: z.number().int().nonnegative(),
        endOffset: z.number().int().positive(),
        bbox: z.tuple([
          z.number().min(0).max(1),
          z.number().min(0).max(1),
          z.number().min(0).max(1),
          z.number().min(0).max(1),
        ]),
        kind: z.literal("line"),
      }),
    )
    .max(20_000),
});
export async function pipelineRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const configured = import.meta.env["VITE_SEMANTIC_ENGINE_URL"];
  const url = new URL(
    typeof configured === "string" && configured.trim() ? configured : "http://127.0.0.1:8018",
  );
  if (
    !["127.0.0.1", "localhost", "[::1]", "::1"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new Error("O pipeline privado exige um serviço HTTP local sem credenciais.");
  const response = await fetch(`${url.href.replace(/\/$/u, "")}/v1/pipeline/${path}`, {
    method: body === undefined ? "GET" : "POST",
    redirect: "error",
    credentials: "omit",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(150_000)])
      : AbortSignal.timeout(150_000),
  });
  if (!response.ok)
    throw new Error(
      `Serviço local indisponível (${response.status}). Verifique modelos, OCR e configuração.`,
    );
  return schema.parse(await response.json());
}
