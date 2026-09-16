import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { acquireCorpus, importCorpus, verifyCorpus } from "./pipeline";

const root = resolve(import.meta.dirname, "../..");
const output = resolve(root, "generated/corpora/biblia-livre/2025.1.0");
async function inventory(dir: string) {
  const rows: { path: string; bytes: number; hash: string }[] = [];
  for (const path of (await readdir(dir, { recursive: true })).sort()) {
    const full = resolve(dir, path);
    if (!(await stat(full)).isFile()) continue;
    const bytes = await readFile(full);
    rows.push({
      path,
      bytes: bytes.byteLength,
      hash: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  return {
    rows,
    digest: createHash("sha256")
      .update(rows.map((r) => `${r.path}\0${r.bytes}\0${r.hash}`).join("\n"))
      .digest("hex"),
  };
}
const runs = [];
for (let number = 1; number <= 2; number++) {
  const started = performance.now();
  await acquireCorpus("biblia-livre");
  await verifyCorpus("biblia-livre");
  await importCorpus("biblia-livre");
  runs.push({
    number,
    milliseconds: Math.round(performance.now() - started),
    ...(await inventory(output)),
  });
}
if (runs[0]!.digest !== runs[1]!.digest)
  throw new Error("Phase 6 generated tree is not deterministic.");
const shards = runs[1]!.rows.filter((r) => r.path.replaceAll("\\", "/").startsWith("books/"));
const source = JSON.parse(
  await readFile(
    resolve(
      root,
      "corpora/source/biblia-livre/a315a15e9f4d01883b62206fe441d57762f126b3/artifact-manifest.json",
    ),
    "utf8",
  ),
) as { artifacts: { byteSize: number }[] };
const report = {
  measuredAt: new Date().toISOString(),
  sourceBytes: source.artifacts.reduce((n, a) => n + a.byteSize, 0),
  generatedBytes: runs[1]!.rows.reduce((n, r) => n + r.bytes, 0),
  files: runs[1]!.rows.length,
  chapterShards: shards.length,
  averageChapterShardBytes: shards.reduce((n, r) => n + r.bytes, 0) / shards.length,
  largestChapterShard: shards.reduce((a, b) => (a.bytes > b.bytes ? a : b)),
  treeDigest: runs[1]!.digest,
  runs: runs.map(({ number, milliseconds, digest }) => ({ number, milliseconds, digest })),
};
await writeFile(
  resolve(root, "docs/corpora/phase6-metrics.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
