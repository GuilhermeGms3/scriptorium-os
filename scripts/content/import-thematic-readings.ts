import { DatabaseSync, backup, type StatementSync } from "node:sqlite";
import { basename, dirname, join, resolve } from "node:path";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { WorkspaceLock } from "../../src/lib/workspace-runtime/workspace-lock.server";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";
import { importThematicReadings } from "../../src/lib/application/thematic-reading-service";
import { reuseImportBackup } from "./reuse-import-backup";

const [workspace, staging, mode] = process.argv.slice(2);
if (!workspace || !staging || !["--runtime-stopped", "--verify", "--dry-run"].includes(mode ?? ""))
  throw Error(
    "Uso: import-thematic-readings <workspace.sqlite3> <staging> --runtime-stopped|--verify|--dry-run",
  );
const path = resolve(workspace);
if (!existsSync(path)) throw Error("Workspace ausente; nenhum banco foi criado.");
const directory = resolve(staging);
const report = z
  .object({
    format: z.literal("scriptorium-thematic-report-v1"),
    files: z
      .array(z.object({ file: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }))
      .min(1),
  })
  .parse(JSON.parse(readFileSync(join(directory, "report.json"), "utf8")) as unknown);
const raws = report.files.map((file) => {
  if (basename(file.file) !== file.file || !/^[a-f0-9-]+\.json$/.test(file.file))
    throw Error("Caminho de lote inválido.");
  const raw = readFileSync(join(directory, file.file), "utf8");
  if (createHash("sha256").update(raw).digest("hex") !== file.sha256)
    throw Error("Checksum de lote divergente.");
  return raw;
});
const verify = mode === "--verify";
const dryRun = mode === "--dry-run";
const lock = verify || dryRun ? undefined : WorkspaceLock.acquire(dirname(path));
let native: DatabaseSync | undefined;
try {
  native = new DatabaseSync(path, { readOnly: verify || dryRun });
  const db = native;
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA cache_size=-65536;");
  const statements = new Map<string, StatementSync>();
  const prepare = (sql: string) => {
    let statement = statements.get(sql);
    if (!statement) {
      statement = db.prepare(sql);
      statements.set(sql, statement);
    }
    return statement;
  };
  const version = Number(
    db.prepare("SELECT max(version) n FROM workspace_migrations").get()?.["n"],
  );
  if (version < 25 || version > 28)
    throw Error("Schema não suportado. Nenhuma migration é aplicada por este importador.");
  if (db.prepare("PRAGMA foreign_key_check").all().length)
    throw Error("Acervo com relacionamentos inválidos.");
  let backupPath: string | undefined;
  if (!verify && !dryRun) {
    backupPath = reuseImportBackup(path, process.argv);
    if (!backupPath) {
      backupPath = `${path}.before-thematic-${Date.now()}`;
      console.info("Criando backup consistente:", backupPath);
      await backup(db, backupPath, { rate: 4096 });
    } else console.info("Snapshot anterior reutilizado; nenhuma cópia completa criada.");
  }
  const adapter: WorkspaceDatabase = {
    persistence: "installation",
    async query(sql, bind = []) {
      lock?.assertOwned();
      return prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute() {
      throw Error("Gravação fora da transação recusada.");
    },
    async transaction(statements) {
      if (dryRun) return;
      if (verify && statements.length)
        throw Error("Lote ainda não incorporado; verificação recusou escrita.");
      lock?.assertOwned();
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const s of statements) prepare(s.sql).run(...(s.bind ?? []));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async reset() {
      throw Error("Este comando não apaga acervos.");
    },
  };
  let imported = 0;
  let reused = 0;
  for (const [index, raw] of raws.entries()) {
    const result = await importThematicReadings(raw, adapter);
    imported += result.imported;
    reused += result.reused;
    console.info(
      `${index + 1}/${raws.length}: ${result.imported} ${dryRun ? "candidatas validadas" : "novas"}, ${result.reused} preservadas`,
    );
    if (!verify && !dryRun)
      appendFileSync(
        join(directory, "receipts.ndjson"),
        JSON.stringify({ backupPath, completed: index + 1, total: raws.length, imported, reused }) +
          "\n",
        { mode: 0o600 },
      );
  }
  if (db.prepare("PRAGMA foreign_key_check").all().length)
    throw Error("Verificação de integridade falhou.");
  console.info(
    JSON.stringify({
      mode,
      ...(dryRun ? { planned: imported } : { imported }),
      reused,
      backupPath,
    }),
  );
} finally {
  native?.close();
  lock?.release();
}
