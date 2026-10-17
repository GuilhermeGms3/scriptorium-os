import type { PrivateDocument, PrivateDocumentPage } from "../domain/private-document";
import type {
  SemanticClassification,
  SemanticDomain,
  SemanticPassageLink,
  SemanticSegment,
  SemanticSegmentBundle,
} from "../domain/semantic-content";
import { biblicalRelationType, parseBiblicalReferences } from "./biblical-reference-parser";
import {
  detectPageZone,
  detectReferenceZone,
  isBibliographyTitle,
  titleZone,
} from "./reference-zone";
import { sha256Hex } from "../workspace-runtime/secure-context";

export const SEMANTIC_ENGINE_VERSION = "deterministic-pt-en-1";
const MAX_SEGMENT_CHARACTERS = 1_800;

const DOMAIN_TERMS: Readonly<Record<Exclude<SemanticDomain, "other">, readonly string[]>> = {
  exegesis: ["exegese", "exegético", "exegetical", "exegesis", "perícope", "pericope"],
  hermeneutics: ["hermenêutica", "hermeneutics", "interpretação", "interpretation"],
  theology: [
    "teologia",
    "theology",
    "doutrina",
    "doctrine",
    "trindade",
    "trinity",
    "cristologia",
    "soteriologia",
    "escatologia",
  ],
  "historical-context": [
    "contexto histórico",
    "historical context",
    "século",
    "century",
    "império romano",
    "roman empire",
    "segundo templo",
  ],
  "social-history": [
    "história social",
    "social history",
    "classe social",
    "social class",
    "família",
    "kinship",
    "honra e vergonha",
    "honor and shame",
  ],
  "political-history": [
    "história política",
    "political history",
    "poder romano",
    "roman rule",
    "herodes",
    "herod",
    "tributação",
    "taxation",
    "governador",
  ],
  archaeology: [
    "arqueologia",
    "archaeology",
    "escavação",
    "excavation",
    "inscrição",
    "inscription",
    "artefato",
  ],
  geography: ["geografia", "geography", "mapa", "região", "region", "cidade", "river", "rio"],
  "textual-criticism": [
    "crítica textual",
    "textual criticism",
    "manuscrito",
    "manuscript",
    "variante textual",
    "variant reading",
    "códice",
    "codex",
  ],
  linguistics: [
    "hebraico",
    "hebrew",
    "grego",
    "greek",
    "lema",
    "lemma",
    "morfologia",
    "morphology",
    "sintaxe",
    "syntax",
    "semântica",
  ],
  patristics: [
    "patrística",
    "patristic",
    "pais da igreja",
    "church fathers",
    "agostinho",
    "augustine",
    "orígenes",
    "origen",
  ],
  liturgy: ["liturgia", "liturgy", "culto", "worship", "eucaristia", "eucharist", "oração"],
  tradition: [
    "tradição",
    "tradition",
    "católico",
    "catholic",
    "ortodoxo",
    "orthodox",
    "reformado",
    "reformed",
    "pentecostal",
  ],
  soteriology: [
    "soteriologia",
    "soteriology",
    "salvação",
    "salvation",
    "justificação",
    "justification",
    "expiação",
    "atonement",
  ],
  eschatology: [
    "escatologia",
    "eschatology",
    "ressurreição final",
    "final resurrection",
    "juízo final",
    "last judgment",
    "parousia",
  ],
  "religious-currents": [
    "gnosticismo",
    "gnosticism",
    "hermetismo",
    "hermeticism",
    "mistério",
    "mystery religion",
    "nag hammadi",
    "esotérico",
    "esoteric",
  ],
  "philosophy-of-religion": [
    "filosofia da religião",
    "philosophy of religion",
    "metafísica",
    "metaphysics",
    "ontologia",
    "epistemologia",
  ],
  science: ["ciência", "science", "cosmologia", "cosmology", "física", "physics", "evolução"],
};

function normalized(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("pt-BR");
}

async function sha256(value: string): Promise<string> {
  return sha256Hex(value, { operation: "A análise do livro" });
}

function structuralKind(text: string): SemanticSegment["structuralKind"] {
  const trimmed = text.trim();
  if (/^(?:[-•*]|\d+[.)])\s+/.test(trimmed)) return "list-item";
  if (/^(?:nota|note)\s*\d*[:.]/i.test(trimmed)) return "footnote";
  if (
    trimmed.length <= 120 &&
    !/[.!?]$/.test(trimmed) &&
    (trimmed === trimmed.toLocaleUpperCase() || /^\p{Lu}[\p{L}\p{M}\s:–—-]+$/u.test(trimmed))
  )
    return "heading";
  return trimmed.length ? "paragraph" : "unknown";
}

function splitLongSpan(
  text: string,
  startOffset: number,
): { text: string; start: number; end: number }[] {
  if (text.length <= MAX_SEGMENT_CHARACTERS)
    return [{ text, start: startOffset, end: startOffset + text.length }];
  const result: { text: string; start: number; end: number }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const maximum = Math.min(text.length, cursor + MAX_SEGMENT_CHARACTERS);
    let end = maximum;
    if (maximum < text.length) {
      const candidate = text.lastIndexOf(". ", maximum);
      if (candidate > cursor + 500) end = candidate + 1;
    }
    const chunk = text.slice(cursor, end).trim();
    const relativeStart = text.indexOf(chunk, cursor);
    if (chunk)
      result.push({
        text: chunk,
        start: startOffset + relativeStart,
        end: startOffset + relativeStart + chunk.length,
      });
    cursor = Math.max(end, cursor + 1);
  }
  return result;
}

function pageSpans(text: string): { text: string; start: number; end: number }[] {
  const spans: { text: string; start: number; end: number }[] = [];
  const pattern = /\S(?:[\s\S]*?\S)?(?=\r?\n\s*\r?\n|$)/g;
  for (const match of text.matchAll(pattern)) {
    const value = match[0].trim();
    if (!value) continue;
    const start = (match.index ?? 0) + match[0].indexOf(value);
    spans.push(...splitLongSpan(value, start));
  }
  return spans;
}

function classify(segmentId: string, text: string): SemanticClassification[] {
  const haystack = normalized(text);
  const matches = Object.entries(DOMAIN_TERMS).flatMap(([domain, terms]) => {
    const evidence = terms.filter((term) => haystack.includes(term));
    return evidence.length
      ? [
          {
            segmentId,
            domain: domain as Exclude<SemanticDomain, "other">,
            score: Math.min(0.95, 0.55 + evidence.length * 0.1),
            method: SEMANTIC_ENGINE_VERSION,
            evidence,
            reviewStatus: "machine-proposed" as const,
          },
        ]
      : [];
  });
  return matches.length
    ? matches.sort((left, right) => right.score - left.score)
    : [
        {
          segmentId,
          domain: "other",
          score: 0.35,
          method: SEMANTIC_ENGINE_VERSION,
          evidence: ["nenhum marcador controlado encontrado"],
          reviewStatus: "machine-proposed",
        },
      ];
}

/** Where the page starts: the section it continues and whether that section is a bibliography. */
export interface PageAnalysisContext {
  sectionTitle?: string;
  bibliographyMode?: boolean;
}

export async function analyzePrivateDocumentPage(
  document: PrivateDocument,
  page: PrivateDocumentPage,
  context: PageAnalysisContext = {},
): Promise<SemanticSegmentBundle[]> {
  const spans = pageSpans(page.text);
  const language = document.language ? { language: document.language } : {};
  const pageZone = detectPageZone(page.text, document.language);
  let sectionTitle = context.sectionTitle;
  let inBibliography = context.bibliographyMode ?? false;
  // Sequential on purpose: a heading changes the zone of every span after it, and the first prose
  // paragraph closes a table of contents or an index.
  const zones = spans.map((span) => {
    const kind = structuralKind(span.text);
    if (kind === "heading") {
      sectionTitle = span.text.trim();
      inBibliography = isBibliographyTitle(sectionTitle);
    }
    const zone = detectReferenceZone({
      text: span.text,
      ...(sectionTitle ? { sectionTitle } : {}),
      ...(inBibliography && (kind === "paragraph" || kind === "list-item")
        ? { unitKind: "bibliography-entry" as const }
        : {}),
      pageZone,
      ...language,
    });
    const announced = sectionTitle ? titleZone(sectionTitle) : null;
    if (zone === "body" && (announced === "toc" || announced === "index")) sectionTitle = undefined;
    return { zone, sectionTitle };
  });
  return Promise.all(
    spans.map(async (span, ordinal) => {
      const checksum = await sha256(span.text);
      const segmentId = `${document.id}:segment:${page.pageIndex + 1}:${ordinal + 1}:${checksum.slice(0, 12)}`;
      const segment: SemanticSegment = {
        id: segmentId,
        documentId: document.id,
        pageId: page.id,
        pageIndex: page.pageIndex,
        ordinal,
        startOffset: span.start,
        endOffset: span.end,
        structuralKind: structuralKind(span.text),
        textChecksum: checksum,
        language: document.language ?? "und",
      };
      const { zone, sectionTitle: titleAfterSpan } = zones[ordinal] ?? { zone: "body" as const };
      const passageLinks: SemanticPassageLink[] = parseBiblicalReferences(span.text, {
        zone,
        ...language,
      }).map((reference, index) => ({
        id: `${segmentId}:passage:${index + 1}:${reference.bookId}:${reference.chapter}:${reference.verseStart ?? 0}`,
        segmentId,
        documentId: document.id,
        pageIndex: page.pageIndex,
        rawReference: reference.rawReference,
        workId: reference.workId,
        bookId: reference.bookId,
        chapter: reference.chapter,
        ...(reference.verseStart !== undefined ? { verseStart: reference.verseStart } : {}),
        ...(reference.verseEnd !== undefined ? { verseEnd: reference.verseEnd } : {}),
        versificationSchemeId: reference.versificationSchemeId,
        relationType: biblicalRelationType(span.text, reference),
        ...(reference.zone ? { referenceZone: reference.zone } : {}),
        confidence: reference.confidence,
        method: SEMANTIC_ENGINE_VERSION,
        reviewStatus: "machine-proposed",
      }));
      return {
        segment,
        text: span.text,
        classifications: classify(segmentId, span.text),
        passageLinks,
        ...(titleAfterSpan ? { sectionTitle: titleAfterSpan } : {}),
      };
    }),
  );
}
