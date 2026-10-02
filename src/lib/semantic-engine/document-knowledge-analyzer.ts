import type { PrivateDocument, PrivateDocumentPage } from "../domain/private-document";
import type {
  DocumentNode,
  KnowledgeProposal,
  KnowledgeProposalPayload,
  SemanticUnit,
} from "../domain/document-knowledge";
import type { ClaimKind } from "../domain/knowledge";
import { analyzePrivateDocumentPage } from "./deterministic-semantic-analyzer";

export interface DocumentKnowledgeAnalysis {
  nodes: DocumentNode[];
  units: SemanticUnit[];
  proposals: KnowledgeProposal[];
}

export interface DocumentKnowledgeAnalyzerCheckpoint {
  nextNodeOrdinal: number;
  nextUnitOrdinal: number;
  processedCharacters: number;
  currentPartId?: string;
  currentChapterId?: string;
  currentSectionId?: string;
}

export interface IncrementalDocumentKnowledgeAnalysis extends DocumentKnowledgeAnalysis {
  checkpoint: DocumentKnowledgeAnalyzerCheckpoint;
}

export interface DocumentKnowledgeAnalyzer {
  readonly id: string;
  readonly version: string;
  analyze(
    document: PrivateDocument,
    pages: readonly PrivateDocumentPage[],
  ): Promise<DocumentKnowledgeAnalysis>;
  analyzeBatch?(
    document: PrivateDocument,
    pages: readonly PrivateDocumentPage[],
    checkpoint?: DocumentKnowledgeAnalyzerCheckpoint,
  ): Promise<IncrementalDocumentKnowledgeAnalysis>;
}

export const DETERMINISTIC_DOCUMENT_ANALYZER_ID = "deterministic-document-knowledge";
export const DETERMINISTIC_DOCUMENT_ANALYZER_VERSION = "2";

interface UnitDraft extends SemanticUnit {
  domains: { domain: string; evidence: string[]; confidence: number }[];
  passageLinks: Awaited<ReturnType<typeof analyzePrivateDocumentPage>>[number]["passageLinks"];
}
//Alternativas de palavra com limites que reconhecem Unicode. O `\\b` do JavaScript reconhece apenas caracteres ASCII; portanto, `\\bé\\b` nunca corresponde a "O Logos é Deus".

function words(alternatives: string, flags = "iu"): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, flags);
}

const ASSERTION_PATTERN = words(
  "é|são|significa|representa|afirma|sustenta|argumenta|conclui|indica|demonstra|defende|is|are|means|represents|states|argues|concludes|indicates|demonstrates",
);
const ARGUMENT_MARKER = words("porque|pois|portanto|logo(?=,)|because|therefore|thus");
/** Uma frase que começa com um marcador de conclusão extrai sua premissa da frase anterior. */

const TERMINAL_PATTERN = /[.!?…][”"')\]]?$/u;
const CONTINUATION_PATTERN = /^\p{Ll}/u;
const LEADING_CONCLUSION_MARKER = /^(?:portanto|logo|therefore|thus)[,:]?\s+/iu;

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
  {
    pattern: /\bSeptuaginta\b|\bSeptuagint\b|\bLXX\b/giu,
    label: "Septuaginta",
    entityType: "work" as const,
  },
  { pattern: /\bVulgata\b|\bVulgate\b/giu, label: "Vulgata", entityType: "work" as const },
  {
    pattern: /\bManuscritos do Mar Morto\b|\bDead Sea Scrolls\b/giu,
    label: "Manuscritos do Mar Morto",
    entityType: "work" as const,
  },
] as const;

function classifyClaim(sentence: string, unit: UnitDraft): ClaimKind {
  const domains = new Set(unit.domains.map((item) => item.domain));
  if (words("variantes?|manuscritos?|aparato|witness(?:es)?|variants?|manuscripts?").test(sentence))
    return "textual-critical-analysis";
  if (
    domains.has("linguistics") ||
    words("grego|hebraico|aramaico|lema|morfologia|sintaxe|grammar|lemma|syntax").test(sentence)
  )
    return "linguistic-analysis";
  if (domains.has("archaeology") || domains.has("historical-context"))
    return "historical-reconstruction";
  if (words("(?:símbolo|simboliza|allegor|symbol)\\p{L}*").test(sentence))
    return "symbolic-interpretation";
  if (domains.has("philosophy-of-religion")) return "philosophical-analysis";
  if (domains.has("patristics") || domains.has("liturgy")) return "reception-history";
  if (
    domains.has("theology") ||
    words("(?:doutrina|trindade|cristologia|soteriologia|theolog|doctrine|trinity)\\p{L}*").test(
      sentence,
    )
  )
    return "theological-interpretation";
  if (domains.has("exegesis") || domains.has("hermeneutics")) return "exegetical-interpretation";
  return "academic-hypothesis";
}

function claimQualifiers(sentence: string, language?: string): string[] {
  const qualifiers: string[] = [];
  // Portuguese "no" is "em + o" ("No princípio…"), never a negation.
  const english = (language ?? "").toLowerCase().startsWith("en");
  const negation = english ? "not|never|no" : "não|nunca|nem|jamais|not|never";
  if (words(negation).test(sentence)) qualifiers.push("contains-negation");
  if (
    words("segundo|conforme|de acordo com|afirma que|according to|argues that|states that").test(
      sentence,
    )
  )
    qualifiers.push("attributed-statement");
  if (words("talvez|possivelmente|provavelmente|may|might|possibly|probably").test(sentence))
    qualifiers.push("modalized");
  return qualifiers;
}

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
// Abreviações cujo ponto final não deve encerrar uma frase ("cf. Jo 1.1", "S. Tomás").
const NON_TERMINAL_ABBREVIATION =
  /(?<![\p{L}])(cf|Cf|p|pp|v|vv|S|Sto|Sta|Dr|Dra|Pe|Fr|séc|sécs|ed|eds|trad|cap|caps|vol|vols|op|cit|ibid|nº|n|ss|al|e\.g|i\.e)\.(?=\s)/gu;
const PROTECTED_DOT = "\u2024";

function sentenceCandidates(text: string): string[] {
  return text
    .replace(NON_TERMINAL_ABBREVIATION, `$1${PROTECTED_DOT}`)
    .split(/(?<=[.!?…])\s+(?=\p{Lu}|["“])/u)
    .map((sentence) => sentence.replaceAll(PROTECTED_DOT, ".").replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 800);
}

function argumentPayload(sentence: string, previous?: string): KnowledgeProposalPayload | null {
  const leading = LEADING_CONCLUSION_MARKER.exec(sentence);
  if (leading && previous && previous.length >= 15) {
    const conclusion = sentence.slice(leading[0].length).trim();
    if (conclusion.length < 15) return null;
    return {
      kind: "argument",
      conclusion,
      premises: [previous],
      marker: leading[0].trim().replace(/[,:]$/u, ""),
      perspectiveProfileIds: [],
    };
  }
  const match = ARGUMENT_MARKER.exec(sentence);
  if (!match || match.index === 0) return null;
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
    perspectiveProfileIds: [],
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
  
  const sentences = sentenceCandidates(unit.text).slice(0, 8);
  for (const [index, sentence] of sentences.entries()) {
    if (ASSERTION_PATTERN.test(sentence))
      drafts.push({
        payload: {
          kind: "claim",
          proposition: sentence,
          claimKind: classifyClaim(sentence, unit),
          qualifiers: claimQualifiers(sentence, unit.language),
          perspectiveProfileIds: [],
        },
        confidence: 0.55,
      });
    const argument = argumentPayload(sentence, sentences[index - 1]);
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
  checkpoint?: DocumentKnowledgeAnalyzerCheckpoint,
): Promise<IncrementalDocumentKnowledgeAnalysis> {
  const method = `${DETERMINISTIC_DOCUMENT_ANALYZER_ID}:${DETERMINISTIC_DOCUMENT_ANALYZER_VERSION}`;
  const rootId = `${document.id}:node:book`;
  const nodes: DocumentNode[] = checkpoint
    ? []
    : [
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
  let currentPartId = checkpoint?.currentPartId;
  let currentChapterId = checkpoint?.currentChapterId;
  let currentSectionId = checkpoint?.currentSectionId;
  let nextNodeOrdinal = checkpoint?.nextNodeOrdinal ?? 1;
  let nextUnitOrdinal = checkpoint?.nextUnitOrdinal ?? 0;
  let processedCharacters = checkpoint?.processedCharacters ?? 0;

  for (const page of pages) {
    processedCharacters += page.text.length;
    const bundles = page.text ? await analyzePrivateDocumentPage(document, page) : [];
    for (const bundle of bundles) {
      const kind = unitKind(bundle.segment.structuralKind, bundle.text);
      if (kind === "heading") {
        const title = normalizeTitle(bundle.text);
        const kindForNode = nodeKind(title);
        const ordinal = nextNodeOrdinal;
        const id = `${document.id}:node:${ordinal}:${(await sha256(title)).slice(0, 12)}`;
        nextNodeOrdinal += 1;
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
          ordinal,
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
      const ordinal = nextUnitOrdinal;
      const id = `${document.id}:unit:${ordinal + 1}:${checksum.slice(0, 12)}`;
      nextUnitOrdinal += 1;
      units.push({
        id,
        documentId: document.id,
        documentNodeId: activeNodeId,
        kind,
        ordinal,
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
    checkpoint: {
      nextNodeOrdinal,
      nextUnitOrdinal,
      processedCharacters,
      ...(currentPartId ? { currentPartId } : {}),
      ...(currentChapterId ? { currentChapterId } : {}),
      ...(currentSectionId ? { currentSectionId } : {}),
    },
  };
}

export const DeterministicDocumentKnowledgeAnalyzer: DocumentKnowledgeAnalyzer = {
  id: DETERMINISTIC_DOCUMENT_ANALYZER_ID,
  version: DETERMINISTIC_DOCUMENT_ANALYZER_VERSION,
  async analyze(document, pages) {
    const { checkpoint: _checkpoint, ...analysis } = await analyzeDeterministically(
      document,
      pages,
    );
    return analysis;
  },
  analyzeBatch: analyzeDeterministically,
};
