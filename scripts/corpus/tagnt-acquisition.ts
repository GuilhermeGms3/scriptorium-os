import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, resolve, relative, isAbsolute } from "node:path";
import { z } from "zod";
import {
  CorpusRightsGate,
  corpusPackageManifestSchema,
  sourceArtifactSchema,
  type SourceArtifact,
} from "../../src/lib/domain/corpus";
import {
  TAGNT_COMMIT,
  TAGNT_FILES,
  TAGNT_PACKAGE,
  TAGNT_REPOSITORY,
  tagntSourceUrl,
} from "../../src/lib/corpus-config/tagnt";

export const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
export const TAGNT_SOURCE_ROOT = resolve(
  PROJECT_ROOT,
  "corpora/source/stepbible-tagnt",
  TAGNT_COMMIT,
);
export const TAGNT_OUTPUT_ROOT = resolve(
  PROJECT_ROOT,
  "generated/corpora/stepbible-tagnt",
  TAGNT_COMMIT,
);
export const sha256 = (bytes: string | Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
export function safePath(root: string, path: string): string {
  const result = resolve(root, path);
  const rel = relative(root, result);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || rel.includes(":"))
    throw new Error(`Unsafe corpus path: ${path}`);
  return result;
}
export function artifactDigest(artifacts: SourceArtifact[]): string {
  return sha256(
    [...artifacts]
      .sort((a, b) => (a.sourcePath < b.sourcePath ? -1 : 1))
      .map((a) => `${a.sourcePath}\0${a.checksum.value}\n`)
      .join(""),
  );
}
const acquisitionSchema = z.object({
  schemaVersion: z.literal(1),
  packageId: z.literal(TAGNT_PACKAGE.id),
  commitSha: z.literal(TAGNT_COMMIT),
  repository: z.literal(TAGNT_REPOSITORY),
  retrievedAt: z.string().datetime(),
  artifacts: z.array(sourceArtifactSchema).length(TAGNT_FILES.length),
  packageDigest: z.object({
    algorithm: z.literal("SHA-256"),
    value: z.string().regex(/^[a-f0-9]{64}$/),
  }),
});
export function assertTagntRights(): void {
  corpusPackageManifestSchema.parse(TAGNT_PACKAGE);
  const decision = CorpusRightsGate.evaluate(TAGNT_PACKAGE.rights);
  if (!decision.eligible) throw new Error(`TAGNT rights blocked: ${decision.reasons.join(", ")}`);
}
export function verifyArtifactBytes(artifact: SourceArtifact, bytes: Uint8Array): void {
  if (bytes.length !== artifact.byteSize || sha256(bytes) !== artifact.checksum.value)
    throw new Error(`TAGNT checksum mismatch: ${artifact.sourcePath}`);
}
export async function verifyTagnt() {
  assertTagntRights();
  const manifest = acquisitionSchema.parse(
    JSON.parse(await readFile(resolve(TAGNT_SOURCE_ROOT, "artifact-manifest.json"), "utf8")),
  );
  const paths = new Set<string>();
  for (const artifact of manifest.artifacts) {
    if (
      !TAGNT_FILES.some((p) => p === artifact.sourcePath) ||
      paths.has(artifact.sourcePath) ||
      artifact.packageId !== TAGNT_PACKAGE.id ||
      artifact.sourceRevision !== TAGNT_COMMIT ||
      artifact.sourceUrl !== tagntSourceUrl(artifact.sourcePath)
    )
      throw new Error("Unexpected TAGNT artifact identity");
    paths.add(artifact.sourcePath);
    const bytes = await readFile(safePath(TAGNT_SOURCE_ROOT, artifact.sourcePath));
    verifyArtifactBytes(artifact, bytes);
  }
  if (artifactDigest(manifest.artifacts) !== manifest.packageDigest.value)
    throw new Error("TAGNT package digest mismatch");
  return manifest;
}
export async function acquireTagnt() {
  assertTagntRights();
  try {
    await readFile(resolve(TAGNT_SOURCE_ROOT, "artifact-manifest.json"));
    return await verifyTagnt();
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const parent = dirname(TAGNT_SOURCE_ROOT);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(resolve(parent, ".acquire-"));
  const artifacts: SourceArtifact[] = [];
  const retrievedAt = new Date().toISOString();
  try {
    for (const [index, path] of TAGNT_FILES.entries()) {
      const response = await fetch(tagntSourceUrl(path), {
        signal: AbortSignal.timeout(60000),
        redirect: "error",
      });
      if (!response.ok || !response.body)
        throw new Error(`TAGNT acquisition HTTP ${response.status}`);
      const chunks: Uint8Array[] = [];
      let length = 0;
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 20 * 1024 * 1024) throw new Error("TAGNT artifact exceeds size limit");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
      const bytes = Buffer.concat(chunks);
      const destination = safePath(staging, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
      artifacts.push({
        id: `artifact:tagnt:${TAGNT_COMMIT}:${index}`,
        packageId: TAGNT_PACKAGE.id,
        role: "source",
        repository: TAGNT_REPOSITORY,
        sourcePath: path,
        sourceUrl: tagntSourceUrl(path),
        fileName: basename(path),
        mediaType: "text/plain; charset=utf-8",
        format: path.endsWith(".txt") ? "tsv" : "unknown",
        retrievedAt,
        sourceRevision: TAGNT_COMMIT,
        checksum: { algorithm: "SHA-256", value: sha256(bytes) },
        byteSize: bytes.length,
      });
    }
    const manifest = acquisitionSchema.parse({
      schemaVersion: 1,
      packageId: TAGNT_PACKAGE.id,
      commitSha: TAGNT_COMMIT,
      repository: TAGNT_REPOSITORY,
      retrievedAt,
      artifacts,
      packageDigest: { algorithm: "SHA-256", value: artifactDigest(artifacts) },
    });
    await writeFile(
      resolve(staging, "artifact-manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    await rename(staging, TAGNT_SOURCE_ROOT);
  } finally {
    // mkdtemp result must still be a child of the exact acquisition directory.
    safePath(parent, staging);
    await rm(staging, { recursive: true, force: true });
  }
  return verifyTagnt();
}
