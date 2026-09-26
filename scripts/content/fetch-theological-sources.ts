import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

interface LockedSource {
  revision: string;
  url: string;
  sha256: string;
  sizeBytes: number;
}

const root = resolve(import.meta.dirname, "../..");
const lock = JSON.parse(readFileSync(join(root, "content/source-lock.json"), "utf8")) as Record<
  string,
  LockedSource
>;

const targets = [
  ["copticScriptoriumThomas", "coptic-scriptorium-thomas/thomas_gospel.xml"],
  ["gutenbergAugustineConfessions", "gutenberg-3296/pg3296.txt"],
  ["gutenbergAquinasSummaPrimaPars", "gutenberg-17611/pg17611.txt"],
  ["gutenbergAquinasSummaPrimaSecundae", "gutenberg-17897/pg17897.txt"],
  ["gutenbergAquinasSummaSecundaSecundae", "gutenberg-18755/pg18755.txt"],
  ["gutenbergAquinasSummaTertiaPars", "gutenberg-19950/pg19950.txt"],
] as const;

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

async function fetchLocked(key: string, relativePath: string): Promise<void> {
  const source = lock[key];
  if (!source) throw new Error(`Missing source lock: ${key}`);
  const path = join(root, "corpora/source/primary-sources", relativePath);
  if (existsSync(path)) {
    const current = readFileSync(path);
    if (current.byteLength === source.sizeBytes && sha256(current) === source.sha256) {
      console.log(`verified ${relativePath}`);
      return;
    }
    throw new Error(`Existing source differs from the lock: ${relativePath}`);
  }
  const response = await fetch(source.url, {
    headers: { "User-Agent": "Scriptorium corpus acquisition/1.0" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Download failed for ${key}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== source.sizeBytes || sha256(bytes) !== source.sha256)
    throw new Error(`Custody check failed for ${key}.`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  console.log(`downloaded ${relativePath} (${bytes.byteLength} bytes)`);
}

for (const [key, path] of targets) await fetchLocked(key, path);
