import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

interface SourceLock {
  stepBibleTbesg: {
    revision: string;
    url: string;
    sha256: string;
    sizeBytes: number;
    license: string;
    attribution: string;
  };
}

const root = resolve(import.meta.dirname, "../..");
const lock = JSON.parse(
  await readFile(resolve(root, "content/source-lock.json"), "utf8"),
) as SourceLock;
const output = resolve(
  root,
  "corpora/source/stepbible-lexicon",
  lock.stepBibleTbesg.revision,
  "TBESG.txt",
);
const response = await fetch(lock.stepBibleTbesg.url);
if (!response.ok) throw new Error(`TBESG fetch failed with HTTP ${response.status}.`);
const bytes = new Uint8Array(await response.arrayBuffer());
const checksum = createHash("sha256").update(bytes).digest("hex");
if (bytes.byteLength !== lock.stepBibleTbesg.sizeBytes || checksum !== lock.stepBibleTbesg.sha256)
  throw new Error(`TBESG custody check failed: ${bytes.byteLength} bytes, ${checksum}.`);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, bytes);
console.log(
  JSON.stringify(
    {
      output,
      bytes: bytes.byteLength,
      checksum,
      license: lock.stepBibleTbesg.license,
      attribution: lock.stepBibleTbesg.attribution,
    },
    null,
    2,
  ),
);
