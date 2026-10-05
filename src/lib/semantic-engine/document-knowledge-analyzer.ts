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
  bibliographyMode?: boolean;
  lastPersonLabel?: string;
  lastWorkLabel?: string;
  providerState?: Record<string, string | number | boolean | null>;
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
export const DETERMINISTIC_DOCUMENT_ANALYZER_VERSION = "3";

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
const EXPLICIT_ATTRIBUTION =
  /^(?:segundo|conforme|para|de acordo com|according to)\s+(?<agent>[\p{Lu}][\p{L}\p{M}.'’ -]{1,80}?)(?:,|\s+(?:afirma|argumenta|sustenta|defende|escreve|observa|declara|interpreta|reports?|argues?|states?|writes?|observes?|rejects?))\s*(?<statement>[\s\S]+)$/iu;
const SUBJECT_ATTRIBUTION =
  /^(?<agent>[\p{Lu}][\p{L}\p{M}.'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}.'’-]*){0,4})\s+(?<verb>afirma|argumenta|sustenta|defende|escreve|observa|declara|interpreta|rejeita|questiona|reports?|argues?|states?|writes?|observes?|rejects?|questions?)\s+(?:que\s+|that\s+)?(?<statement>[\s\S]{15,})$/iu;
const PRONOUN_ATTRIBUTION =
  /^(?<mention>ele|ela|o autor|a autora|he|she|the author)\s+(?<verb>afirma|argumenta|sustenta|defende|escreve|observa|declara|interpreta|rejeita|questiona|reports?|argues?|states?|writes?|observes?|rejects?|questions?)\s+(?:que\s+|that\s+)?(?<statement>[\s\S]{15,})$/iu;
const YEAR_PATTERN = /(?:^|[^\d])((?:1[4-9]|20)\d{2})(?:[a-z])?(?:[^\d]|$)/u;

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

interface DiscourseContext {
  bibliographyMode: boolean;
  lastPersonLabel?: string;
  lastWorkLabel?: string;
}

function attributionRelation(
  verb: string,
): Extract<KnowledgeProposalPayload, { kind: "attribution" }>["relation"] {
  if (/rejeita|reject/iu.test(verb)) return "rejects";
  if (/questiona|question/iu.test(verb)) return "questions";
  if (/escreve|write/iu.test(verb)) return "quotes";
  if (/observa|declara|report/iu.test(verb)) return "reports";
  return "asserts";
}

function explicitAttribution(sentence: string): {
  agent: string;
  statement: string;
  relation: Extract<KnowledgeProposalPayload, { kind: "attribution" }>["relation"];
} | null {
  const prefixed = EXPLICIT_ATTRIBUTION.exec(sentence);
  const subject = SUBJECT_ATTRIBUTION.exec(sentence);
  const match = prefixed ?? subject;
  const agent = match?.groups?.["agent"]?.replace(/\s+/g, " ").trim();
  const statement = match?.groups?.["statement"]?.replace(/\s+/g, " ").trim();
  if (
    !agent ||
    !statement ||
    !/^\p{Lu}/u.test(agent) ||
    /^(?:o|a|os|as|um|uma|seu|sua|the|his|her)\s/iu.test(agent) ||
    agent.split(/\s+/u).length > 8
  )
    return null;
  return {
    agent,
    statement,
    relation: attributionRelation(match?.groups?.["verb"] ?? "afirma"),
  };
}

function bibliographicPayload(
  text: string,
): Extract<KnowledgeProposalPayload, { kind: "bibliographic-reference" }> | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length < 20) return null;
  const yearMatch = YEAR_PATTERN.exec(normalized);
  const segments = normalized
    .split(/\.\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const authorSegment = segments[0];
  if (!authorSegment || segments.length < 2) return null;
  const authors = authorSegment
    .split(/\s*(?:;|\be\b|\band\b|&)\s*/iu)
    .map((author) => author.replace(/,$/u, "").trim())
    .filter((author) => author.length >= 2 && author.length <= 120);
  const title = segments[1]?.replace(/[,;:]$/u, "").trim();
  const locator = normalized.match(/\b(?:p{1,2}|v|vol|cap)\.\s*[\divxlcdm–-]+/iu)?.[0];
  return {
    kind: "bibliographic-reference",
    rawText: normalized,
    authors,
    ...(title && title.length >= 3 ? { title } : {}),
    ...(yearMatch?.[1] ? { year: Number(yearMatch[1]) } : {}),
    ...(locator ? { locator } : {}),
    referenceType: /https?:\/\//iu.test(normalized)
      ? "web"
      : /\b(?:in:|cap[ií]tulo|chapter)\b/iu.test(normalized)
        ? "chapter"
        : /[“"]|\b(?:revista|journal)\b/iu.test(normalized)
          ? "article"
          : title
            ? "book"
            : "unknown",
  };
}

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
  context: DiscourseContext,
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
        additionalPassages: [],
      },
      confidence: link.confidence,
    });
  }
  for (const match of unit.text.matchAll(/["“]([^"”]{20,600})["”]/gu)) {
    drafts.push({
      payload: {
        kind: "citation",
        quotedText: match[1]!.trim(),
        citationKind: "possible-quote",
        ...(context.lastPersonLabel ? { attributedTo: context.lastPersonLabel } : {}),
        ...(context.lastWorkLabel ? { sourceWork: context.lastWorkLabel } : {}),
      },
      confidence: 0.62,
    });
  }
  for (const entity of CONTROLLED_ENTITIES) {
    entity.pattern.lastIndex = 0;
    if (entity.pattern.test(unit.text)) {
      drafts.push({
        payload: { kind: "entity", label: entity.label, entityType: entity.entityType },
        confidence: 0.7,
      });
      if (entity.entityType === "person") context.lastPersonLabel = entity.label;
      if (entity.entityType === "work") context.lastWorkLabel = entity.label;
    }
  }

  if (unit.kind === "bibliography-entry") {
    const bibliography = bibliographicPayload(unit.text);
    if (bibliography) {
      drafts.push({ payload: bibliography, confidence: 0.68 });
      if (bibliography.authors[0]) context.lastPersonLabel = bibliography.authors[0];
      if (bibliography.title) context.lastWorkLabel = bibliography.title;
    }
  }

  const sentences = sentenceCandidates(unit.text).slice(0, 8);
  for (const [index, sentence] of sentences.entries()) {
    const coreference = PRONOUN_ATTRIBUTION.exec(sentence);
    const mention = coreference?.groups?.["mention"];
    const statement = coreference?.groups?.["statement"]?.replace(/\s+/g, " ").trim();
    if (mention && statement && context.lastPersonLabel) {
      drafts.push({
        payload: {
          kind: "coreference",
          mention,
          resolvedLabel: context.lastPersonLabel,
          entityType: "person",
          basis: "recent-attribution",
        },
        confidence: 0.58,
      });
      drafts.push({
        payload: {
          kind: "attribution",
          statement,
          agentLabel: context.lastPersonLabel,
          agentType: "person",
          relation: attributionRelation(coreference.groups?.["verb"] ?? "afirma"),
          resolution: "coreference",
        },
        confidence: 0.56,
      });
    } else {
      const explicit = explicitAttribution(sentence);
      if (!explicit) {
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
        continue;
      }
      context.lastPersonLabel = explicit.agent;
      drafts.push({
        payload: {
          kind: "attribution",
          statement: explicit.statement,
          agentLabel: explicit.agent,
          agentType: "person",
          relation: explicit.relation,
          resolution: "explicit",
        },
        confidence: 0.72,
      });
      drafts.push({
        payload: { kind: "entity", label: explicit.agent, entityType: "person" },
        confidence: 0.66,
      });
    }
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
  const discourse: DiscourseContext = {
    bibliographyMode: checkpoint?.bibliographyMode ?? false,
    ...(checkpoint?.lastPersonLabel ? { lastPersonLabel: checkpoint.lastPersonLabel } : {}),
    ...(checkpoint?.lastWorkLabel ? { lastWorkLabel: checkpoint.lastWorkLabel } : {}),
  };

  for (const page of pages) {
    processedCharacters += page.text.length;
    const bundles = page.text ? await analyzePrivateDocumentPage(document, page) : [];
    for (const bundle of bundles) {
      const baseKind = unitKind(bundle.segment.structuralKind, bundle.text);
      if (baseKind === "heading") {
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
          discourse.bibliographyMode = false;
          currentPartId = id;
          currentChapterId = undefined;
          currentSectionId = undefined;
        } else if (kindForNode === "chapter") {
          discourse.bibliographyMode = false;
          currentChapterId = id;
          currentSectionId = undefined;
        } else if (kindForNode === "section" || kindForNode === "subsection") {
          discourse.bibliographyMode = false;
          currentSectionId = id;
        } else if (kindForNode === "bibliography") {
          discourse.bibliographyMode = true;
          currentSectionId = id;
        } else {
          discourse.bibliographyMode = false;
        }
      }
      const kind =
        discourse.bibliographyMode && (baseKind === "paragraph" || baseKind === "list-item")
          ? "bibliography-entry"
          : baseKind;
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

  const proposals: KnowledgeProposal[] = [];
  for (const unit of units) proposals.push(...(await proposalsForUnit(document, unit, discourse)));
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
      ...(discourse.bibliographyMode ? { bibliographyMode: true } : {}),
      ...(discourse.lastPersonLabel ? { lastPersonLabel: discourse.lastPersonLabel } : {}),
      ...(discourse.lastWorkLabel ? { lastWorkLabel: discourse.lastWorkLabel } : {}),
      ...(checkpoint?.providerState ? { providerState: checkpoint.providerState } : {}),
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
