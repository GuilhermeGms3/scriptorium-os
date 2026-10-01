import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CorpusRightsGate } from "../../src/lib/domain/corpus";
import {
  BIBLIA_LIVRE_COMMIT,
  BIBLIA_LIVRE_EDITION_ID,
  BIBLIA_LIVRE_PACKAGE,
} from "../../src/lib/corpus-config/biblia-livre";
import manifestJson from "../../generated/corpora/biblia-livre/2025.1.0/manifest.json";
import { corpusRegistry } from "../../src/lib/repositories/corpus-registry";
import { ScriptureRepository } from "../../src/lib/repositories/scripture-repository";
import {
  ScriptureKnowledgeEngine,
  validatePassageKnowledgeBundle,
} from "../../src/lib/knowledge-engine/scripture-knowledge-engine";
import type { CorpusAdapter } from "./adapter";
import { BibliaLivreAdapter, parseBibliaLivreF4 } from "./adapters/biblia-livre-adapter";
import {
  CorpusPipelineError,
  createCorpusPipeline,
  verifyCorpus,
  type CorpusGit,
  type CorpusPipelineEvent,
  type CorpusPipelineOptions,
} from "./pipeline";

const manifest = manifestJson as typeof manifestJson;
describe("Bíblia Livre official N4", () => {
  it("keeps the historical candidate blocked and the source-specific package eligible", () => {
    expect(corpusRegistry.getPackage("pkg-biblia-livre-unresolved")?.rights.status).toBe(
      "conflicting-metadata",
    );
    expect(CorpusRightsGate.evaluate(BIBLIA_LIVRE_PACKAGE.rights).eligible).toBe(true);
    expect(corpusRegistry.getPackage(BIBLIA_LIVRE_PACKAGE.id)?.status).toBe("bundled");
  });
  it("verifies the immutable 68-artifact custody snapshot", async () => {
    const acquired = await verifyCorpus("biblia-livre");
    expect(acquired.commitSha).toBe(BIBLIA_LIVRE_COMMIT);
    expect(acquired.artifacts).toHaveLength(68);
    expect(acquired.artifacts.every((a) => /^[a-f0-9]{64}$/.test(a.checksum.value))).toBe(true);
  });
  it("parses UTF-8 F4, visible additions, notes and headings without word alignment", () => {
    const parsed = parseBibliaLivreF4(
      "\uFEFF\\v Gn.1.1\nCriação\n\\added\né boa\n\\*added\n.\n\\v Gn.1.2\nTexto\n\\fn\nnota ágil\n\\key\nx\n\\*key\nfim\n\\*fn\nvisível\n\\psalm-title\nTítulo\n\\*psalm-title",
    );
    expect(parsed.chapters.get(1)?.get(1)).toBe("Criação é boa.");
    expect(parsed.chapters.get(1)?.get(2)).toBe("Texto visível");
    expect(parsed.notes[0]?.text).toContain("nota ágil");
    expect(parsed.headings[0]?.text).toBe("Título");
  });
  it("discovers all canonical books automatically", async () => {
    const adapter = new BibliaLivreAdapter();
    const found = await adapter.discover(
      resolve("corpora/source/biblia-livre", BIBLIA_LIVRE_COMMIT),
    );
    expect(found.filter((a) => a.classification === "book")).toHaveLength(66);
    expect(new Set(found.flatMap((a) => (a.canonicalBookId ? [a.canonicalBookId] : []))).size).toBe(
      66,
    );
  });
  it("records the complete inventory and explicit versification anomaly", () => {
    expect(manifest.statistics).toMatchObject({
      books: 66,
      chapters: 1189,
      verses: 31101,
      tokenOccurrences: 0,
      missingCanonicalMappings: 0,
    });
    expect(manifest.versificationAnomalies).toEqual(["mark:omitted:5:19"]);
  });
  it("loads OT and NT lazily with Portuguese default and independent Greek/TAGNT", async () => {
    const genesis = await ScriptureRepository.loadChapter("genesis", 1);
    expect(genesis?.verses[0]?.translations[BIBLIA_LIVRE_EDITION_ID]).toContain("No princípio");
    const john = await ScriptureRepository.loadChapter("john", 1);
    expect(ScriptureRepository.defaultEditionId("john", 1)).toBe(BIBLIA_LIVRE_EDITION_ID);
    expect(john?.verses[0]?.translations[BIBLIA_LIVRE_EDITION_ID]).toContain("No princípio");
    expect(john?.verses[0]?.originalEditionId).toBe("sblgnt-1.2");
    expect(john?.verses[0]?.original?.some((t) => t.surface.normalize("NFC") === "λόγος")).toBe(
      true,
    );
    expect(john?.verses[0]?.original?.every((t) => t.editionId === "sblgnt-1.2")).toBe(true);
    expect(
      ScriptureRepository.getPassage({
        edition: BIBLIA_LIVRE_EDITION_ID,
        book: "john",
        chapter: 1,
      })[0]?.translations[BIBLIA_LIVRE_EDITION_ID],
    ).toContain("No princípio");
    expect(
      ScriptureRepository.getPassage({ edition: "sblgnt-1.2", book: "john", chapter: 1 })[0]
        ?.originalEditionId,
    ).toBe("sblgnt-1.2");
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle({
      bookId: "john",
      chapter: 1,
      verseStart: 1,
    });
    expect(bundle?.texts.map((t) => t.edition.id)).toEqual([
      BIBLIA_LIVRE_EDITION_ID,
      "biblia-portuguesa-mundial-2026-08-19",
      "sblgnt-1.2",
    ]);
    expect(new Set(bundle?.texts.map((t) => t.provenance.packageId)).size).toBe(3);
    await ScriptureKnowledgeEngine.loadLinguisticPassage({ bookId: "john", chapter: 1 });
    const loadedBundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle({
      bookId: "john",
      chapter: 1,
      verseStart: 1,
    });
    expect(loadedBundle?.linguistics.status).toBe("available");
    expect(validatePassageKnowledgeBundle(loadedBundle!)).toEqual([]);
  });
  it("preserves source attribution after a route-loader hydration", async () => {
    const serializedChapter = structuredClone(await ScriptureRepository.loadChapter("genesis", 1));
    expect(serializedChapter).not.toBeNull();

    vi.resetModules();
    const { ScriptureRepository: hydratedRepository } =
      await import("../../src/lib/repositories/scripture-repository");
    hydratedRepository.primeChapter(serializedChapter);
    const { ScriptureKnowledgeEngine: hydratedEngine } =
      await import("../../src/lib/knowledge-engine/scripture-knowledge-engine");
    const bundle = hydratedEngine.getPassageKnowledgeBundle({ bookId: "genesis", chapter: 1 });

    const portuguese = bundle?.texts.find(
      (layer) => layer.editionId === "biblia-livre-n4-2025.1.0",
    );
    expect(portuguese?.provenance.attribution).toContain("Bíblia Livre");
    expect(portuguese?.provenance.sourceArtifactIds?.[0]).toContain(":gen");
  });
  it("covers first and last books and stores only chapter modules", async () => {
    expect(
      (await ScriptureRepository.loadChapter("revelation", 22))?.verses.at(-1)?.translations[
        BIBLIA_LIVRE_EDITION_ID
      ],
    ).toContain("graça");
    const raw = await readFile(
      "generated/corpora/biblia-livre/2025.1.0/books/genesis/01.json",
      "utf8",
    );
    expect(raw).toContain(BIBLIA_LIVRE_EDITION_ID);
    expect(raw).not.toContain('"original"');
  });
});

const SNAPSHOT = resolve("corpora/source/biblia-livre", BIBLIA_LIVRE_COMMIT);
const SAMPLE_FILES = ["README.md", "LICENCA.md", "rute.txt", "oba.txt", "jud.txt"].map((name) =>
  name.endsWith(".txt") ? `textos/f4/n4/${name}` : name,
);
const SAMPLE_BOOKS = ["ruth", "obadiah", "jude"];
const temporaryRoots: string[] = [];

afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function sandbox(options: { resolvedCommit?: string } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "scriptorium-corpus-"));
  temporaryRoots.push(root);
  const events: CorpusPipelineEvent[] = [];
  const clones = { count: 0 };
  const git: CorpusGit = {
    async clone(_repository, destination) {
      clones.count += 1;
      for (const file of SAMPLE_FILES) {
        await mkdir(resolve(destination, file, ".."), { recursive: true });
        await cp(resolve(SNAPSHOT, file), resolve(destination, file));
      }
    },
    async checkout() {},
    async revParse() {
      return options.resolvedCommit ?? BIBLIA_LIVRE_COMMIT;
    },
  };
  const base: CorpusPipelineOptions = {
    projectRoot: root,
    registry: [
      {
        ...BIBLIA_LIVRE_PACKAGE,
        acquisitionPlan: {
          ...BIBLIA_LIVRE_PACKAGE.acquisitionPlan!,
          expectedBookIds: SAMPLE_BOOKS,
        },
      },
    ],
    git,
    now: () => new Date("2026-10-01T12:00:00.000Z"),
    onEvent: (event) => events.push(event),
  };
  return {
    root,
    events,
    clones,
    pipeline: createCorpusPipeline(base),
    with: (overrides: CorpusPipelineOptions) => createCorpusPipeline({ ...base, ...overrides }),
  };
}

async function failure(promise: Promise<unknown>): Promise<CorpusPipelineError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(CorpusPipelineError);
    return error as CorpusPipelineError;
  }
  throw new Error("Expected the pipeline to fail.");
}

async function stagingLeftovers(root: string): Promise<string[]> {
  const staging = resolve(root, "corpora/.staging");
  return existsSync(staging) ? readdir(staging) : [];
}

describe("Bíblia Livre pipeline guarantees", () => {
  it("installs the snapshot atomically and reuses it when verified", async () => {
    const { root, pipeline, events, clones } = await sandbox();
    const acquired = await pipeline.acquire("biblia-livre");
    expect(acquired.artifacts.map((artifact) => artifact.sourcePath).sort()).toEqual(
      [...SAMPLE_FILES].sort(),
    );
    expect(acquired.retrievedAt).toBe("2026-10-01T12:00:00.000Z");
    expect(
      existsSync(
        resolve(root, "corpora/source/biblia-livre", BIBLIA_LIVRE_COMMIT, "artifact-manifest.json"),
      ),
    ).toBe(true);
    expect(await stagingLeftovers(root)).toEqual([]);

    expect((await pipeline.acquire("biblia-livre")).packageDigest).toEqual(acquired.packageDigest);
    expect(clones.count).toBe(1);
    expect(events.map((event) => event.type)).toEqual(["acquired", "acquisition-reused"]);
    expect((await pipeline.status("biblia-livre")).acquisition).toEqual({
      state: "verified",
      reason: null,
    });
  });

  it("reports a tampered artifact as an integrity failure naming its path", async () => {
    const { root, pipeline } = await sandbox();
    await pipeline.acquire("biblia-livre");
    await appendFile(
      resolve(root, "corpora/source/biblia-livre", BIBLIA_LIVRE_COMMIT, "textos/f4/n4/oba.txt"),
      "x",
    );
    const error = await failure(pipeline.verify("biblia-livre"));
    expect(error.code).toBe("integrity");
    expect(
      error.details.filter((detail) => detail.startsWith("textos/f4/n4/oba.txt:")),
    ).toHaveLength(2);
    expect((await failure(pipeline.acquire("biblia-livre"))).code).toBe("integrity");
    expect((await pipeline.status("biblia-livre")).acquisition.state).toBe("corrupt");
  });

  it("rejects a wrong commit without leaving a snapshot, staging area or lock", async () => {
    const { root, pipeline } = await sandbox({ resolvedCommit: "0".repeat(40) });
    const error = await failure(pipeline.acquire("biblia-livre"));
    expect(error.code).toBe("git");
    expect(existsSync(resolve(root, "corpora/source/biblia-livre"))).toBe(false);
    expect(await stagingLeftovers(root)).toEqual([]);
    expect((await pipeline.status("biblia-livre")).acquisition.state).toBe("missing");
  });

  it("reuses an up-to-date dataset, re-imports a missing chapter and honours force", async () => {
    const { root, pipeline, events } = await sandbox();
    const output = resolve(root, "generated/corpora/biblia-livre/2025.1.0");
    const first = await pipeline.build("biblia-livre");
    expect(first.books.map((book) => book.id)).toEqual(SAMPLE_BOOKS);
    expect(first.transformations[0]?.type).toBe("parse-f4");
    expect(first.structuralDecisions).toEqual(manifest.structuralDecisions);
    expect(Object.keys(first.statistics)).toEqual(Object.keys(manifest.statistics));
    expect((await pipeline.status("biblia-livre")).dataset.state).toBe("up-to-date");

    const manifestBytes = await readFile(resolve(output, "manifest.json"));
    await pipeline.import("biblia-livre");
    await rm(resolve(output, "books/jude/01.json"));
    expect((await pipeline.status("biblia-livre")).dataset).toEqual({
      state: "stale",
      reason: "chapter file books/jude/01.json is missing",
    });
    await pipeline.import("biblia-livre");
    expect(existsSync(resolve(output, "books/jude/01.json"))).toBe(true);
    await pipeline.import("biblia-livre", { force: true });
    expect(await readFile(resolve(output, "manifest.json"))).toEqual(manifestBytes);
    expect(events.map((event) => event.type)).toEqual([
      "acquired",
      "imported",
      "import-reused",
      "imported",
      "imported",
    ]);
    expect(await readdir(resolve(root, "generated/corpora/biblia-livre/.staging"))).toEqual([]);
  });

  it("aggregates validation errors from two books and keeps the previous dataset", async () => {
    const context = await sandbox();
    await context.pipeline.build("biblia-livre");
    const output = resolve(context.root, "generated/corpora/biblia-livre/2025.1.0");
    const before = await readFile(resolve(output, "manifest.json"));
    const base = new BibliaLivreAdapter();
    const failing: CorpusAdapter = {
      id: base.id,
      importerVersion: base.importerVersion,
      transformationType: base.transformationType,
      structuralDecisions: base.structuralDecisions,
      supports: (candidate) => base.supports(candidate),
      discover: (sourceRoot) => base.discover(sourceRoot),
      parseAndNormalize: (...args) => base.parseAndNormalize(...args),
      validate: (book) =>
        book.book.id === "obadiah" ? [] : [`${book.book.id}: synthetic validation failure`],
    };
    const error = await failure(
      context.with({ adapters: [failing] }).import("biblia-livre", { force: true }),
    );
    expect(error.code).toBe("validation");
    expect(error.details).toEqual([
      "textos/f4/n4/jud.txt › jude: synthetic validation failure",
      "textos/f4/n4/rute.txt › ruth: synthetic validation failure",
    ]);
    expect(await readFile(resolve(output, "manifest.json"))).toEqual(before);
    expect(existsSync(resolve(output, "books/jude/01.json"))).toBe(true);
    expect(await readdir(resolve(context.root, "generated/corpora/biblia-livre/.staging"))).toEqual(
      [],
    );
  });

  it("fails closed on a live lock and recovers a dead or expired one", async () => {
    const { root, pipeline, events } = await sandbox();
    const lockPath = resolve(root, "corpora/.staging/biblia-livre.lock");
    await mkdir(resolve(lockPath, ".."), { recursive: true });
    const writeLock = (pid: number, createdAt: string) =>
      writeFile(lockPath, JSON.stringify({ pid, createdAt }), "utf8");

    await writeLock(process.pid, "2026-10-01T11:00:00.000Z");
    const locked = await failure(pipeline.acquire("biblia-livre"));
    expect(locked.code).toBe("locked");
    expect(locked.details).toContain(`lock: ${lockPath}`);
    expect(existsSync(resolve(root, "corpora/source/biblia-livre"))).toBe(false);

    const deadPid = spawnSync(process.execPath, ["-e", ""]).pid;
    await writeLock(deadPid, "2026-10-01T11:00:00.000Z");
    await pipeline.acquire("biblia-livre");
    await writeLock(process.pid, "2026-10-01T05:00:00.000Z");
    await pipeline.import("biblia-livre");
    expect(events.filter((event) => event.type === "lock-recovered")).toHaveLength(2);
    expect(existsSync(lockPath)).toBe(false);
  });
});
