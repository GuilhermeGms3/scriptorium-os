import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
  acquireTagnt,
  PROJECT_ROOT,
  sha256,
  TAGNT_OUTPUT_ROOT,
  TAGNT_SOURCE_ROOT,
  verifyTagnt,
} from "./tagnt-acquisition";
import { directoryBytes, importTagnt } from "./tagnt-import";

async function fileInventory(
  root: string,
): Promise<{ path: string; bytes: number; sha256: string }[]> {
  const result: { path: string; bytes: number; sha256: string }[] = [];
  for (const name of (await readdir(root, { recursive: true })).sort()) {
    const path = resolve(root, name);
    if (!(await stat(path)).isFile()) continue;
    const data = await readFile(path);
    result.push({ path: name.replaceAll("\\", "/"), bytes: data.length, sha256: sha256(data) });
  }
  return result;
}
const runs = [];
for (let run = 1; run <= 2; run++) {
  const start = performance.now();
  const acquired = await acquireTagnt();
  const verified = await verifyTagnt();
  if (acquired.packageDigest.value !== verified.packageDigest.value)
    throw new Error("Acquisition changed");
  const imported = await importTagnt();
  const files = await fileInventory(TAGNT_OUTPUT_ROOT);
  runs.push({
    run,
    durationMs: Math.round(performance.now() - start),
    sourceDigest: verified.packageDigest.value,
    generatedTreeDigest: sha256(JSON.stringify(files)),
    files: files.length,
    statistics: imported.statistics,
  });
}
if (runs[0]!.generatedTreeDigest !== runs[1]!.generatedTreeDigest)
  throw new Error("TAGNT import is not idempotent");
const sblRoot = resolve(PROJECT_ROOT, "generated/corpora/sblgnt/1.2");
const sbl = await fileInventory(sblRoot),
  tagnt = await fileInventory(TAGNT_OUTPUT_ROOT);
const shardSummary = (files: typeof sbl, prefix: string) => {
  const selected = files.filter((f) => f.path.startsWith(prefix));
  return {
    count: selected.length,
    totalBytes: selected.reduce((n, f) => n + f.bytes, 0),
    averageBytes: selected.reduce((n, f) => n + f.bytes, 0) / selected.length,
    largest: [...selected].sort((a, b) => b.bytes - a.bytes)[0],
  };
};
const result = {
  measuredAt: new Date().toISOString(),
  runs,
  storage: {
    sblgntGeneratedBefore: 74746655,
    sblgntGeneratedAfter: await directoryBytes(sblRoot),
    tagntSourceArtifacts: (await verifyTagnt()).artifacts.reduce((n, a) => n + a.byteSize, 0),
    tagntSourceIncludingCustodyManifest: await directoryBytes(TAGNT_SOURCE_ROOT),
    tagntGenerated: await directoryBytes(TAGNT_OUTPUT_ROOT),
    totalSourceAndGenerated:
      (await directoryBytes(resolve(PROJECT_ROOT, "corpora/source"))) +
      (await directoryBytes(resolve(PROJECT_ROOT, "generated/corpora"))),
    sblgntChapters: shardSummary(sbl, "books/"),
    tagntChapters: shardSummary(tagnt, "books/"),
    concordance: shardSummary(tagnt, "lexical/"),
    sblgntGeneratedTreeDigest: sha256(JSON.stringify(sbl)),
  },
};
await writeFile(
  resolve(PROJECT_ROOT, "docs/corpora/phase5-metrics.json"),
  JSON.stringify(result, null, 2) + "\n",
);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
