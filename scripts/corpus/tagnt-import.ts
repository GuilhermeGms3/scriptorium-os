import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  readdir,
  stat,
  writeFile,
  open,
  unlink,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  TAGNT_ATTRIBUTION,
  TAGNT_BOOKS,
  TAGNT_COMMIT,
  TAGNT_FILES,
  TAGNT_PACKAGE,
} from "../../src/lib/corpus-config/tagnt";
import {
  compactChapter,
  expandChapter,
  type CompactChapterShard,
} from "../../src/lib/domain/compact-corpus";
import type {
  GeneratedChapterShard,
  GeneratedCorpusManifest,
} from "../../src/lib/domain/generated-corpus";
import {
  lemmaForms,
  lexicalReferences,
  lexemeBucket,
  type ConcordanceBucket,
  type Lexeme,
  type LinguisticChapter,
  type LinguisticDataset,
  type LinguisticStatistics,
} from "../../src/lib/domain/linguistic";
import {
  alignVerse,
  hasSblMembership,
  morphologyCodes,
  parseMorphologyDefinitions,
  parseTagnt,
  type ParsedTagntRecord,
} from "./adapters/tagnt-adapter";
import {
  PROJECT_ROOT,
  safePath,
  sha256,
  TAGNT_OUTPUT_ROOT,
  TAGNT_SOURCE_ROOT,
  verifyTagnt,
} from "./tagnt-acquisition";

export async function directoryBytes(root: string): Promise<number> {
  let result = 0;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    result += entry.isDirectory() ? await directoryBytes(path) : (await stat(path)).size;
  }
  return result;
}

async function treeDigest(root: string): Promise<string | null> {
  try {
    const entries: string[] = [];
    for (const path of (await readdir(root, { recursive: true })).sort()) {
      const full = safePath(root, path);
      if ((await stat(full)).isFile()) entries.push(`${path}\0${sha256(await readFile(full))}`);
    }
    return sha256(entries.join("\n"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function publishTagntSnapshot(
  staging: string,
  destination: string,
  parent: string,
): Promise<void> {
  safePath(parent, staging);
  safePath(parent, destination);
  const previous = await treeDigest(destination);
  if (previous !== null && previous === (await treeDigest(staging))) return;
  const recovery = previous === null ? null : await mkdtemp(resolve(parent, ".previous-"));
  const backup = recovery ? safePath(recovery, "snapshot") : null;
  if (backup) await rename(destination, backup);
  try {
    await rename(staging, destination);
  } catch (error) {
    if (backup) {
      try {
        await rename(backup, destination);
      } catch {
        throw new Error(`Snapshot publication failed; previous data preserved at ${backup}`, {
          cause: error,
        });
      }
    }
    throw error;
  }
  if (recovery) {
    safePath(parent, recovery);
    await rm(recovery, { recursive: true, force: true });
  }
}
export async function importTagnt(): Promise<LinguisticDataset> {
  const parent = dirname(TAGNT_OUTPUT_ROOT);
  await mkdir(parent, { recursive: true });
  const lockPath = safePath(parent, ".import.lock");
  const lock = await open(lockPath, "wx");
  try {
    return await buildTagnt();
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

async function buildTagnt(): Promise<LinguisticDataset> {
  const acquired = await verifyTagnt();
  const targetRoot = resolve(PROJECT_ROOT, "generated/corpora/sblgnt/1.2");
  const targetManifest = JSON.parse(
    await readFile(resolve(targetRoot, "manifest.json"), "utf8"),
  ) as GeneratedCorpusManifest;
  const id = `dataset:tagnt:${TAGNT_COMMIT}:${acquired.packageDigest.value.slice(0, 16)}:v1`;
  const parsed = new Map<string, { artifactId: string; records: ParsedTagntRecord[] }>();
  const allIds = new Set<string>();
  for (const path of TAGNT_FILES.slice(1, 3)) {
    const artifact = acquired.artifacts.find((a) => a.sourcePath === path)!;
    for (const record of parseTagnt(await readFile(safePath(TAGNT_SOURCE_ROOT, path), "utf8"))) {
      if (allIds.has(record.locator))
        throw new Error(`Duplicate cross-file TAGNT record ${record.locator}`);
      allIds.add(record.locator);
      const key = `${record.bookId}/${record.chapter}`;
      if (!parsed.has(key)) parsed.set(key, { artifactId: artifact.id, records: [] });
      parsed.get(key)!.records.push(record);
    }
  }
  const morphology = parseMorphologyDefinitions(
    await readFile(safePath(TAGNT_SOURCE_ROOT, TAGNT_FILES[3]), "utf8"),
  );
  const statistics: LinguisticStatistics = {
    sourceRecords: allIds.size,
    sblMemberRecords: 0,
    targetTokens: 0,
    successfullyAligned: 0,
    exact: 0,
    normalized: 0,
    positional: 0,
    ambiguous: 0,
    unmatched: 0,
    morphologicalAnnotations: 0,
    unmappedMorphology: 0,
    lexicalIds: 0,
    uniqueLexemes: 0,
    booksCovered: 0,
    chapters: 0,
    sourceRecordsWithoutTarget: 0,
  };
  const lexemes = new Map<string, Lexeme>();
  const buckets = new Map<string, ConcordanceBucket>();
  const unresolvedClassifications: Record<string, number> = {};
  const books: Record<string, number[]> = {};
  const parent = dirname(TAGNT_OUTPUT_ROOT);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(resolve(parent, ".import-"));
  const sourceAudit: { locator: string; reason: string; artifactId: string; line: number }[] = [];
  const targetAudit: { tokenId: string; status: string; reason: string; candidates: string[] }[] =
    [];
  const writeJson = async (path: string, value: unknown) => {
    const out = safePath(staging, path);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(value) + "\n");
  };
  try {
    for (const book of targetManifest.books) {
      books[book.id] = [];
      for (const [chapterNumber, path] of Object.entries(book.chapterFiles)) {
        const chapter = expandChapter(
          JSON.parse(await readFile(safePath(targetRoot, path), "utf8")) as
            GeneratedChapterShard | CompactChapterShard,
        );
        // Guard the storage change against accidental loss of a domain field.
        if (!isDeepStrictEqual(expandChapter(compactChapter(chapter)), chapter))
          throw new Error("Compact chapter changed textual domain");
        const key = `${book.id}/${chapterNumber}`;
        const source = parsed.get(key);
        if (!source) throw new Error(`Missing TAGNT chapter ${key}`);
        parsed.delete(key);
        books[book.id]!.push(chapter.chapter);
        const editions = [...new Set(source.records.map((r) => r.editions))];
        const shard: LinguisticChapter = {
          schemaVersion: 1,
          datasetId: id,
          bookId: book.id,
          chapter: chapter.chapter,
          sourceArtifactId: source.artifactId,
          editions,
          records: [],
          alignments: [],
        };
        const recordIndex = new Map(source.records.map((r, i) => [r.locator, i]));
        const byVerse = new Map<number, ParsedTagntRecord[]>();
        for (const record of source.records) {
          if (!byVerse.has(record.verse)) byVerse.set(record.verse, []);
          byVerse.get(record.verse)!.push(record);
          if (hasSblMembership(record.editions)) statistics.sblMemberRecords++;
          const lemmas = lemmaForms(record.lemma),
            references = lexicalReferences(record.lexicalGrammar, record.strongInstance);
          // Identity uses the supplied lemma(s) and STEP identifiers; a Strong number alone is not a lemma.
          const lexicalKey = JSON.stringify([
            lemmas,
            references.filter((r) => r.system === "step-disambiguated-strong"),
          ]);
          const lexemeId =
            lemmas.length && references.length
              ? `lexeme:tagnt:${sha256(lexicalKey).slice(0, 24)}`
              : null;
          if (lexemeId && !lexemes.has(lexemeId))
            lexemes.set(lexemeId, {
              id: lexemeId,
              language: "grc",
              lemmas,
              lexicalReferences: references,
              sourceDatasetId: id,
            });
          shard.records.push([
            record.locator,
            record.line,
            record.greek,
            record.lexicalGrammar,
            record.lemma,
            editions.indexOf(record.editions),
            record.spelling,
            record.strongInstance,
            lexemeId,
          ]);
        }
        const used = new Set<string>();
        for (const verse of chapter.verses) {
          for (const result of alignVerse(verse.original ?? [], byVerse.get(verse.verse) ?? [])) {
            statistics.targetTokens++;
            statistics[result.status]++;
            shard.alignments.push([
              verse.verse,
              result.target.position,
              result.source ? recordIndex.get(result.source.locator)! : null,
              result.status,
              result.reason,
              result.candidates.map((r) => recordIndex.get(r.locator)!),
            ]);
            if (!result.source) {
              unresolvedClassifications[result.reason] =
                (unresolvedClassifications[result.reason] ?? 0) + 1;
              targetAudit.push({
                tokenId: result.target.id,
                status: result.status,
                reason: result.reason,
                candidates: result.candidates.map((r) => r.locator),
              });
              continue;
            }
            if (used.has(result.source.locator))
              throw new Error(`Duplicate target mapping ${result.source.locator}`);
            used.add(result.source.locator);
            statistics.successfullyAligned++;
            const codes = morphologyCodes(result.source.lexicalGrammar);
            statistics.morphologicalAnnotations += codes.length;
            statistics.unmappedMorphology += codes.filter((code) => !morphology[code]).length;
            const record = shard.records[recordIndex.get(result.source.locator)!]!;
            const lexemeId = record[8];
            if (lexemeId) {
              statistics.lexicalIds++;
              const bucketId = lexemeBucket(lexemeId);
              if (!buckets.has(bucketId)) buckets.set(bucketId, { lexemes: {}, occurrences: {} });
              const bucket = buckets.get(bucketId)!;
              bucket.lexemes[lexemeId] = lexemes.get(lexemeId)!;
              (bucket.occurrences[lexemeId] ??= []).push([
                book.id,
                chapter.chapter,
                verse.verse,
                result.target.position,
              ]);
            }
          }
        }
        for (const record of source.records)
          if (!used.has(record.locator))
            sourceAudit.push({
              locator: record.locator,
              artifactId: source.artifactId,
              line: record.line,
              reason: hasSblMembership(record.editions)
                ? "sbl-record-without-target"
                : "excluded-no-sbl-membership",
            });
        await writeJson(`books/${key}.json`, shard);
        statistics.chapters++;
      }
    }
    if (parsed.size)
      throw new Error(`Unprocessed TAGNT chapters: ${[...parsed.keys()].join(", ")}`);
    statistics.booksCovered = Object.keys(books).length;
    statistics.uniqueLexemes = lexemes.size;
    statistics.sourceRecordsWithoutTarget = sourceAudit.length;
    // Retain lexical identities even when no SBL occurrence was accepted, but keep counts distinct.
    for (const lexeme of lexemes.values()) {
      const bucketId = lexemeBucket(lexeme.id);
      if (!buckets.has(bucketId)) buckets.set(bucketId, { lexemes: {}, occurrences: {} });
      buckets.get(bucketId)!.lexemes[lexeme.id] = lexeme;
    }
    for (const [bucketId, bucket] of buckets) await writeJson(`lexical/${bucketId}.json`, bucket);
    await writeJson("morphology.json", morphology);
    await writeJson("audit/targets.json", targetAudit);
    await writeJson("audit/source-records.json", sourceAudit);
    const passed =
      statistics.booksCovered === Object.keys(TAGNT_BOOKS).length &&
      statistics.targetTokens === targetManifest.statistics.tokenOccurrences &&
      statistics.targetTokens ===
        statistics.successfullyAligned + statistics.ambiguous + statistics.unmatched &&
      targetAudit.length === statistics.ambiguous + statistics.unmatched;
    if (!passed) throw new Error("TAGNT accounting quality gate failed");
    const dataset: LinguisticDataset = {
      schemaVersion: 1,
      id,
      packageId: TAGNT_PACKAGE.id,
      sourceRevision: TAGNT_COMMIT,
      targetEditionId: targetManifest.editionId,
      targetDatasetId: targetManifest.datasetId,
      sourcePackageDigest: acquired.packageDigest.value,
      attribution: TAGNT_ATTRIBUTION,
      artifacts: acquired.artifacts,
      transformations: ["normalize-unicode", "attach-morphology", "build-chapter-shards"].map(
        (type, index) => ({
          id: `${id}:transformation:${index}`,
          type: type as "normalize-unicode" | "attach-morphology" | "build-chapter-shards",
          tool: { name: "scriptorium-tagnt", version: "1.0.0" },
          timestamp: acquired.retrievedAt,
          inputArtifactIds: acquired.artifacts.map((a) => a.id),
          output: { artifactIds: [], datasetIds: [id] },
          notes: [
            "Parse TSV; preserve selected raw fields; NFC + separate accent/case/punctuation folding for matching only.",
            "TEGMC structured definitions; edition-aware unique optimal sequence, no annotation on ambiguous/unmatched tokens.",
            "Chapter shards, lexical bucket indexes, exhaustive target/source audit.",
          ][index]!,
        }),
      ),
      books,
      statistics,
      qualityGate: {
        passed,
        policy:
          "All books and target tokens accounted; one-to-one accepted links; every unresolved target and unused source enumerated. Coverage is measured, not assumed perfect.",
        unresolvedClassifications,
      },
    };
    await writeJson("manifest.json", dataset);
    // Replace only this validated generated snapshot, never source or user-owned files.
    safePath(resolve(PROJECT_ROOT, "generated/corpora/stepbible-tagnt"), TAGNT_OUTPUT_ROOT);
    await publishTagntSnapshot(staging, TAGNT_OUTPUT_ROOT, parent);
    return dataset;
  } finally {
    safePath(parent, staging);
    await rm(staging, { recursive: true, force: true });
  }
}
