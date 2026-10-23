import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { ContextualReadingPackageSchema } from "../../src/lib/domain/contextual-reading";

const [destination, ...sources] = process.argv.slice(2);
if (!destination || !sources.length)
  throw new Error("Uso: combine-contextual-batches <saída privada nova> <diretórios> [...]");
const manifest = z.object({
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  structureResolved: z.literal(true),
  sourceType: z.literal("source-context"),
  files: z.array(z.object({ file: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })).min(1),
});
const checksums = new Set<string>();
const files: { file: string; sha256: string }[] = [];
const artifacts: { name: string; raw: Buffer }[] = [];
for (const directory of sources) {
  const report = manifest.parse(
    JSON.parse(readFileSync(join(directory, "report.json"), "utf8")) as unknown,
  );
  if (checksums.has(report.sourceChecksum)) throw new Error("Fonte duplicada na entrega.");
  checksums.add(report.sourceChecksum);
  for (const entry of report.files) {
    if (basename(entry.file) !== entry.file) throw new Error("Nome de lote inválido.");
    const raw = readFileSync(join(directory, entry.file));
    if (createHash("sha256").update(raw).digest("hex") !== entry.sha256)
      throw new Error("Checksum divergente.");
    const batch = ContextualReadingPackageSchema.parse(JSON.parse(raw.toString("utf8")) as unknown);
    if (
      batch.notes.some(
        (note) =>
          note.sourceChecksum !== report.sourceChecksum || note.analysis.mode !== "source-excerpt",
      )
    )
      throw new Error("Lote diverge da fonte/modo.");
    const name = `${String(files.length).padStart(4, "0")}-${batch.batchId}.json`;
    files.push({ file: name, sha256: entry.sha256 });
    artifacts.push({ name, raw });
  }
}
// Refuse existing directories. Validate every input before creating any output.
mkdirSync(destination);
for (const artifact of artifacts)
  writeFileSync(join(destination, artifact.name), artifact.raw, { flag: "wx", mode: 0o600 });
writeFileSync(
  join(destination, "report.json"),
  JSON.stringify(
    {
      format: "scriptorium-commentary-report-v1",
      sourceType: "source-context",
      structureResolved: true,
      sourceChecksums: [...checksums],
      files,
      publication: "staging-only",
    },
    null,
    2,
  ),
  { flag: "wx", mode: 0o600 },
);
console.log(JSON.stringify({ sources: checksums.size, batches: files.length, destination }));
