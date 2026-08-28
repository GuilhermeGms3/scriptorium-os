import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
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
import { corpusRegistry } from "../../src/lib/repositories/corpus-registry";
import type { CorpusAdapter, DiscoveredCorpusArtifact } from "./adapter";
import { emptyImportStatistics } from "./adapter";
import { SblgntXmlAdapter } from "./adapters/sblgnt-xml-adapter";
import { compactChapter } from "../../src/lib/domain/compact-corpus";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const SOURCE_ROOT = resolve(PROJECT_ROOT, "corpora/source");
const SOURCE_STAGING_ROOT = resolve(PROJECT_ROOT, "corpora/.staging");
const GENERATED_ROOT = resolve(PROJECT_ROOT, "generated/corpora");
const ADAPTERS: CorpusAdapter[] = [new SblgntXmlAdapter()];

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

async function run(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with code ${code ?? "unknown"}.`));
    });
  });
}

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

function packageFor(corpusId: string): CorpusPackageManifest {
  const matches = corpusRegistry.listPackages(corpusId);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one registered package for corpus ${corpusId}.`);
  }
  const manifest = matches[0]!;
  if (!manifest.acquisitionPlan) throw new Error(`Package ${manifest.id} has no acquisition plan.`);
  return manifest;
}

function adapterFor(manifest: CorpusPackageManifest): CorpusAdapter {
  const matches = ADAPTERS.filter((adapter) => adapter.supports(manifest));
  if (matches.length !== 1) throw new Error(`Expected exactly one adapter for ${manifest.id}.`);
  return matches[0]!;
}

function assertRights(manifest: CorpusPackageManifest): void {
  const decision = CorpusRightsGate.evaluate(manifest.rights);
  if (!decision.eligible) {
    throw new Error(`Rights gate denied ${manifest.id}: ${decision.reasons.join(", ")}.`);
  }
  if (manifest.rights.license.attributionRequired && !manifest.rights.attribution) {
    throw new Error(`Rights gate denied ${manifest.id}: attribution is missing.`);
  }
}

function snapshotRoot(manifest: CorpusPackageManifest): string {
  return resolve(SOURCE_ROOT, manifest.corpusId, manifest.acquisitionPlan!.commitSha);
}

function artifactManifestPath(manifest: CorpusPackageManifest): string {
  return resolve(snapshotRoot(manifest), "artifact-manifest.json");
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
  const stem = basename(discovered.fileName, ".xml").toLowerCase();
  return sourceArtifactSchema.parse({
    id: `artifact:sblgnt:1.2:${stem}`,
    packageId: manifest.id,
    role: "source",
    repository: manifest.acquisitionPlan!.repository,
    sourcePath: discovered.sourcePath,
    sourceUrl: sourceUrlFor(manifest, discovered.sourcePath),
    fileName: discovered.fileName,
    mediaType: "application/xml",
    format: "xml",
    retrievedAt,
    sourceRevision: manifest.acquisitionPlan!.commitSha,
    checksum: { algorithm: "SHA-256", value: sha256(bytes) },
    byteSize: bytes.byteLength,
  });
}

async function readAcquired(manifest: CorpusPackageManifest): Promise<AcquiredPackage> {
  const raw = await readFile(artifactManifestPath(manifest), "utf8");
  return acquiredPackageSchema.parse(JSON.parse(raw) as unknown);
}

export async function acquireCorpus(corpusId: string): Promise<AcquiredPackage> {
  const manifest = packageFor(corpusId);
  const adapter = adapterFor(manifest);
  const plan = manifest.acquisitionPlan!;
  assertRights(manifest);
  if (plan.commitSha === "HEAD" || plan.commitSha === "master" || plan.commitSha === "latest") {
    throw new Error(`Mutable revision is forbidden for ${manifest.id}.`);
  }

  try {
    const existing = await readAcquired(manifest);
    await verifyCorpus(corpusId);
    return existing;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  await mkdir(SOURCE_STAGING_ROOT, { recursive: true });
  const staging = await mkdtemp(resolve(SOURCE_STAGING_ROOT, `${manifest.corpusId}-`));
  const checkout = resolve(staging, "checkout");
  const target = snapshotRoot(manifest);
  assertInside(SOURCE_ROOT, target);

  try {
    const repositoryUrl = new URL(plan.repository);
    if (repositoryUrl.protocol !== "https:" || repositoryUrl.username || repositoryUrl.password) {
      throw new Error(`Only credential-free HTTPS repositories are allowed.`);
    }
    await run(
      "git",
      ["clone", "--filter=blob:none", "--no-checkout", plan.repository, checkout],
      PROJECT_ROOT,
    );
    await run("git", ["-C", checkout, "checkout", "--detach", plan.commitSha], PROJECT_ROOT);
    const resolvedCommit = (await new Promise<string>((resolvePromise, reject) => {
      const child = spawn("git", ["-C", checkout, "rev-parse", "HEAD"], {
        cwd: PROJECT_ROOT,
        shell: false,
      });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString("utf8")));
      child.once("error", reject);
      child.once("exit", (code) =>
        code === 0
          ? resolvePromise(output.trim())
          : reject(new Error("Unable to resolve Git commit.")),
      );
    })) as string;
    if (resolvedCommit !== plan.commitSha) {
      throw new Error(`Git resolved ${resolvedCommit}, expected ${plan.commitSha}.`);
    }

    const discovered = await adapter.discover(checkout, manifest);
    const retrievedAt = new Date().toISOString();
    const artifacts: SourceArtifact[] = [];
    for (const item of discovered) artifacts.push(await artifactFrom(item, manifest, retrievedAt));

    await mkdir(target, { recursive: true });
    for (const item of discovered) {
      const destination = resolve(target, item.sourcePath);
      assertInside(target, destination);
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
      artifactManifestPath(manifest),
      `${JSON.stringify(acquired, null, 2)}\n`,
      "utf8",
    );
    return await verifyCorpus(corpusId);
  } catch (error) {
    await safeRemove(target, SOURCE_ROOT);
    throw error;
  } finally {
    await safeRemove(staging, SOURCE_STAGING_ROOT);
  }
}

export async function verifyCorpus(corpusId: string): Promise<AcquiredPackage> {
  const manifest = packageFor(corpusId);
  const adapter = adapterFor(manifest);
  const plan = manifest.acquisitionPlan!;
  assertRights(manifest);
  const acquired = await readAcquired(manifest);
  if (
    acquired.packageId !== manifest.id ||
    acquired.commitSha !== plan.commitSha ||
    acquired.repository !== plan.repository
  ) {
    throw new Error(`Acquired package identity does not match ${manifest.id}.`);
  }

  const source = snapshotRoot(manifest);
  const discovered = await adapter.discover(source, manifest);
  const discoveredPaths = new Set(discovered.map((artifact) => artifact.sourcePath));
  if (discoveredPaths.size !== acquired.artifacts.length) {
    throw new Error(`Artifact count changed after acquisition.`);
  }
  for (const artifact of acquired.artifacts) {
    if (!discoveredPaths.has(artifact.sourcePath)) {
      throw new Error(`Registered artifact is no longer discoverable: ${artifact.sourcePath}.`);
    }
    const path = resolve(source, artifact.sourcePath);
    assertInside(source, path);
    const bytes = await readFile(path);
    if (bytes.byteLength !== artifact.byteSize || sha256(bytes) !== artifact.checksum.value) {
      throw new Error(`Integrity verification failed for ${artifact.sourcePath}.`);
    }
  }
  const digest = calculatePackageDigest(acquired.artifacts);
  if (digest !== acquired.packageDigest.value)
    throw new Error(`Package digest verification failed.`);
  return acquired;
}

export async function importCorpus(corpusId: string): Promise<GeneratedCorpusManifest> {
  const manifest = packageFor(corpusId);
  const adapter = adapterFor(manifest);
  const acquired = await verifyCorpus(corpusId);
  const source = snapshotRoot(manifest);
  const discovered = await adapter.discover(source, manifest);
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

  const corpusOutputRoot = resolve(GENERATED_ROOT, manifest.corpusId);
  const finalOutput = resolve(
    corpusOutputRoot,
    manifest.version ?? manifest.revision ?? "unversioned",
  );
  await mkdir(resolve(corpusOutputRoot, ".staging"), { recursive: true });
  const staging = await mkdtemp(resolve(corpusOutputRoot, ".staging", "import-"));
  const books: GeneratedCorpusBookIndex[] = [];
  const bookArtifacts = discovered.filter((artifact) => artifact.classification === "book");

  try {
    for (const discoveredArtifact of bookArtifacts) {
      const sourceArtifact = artifactByPath.get(discoveredArtifact.sourcePath);
      if (!sourceArtifact)
        throw new Error(`Missing custody record for ${discoveredArtifact.sourcePath}.`);
      const normalized = await adapter.parseAndNormalize(
        discoveredArtifact,
        sourceArtifact,
        manifest,
        datasetId,
      );
      if (!normalized) continue;
      const validationErrors = adapter.validate(normalized, manifest);
      if (validationErrors.length) {
        statistics.errors += validationErrors.length;
        throw new Error(validationErrors.join("\n"));
      }
      statistics.warnings += normalized.warnings.length;
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
    if (
      books.length !== expected.length ||
      expected.some((id) => !books.some((book) => book.id === id))
    ) {
      throw new Error(`Generated dataset does not contain the complete expected book set.`);
    }
    const attribution =
      manifest.rights.attribution?.requiredText ?? manifest.rights.attribution?.recommendedCitation;
    if (!attribution) throw new Error(`Attribution text is required before dataset generation.`);

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
          id: `transformation:${manifest.corpusId}:${adapter.importerVersion}:parse-xml`,
          type: "parse-xml",
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
      structuralDecisions: [
        "Storage schema v2 omits only token editionId, textUnitId, ref and language inherited from chapter/verse; repository restores the v1 domain exactly. JSON whitespace is removed.",
        "Each source <w> is preserved as one TokenOccurrence; no whitespace retokenization is performed.",
        "Source <prefix> and <suffix> values are preserved on the adjacent token.",
        "Source <p> boundaries are preserved as paragraph IDs and chapter-local boundary ranges.",
        "Lexeme, gloss, morphology and Strong identifiers remain absent because the SBLGNT XML does not supply them.",
        "Generated storage is partitioned by book and chapter; no per-verse files are created.",
      ],
    };
    await writeFile(
      resolve(staging, "manifest.json"),
      `${JSON.stringify(generated, null, 2)}\n`,
      "utf8",
    );
    await safeRemove(finalOutput, corpusOutputRoot);
    await mkdir(dirname(finalOutput), { recursive: true });
    await rename(staging, finalOutput);
    return generated;
  } catch (error) {
    await safeRemove(staging, resolve(corpusOutputRoot, ".staging"));
    throw error;
  }
}

export async function buildCorpus(corpusId: string): Promise<GeneratedCorpusManifest> {
  await acquireCorpus(corpusId);
  await verifyCorpus(corpusId);
  return importCorpus(corpusId);
}
