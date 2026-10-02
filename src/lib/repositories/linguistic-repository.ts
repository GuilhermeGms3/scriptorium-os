import manifestJson from "../../../generated/corpora/stepbible-tagnt/efe428a0047bf7b9c3ce2624f60c252c6e435945/manifest.json";
import type {
  Lexeme,
  LexicalOccurrence,
  LinguisticAnnotation,
  LinguisticDataset,
  LinguisticPassage,
  TokenAlignment,
  LexicalDictionaryEntry,
} from "../domain/linguistic";
import {
  greekCell,
  lemmaForms,
  lexicalReferences,
  sourceRecordId,
  type MorphologicalAnalysis,
} from "../domain/linguistic";
import type { PassageRef } from "../domain/scripture";
import { DEFAULT_BIBLICAL_VERSIFICATION } from "../domain/text-identity";
import { corpusPackageRegistry } from "../corpus-runtime/corpus-package-registry";
import type { StoredToken } from "../corpus-runtime/contracts";
import type { TokenOccurrence } from "../domain/scripture";

const manifest = manifestJson as LinguisticDataset;
const cache = new Map<string, LinguisticPassage>();
const pending = new Map<string, Promise<LinguisticPassage | null>>();

type CompactTagntRecord = [
  locator: string,
  sourceLine: number,
  greek: string,
  lexicalGrammar: string,
  lemma: string,
  editions: string,
  spelling: string,
  strongInstance: string,
  lexemeId: string | null,
];
type CompactTagntAnnotation = [
  record: CompactTagntRecord | null,
  status: TokenAlignment["status"],
  reason: string,
  candidateLocators: string[],
  sourceArtifactId: string,
];

function decodeTagnt(
  token: StoredToken,
  value: unknown,
): { alignment: TokenAlignment; annotation?: LinguisticAnnotation } {
  const [record, status, reason, candidates, sourceArtifactId] = value as CompactTagntAnnotation;
  const alignment: TokenAlignment = {
    targetTokenId: token.id,
    sourceDatasetId: manifest.id,
    sourceRecordId: record ? sourceRecordId(manifest.id, record[0]) : null,
    method: "edition-aware-sequence-v1",
    status,
    evidence: reason,
    candidateSourceRecordIds: candidates.map((locator) => sourceRecordId(manifest.id, locator)),
  };
  if (!record || status === "ambiguous" || status === "unmatched") return { alignment };
  const forms = greekCell(record[2]);
  const morphology = token.morphology
    ? (JSON.parse(token.morphology) as MorphologicalAnalysis[])
    : [];
  return {
    alignment,
    annotation: {
      type: "token-linguistics",
      sourceDatasetId: manifest.id,
      sourceRecordId: alignment.sourceRecordId!,
      targetTokenId: token.id,
      raw: {
        surface: forms.surface,
        greek: record[2],
        lexicalGrammar: record[3],
        lemma: record[4],
        editions: record[5],
        spelling: record[6],
        strongInstance: record[7],
      },
      normalized: {
        surface: forms.surface.normalize("NFC"),
        ...(forms.transliteration ? { transliteration: forms.transliteration } : {}),
        lemmas: lemmaForms(record[4]),
        lexicalReferences: lexicalReferences(record[3], record[7]),
        lexemeId: record[8],
        morphology,
      },
      provenance: {
        sourceArtifactId,
        sourceLine: record[1],
        transformationIds: manifest.transformations.map((transformation) => transformation.id),
      },
      alignment,
    },
  };
}

function inPassage(ref: PassageRef, tokenId: string): boolean {
  const parts = tokenId.split(":");
  const verse = Number(parts.at(-2));
  if (!Number.isInteger(verse)) return false;
  return verse >= (ref.verseStart ?? 1) && verse <= (ref.verseEnd ?? ref.verseStart ?? Infinity);
}

function annotationFromToken(
  token: StoredToken,
  editionId: string,
  sourceArtifactId: string,
): LinguisticAnnotation | null {
  if (!token.lemma && !token.morphology) return null;
  const morphology = token.morphology
    ? (JSON.parse(token.morphology) as MorphologicalAnalysis["features"] & { code?: string })
    : null;
  const rawMorphologyCode = morphology?.code ?? "";
  const features: Record<string, string | number | boolean | null> = { ...(morphology ?? {}) };
  delete features["code"];
  const alignment: TokenAlignment = {
    targetTokenId: token.id,
    sourceDatasetId: editionId,
    sourceRecordId: token.id,
    method: "edition-aware-sequence-v1",
    status: "exact",
    evidence: "Lemma and morphology are attached directly to the source-edition token.",
    candidateSourceRecordIds: [],
  };
  return {
    type: "token-linguistics",
    sourceDatasetId: editionId,
    sourceRecordId: token.id,
    targetTokenId: token.id,
    raw: {
      surface: token.surface,
      ...(token.lemma ? { lemma: token.lemma } : {}),
      ...(rawMorphologyCode ? { morphology: rawMorphologyCode } : {}),
      ...(token.strongs ? { strongInstance: token.strongs } : {}),
    },
    normalized: {
      surface: token.surface.normalize("NFC"),
      lemmas: token.lemma ? [token.lemma] : [],
      lexicalReferences: (token.strongs ?? "")
        .split(/[\s/]+/)
        .filter((value) => /^\d/.test(value))
        .map((value) => ({ system: "strong" as const, value })),
      lexemeId: token.lemmaId ?? null,
      morphology: morphology
        ? [
            {
              rawMorphologyCode,
              status: rawMorphologyCode ? "parsed" : "unmapped",
              features,
              extras: {},
            },
          ]
        : [],
    },
    provenance: { sourceArtifactId, sourceLine: 0, transformationIds: [] },
    alignment,
  };
}

export const LinguisticRepository = {
  getDataset(): LinguisticDataset {
    return manifest;
  },

  getPassage(ref: PassageRef): LinguisticPassage | null {
    const chapter = cache.get(`${ref.bookId}/${ref.chapter}`);
    if (!chapter) return null;
    return {
      alignments: chapter.alignments.filter((alignment) => inPassage(ref, alignment.targetTokenId)),
      annotations: chapter.annotations.filter((annotation) =>
        inPassage(ref, annotation.targetTokenId),
      ),
    };
  },

  async loadChapter(bookId: string, chapter: number): Promise<LinguisticPassage | null> {
    const key = `${bookId}/${chapter}`;
    if (cache.has(key)) return cache.get(key)!;
    if (pending.has(key)) return pending.get(key)!;
    const request = (async () => {
      if (!manifest.books[bookId]?.includes(chapter)) {
        const originalPackage = (await corpusPackageRegistry.listEnabled()).find(
          (candidate) =>
            candidate.languages.some((language) => language === "hbo" || language === "he") &&
            candidate.works.includes(`work:${bookId}`) &&
            candidate.parts.some((part) => part.role === "linguistic" && !part.workId),
        );
        if (!originalPackage) return null;
        const storage = await corpusPackageRegistry.open(
          originalPackage.editionId,
          `work:${bookId}`,
        );
        const units = await storage.getTextUnits(
          {
            workId: `work:${bookId}`,
            versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
            bookId,
            chapter,
          },
          originalPackage.editionId,
        );
        const result: LinguisticPassage = { alignments: [], annotations: [] };
        for (const unit of units) {
          const sourceArtifactId =
            unit.provenance.sourceArtifactIds?.[0] ??
            originalPackage.provenance.sourceArtifactIds[0] ??
            "";
          for (const token of await storage.getTokens(unit.id)) {
            const annotation = annotationFromToken(
              token,
              originalPackage.editionId,
              sourceArtifactId,
            );
            if (!annotation) continue;
            result.alignments.push(annotation.alignment);
            result.annotations.push(annotation);
          }
        }
        cache.set(key, result);
        if (cache.size > 8) cache.delete(cache.keys().next().value!);
        return result;
      }
      const storage = await corpusPackageRegistry.open(manifest.targetEditionId, `work:${bookId}`);
      const units = await storage.getTextUnits(
        {
          workId: `work:${bookId}`,
          versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
          bookId,
          chapter,
        },
        manifest.targetEditionId,
      );
      const result: LinguisticPassage = { alignments: [], annotations: [] };
      for (const unit of units) {
        const [tokens, stored] = await Promise.all([
          storage.getTokens(unit.id),
          storage.getTokenAnnotations(unit.id),
        ]);
        const tokensById = new Map(tokens.map((token) => [token.id, token]));
        for (const storedAnnotation of stored) {
          if (storedAnnotation.annotationType !== "tagnt") continue;
          const token = tokensById.get(storedAnnotation.tokenId);
          if (!token) continue;
          const decoded = decodeTagnt(token, storedAnnotation.value);
          result.alignments.push(decoded.alignment);
          if (decoded.annotation) result.annotations.push(decoded.annotation);
        }
      }
      cache.set(key, result);
      if (cache.size > 8) cache.delete(cache.keys().next().value!);
      return result;
    })();
    pending.set(key, request);
    try {
      return await request;
    } finally {
      pending.delete(key);
    }
  },

  async getLexeme(id: string): Promise<Lexeme | null> {
    if (!/^lexeme:tagnt:[a-f0-9]{24}$/.test(id)) return null;
    const storage = await corpusPackageRegistry.openPart(manifest.targetEditionId, "linguistic");
    const result = await storage.findTokensByLemma(id, 0, 1);
    const first = result.items[0];
    if (!first) return null;
    return {
      id,
      language: "grc",
      lemmas: lemmaForms(first.token.lemma ?? first.token.surface),
      lexicalReferences: lexicalReferences("", first.token.strongs ?? ""),
      sourceDatasetId: manifest.id,
    };
  },

  async getOccurrencesByLexeme(
    id: string,
    offset = 0,
    limit = 30,
  ): Promise<{ total: number; offset: number; items: LexicalOccurrence[] }> {
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new Error("Invalid concordance page");
    const storage = await corpusPackageRegistry.openPart(manifest.targetEditionId, "linguistic");
    const result = await storage.findTokensByLemma(id, offset, limit);
    return {
      total: result.total,
      offset,
      items: result.items.flatMap(({ token, textUnit }) => {
        const address = textUnit.address;
        if (!address?.bookId || address.chapter === undefined || address.verseStart === undefined)
          return [];
        return [
          {
            tokenId: token.id,
            ref: {
              workId: address.workId,
              bookId: address.bookId,
              chapter: address.chapter,
              verseStart: address.verseStart,
              versificationSchemeId: address.versificationSchemeId,
            },
            position: token.position,
          },
        ];
      }),
    };
  },

  async getDictionaryEntries(
    references: { system: string; value: string }[],
    editionId = manifest.targetEditionId,
  ): Promise<LexicalDictionaryEntry[]> {
    const supported = references.filter(
      (reference) => reference.system === "strong" && /^[GH]?\d+[A-Za-z]*$/.test(reference.value),
    );
    if (!supported.length) return [];
    const storage = await corpusPackageRegistry.openPart(editionId, "linguistic");
    const entries = await Promise.all(
      supported.map((reference) => storage.getLexicalEntriesByReference("strong", reference.value)),
    );
    return [
      ...new Map(
        entries.flat().map((entry) => [entry.id, entry satisfies LexicalDictionaryEntry]),
      ).values(),
    ];
  },

  async getTokenLexeme(token: TokenOccurrence): Promise<Lexeme | null> {
    if (!token.lemmaId || !token.lemma) return null;
    return {
      id: token.lemmaId,
      language: token.language === "hbo" ? "hbo" : "grc",
      lemmas: [token.lemma],
      lexicalReferences: (token.strongs ?? "")
        .split(/[\s/]+/)
        .filter(Boolean)
        .map((value) => ({ system: "strong" as const, value })),
      sourceDatasetId: token.editionId,
    } as Lexeme;
  },

  async getTokenOccurrences(
    token: TokenOccurrence,
    offset = 0,
    limit = 30,
  ): Promise<{ total: number; offset: number; items: LexicalOccurrence[] } | null> {
    if (!token.lemmaId) return null;
    const storage = await corpusPackageRegistry.openPart(token.editionId, "linguistic");
    const result = await storage.findTokensByLemma(token.lemmaId, offset, limit);
    return {
      total: result.total,
      offset,
      items: result.items.flatMap(({ token: stored, textUnit }) => {
        const address = textUnit.address;
        if (!address?.bookId || address.chapter === undefined || address.verseStart === undefined)
          return [];
        return [
          {
            tokenId: stored.id,
            ref: {
              workId: address.workId,
              bookId: address.bookId,
              chapter: address.chapter,
              verseStart: address.verseStart,
              versificationSchemeId: address.versificationSchemeId,
            },
            position: stored.position,
          },
        ];
      }),
    };
  },
};
