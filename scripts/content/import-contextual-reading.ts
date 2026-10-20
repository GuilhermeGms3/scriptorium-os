import { readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { DatabaseSync, backup } from "node:sqlite";
import { ContextualReadingService } from "../../src/lib/application/contextual-reading-service";
import { ContextualReadingPackageSchema } from "../../src/lib/domain/contextual-reading";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";
import { applyWorkspaceMigrations } from "../database/workspace-migrate";
import { contextualImportSchema } from "./contextual-import-schema";
import { WorkspaceLock } from "../../src/lib/workspace-runtime/workspace-lock.server";

// Offline operator command. Never run against a Linux bind mount while Docker is writing it.
const [databasePath, batchPath, confirmation] = process.argv.slice(2);
if (!databasePath || !batchPath || confirmation !== "--runtime-stopped")
  throw new Error(
    "Pare Docker/Vite. Uso: npm run content:import:contextual -- <workspace.sqlite3> <lote.json> --runtime-stopped",
  );
const path = resolve(databasePath);
if (!existsSync(path))
  throw new Error("Workspace existente não encontrado; nenhum banco foi criado.");
const lock = WorkspaceLock.acquire(dirname(path));
let db: DatabaseSync | undefined;
try {
  const input = resolve(batchPath);
  const directory = statSync(input).isDirectory();
  const reportSchema = z
    .object({
      format: z.literal("scriptorium-commentary-report-v1"),
      allBookHeadingsResolved: z.literal(true).optional(),
      structureResolved: z.literal(true).optional(),
      sourceType: z.literal("source-context").optional(),
      sourceChecksum: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
      sourceChecksums: z
        .array(z.string().regex(/^[a-f0-9]{64}$/))
        .min(1)
        .max(30)
        .optional(),
      files: z
        .array(z.object({ file: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }))
        .min(1),
    })
    .refine(
      (report) =>
        report.allBookHeadingsResolved === true ||
        (report.structureResolved === true && report.sourceType === "source-context"),
      "Estrutura da fonte não foi resolvida.",
    )
    .refine(
      (report) => Boolean(report.sourceChecksum) !== Boolean(report.sourceChecksums),
      "Declare uma fonte ou uma lista de fontes, não ambas.",
    );
  const report = directory
    ? reportSchema.parse(JSON.parse(readFileSync(join(input, "report.json"), "utf8")) as unknown)
    : undefined;
  const raws = report
    ? report.files.map((file) => {
        if (basename(file.file) !== file.file || !file.file.endsWith(".json"))
          throw new Error("Nome de lote inválido.");
        const raw = readFileSync(join(input, file.file), "utf8");
        if (createHash("sha256").update(raw).digest("hex") !== file.sha256)
          throw new Error("Checksum do lote divergente.");
        return raw;
      })
    : [readFileSync(input, "utf8")];
  const batches = raws.map((raw) =>
    ContextualReadingPackageSchema.parse(JSON.parse(raw) as unknown),
  );
  if (
    report &&
    batches.some((batch) =>
      batch.notes.some(
        (note) =>
          !(report.sourceChecksums ?? [report.sourceChecksum!]).includes(note.sourceChecksum) ||
          note.analysis.mode !== "source-excerpt",
      ),
    )
  )
    throw new Error("Pacote não corresponde à fonte/modo do relatório.");
  const database = new DatabaseSync(path);
  db = database;
  database.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  if (directory)
    // Bounded cache and one final checkpoint avoid thrashing a large workspace during bulk import.
    // Keep SQLite's synchronous/durability setting unchanged; the WAL remains the recovery log.
    database.exec("PRAGMA cache_size=-65536; PRAGMA wal_autocheckpoint=0;");
  const version = db.prepare("SELECT max(version) n FROM workspace_migrations").get()?.["n"];
  const schema = contextualImportSchema(version);
  if (db.prepare("PRAGMA foreign_key_check").all().length)
    throw new Error("Workspace com violação de integridade. Importação recusada.");
  const destination = `${path}.before-contextual-${batches[0]!.batchId}-${Date.now()}`;
  console.info("Criando backup consistente antes da importação:", destination);
  await backup(db, destination, { rate: 4096 });
  if (schema.migrate) applyWorkspaceMigrations(database);
  const adapter: WorkspaceDatabase = {
    persistence: "installation",
    async query(sql, bind = []) {
      lock.assertOwned();
      return database.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql, bind = []) {
      lock.assertOwned();
      database.prepare(sql).run(...bind);
    },
    async transaction(statements) {
      lock.assertOwned();
      database.exec("BEGIN IMMEDIATE");
      try {
        for (const statement of statements)
          database.prepare(statement.sql).run(...(statement.bind ?? []));
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    async reset() {
      throw new Error("Este comando não apaga workspaces.");
    },
  };
  const results = [];
  for (const [index, raw] of raws.entries()) {
    const result = await ContextualReadingService.importJson(raw, adapter);
    results.push(result);
    if (directory)
      writeFileSync(
        join(input, "import-receipt.json"),
        JSON.stringify(
          { backup: destination, completed: results.length, total: raws.length, results },
          null,
          2,
        ),
        { mode: 0o600 },
      );
    console.info(
      `Lote ${index + 1}/${raws.length}: ${result.imported} novas, ${result.reused} preservadas.`,
    );
  }
  console.log(
    JSON.stringify(
      {
        imported: results.reduce((sum, x) => sum + x.imported, 0),
        reused: results.reduce((sum, x) => sum + x.reused, 0),
        batches: results.length,
        backup: destination,
      },
      null,
      2,
    ),
  );
} finally {
  try {
    db?.close();
  } finally {
    lock.release();
  }
}
