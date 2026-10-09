import { z } from "zod";
import {
  KnowledgeProposalPayloadSchema,
  type KnowledgeProposal,
  type SemanticUnit,
} from "../domain/document-knowledge";
import type { PrivateDocument, PrivateDocumentPage } from "../domain/private-document";
import {
  DeterministicDocumentKnowledgeAnalyzer,
  type DocumentKnowledgeAnalysis,
  type DocumentKnowledgeAnalyzer,
  type DocumentKnowledgeAnalyzerCheckpoint,
  type IncrementalDocumentKnowledgeAnalysis,
} from "./document-knowledge-analyzer";

const PROVIDER_ID = "python-contextual-document-knowledge";
const PROVIDER_VERSION = "2";
const MAX_REMOTE_UNITS = 150;
const MAX_UNIT_CHARACTERS = 20_000;

const ProviderResponseSchema = z.object({
  analyzerId: z.literal("contextual-rule-analyzer"),
  analyzerRevision: z.literal("2"),
  proposals: z.array(
    z.object({
      unitId: z.string().min(1),
      payload: KnowledgeProposalPayloadSchema,
      confidence: z.number().min(0).max(1),
    }),
  ),
  checkpoint: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

function semanticEngineEndpoint(): string {
  const configured = import.meta.env["VITE_SEMANTIC_ENGINE_URL"];
  const raw =
    typeof configured === "string" && configured.trim() ? configured : "http://127.0.0.1:8018";
  const url = new URL(raw);
  if (url.username || url.password)
    throw new Error("A URL do motor semântico local não pode conter credenciais.");
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname))
    throw new Error("O analisador privado aceita somente um serviço no dispositivo local.");
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("A URL do motor semântico local precisa usar HTTP ou HTTPS.");
  return url.href.replace(/\/$/u, "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

async function providerProposal(
  documentId: string,
  unitId: string,
  payload: z.infer<typeof KnowledgeProposalPayloadSchema>,
  confidence: number,
): Promise<KnowledgeProposal> {
  const fingerprint = await sha256(JSON.stringify(payload));
  const timestamp = new Date().toISOString();
  return {
    id: `${documentId}:proposal:${unitId.split(":").at(-1)}:${payload.kind}:${fingerprint.slice(0, 16)}`,
    documentId,
    semanticUnitId: unitId,
    proposalKind: payload.kind,
    payload,
    method: "contextual-rule-analyzer:2",
    confidence,
    reviewStatus: "machine-proposed",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function enrich(
  documentId: string,
  units: readonly SemanticUnit[],
  checkpoint: DocumentKnowledgeAnalyzerCheckpoint,
): Promise<{ proposals: KnowledgeProposal[]; checkpoint: DocumentKnowledgeAnalyzerCheckpoint }> {
  let providerState = checkpoint.providerState ?? {};
  const proposals: KnowledgeProposal[] = [];
  for (let offset = 0; offset < units.length; offset += MAX_REMOTE_UNITS) {
    const batch = units.slice(offset, offset + MAX_REMOTE_UNITS);
    const oversized = batch.find((unit) => unit.text.length > MAX_UNIT_CHARACTERS);
    if (oversized)
      throw new Error(
        `A unidade ${oversized.ordinal + 1} excede o limite de ${MAX_UNIT_CHARACTERS} caracteres do analisador contextual.`,
      );
    const response = await fetch(`${semanticEngineEndpoint()}/v1/analyze/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        units: batch.map((unit) => ({
          id: unit.id,
          text: unit.text,
          kind: unit.kind,
          language: unit.language,
        })),
        checkpoint: providerState,
      }),
    });
    if (!response.ok)
      throw new Error(`O analisador contextual local não respondeu (${response.status}).`);
    const result = ProviderResponseSchema.parse(await response.json());
    const batchUnitIds = new Set(batch.map((unit) => unit.id));
    const foreignProposal = result.proposals.find((proposal) => !batchUnitIds.has(proposal.unitId));
    if (foreignProposal)
      throw new Error(
        `O analisador contextual retornou uma proposta para uma unidade fora do lote: ${foreignProposal.unitId}.`,
      );
    providerState = result.checkpoint;
    proposals.push(
      ...(await Promise.all(
        result.proposals.map((proposal) =>
          providerProposal(documentId, proposal.unitId, proposal.payload, proposal.confidence),
        ),
      )),
    );
  }
  return { proposals, checkpoint: { ...checkpoint, providerState } };
}

async function analyzeBatch(
  document: PrivateDocument,
  pages: readonly PrivateDocumentPage[],
  checkpoint?: DocumentKnowledgeAnalyzerCheckpoint,
): Promise<IncrementalDocumentKnowledgeAnalysis> {
  const baseline = await DeterministicDocumentKnowledgeAnalyzer.analyzeBatch!(
    document,
    pages,
    checkpoint,
  );
  const contextual = await enrich(document.id, baseline.units, baseline.checkpoint);
  const unique = new Map(
    [...baseline.proposals, ...contextual.proposals].map((proposal) => [proposal.id, proposal]),
  );
  return {
    nodes: baseline.nodes,
    units: baseline.units,
    proposals: [...unique.values()],
    checkpoint: contextual.checkpoint,
  };
}

export const PythonDocumentKnowledgeAnalyzer: DocumentKnowledgeAnalyzer = {
  id: PROVIDER_ID,
  version: PROVIDER_VERSION,
  async analyze(
    document: PrivateDocument,
    pages: readonly PrivateDocumentPage[],
  ): Promise<DocumentKnowledgeAnalysis> {
    const { checkpoint: _checkpoint, ...analysis } = await analyzeBatch(document, pages);
    return analysis;
  },
  analyzeBatch,
};
