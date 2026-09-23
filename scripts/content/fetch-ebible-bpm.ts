import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCE_URL = "https://ebible.org/Scriptures/porbrbsl_usfm.zip";
const OUTPUT = resolve(
  import.meta.dirname,
  "../../corpora/source/ebible-bpm/2026-08-19/porbrbsl_usfm.zip",
);

async function describe(bytes: Uint8Array, reused: boolean) {
  return {
    output: OUTPUT,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    source: SOURCE_URL,
    reused,
  };
}

try {
  const existing = await readFile(OUTPUT);
  if (existing.byteLength > 1_000_000) {
    process.stdout.write(`${JSON.stringify(await describe(existing, true), null, 2)}\n`);
    process.exit(0);
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60_000);
try {
  const response = await fetch(SOURCE_URL, {
    signal: controller.signal,
    headers: { "User-Agent": "Scriptorium/0.1 corpus-acquisition (local research tool)" },
  });
  if (!response.ok) throw new Error(`eBible returned HTTP ${response.status}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 1_000_000) throw new Error("The eBible package is unexpectedly small.");
  await mkdir(resolve(OUTPUT, ".."), { recursive: true });
  await writeFile(OUTPUT, bytes);
  process.stdout.write(`${JSON.stringify(await describe(bytes, false), null, 2)}\n`);
} finally {
  clearTimeout(timeout);
}
