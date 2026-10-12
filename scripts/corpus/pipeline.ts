import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import { z } from "zod";
import {
  CorpusRightsGate,
  checksumSchema,
  sourceArtifactSchema,
  type CorpusPackageManifest,
  type SourceArtifact,
} from "../../src/lib/domain/corpus";
import type {
  GeneratedCorpusBookIndex,
  GeneratedCorpusManifest,
} from "../../src/lib/domain/generated-corpus";
import { CORPUS_PACKAGE_CANDIDATES } from "../../src/lib/fixtures/corpus-registry.fixture";
import type { CorpusAdapter, DiscoveredCorpusArtifact, NormalizedCorpusBook } from "./adapter";
import { emptyImportStatistics } from "./adapter";
import { SblgntXmlAdapter } from "./adapters/sblgnt-xml-adapter";
import { BibliaLivreAdapter } from "./adapters/biblia-livre-adapter";
import { OshbOsisAdapter } from "./adapters/oshb-osis-adapter";
import { compactChapter } from "../../src/lib/domain/compact-corpus";

const DEFAULT_PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const MUTABLE_REVISIONS = new Set(["HEAD", "master", "latest"]);
const LOCK_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const UNWRITTEN_LOCK_GRACE_MS = 60 * 1000;

export const acquiredPackageSchema = z.object({
  schemaVersion: z.literal(1),
  packageId: z.string().min(1),
  corpusId: z.string().min(1),
  editionId: z.string().min(1),
  repository: z.string().url(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  retrievedAt: z.string().datetime(),
  packageDigest: checksumSchema,
  artifacts: z.array(sourceArtifactSchema).min(1),
});

export type AcquiredPackage = z.infer<typeof acquiredPackageSchema>;

export type CorpusPipelineErrorCode =
  | "not-registered"
  | "rights-denied"
  | "mutable-revision"
  | "locked"
  | "integrity"
  | "validation"
  | "incomplete"
  | "git";

export class CorpusPipelineError extends Error {
  readonly code: CorpusPipelineErrorCode;
  readonly details: string[];

  constructor(code: CorpusPipelineErrorCode, message: string, details: string[] = []) {
    super(message);
    this.name = "CorpusPipelineError";
    this.code = code;
    this.details = details;
  }
}

export interface CorpusGit {
  clone(repository: string, destination: string): Promise<void>;
  checkout(directory: string, commitSha: string): Promise<void>;
  revParse(directory: string): Promise<string>;
}

export interface CorpusPipelineEvent {
  type: "lock-recovered" | "acquisition-reused" | "acquired" | "import-reused" | "imported";
  corpusId: string;
  detail: string;
}

export interface CorpusPipelineOptions {
  projectRoot?: string;
  registry?: readonly CorpusPackageManifest[];
  adapters?: readonly CorpusAdapter[];
  git?: CorpusGit;
  now?: () => Date;
  onEvent?: (event: CorpusPipelineEvent) => void;
}

export interface CorpusRunOptions {
  force?: boolean;
}

export interface CorpusStatus {
  corpusId: string;
  registered: boolean;
  packageId: string | null;
  rights: { eligible: boolean; reasons: string[] };
  acquisition: { state: "missing" | "verified" | "corrupt"; reason: string | null };
  dataset: { state: "missing" | "up-to-date" | "stale"; reason: string | null };
}

export interface RegisteredCorpus {
  corpusId: string;
  packageId: string;
  editionId: string;
  version: string | null;
  commitSha: string;
  adapterId: string | null;
  rightsEligible: boolean;
}

export interface CorpusPipeline {
  acquire(corpusId: string, options?: CorpusRunOptions): Promise<AcquiredPackage>;
  verify(corpusId: string): Promise<AcquiredPackage>;
  import(corpusId: string, options?: CorpusRunOptions): Promise<GeneratedCorpusManifest>;
  build(corpusId: string, options?: CorpusRunOptions): Promise<GeneratedCorpusManifest>;
  status(corpusId: string): Promise<CorpusStatus>;
  list(): RegisteredCorpus[];
}

type DatasetState =
  | { state: "missing"; reason: string }
  | { state: "stale"; reason: string }
  | { state: "up-to-date"; manifest: GeneratedCorpusManifest };

function assertInside(parent: string, child: string): void {
  const path = relative(resolve(parent), resolve(child));
  if (path === "" || path === ".") return;
  if (path.startsWith(`..${sep}`) || path === ".." || path.includes(":")) {
    throw new Error(`Path escapes its allowed root: ${child}`);
  }
}

async function safeRemove(target: string, allowedRoot: string): Promise<void> {
  assertInside(allowedRoot, target);
  if (resolve(target) === resolve(allowedRoot))
    throw new Error(`Refusing to remove root ${target}.`);
  await rm(target, { recursive: true, force: true });
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn("git", args, { cwd, shell: false, stdio: ["ignore", "pipe", "inherit"] });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString("utf8")));
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise(output.trim());
      else reject(new Error(`git ${args.join(" ")} exited with code ${code ?? "unknown"}.`));
    });
  });
}

const defaultGit: CorpusGit = {
  async clone(repository, destination) {
    await runGit(
      ["clone", "--filter=blob:none", "--no-checkout", repository, destination],
      dirname(destination),
    );
  },
  async checkout(directory, commitSha) {
    await runGit(["-C", directory, "checkout", "--detach", commitSha], directory);
  },
  revParse: (directory) => runGit(["-C", directory, "rev-parse", "HEAD"], directory),
};

// Reentrant per process: build() holds the lock while it calls acquire() and import().
const heldLocks = new Map<string, number>();

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function calculatePackageDigest(artifacts: SourceArtifact[]): string {
  const identity = [...artifacts]
    .sort((left, right) =>
      left.sourcePath < right.sourcePath ? -1 : left.sourcePath > right.sourcePath ? 1 : 0,
    )
    .map((artifact) => `${artifact.sourcePath}\0${artifact.checksum.value}\n`)
    .join("");
  return sha256(identity);
}

function assertRights(manifest: CorpusPackageManifest): void {
  const decision = CorpusRightsGate.evaluate(manifest.rights);
  if (!decision.eligible) {
    throw new CorpusPipelineError(
      "rights-denied",
      `Rights gate denied ${manifest.id}.`,
      decision.reasons,
    );
  }
  if (manifest.rights.license.attributionRequired && !manifest.rights.attribution) {
    throw new CorpusPipelineError("rights-denied", `Rights gate denied ${manifest.id}.`, [
      "attribution is missing",
    ]);
  }
}

function sourceUrlFor(manifest: CorpusPackageManifest, sourcePath: string): string {
  const repository = (manifest.sourceRepository ?? manifest.canonicalSource).replace(/\.git$/, "");
  return `${repository}/blob/${manifest.acquisitionPlan!.commitSha}/${sourcePath}`;
}

async function artifactFrom(
  discovered: DiscoveredCorpusArtifact,
  manifest: CorpusPackageManifest,
  retrievedAt: string,
): Promise<SourceArtifact> {
  const bytes = await readFile(discovered.absolutePath);
  const extension = extname(discovered.fileName);
  const stem = basename(discovered.fileName, extension)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
  const format =
    discovered.classification === "book" && manifest.format !== "unknown"
      ? manifest.format
      : "unknown";
  return sourceArtifactSchema.parse({
    id: `artifact:${manifest.id}:${stem}`,
    packageId: manifest.id,
    role: "source",
    repository: manifest.acquisitionPlan!.repository,
    sourcePath: discovered.sourcePath,
    sourceUrl: sourceUrlFor(manifest, discovered.sourcePath),
    fileName: discovered.fileName,
    mediaType:
      extension === ".md"
        ? "text/markdown"
        : extension === ".xml"
          ? "application/xml"
          : "text/plain",
    format,
    retrievedAt,
    sourceRevision: manifest.acquisitionPlan!.commitSha,
    checksum: { algorithm: "SHA-256", value: sha256(bytes) },
    byteSize: bytes.byteLength,
  });
}

/**
 * Replaces `target` with `next`. An existing target is moved to `previous` first and is restored
 * if the swap fails; it is deleted only after the new directory is in place.
 */
async function installDirectory(
  next: string,
  target: string,
  previous: string,
  cleanupRoot: string,
): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  const hadPrevious = await exists(target);
  if (hadPrevious) await rename(target, previous);
  try {
    await rename(next, target);
  } catch (error) {
    if (hadPrevious) {
      try {
        await rename(previous, target);
      } catch {
        throw new CorpusPipelineError("incomplete", `Could not install ${target}.`, [
          errorMessage(error),
          `previous version preserved at ${previous}`,
        ]);
      }
    }
    throw error;
  }
  if (hadPrevious) await safeRemove(previous, cleanupRoot);
}

export function createCorpusPipeline(options: CorpusPipelineOptions = {}): CorpusPipeline {
  const projectRoot = resolve(options.projectRoot ?? DEFAULT_PROJECT_ROOT);
  const sourceRoot = resolve(projectRoot, "corpora/source");
  const stagingRoot = resolve(projectRoot, "corpora/.staging");
  const generatedRoot = resolve(projectRoot, "generated/corpora");
  const registry = options.registry ?? CORPUS_PACKAGE_CANDIDATES;
  const adapters = options.adapters ?? [
    new SblgntXmlAdapter(),
    new BibliaLivreAdapter(),
    new OshbOsisAdapter(),
  ];
  const git = options.git ?? defaultGit;
  const now = options.now ?? (() => new Date());
  const emit = options.onEvent ?? (() => undefined);

  function registrationsFor(corpusId: string): CorpusPackageManifest[] {
    return registry.filter(
      (manifest) => manifest.corpusId === corpusId && manifest.acquisitionPlan,
    );
  }

  function packageFor(corpusId: string): CorpusPackageManifest {
    const registered = registrationsFor(corpusId);
    if (!registered.length) {
      throw new CorpusPipelineError(
        "not-registered",
        `No acquirable package is registered for corpus ${corpusId}.`,
        [`registered corpora: ${[...new Set(list().map((item) => item.corpusId))].join(", ")}`],
      );
    }
    const eligible = registered.filter(
      (manifest) => CorpusRightsGate.evaluate(manifest.rights).eligible,
    );
    if (!eligible.length) {
      throw new CorpusPipelineError(
        "rights-denied",
        `Rights gate denied every package registered for corpus ${corpusId}.`,
        registered.map(
          (manifest) =>
            `${manifest.id}: ${CorpusRightsGate.evaluate(manifest.rights).reasons.join(", ")}`,
        ),
      );
    }
    if (eligible.length > 1) {
      throw new CorpusPipelineError(
        "not-registered",
        `Expected exactly one registered package for corpus ${corpusId}.`,
        eligible.map((manifest) => manifest.id),
      );
    }
    return eligible[0]!;
  }

  function adapterFor(manifest: CorpusPackageManifest): CorpusAdapter {
    const matches = adapters.filter((adapter) => adapter.supports(manifest));
    if (matches.length !== 1) {
      throw new CorpusPipelineError(
        "not-registered",
        `Expected exactly one adapter for ${manifest.id}.`,
        matches.map((adapter) => adapter.id),
      );
    }
    return matches[0]!;
  }

  function snapshotRoot(manifest: CorpusPackageManifest): string {
    return resolve(sourceRoot, manifest.corpusId, manifest.acquisitionPlan!.commitSha);
  }

  function outputRoot(manifest: CorpusPackageManifest): string {
    return resolve(
      generatedRoot,
      manifest.corpusId,
      manifest.version ?? manifest.revision ?? "unversioned",
    );
  }

  async function readLock(lockPath: string): Promise<{ holder: string; live: boolean }> {
    let pid: number | null = null;
    let createdAt: Date | null = null;
    try {
      const parsed = JSON.parse(await readFile(lockPath, "utf8")) as {
        pid?: unknown;
        createdAt?: unknown;
      };
      if (typeof parsed.pid === "number") pid = parsed.pid;
      if (typeof parsed.createdAt === "string") createdAt = new Date(parsed.createdAt);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { holder: "released", live: false };
    }
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      try {
        createdAt = (await stat(lockPath)).mtime;
      } catch {
        return { holder: "released", live: false };
      }
    }
    const age = now().getTime() - createdAt.getTime();
    // A lock without a readable pid may still be in the middle of being written.
    const live =
      age < LOCK_MAX_AGE_MS && (pid === null ? age < UNWRITTEN_LOCK_GRACE_MS : processAlive(pid));
    return { holder: `pid ${pid ?? "unknown"} since ${createdAt.toISOString()}`, live };
  }

  async function takeLock(corpusId: string, lockPath: string): Promise<void> {
    await mkdir(stagingRoot, { recursive: true });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const handle = await open(lockPath, "wx");
        try {
          await handle.writeFile(
            `${JSON.stringify({ pid: process.pid, createdAt: now().toISOString() })}\n`,
            "utf8",
          );
        } finally {
          await handle.close();
        }
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
      const lock = await readLock(lockPath);
      if (lock.live) {
        throw new CorpusPipelineError("locked", `Corpus ${corpusId} is locked by another run.`, [
          `lock: ${lockPath}`,
          `holder: ${lock.holder}`,
        ]);
      }
      await rm(lockPath, { force: true });
      emit({
        type: "lock-recovered",
        corpusId,
        detail: `Recovered stale lock ${lockPath} (${lock.holder}).`,
      });
    }
    throw new CorpusPipelineError("locked", `Corpus ${corpusId} lock could not be acquired.`, [
      `lock: ${lockPath}`,
    ]);
  }

  async function withLock<T>(corpusId: string, task: () => Promise<T>): Promise<T> {
    const lockPath = resolve(stagingRoot, `${corpusId}.lock`);
    assertInside(stagingRoot, lockPath);
    const depth = heldLocks.get(lockPath) ?? 0;
    if (depth === 0) await takeLock(corpusId, lockPath);
    heldLocks.set(lockPath, depth + 1);
    try {
      return await task();
    } finally {
      const remaining = (heldLocks.get(lockPath) ?? 1) - 1;
      if (remaining > 0) heldLocks.set(lockPath, remaining);
      else {
        heldLocks.delete(lockPath);
        await rm(lockPath, { force: true });
      }
    }
  }

  async function readAcquiredAt(
    root: string,
    manifest: CorpusPackageManifest,
  ): Promise<AcquiredPackage> {
    const path = resolve(root, "artifact-manifest.json");
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      throw new CorpusPipelineError(
        "incomplete",
        `Corpus ${manifest.corpusId} has not been acquired.`,
        [`missing ${path}`],
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (error) {
      throw new CorpusPipelineError("integrity", `Invalid artifact manifest for ${manifest.id}.`, [
        `${path}: ${errorMessage(error)}`,
      ]);
    }
    const result = acquiredPackageSchema.safeParse(parsed);
    if (!result.success) {
      throw new CorpusPipelineError(
        "integrity",
        `Invalid artifact manifest for ${manifest.id}.`,
        result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
      );
    }
    return result.data;
  }

  async function integrityIssues(
    root: string,
    manifest: CorpusPackageManifest,
    adapter: CorpusAdapter,
  ): Promise<{ acquired: AcquiredPackage; issues: string[] }> {
    const acquired = await readAcquiredAt(root, manifest);
    const plan = manifest.acquisitionPlan!;
    const issues: string[] = [];
    if (acquired.packageId !== manifest.id)
      issues.push(`packageId is ${acquired.packageId}, expected ${manifest.id}`);
    if (acquired.commitSha !== plan.commitSha)
      issues.push(`commitSha is ${acquired.commitSha}, expected ${plan.commitSha}`);
    if (acquired.repository !== plan.repository)
      issues.push(`repository is ${acquired.repository}, expected ${plan.repository}`);

    let discovered: DiscoveredCorpusArtifact[] | null = null;
    try {
      discovered = await adapter.discover(root, manifest);
    } catch (error) {
      issues.push(`artifact discovery failed: ${errorMessage(error)}`);
    }
    const registered = new Set(acquired.artifacts.map((artifact) => artifact.sourcePath));
    const discoveredPaths = new Set(discovered?.map((artifact) => artifact.sourcePath));
    for (const path of discoveredPaths)
      if (!registered.has(path)) issues.push(`${path}: artifact is not registered`);

    for (const artifact of acquired.artifacts) {
      const path = resolve(root, artifact.sourcePath);
      assertInside(root, path);
      let bytes: Buffer;
      try {
        bytes = await readFile(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        issues.push(`${artifact.sourcePath}: file is missing`);
        continue;
      }
      if (discovered && !discoveredPaths.has(artifact.sourcePath))
        issues.push(`${artifact.sourcePath}: registered artifact is no longer discoverable`);
      if (bytes.byteLength !== artifact.byteSize)
        issues.push(
          `${artifact.sourcePath}: size is ${bytes.byteLength} bytes, expected ${artifact.byteSize}`,
        );
      const checksum = sha256(bytes);
      if (checksum !== artifact.checksum.value)
        issues.push(
          `${artifact.sourcePath}: SHA-256 is ${checksum}, expected ${artifact.checksum.value}`,
        );
    }
    const digest = calculatePackageDigest(acquired.artifacts);
    if (digest !== acquired.packageDigest.value)
      issues.push(`package digest is ${digest}, expected ${acquired.packageDigest.value}`);
    return { acquired, issues };
  }

  async function verifySnapshot(
    root: string,
    manifest: CorpusPackageManifest,
    adapter: CorpusAdapter,
  ): Promise<AcquiredPackage> {
    const { acquired, issues } = await integrityIssues(root, manifest, adapter);
    if (issues.length) {
      throw new CorpusPipelineError(
        "integrity",
        `Integrity verification failed for ${manifest.id} (${issues.length} problem(s)).`,
        issues,
      );
    }
    return acquired;
  }

  async function datasetState(
    output: string,
    adapter: CorpusAdapter,
    acquired: AcquiredPackage | null,
  ): Promise<DatasetState> {
    let current: Partial<GeneratedCorpusManifest>;
    try {
      current = JSON.parse(
        await readFile(resolve(output, "manifest.json"), "utf8"),
      ) as Partial<GeneratedCorpusManifest>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { state: "missing", reason: "manifest.json not found" };
      return { state: "stale", reason: `manifest.json is unreadable: ${errorMessage(error)}` };
    }
    if (current.importer?.adapter !== adapter.id)
      return {
        state: "stale",
        reason: `adapter is ${current.importer?.adapter}, expected ${adapter.id}`,
      };
    if (current.importer.version !== adapter.importerVersion)
      return {
        state: "stale",
        reason: `importer version is ${current.importer.version}, expected ${adapter.importerVersion}`,
      };
    if (!acquired) return { state: "stale", reason: "source snapshot is not available" };
    if (current.sourcePackageDigest?.value !== acquired.packageDigest.value)
      return { state: "stale", reason: "source package digest changed" };
    for (const book of current.books ?? [])
      for (const relativePath of Object.values(book.chapterFiles)) {
        const path = resolve(output, relativePath);
        assertInside(output, path);
        if (!(await exists(path)))
          return { state: "stale", reason: `chapter file ${relativePath} is missing` };
      }
    return { state: "up-to-date", manifest: current as GeneratedCorpusManifest };
  }

  async function generateDataset(
    manifest: CorpusPackageManifest,
    adapter: CorpusAdapter,
    acquired: AcquiredPackage,
    staging: string,
  ): Promise<GeneratedCorpusManifest> {
    const discovered = await adapter.discover(snapshotRoot(manifest), manifest);
    const artifactByPath = new Map(
      acquired.artifacts.map((artifact) => [artifact.sourcePath, artifact]),
    );
    const datasetId = `dataset:${manifest.corpusId}:${manifest.version}:${acquired.packageDigest.value}`;
    const statistics = emptyImportStatistics();
    statistics.artifacts = acquired.artifacts.length;
    statistics.bytesProcessed = acquired.artifacts.reduce(
      (total, artifact) => total + artifact.byteSize,
      0,
    );
    const books: GeneratedCorpusBookIndex[] = [];
    const versificationAnomalies: string[] = [];
    const problems: string[] = [];
    const attemptedBookIds = new Set<string>();

    for (const discoveredArtifact of discovered.filter((item) => item.classification === "book")) {
      const where = discoveredArtifact.sourcePath;
      if (discoveredArtifact.canonicalBookId)
        attemptedBookIds.add(discoveredArtifact.canonicalBookId);
      const sourceArtifact = artifactByPath.get(where);
      if (!sourceArtifact) {
        problems.push(`${where} › missing custody record`);
        continue;
      }
      let normalized: NormalizedCorpusBook | null;
      try {
        normalized = await adapter.parseAndNormalize(
          discoveredArtifact,
          sourceArtifact,
          manifest,
          datasetId,
        );
      } catch (error) {
        problems.push(`${where} › ${errorMessage(error)}`);
        continue;
      }
      if (!normalized) continue;
      attemptedBookIds.add(normalized.book.id);
      const validationErrors = adapter.validate(normalized, manifest);
      if (validationErrors.length) {
        statistics.errors += validationErrors.length;
        problems.push(...validationErrors.map((message) => `${where} › ${message}`));
        continue;
      }
      statistics.warnings += normalized.warnings.length;
      versificationAnomalies.push(...normalized.warnings);
      statistics.headings =
        (statistics.headings ?? 0) + (normalized.structuralCounts?.headings ?? 0);
      statistics.notes = (statistics.notes ?? 0) + (normalized.structuralCounts?.notes ?? 0);
      statistics.versificationAnomalies =
        (statistics.versificationAnomalies ?? 0) + normalized.warnings.length;
      // Created after headings/notes/versificationAnomalies so the manifest key order is stable.
      statistics.missingCanonicalMappings ??= 0;
      statistics.books += 1;
      statistics.chapters += normalized.chapters.length;
      statistics.paragraphBoundaries += new Set(
        normalized.chapters.flatMap((chapter) =>
          (chapter.paragraphBoundaries ?? []).map((boundary) => boundary.id),
        ),
      ).size;
      const chapterFiles: Record<string, string> = {};
      for (const chapter of normalized.chapters) {
        const chapterName = String(chapter.chapter).padStart(2, "0");
        const relativePath = `books/${normalized.book.id}/${chapterName}.json`;
        const outputPath = resolve(staging, relativePath);
        assertInside(staging, outputPath);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(compactChapter(chapter))}\n`, "utf8");
        chapterFiles[String(chapter.chapter)] = relativePath;
        statistics.verses += chapter.verses.length;
        statistics.textUnits += chapter.verses.length;
        statistics.tokenOccurrences += chapter.verses.reduce(
          (total, verse) => total + (verse.original?.length ?? 0),
          0,
        );
      }
      books.push({ ...normalized.book, chapterFiles });
    }

    books.sort((left, right) => left.order - right.order);
    const expected = manifest.acquisitionPlan!.expectedBookIds;
    for (const id of expected)
      if (!attemptedBookIds.has(id) && !books.some((book) => book.id === id))
        problems.push(`${id} › expected book is missing from the source`);
    for (const book of books)
      if (!expected.includes(book.id)) problems.push(`${book.id} › unexpected book`);
    if (problems.length) {
      throw new CorpusPipelineError(
        "validation",
        `Validation failed for ${manifest.id} (${problems.length} problem(s)).`,
        problems,
      );
    }
    const attribution =
      manifest.rights.attribution?.requiredText ?? manifest.rights.attribution?.recommendedCitation;
    if (!attribution) {
      throw new CorpusPipelineError("rights-denied", `Rights gate denied ${manifest.id}.`, [
        "attribution text is required before dataset generation",
      ]);
    }

    const generated: GeneratedCorpusManifest = {
      schemaVersion: 1,
      importer: {
        name: "Scriptorium Corpus Pipeline",
        version: adapter.importerVersion,
        adapter: adapter.id,
      },
      corpusId: manifest.corpusId,
      editionId: manifest.editionId,
      packageId: manifest.id,
      sourceRevision: manifest.acquisitionPlan!.commitSha,
      sourcePackageDigest: acquired.packageDigest,
      attribution,
      versificationScheme: manifest.versificationScheme,
      sourceArtifactIds: acquired.artifacts.map((artifact) => artifact.id),
      transformations: [
        {
          id: `transformation:${manifest.corpusId}:${adapter.importerVersion}:parse-source`,
          type: adapter.transformationType,
          inputArtifactIds: acquired.artifacts.map((artifact) => artifact.id),
          outputDatasetId: datasetId,
        },
        {
          id: `transformation:${manifest.corpusId}:${adapter.importerVersion}:chapter-shards`,
          type: "build-chapter-shards",
          inputArtifactIds: acquired.artifacts.map((artifact) => artifact.id),
          outputDatasetId: datasetId,
        },
      ],
      datasetId,
      books,
      statistics,
      structuralDecisions: [...adapter.structuralDecisions],
      versificationAnomalies,
    };
    await writeFile(
      resolve(staging, "manifest.json"),
      `${JSON.stringify(generated, null, 2)}\n`,
      "utf8",
    );
    return generated;
  }

  async function acquire(
    corpusId: string,
    runOptions: CorpusRunOptions = {},
  ): Promise<AcquiredPackage> {
    const manifest = packageFor(corpusId);
    const adapter = adapterFor(manifest);
    const plan = manifest.acquisitionPlan!;
    assertRights(manifest);
    if (MUTABLE_REVISIONS.has(plan.commitSha) || !/^[a-f0-9]{40}$/.test(plan.commitSha)) {
      throw new CorpusPipelineError(
        "mutable-revision",
        `Mutable revision is forbidden for ${manifest.id}.`,
        [plan.commitSha],
      );
    }
    return withLock(corpusId, async () => {
      const target = snapshotRoot(manifest);
      assertInside(sourceRoot, target);
      if (!runOptions.force) {
        if (await exists(resolve(target, "artifact-manifest.json"))) {
          // An installed snapshot is reused when intact and never replaced silently when not.
          const acquired = await verifySnapshot(target, manifest, adapter);
          emit({
            type: "acquisition-reused",
            corpusId,
            detail: `${manifest.id} @ ${plan.commitSha}`,
          });
          return acquired;
        }
        if (await exists(target)) {
          throw new CorpusPipelineError(
            "incomplete",
            `Snapshot directory exists without artifact-manifest.json: ${target}.`,
            ["inspect it, then acquire again with --force to replace it atomically"],
          );
        }
      }

      await mkdir(stagingRoot, { recursive: true });
      const staging = await mkdtemp(resolve(stagingRoot, `${manifest.corpusId}-`));
      const checkout = resolve(staging, "checkout");
      const snapshot = resolve(staging, "snapshot");
      try {
        const repositoryUrl = new URL(plan.repository);
        if (
          repositoryUrl.protocol !== "https:" ||
          repositoryUrl.username ||
          repositoryUrl.password
        ) {
          throw new CorpusPipelineError(
            "git",
            "Only credential-free HTTPS repositories are allowed.",
            [plan.repository],
          );
        }
        let resolvedCommit: string;
        try {
          await git.clone(plan.repository, checkout);
          await git.checkout(checkout, plan.commitSha);
          resolvedCommit = await git.revParse(checkout);
        } catch (error) {
          throw new CorpusPipelineError("git", `Git acquisition failed for ${manifest.id}.`, [
            errorMessage(error),
          ]);
        }
        if (resolvedCommit !== plan.commitSha) {
          throw new CorpusPipelineError(
            "git",
            `Git resolved ${resolvedCommit}, expected ${plan.commitSha}.`,
            [`repository: ${plan.repository}`],
          );
        }

        const discovered = await adapter.discover(checkout, manifest);
        const retrievedAt = now().toISOString();
        const artifacts: SourceArtifact[] = [];
        for (const item of discovered)
          artifacts.push(await artifactFrom(item, manifest, retrievedAt));
        for (const item of discovered) {
          const destination = resolve(snapshot, item.sourcePath);
          assertInside(snapshot, destination);
          await mkdir(dirname(destination), { recursive: true });
          await copyFile(item.absolutePath, destination);
        }
        const acquired: AcquiredPackage = {
          schemaVersion: 1,
          packageId: manifest.id,
          corpusId: manifest.corpusId,
          editionId: manifest.editionId,
          repository: plan.repository,
          commitSha: plan.commitSha,
          retrievedAt,
          packageDigest: { algorithm: "SHA-256", value: calculatePackageDigest(artifacts) },
          artifacts,
        };
        await writeFile(
          resolve(snapshot, "artifact-manifest.json"),
          `${JSON.stringify(acquired, null, 2)}\n`,
          "utf8",
        );
        const verified = await verifySnapshot(snapshot, manifest, adapter);
        await installDirectory(snapshot, target, `${staging}-previous`, stagingRoot);
        emit({ type: "acquired", corpusId, detail: `${manifest.id} @ ${plan.commitSha}` });
        return verified;
      } finally {
        await safeRemove(staging, stagingRoot);
      }
    });
  }

  async function verify(corpusId: string): Promise<AcquiredPackage> {
    const manifest = packageFor(corpusId);
    const adapter = adapterFor(manifest);
    assertRights(manifest);
    return verifySnapshot(snapshotRoot(manifest), manifest, adapter);
  }

  async function importDataset(
    corpusId: string,
    runOptions: CorpusRunOptions = {},
  ): Promise<GeneratedCorpusManifest> {
    const manifest = packageFor(corpusId);
    const adapter = adapterFor(manifest);
    assertRights(manifest);
    return withLock(corpusId, async () => {
      const acquired = await verifySnapshot(snapshotRoot(manifest), manifest, adapter);
      const finalOutput = outputRoot(manifest);
      if (!runOptions.force) {
        const current = await datasetState(finalOutput, adapter, acquired);
        if (current.state === "up-to-date") {
          emit({ type: "import-reused", corpusId, detail: current.manifest.datasetId });
          return current.manifest;
        }
      }
      const importStagingRoot = resolve(generatedRoot, manifest.corpusId, ".staging");
      await mkdir(importStagingRoot, { recursive: true });
      const staging = await mkdtemp(resolve(importStagingRoot, "import-"));
      try {
        const generated = await generateDataset(manifest, adapter, acquired, staging);
        const previous = resolve(
          importStagingRoot,
          `previous-${basename(staging).slice("import-".length)}`,
        );
        await installDirectory(staging, finalOutput, previous, importStagingRoot);
        emit({ type: "imported", corpusId, detail: generated.datasetId });
        return generated;
      } catch (error) {
        await safeRemove(staging, importStagingRoot);
        throw error;
      }
    });
  }

  async function build(
    corpusId: string,
    runOptions: CorpusRunOptions = {},
  ): Promise<GeneratedCorpusManifest> {
    packageFor(corpusId);
    return withLock(corpusId, async () => {
      await acquire(corpusId);
      return importDataset(corpusId, runOptions);
    });
  }

  async function status(corpusId: string): Promise<CorpusStatus> {
    const registered = registrationsFor(corpusId);
    if (!registered.length) {
      return {
        corpusId,
        registered: false,
        packageId: null,
        rights: { eligible: false, reasons: ["not-registered"] },
        acquisition: { state: "missing", reason: "corpus is not registered" },
        dataset: { state: "missing", reason: "corpus is not registered" },
      };
    }
    const eligible = registered.filter(
      (manifest) => CorpusRightsGate.evaluate(manifest.rights).eligible,
    );
    const manifest = eligible.length === 1 ? eligible[0]! : registered[0]!;
    const rights =
      eligible.length > 1
        ? {
            eligible: false,
            reasons: [`ambiguous packages: ${eligible.map((m) => m.id).join(", ")}`],
          }
        : CorpusRightsGate.evaluate(manifest.rights);
    const matches = adapters.filter((adapter) => adapter.supports(manifest));
    if (matches.length !== 1) {
      const reason = `expected exactly one adapter for ${manifest.id}`;
      return {
        corpusId,
        registered: true,
        packageId: manifest.id,
        rights,
        acquisition: { state: "missing", reason },
        dataset: { state: "missing", reason },
      };
    }
    const adapter = matches[0]!;
    let acquired: AcquiredPackage | null = null;
    let acquisition: CorpusStatus["acquisition"];
    try {
      const result = await integrityIssues(snapshotRoot(manifest), manifest, adapter);
      acquired = result.acquired;
      acquisition = result.issues.length
        ? { state: "corrupt", reason: `${result.issues.length} problem(s): ${result.issues[0]}` }
        : { state: "verified", reason: null };
    } catch (error) {
      acquisition =
        error instanceof CorpusPipelineError && error.code === "incomplete"
          ? { state: "missing", reason: error.details[0] ?? error.message }
          : { state: "corrupt", reason: errorMessage(error) };
    }
    const dataset = await datasetState(outputRoot(manifest), adapter, acquired);
    return {
      corpusId,
      registered: true,
      packageId: manifest.id,
      rights: { eligible: rights.eligible, reasons: rights.reasons },
      acquisition,
      dataset:
        dataset.state === "up-to-date"
          ? { state: "up-to-date", reason: null }
          : { state: dataset.state, reason: dataset.reason },
    };
  }

  function list(): RegisteredCorpus[] {
    return registry
      .filter((manifest) => manifest.acquisitionPlan)
      .map((manifest) => ({
        corpusId: manifest.corpusId,
        packageId: manifest.id,
        editionId: manifest.editionId,
        version: manifest.version ?? null,
        commitSha: manifest.acquisitionPlan!.commitSha,
        adapterId: adapters.find((adapter) => adapter.supports(manifest))?.id ?? null,
        rightsEligible: CorpusRightsGate.evaluate(manifest.rights).eligible,
      }));
  }

  return { acquire, verify, import: importDataset, build, status, list };
}

const defaultPipeline = createCorpusPipeline();

export function acquireCorpus(
  corpusId: string,
  options: CorpusRunOptions = {},
): Promise<AcquiredPackage> {
  return defaultPipeline.acquire(corpusId, options);
}

export function verifyCorpus(corpusId: string): Promise<AcquiredPackage> {
  return defaultPipeline.verify(corpusId);
}

export function importCorpus(
  corpusId: string,
  options: CorpusRunOptions = {},
): Promise<GeneratedCorpusManifest> {
  return defaultPipeline.import(corpusId, options);
}

export function buildCorpus(
  corpusId: string,
  options: CorpusRunOptions = {},
): Promise<GeneratedCorpusManifest> {
  return defaultPipeline.build(corpusId, options);
}
