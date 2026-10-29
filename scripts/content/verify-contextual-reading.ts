import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";
import { ContextualReadingService } from "../../src/lib/application/contextual-reading-service";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";

const [workspace, output, ...directories] = process.argv.slice(2);
if (!workspace || !output || !directories.length)
  throw new Error(
    "Uso: verify-contextual-reading <workspace> <recibo privado.json> <diretório de lotes> [...]",
  );
const db = new DatabaseSync(workspace, { readOnly: true });
const adapter: WorkspaceDatabase = {
  persistence: "installation",
  async query(sql, bind = []) {
    return db.prepare(sql).all(...bind) as WorkspaceRow[];
  },
  async execute() {
    throw new Error("Verificação somente leitura: escrita recusada.");
  },
  async transaction(statements) {
    if (statements.length)
      throw new Error("Pacote ainda exige escrita; não está integralmente reutilizável.");
  },
  async reset() {
    throw new Error("Verificação não apaga dados.");
  },
};
try {
  const sources = [];
  for (const directory of directories) {
    const report = z
      .object({
        sourceChecksum: z.string(),
        files: z.array(z.object({ file: z.string(), sha256: z.string() })).min(1),
      })
      .parse(JSON.parse(readFileSync(join(directory, "report.json"), "utf8")) as unknown);
    let reused = 0;
    for (const file of report.files) {
      if (basename(file.file) !== file.file) throw new Error("Caminho de lote inválido.");
      const raw = readFileSync(join(directory, file.file), "utf8");
      if (createHash("sha256").update(raw).digest("hex") !== file.sha256)
        throw new Error("Checksum do lote divergente.");
      const result = await ContextualReadingService.importJson(raw, adapter);
      if (result.imported !== 0) throw new Error("Pacote não idempotente.");
      reused += result.reused;
    }
    sources.push({
      sourceChecksum: report.sourceChecksum,
      batches: report.files.length,
      imported: 0,
      reused,
    });
    console.log(JSON.stringify(sources.at(-1)));
  }
  writeFileSync(
    output,
    JSON.stringify(
      { verifiedAt: new Date().toISOString(), mode: "read-only-idempotency", sources },
      null,
      2,
    ),
    { flag: "wx", mode: 0o600 },
  );
} finally {
  db.close();
}
