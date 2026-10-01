import type { PrivateDocument, PrivateDocumentPage } from "../domain/private-document";
import type {
  DocumentNode,
  KnowledgeProposal,
  KnowledgeProposalPayload,
  SemanticUnit,
} from "../domain/document-knowledge";
import { analyzePrivateDocumentPage } from "./deterministic-semantic-analyzer";

export interface DocumentKnowledgeAnalysis {
  nodes: DocumentNode[];
  units: SemanticUnit[];
  proposals: KnowledgeProposal[];
}

export interface DocumentKnowledgeAnalyzer {
  readonly id: string;
  readonly version: string;
  analyze(
    document: PrivateDocument,
    pages: readonly PrivateDocumentPage[],
  ): Promise<DocumentKnowledgeAnalysis>;
}

export const DETERMINISTIC_DOCUMENT_ANALYZER_ID = "deterministic-document-knowledge";
export const DETERMINISTIC_DOCUMENT_ANALYZER_VERSION = "1";

interface UnitDraft extends SemanticUnit {
  domains: { domain: string; evidence: string[]; confidence: number }[];
  passageLinks: Awaited<ReturnType<typeof analyzePrivateDocumentPage>>[number]["passageLinks"];
}

const ASSERTION_PATTERN =
  /\b(?:é|são|significa|representa|afirma|sustenta|argumenta|conclui|indica|demonstra|defende|is|are|means|represents|states|argues|concludes|indicates|demonstrates)\b/iu;
const ARGUMENT_MARKER = /\b(porque|pois|portanto|logo|because|therefore|thus)\b/iu;
const TERMINAL_PATTERN = /[.!?…][”"')\]]?$/u;
const CONTINUATION_PATTERN = /^\p{Ll}/u;

const CONTROLLED_ENTITIES = [
  { pattern: /\bLogos\b/giu, label: "Logos", entityType: "concept" as const },
  { pattern: /\bTrindade\b|\bTrinity\b/giu, label: "Trindade", entityType: "concept" as const },
  {
    pattern: /\bCristologia\b|\bChristology\b/giu,
    label: "Cristologia",
    entityType: "concept" as const,
  },
  { pattern: /\bAgostinho\b|\bAugustine\b/giu, label: "Agostinho", entityType: "person" as const },
  { pattern: /\bOrígenes\b|\bOrigen\b/giu, label: "Orígenes", entityType: "person" as const },
  {
    pattern: /\bTomás de Aquino\b|\bThomas Aquinas\b/giu,
    label: "Tomás de Aquino",
    entityType: "person" as const,
  },
] as const;

function normalizeTitle(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function nodeKind(title: string): DocumentNode["kind"] {
  if (/^(?:parte|part)\s+[\divxlcdm]+\b/iu.test(title)) return "part";
  if (/^(?:cap[ií]tulo|chapter)\s+[\divxlcdm]+\b/iu.test(title)) return "chapter";
  if (/^(?:referências|referencias|bibliografia|references|bibliography)\b/iu.test(title))
    return "bibliography";
  if (/^(?:prefácio|prefacio|introdução|introducao|foreword|preface|introduction)\b/iu.test(title))
    return "front-matter";
  if (
    /^(?:conclusão|conclusao|apêndice|apendice|índice|indice|conclusion|appendix|index)\b/iu.test(
      title,
    )
  )
    return "back-matter";
  const numbered = title.match(/^(\d+(?:\.\d+)+)\b/u)?.[1];
  if (numbered && numbered.split(".").length >= 3) return "subsection";
  return "section";
}

function unitKind(
  structuralKind: "heading" | "paragraph" | "list-item" | "footnote" | "unknown",
  text: string,
): SemanticUnit["kind"] {
  if (structuralKind === "heading") return "heading";
  if (structuralKind === "footnote") return "footnote";
  if (structuralKind === "list-item") return "list-item";
  if (/^(?:[-–—]?\s*)?["“][\s\S]{20,}["”]$/u.test(text.trim())) return "quotation";
  if (structuralKind === "paragraph") return "paragraph";
  return "unknown";
}

function sentenceCandidates(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+(?=\p{Lu}|["“])/u)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 800);
}

function argumentPayload(sentence: string): KnowledgeProposalPayload | null {
  const match = ARGUMENT_MARKER.exec(sentence);
  if (!match?.index) return null;
  const before = sentence
    .slice(0, match.index)
    .replace(/[,:;\s]+$/u, "")
    .trim();
  const after = sentence
    .slice(match.index + match[0].length)
    .replace(/^[,:;\s]+/u, "")
    .trim();
  if (before.length < 15 || after.length < 15) return null;
  const conclusionFirst = /^(porque|pois|because)$/iu.test(match[0]);
  return {
    kind: "argument",
    conclusion: conclusionFirst ? before : after,
    premises: [conclusionFirst ? after : before],
    marker: match[0],
  };
}

async function proposalId(
  documentId: string,
  unitId: string,
  payload: KnowledgeProposalPayload,
): Promise<string> {
  const fingerprint = await sha256(JSON.stringify(payload));
  return `${documentId}:proposal:${unitId.split(":").at(-1)}:${payload.kind}:${fingerprint.slice(0, 16)}`;
}

async function proposalsForUnit(
  document: PrivateDocument,
  unit: UnitDraft,
): Promise<KnowledgeProposal[]> {
  if (unit.kind === "heading" || unit.kind === "unknown") return [];
  const drafts: { payload: KnowledgeProposalPayload; confidence: number }[] = [];
  for (const domain of unit.domains) {
    drafts.push({
      payload: {
        kind: "topic-assignment",
        domain: domain.domain as Extract<
          KnowledgeProposalPayload,
          { kind: "topic-assignment" }
        >["domain"],
        evidence: domain.evidence,
      },
      confidence: domain.confidence,
    });
  }
  for (const link of unit.passageLinks) {
    drafts.push({
      payload: {
        kind: "passage-relation",
        rawReference: link.rawReference,
        relationType: link.relationType,
        passage: {
          workId: link.workId,
          bookId: link.bookId,
          chapter: link.chapter,
          ...(link.verseStart !== undefined ? { verseStart: link.verseStart } : {}),
          ...(link.verseEnd !== undefined ? { verseEnd: link.verseEnd } : {}),
          versificationSchemeId: link.versificationSchemeId,
        },
      },
      confidence: link.confidence,
    });
  }
  for (const match of unit.text.matchAll(/["“]([^"”]{20,600})["”]/gu)) {
    drafts.push({
      payload: { kind: "citation", quotedText: match[1]!.trim(), citationKind: "possible-quote" },
      confidence: 0.62,
    });
  }
  for (const entity of CONTROLLED_ENTITIES) {
    entity.pattern.lastIndex = 0;
    if (entity.pattern.test(unit.text))
      drafts.push({
        payload: { kind: "entity", label: entity.label, entityType: entity.entityType },
        confidence: 0.7,
      });
  }
  for (const sentence of sentenceCandidates(unit.text).slice(0, 8)) {
    if (ASSERTION_PATTERN.test(sentence))
      drafts.push({
        payload: {
          kind: "claim",
          proposition: sentence,
          claimKind: "academic-hypothesis",
          qualifiers: [],
        },
        confidence: 0.55,
      });
    const argument = argumentPayload(sentence);
    if (argument) drafts.push({ payload: argument, confidence: 0.58 });
  }
  const now = new Date().toISOString();
  const unique = new Map<string, { payload: KnowledgeProposalPayload; confidence: number }>();
  for (const draft of drafts) unique.set(JSON.stringify(draft.payload), draft);
  return Promise.all(
    [...unique.values()].map(async (draft) => ({
      id: await proposalId(document.id, unit.id, draft.payload),
      documentId: document.id,
      semanticUnitId: unit.id,
      proposalKind: draft.payload.kind,
      payload: draft.payload,
      method: `${DETERMINISTIC_DOCUMENT_ANALYZER_ID}:${DETERMINISTIC_DOCUMENT_ANALYZER_VERSION}`,
      confidence: draft.confidence,
      reviewStatus: "machine-proposed" as const,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

async function analyzeDeterministically(
  document: PrivateDocument,
  pages: readonly PrivateDocumentPage[],
): Promise<DocumentKnowledgeAnalysis> {
  const method = `${DETERMINISTIC_DOCUMENT_ANALYZER_ID}:${DETERMINISTIC_DOCUMENT_ANALYZER_VERSION}`;
  const rootId = `${document.id}:node:book`;
  const nodes: DocumentNode[] = [
    {
      id: rootId,
      documentId: document.id,
      kind: "book",
      title: document.title,
      ordinal: 0,
      pageStart: 0,
      pageEnd: Math.max(0, document.pageCount - 1),
      method,
      confidence: 1,
      reviewStatus: "accepted",
    },
  ];
  const units: UnitDraft[] = [];
  let currentPartId: string | undefined;
  let currentChapterId: string | undefined;
  let currentSectionId: string | undefined;

  for (const page of pages) {
    const bundles = page.text ? await analyzePrivateDocumentPage(document, page) : [];
    for (const bundle of bundles) {
      const kind = unitKind(bundle.segment.structuralKind, bundle.text);
      if (kind === "heading") {
        const title = normalizeTitle(bundle.text);
        const kindForNode = nodeKind(title);
        const id = `${document.id}:node:${nodes.length}:${(await sha256(title)).slice(0, 12)}`;
        const parentId =
          kindForNode === "part" || kindForNode === "front-matter" || kindForNode === "back-matter"
            ? rootId
            : kindForNode === "chapter"
              ? (currentPartId ?? rootId)
              : kindForNode === "subsection"
                ? (currentSectionId ?? currentChapterId ?? currentPartId ?? rootId)
                : (currentChapterId ?? currentPartId ?? rootId);
        nodes.push({
          id,
          documentId: document.id,
          parentId,
          kind: kindForNode,
          title,
          ordinal: nodes.length,
          pageStart: page.pageIndex,
          pageEnd: page.pageIndex,
          method,
          confidence: kindForNode === "section" ? 0.68 : 0.82,
          reviewStatus: "machine-proposed",
        });
        if (kindForNode === "part") {
          currentPartId = id;
          currentChapterId = undefined;
          currentSectionId = undefined;
        } else if (kindForNode === "chapter") {
          currentChapterId = id;
          currentSectionId = undefined;
        } else if (kindForNode === "section" || kindForNode === "subsection") {
          currentSectionId = id;
        }
      }
      const activeNodeId = currentSectionId ?? currentChapterId ?? currentPartId ?? rootId;
      const previous = units.at(-1);
      const continuesPrevious =
        kind === "paragraph" &&
        previous?.kind === "paragraph" &&
        previous.spans.at(-1)?.pageIndex === page.pageIndex - 1 &&
        !TERMINAL_PATTERN.test(previous.text.trim()) &&
        CONTINUATION_PATTERN.test(bundle.text.trim());
      if (continuesPrevious && previous) {
        previous.text = `${previous.text.trimEnd()} ${bundle.text.trimStart()}`;
        previous.textChecksum = await sha256(previous.text);
        previous.spans.push({
          unitId: previous.id,
          pageId: page.id,
          pageIndex: page.pageIndex,
          startOffset: bundle.segment.startOffset,
          endOffset: bundle.segment.endOffset,
          ordinal: previous.spans.length,
        });
        previous.domains.push(
          ...bundle.classifications.map((item) => ({
            domain: item.domain,
            evidence: item.evidence,
            confidence: item.score,
          })),
        );
        previous.passageLinks.push(...bundle.passageLinks);
        continue;
      }
      const checksum = await sha256(bundle.text);
      const id = `${document.id}:unit:${units.length + 1}:${checksum.slice(0, 12)}`;
      units.push({
        id,
        documentId: document.id,
        documentNodeId: activeNodeId,
        kind,
        ordinal: units.length,
        textChecksum: checksum,
        language: document.language ?? "und",
        method,
        spans: [
          {
            unitId: id,
            pageId: page.id,
            pageIndex: page.pageIndex,
            startOffset: bundle.segment.startOffset,
            endOffset: bundle.segment.endOffset,
            ordinal: 0,
          },
        ],
        text: bundle.text,
        domains: bundle.classifications.map((item) => ({
          domain: item.domain,
          evidence: item.evidence,
          confidence: item.score,
        })),
        passageLinks: [...bundle.passageLinks],
      });
    }
  }

  const proposals = (
    await Promise.all(units.map((unit) => proposalsForUnit(document, unit)))
  ).flat();
  return {
    nodes,
    units: units.map(({ domains: _domains, passageLinks: _passageLinks, ...unit }) => unit),
    proposals,
  };
}

export const DeterministicDocumentKnowledgeAnalyzer: DocumentKnowledgeAnalyzer = {
  id: DETERMINISTIC_DOCUMENT_ANALYZER_ID,
  version: DETERMINISTIC_DOCUMENT_ANALYZER_VERSION,
  analyze: analyzeDeterministically,
};
