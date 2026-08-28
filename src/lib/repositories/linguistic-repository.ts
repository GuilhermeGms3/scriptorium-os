import manifestJson from "../../../generated/corpora/stepbible-tagnt/efe428a0047bf7b9c3ce2624f60c252c6e435945/manifest.json";
import {
  greekCell,
  lemmaForms,
  lexicalReferences,
  lexemeBucket,
  sourceRecordId,
  targetTokenId,
  type ConcordanceBucket,
  type LexicalOccurrence,
  type LinguisticChapter,
  type LinguisticDataset,
  type LinguisticPassage,
  type MorphologicalAnalysis,
  type TokenAlignment,
} from "../domain/linguistic";
import type { PassageRef } from "../domain/scripture";

const manifest = manifestJson as LinguisticDataset;
const root = "../../../generated/corpora/stepbible-tagnt/efe428a0047bf7b9c3ce2624f60c252c6e435945";
const chapters = import.meta.glob<{ default: LinguisticChapter }>(
  "../../../generated/corpora/stepbible-tagnt/efe428a0047bf7b9c3ce2624f60c252c6e435945/books/**/*.json",
);
const lexical = import.meta.glob<{ default: ConcordanceBucket }>(
  "../../../generated/corpora/stepbible-tagnt/efe428a0047bf7b9c3ce2624f60c252c6e435945/lexical/*.json",
);
const cache = new Map<string, LinguisticPassage>();
const pending = new Map<string, Promise<LinguisticPassage | null>>();

function decodeChapter(
  shard: LinguisticChapter,
  morphology: Record<string, MorphologicalAnalysis>,
): LinguisticPassage {
  if (shard.schemaVersion !== 1 || shard.datasetId !== manifest.id)
    throw new Error("Linguistic shard identity mismatch");
  const result: LinguisticPassage = { alignments: [], annotations: [] };
  for (const [verse, position, index, status, reason, candidates] of shard.alignments) {
    const record = index === null ? null : shard.records[index];
    if (index !== null && !record) throw new Error("Missing aligned source record");
    const alignment: TokenAlignment = {
      targetTokenId: targetTokenId(shard.bookId, shard.chapter, verse, position),
      sourceDatasetId: manifest.id,
      sourceRecordId: record ? sourceRecordId(manifest.id, record[0]) : null,
      method: "edition-aware-sequence-v1",
      status,
      evidence: reason,
      candidateSourceRecordIds: candidates.map((i) =>
        sourceRecordId(manifest.id, shard.records[i]![0]),
      ),
    };
    result.alignments.push(alignment);
    if (!record || status === "ambiguous" || status === "unmatched") continue;
    const forms = greekCell(record[2]);
    result.annotations.push({
      type: "token-linguistics",
      sourceDatasetId: manifest.id,
      sourceRecordId: alignment.sourceRecordId!,
      targetTokenId: alignment.targetTokenId,
      raw: {
        greek: record[2],
        lexicalGrammar: record[3],
        lemma: record[4],
        editions: shard.editions[record[5]]!,
        spelling: record[6],
        strongInstance: record[7],
      },
      normalized: {
        surface: forms.surface.normalize("NFC"),
        ...(forms.transliteration !== undefined ? { transliteration: forms.transliteration } : {}),
        lemmas: lemmaForms(record[4]),
        lexicalReferences: lexicalReferences(record[3], record[7]),
        lexemeId: record[8],
        morphology: [...record[3].matchAll(/=([A-Z0-9-]+)/g)].map(
          (m) =>
            morphology[m[1]!] ?? {
              rawMorphologyCode: m[1]!,
              status: "unmapped",
              features: {},
              extras: {},
            },
        ),
      },
      provenance: {
        sourceArtifactId: shard.sourceArtifactId,
        sourceLine: record[1],
        transformationIds: manifest.transformations.map((t) => t.id),
      },
      alignment,
    });
  }
  return result;
}
async function loadLexicalBucket(id: string): Promise<ConcordanceBucket | null> {
  if (!/^lexeme:tagnt:[a-f0-9]{24}$/.test(id)) return null;
  const loader = lexical[`${root}/lexical/${lexemeBucket(id)}.json`];
  return loader ? (await loader()).default : null;
}
export const LinguisticRepository = {
  getDataset(): LinguisticDataset {
    return manifest;
  },
  getPassage(ref: PassageRef): LinguisticPassage | null {
    const chapter = cache.get(`${ref.bookId}/${ref.chapter}`);
    if (!chapter) return null;
    const prefix = `sblgnt:1.2:${ref.bookId}:${ref.chapter}:`;
    const inRange = (id: string) => {
      const verse = Number(id.slice(prefix.length).split(":")[0]);
      return (
        verse >= (ref.verseStart ?? 1) && verse <= (ref.verseEnd ?? ref.verseStart ?? Infinity)
      );
    };
    return {
      alignments: chapter.alignments.filter((a) => inRange(a.targetTokenId)),
      annotations: chapter.annotations.filter((a) => inRange(a.targetTokenId)),
    };
  },
  async loadChapter(bookId: string, chapter: number): Promise<LinguisticPassage | null> {
    if (!manifest.books[bookId]?.includes(chapter)) return null;
    const key = `${bookId}/${chapter}`;
    if (cache.has(key)) return cache.get(key)!;
    if (pending.has(key)) return pending.get(key)!;
    const request = (async () => {
      const loader = chapters[`${root}/books/${key}.json`];
      if (!loader) throw new Error("Missing linguistic chapter module");
      const [shard, definitions] = await Promise.all([
        loader(),
        import("../../../generated/corpora/stepbible-tagnt/efe428a0047bf7b9c3ce2624f60c252c6e435945/morphology.json"),
      ]);
      if (shard.default.bookId !== bookId || shard.default.chapter !== chapter)
        throw new Error("Linguistic chapter mismatch");
      const result = decodeChapter(
        shard.default,
        definitions.default as Record<string, MorphologicalAnalysis>,
      );
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
  async getLexeme(id: string) {
    return (await loadLexicalBucket(id))?.lexemes[id] ?? null;
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
    const rows = (await loadLexicalBucket(id))?.occurrences[id] ?? [];
    return {
      total: rows.length,
      offset,
      items: rows.slice(offset, offset + limit).map(([bookId, chapter, verse, position]) => ({
        tokenId: targetTokenId(bookId, chapter, verse, position),
        ref: { bookId, chapter, verseStart: verse, versification: "sblgnt-1.2" },
        position,
      })),
    };
  },
};
