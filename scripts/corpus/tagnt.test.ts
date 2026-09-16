import { readFile, mkdtemp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TAGNT_COMMIT, TAGNT_FILES, TAGNT_PACKAGE } from "../../src/lib/corpus-config/tagnt";
import { CorpusRightsGate } from "../../src/lib/domain/corpus";
import {
  compactChapter,
  expandChapter,
  type CompactChapterShard,
} from "../../src/lib/domain/compact-corpus";
import type { GeneratedCorpusManifest } from "../../src/lib/domain/generated-corpus";
import {
  matchingGreek,
  sourceRecordId,
  type ConcordanceBucket,
  type LinguisticChapter,
  type LinguisticDataset,
} from "../../src/lib/domain/linguistic";
import type { TokenOccurrence } from "../../src/lib/domain/scripture";
import { LinguisticRepository } from "../../src/lib/repositories/linguistic-repository";
import { ScriptureRepository } from "../../src/lib/repositories/scripture-repository";
import { corpusRegistry } from "../../src/lib/repositories/corpus-registry";
import { ScriptureKnowledgeEngine } from "../../src/lib/knowledge-engine/scripture-knowledge-engine";
import {
  alignVerse,
  hasSblMembership,
  parseMorphologyDefinitions,
  parseTagnt,
  type ParsedTagntRecord,
} from "./adapters/tagnt-adapter";
import { SblgntXmlAdapter } from "./adapters/sblgnt-xml-adapter";
import { publishTagntSnapshot } from "./tagnt-import";
import {
  acquireTagnt,
  PROJECT_ROOT,
  sha256,
  TAGNT_OUTPUT_ROOT,
  TAGNT_SOURCE_ROOT,
  verifyTagnt,
  verifyArtifactBytes,
} from "./tagnt-acquisition";

const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T;
const sourceRow = (greek = "λόγος", editions = "SBL", order = 1): ParsedTagntRecord => ({
  locator: `Jhn.1.1#${order}=NKO`,
  line: 100 + order,
  bookId: "john",
  chapter: 1,
  verse: 1,
  order,
  greek,
  lexicalGrammar: "G3056=N-NSM",
  lemma: "λόγος",
  editions,
  spelling: "",
  strongInstance: "G3056",
});
const target = (surface = "λόγος", position = 1): TokenOccurrence => ({
  id: `sblgnt:1.2:john:1:1:${String(position).padStart(3, "0")}`,
  editionId: "sblgnt-1.2",
  textUnitId: "sblgnt-1.2:john.1.1",
  ref: { bookId: "john", chapter: 1, verseStart: 1 },
  position,
  language: "grc",
  surface,
});

describe("TAGNT source, rights and parser", () => {
  it("rejects modified artifact bytes and unknown book identifiers", async () => {
    const acquired = await verifyTagnt();
    expect(() => verifyArtifactBytes(acquired.artifacts[0]!, new Uint8Array([1, 2]))).toThrow(
      "checksum mismatch",
    );
    expect(() =>
      parseTagnt(
        "Word & Type\tGreek\nXxx.1.1#01=NKO\tλόγος\t\tG3056=N-NSM\tλόγος\tSBL\t\t\t\t\t\tG3056",
      ),
    ).toThrow("Unknown TAGNT book");
  });
  it("acquires only the fixed commit and verifies the existing bytes idempotently", async () => {
    const first = await verifyTagnt(),
      second = await acquireTagnt();
    expect(first).toEqual(second);
    expect(first.commitSha).toBe(TAGNT_COMMIT);
    expect(first.artifacts.map((a) => a.sourcePath)).toEqual([...TAGNT_FILES]);
    for (const a of first.artifacts)
      expect(sha256(await readFile(resolve(TAGNT_SOURCE_ROOT, a.sourcePath)))).toBe(
        a.checksum.value,
      );
  });
  it("keeps rights explicit, excludes translation capabilities and blocks unresolved notices", () => {
    expect(CorpusRightsGate.evaluate(TAGNT_PACKAGE.rights).eligible).toBe(true);
    expect(
      CorpusRightsGate.evaluate({ ...TAGNT_PACKAGE.rights, status: "conflicting-metadata" })
        .eligible,
    ).toBe(false);
    expect(TAGNT_PACKAGE.contentCapabilities).toEqual(["lemmas", "morphology", "strong-numbers"]);
    expect(TAGNT_PACKAGE.rights.evidence).toHaveLength(5);
    expect(corpusRegistry.canBundle(TAGNT_PACKAGE.id).eligible).toBe(true);
  });
  it("preserves raw Unicode, references and source IDs; excludes glosses and translations", () => {
    const line =
      "Jhn.1.1[1.2]#05=NKO\tλόγος (logos)\tword\tG3056=N-NSM\tλόγος=word\tNA28+SBL\t\t\tpalabra\tmeaning\t#05\tG3056_A";
    const record = parseTagnt("Word & Type\tGreek\n" + line)[0]!;
    expect(record).toMatchObject({
      bookId: "john",
      chapter: 1,
      verse: 1,
      lemma: "λόγος",
      greek: "λόγος (logos)",
    });
    expect(sourceRecordId("dataset", record.locator)).toBe(
      sourceRecordId("dataset", record.locator),
    );
    expect(record).not.toHaveProperty("translation");
    expect(() => parseTagnt("Word & Type\tGreek\n" + line + "\n" + line)).toThrow("Duplicate");
    expect(() => parseTagnt("Word & Type\tGreek\ninvalid row")).toThrow("Unrecognized");
  });
  it("does not treat NKO or another edition as SBL membership", () => {
    expect(hasSblMembership("NA28+TR+Byz")).toBe(false);
    expect(hasSblMembership("NA28+SBL«2")).toBe(true);
    expect(alignVerse([target()], [sourceRow("λόγος", "NA28")])[0]!.status).toBe("unmatched");
  });
});
describe("auditable automatic alignment", () => {
  it("separates exact, normalized, positional, ambiguous and unmatched", () => {
    expect(alignVerse([target()], [sourceRow()])[0]!.status).toBe("exact");
    const raw = "λόγος (logos)";
    expect(alignVerse([target()], [sourceRow(raw)])[0]!.status).toBe("normalized");
    expect(sourceRow(raw).greek).toBe(raw);
    expect(matchingGreek("κατʼ")).toBe(matchingGreek("κατ᾽"));
    const variant = { ...sourceRow("Δαυιδ"), spelling: "SBL: Δαυειδ" };
    expect(alignVerse([target("Δαυειδ")], [variant])[0]!.status).toBe("positional");
    expect(alignVerse([target()], [sourceRow(), sourceRow("λόγος", "SBL", 2)])[0]!.status).toBe(
      "ambiguous",
    );
    expect(alignVerse([target("ἀρχή")], [sourceRow()])[0]!.status).toBe("unmatched");
  });
  it("uses explicit edition order for transpositions", () => {
    const rows = [sourceRow("ἀρχή", "SBL", 1), sourceRow("λόγος", "SBL«2", 2)];
    const matches = alignVerse([target("λόγος"), target("ἀρχή", 2)], rows);
    expect(matches.map((m) => m.status)).toEqual(["positional", "positional"]);
    expect(matches.map((m) => m.source!.order)).toEqual([2, 1]);
  });
  it("does not steal a repeated source when one target could be skipped", () => {
    const matches = alignVerse([target(), target("λόγος", 2)], [sourceRow()]);
    expect(matches.map((m) => m.status)).toEqual(["ambiguous", "ambiguous"]);
    expect(matches.every((m) => m.source === null)).toBe(true);
  });
  it("parses morphology from the supplied TEGMC definitions without inventing absent features", async () => {
    const definitions = parseMorphologyDefinitions(
      await readFile(resolve(TAGNT_SOURCE_ROOT, TAGNT_FILES[3]), "utf8"),
    );
    expect(definitions["N-NSM"]).toMatchObject({
      rawMorphologyCode: "N-NSM",
      features: {
        partOfSpeech: "noun",
        case: "nominative",
        number: "singular",
        gender: "masculine",
      },
    });
    expect(definitions["N-NSM"]!.features.tense).toBeUndefined();
    expect(definitions["V-PAN"]!.extras["Form"]).toBe("Infinitive");
  });
});
describe("real NT linguistic layer", () => {
  it("accounts for every target and source, with no duplicate accepted mappings", async () => {
    const manifest = await json<LinguisticDataset>(resolve(TAGNT_OUTPUT_ROOT, "manifest.json"));
    const tokens = new Set<string>(),
      sources = new Set<string>();
    let accepted = 0,
      unresolved = 0,
      records = 0;
    for (const [book, chapters] of Object.entries(manifest.books))
      for (const chapter of chapters) {
        const shard = await json<LinguisticChapter>(
          resolve(TAGNT_OUTPUT_ROOT, `books/${book}/${chapter}.json`),
        );
        records += shard.records.length;
        for (const row of shard.alignments) {
          const id = `${book}:${chapter}:${row[0]}:${row[1]}`;
          expect(tokens.has(id)).toBe(false);
          tokens.add(id);
          if (row[2] === null) {
            unresolved++;
            expect(["ambiguous", "unmatched"]).toContain(row[3]);
          } else {
            accepted++;
            const locator = shard.records[row[2]]![0];
            expect(sources.has(locator)).toBe(false);
            sources.add(locator);
          }
        }
      }
    expect(records).toBe(manifest.statistics.sourceRecords);
    expect(tokens.size).toBe(137741);
    expect(accepted).toBe(manifest.statistics.successfullyAligned);
    expect(unresolved).toBe(manifest.statistics.unmatched + manifest.statistics.ambiguous);
    const audit = await json<unknown[]>(resolve(TAGNT_OUTPUT_ROOT, "audit/targets.json"));
    expect(audit.length).toBe(unresolved);
    expect(Object.keys(manifest.books)).toHaveLength(27);
    expect(manifest.statistics.unmappedMorphology).toBe(0);
  }, 30000);
  it("John 1:1 has three distinct logos tokens, real noun analyses and a shared lexical identity", async () => {
    const chapter = await ScriptureRepository.loadChapter("john", 1);
    await ScriptureKnowledgeEngine.loadLinguisticPassage({
      bookId: "john",
      chapter: 1,
      verseStart: 1,
    });
    const passage = LinguisticRepository.getPassage({ bookId: "john", chapter: 1, verseStart: 1 })!;
    const tokens = chapter!.verses[0]!.original!.filter((t) => t.surface === "λόγος");
    const annotations = passage.annotations.filter((a) =>
      tokens.some((t) => t.id === a.targetTokenId),
    );
    expect(tokens).toHaveLength(3);
    expect(annotations).toHaveLength(3);
    expect(new Set(annotations.map((a) => a.sourceRecordId)).size).toBe(3);
    expect(new Set(annotations.map((a) => a.normalized.lexemeId)).size).toBe(1);
    for (const annotation of annotations) {
      expect(annotation.normalized.lemmas).toContain("λόγος");
      expect(annotation.normalized.morphology[0]!.features).toMatchObject({
        partOfSpeech: "noun",
        case: "nominative",
        gender: "masculine",
        number: "singular",
      });
      expect(tokens.find((t) => t.id === annotation.targetTokenId)).not.toHaveProperty(
        "morphology",
      );
      expect(
        corpusRegistry.getArtifact(annotation.provenance.sourceArtifactId)?.sourceRevision,
      ).toBe(TAGNT_COMMIT);
    }
    const lexeme = annotations[0]!.normalized.lexemeId!;
    const first = await LinguisticRepository.getOccurrencesByLexeme(lexeme, 0, 30);
    const second = await LinguisticRepository.getOccurrencesByLexeme(lexeme, 30, 30);
    expect(first.items).toHaveLength(30);
    expect(second.items).toHaveLength(30);
    expect(first.total).toBeGreaterThan(100);
    expect(new Set([...first.items, ...second.items].map((i) => i.tokenId)).size).toBe(60);
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle({
      bookId: "john",
      chapter: 1,
      verseStart: 1,
    })!;
    expect(bundle.linguistics.status).toBe("available");
  });
  it("does not fabricate annotations for John 7:53–8:11 without SBL membership", async () => {
    for (const ref of [
      { bookId: "john", chapter: 7, verseStart: 53 },
      { bookId: "john", chapter: 8, verseStart: 1, verseEnd: 11 },
    ]) {
      await LinguisticRepository.loadChapter(ref.bookId, ref.chapter);
      const passage = LinguisticRepository.getPassage(ref)!;
      expect(passage.alignments.length).toBeGreaterThan(0);
      expect(passage.annotations).toEqual([]);
      expect(
        passage.alignments.every(
          (a) => a.status === "unmatched" && a.evidence === "no-sbl-membership",
        ),
      ).toBe(true);
    }
  });
  it("covers the beginning of Matthew and end of Revelation", async () => {
    for (const ref of [
      { bookId: "matthew", chapter: 1, verseStart: 1 },
      { bookId: "revelation", chapter: 22, verseStart: 21 },
    ]) {
      await LinguisticRepository.loadChapter(ref.bookId, ref.chapter);
      const passage = LinguisticRepository.getPassage(ref)!;
      expect(passage.annotations.length).toBeGreaterThan(0);
      expect(
        passage.alignments.every((a) => a.sourceDatasetId === LinguisticRepository.getDataset().id),
      ).toBe(true);
    }
  });
  it("keeps indexed occurrences unique and page inputs bounded", async () => {
    const id = "lexeme:tagnt:000000000000000000000000";
    await expect(LinguisticRepository.getOccurrencesByLexeme(id, -1)).rejects.toThrow("Invalid");
    await expect(LinguisticRepository.getOccurrencesByLexeme(id, 0, 1000)).rejects.toThrow(
      "Invalid",
    );
    const { readdir } = await import("node:fs/promises");
    for (const file of await readdir(resolve(TAGNT_OUTPUT_ROOT, "lexical"))) {
      const bucket = await json<ConcordanceBucket>(resolve(TAGNT_OUTPUT_ROOT, "lexical", file));
      for (const [key, rows] of Object.entries(bucket.occurrences)) {
        expect(bucket.lexemes[key]).toBeDefined();
        expect(new Set(rows.map((r) => JSON.stringify(r))).size).toBe(rows.length);
      }
    }
  });
  it("keeps chapter and lexical data behind the lazy SQLite corpus boundary", async () => {
    const source = await readFile(
      resolve(PROJECT_ROOT, "src/lib/repositories/linguistic-repository.ts"),
      "utf8",
    );
    expect(source).toContain("corpusPackageRegistry.open");
    expect(source).not.toContain("import.meta.glob");
    expect(source).not.toContain("/books/**/*.json");
    expect(source).not.toContain("/lexical/*.json");
    expect(source).not.toContain("audit/targets.json");
  });
});
describe("SBLGNT compact storage regression", () => {
  it("keeps the published tree unchanged on identical rebuilds and restores it after failed replacement", async () => {
    const parent = await mkdtemp(resolve(tmpdir(), "scriptorium-publish-test-"));
    try {
      const destination = resolve(parent, "published"),
        staging = resolve(parent, "staging");
      await mkdir(destination);
      await mkdir(staging);
      await writeFile(resolve(destination, "data.json"), "original");
      await writeFile(resolve(staging, "data.json"), "original");
      const before = (await stat(resolve(destination, "data.json"))).mtimeMs;
      await publishTagntSnapshot(staging, destination, parent);
      expect((await stat(resolve(destination, "data.json"))).mtimeMs).toBe(before);
      await expect(
        publishTagntSnapshot(resolve(parent, "missing"), destination, parent),
      ).rejects.toThrow();
      expect(await readFile(resolve(destination, "data.json"), "utf8")).toBe("original");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
  it("reconstructs every field of every source-derived chapter exactly", async () => {
    const root = resolve(PROJECT_ROOT, "generated/corpora/sblgnt/1.2");
    const manifest = await json<GeneratedCorpusManifest>(resolve(root, "manifest.json"));
    const pkg = corpusRegistry.getPackage(manifest.packageId)!;
    const adapter = new SblgntXmlAdapter();
    const sourceRoot = resolve(PROJECT_ROOT, "corpora/source/sblgnt", manifest.sourceRevision);
    for (const artifact of await adapter.discover(sourceRoot, pkg)) {
      const metadata = manifest.sourceArtifactIds
        .map((id) => corpusRegistry.getArtifact(id)!)
        .find((a) => a.sourcePath === artifact.sourcePath)!;
      const parsed = await adapter.parseAndNormalize(artifact, metadata, pkg, manifest.datasetId);
      if (!parsed) continue;
      for (const chapter of parsed.chapters) {
        expect(expandChapter(compactChapter(chapter))).toEqual(chapter);
        const path = manifest.books.find((b) => b.id === chapter.bookId)!.chapterFiles[
          String(chapter.chapter)
        ]!;
        expect(expandChapter(await json<CompactChapterShard>(resolve(root, path)))).toEqual(
          chapter,
        );
      }
    }
  }, 30000);
});
