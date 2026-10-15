import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync, backup } from "node:sqlite";
import { ContextualReadingService } from "../../src/lib/application/contextual-reading-service";
import { ContextualReadingPackageSchema } from "../../src/lib/domain/contextual-reading";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";
import { WORKSPACE_SCHEMA_VERSION } from "../database/workspace-migrate";

// Offline operator command. Never run against a Linux bind mount while Docker is writing it.
const [databasePath, batchPath, confirmation] = process.argv.slice(2);
if (!databasePath || !batchPath || confirmation !== "--runtime-stopped")
  throw new Error(
    "Pare Docker/Vite. Uso: npm run content:import:contextual -- <workspace.sqlite3> <lote.json> --runtime-stopped",
  );
const path = resolve(databasePath);
if (!existsSync(path))
  throw new Error("Workspace existente não encontrado; nenhum banco foi criado.");
const raw = readFileSync(resolve(batchPath), "utf8");
const batch = ContextualReadingPackageSchema.parse(JSON.parse(raw) as unknown);
const db = new DatabaseSync(path);
try {
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  const version = db.prepare("SELECT max(version) n FROM workspace_migrations").get()?.["n"];
  if (version !== WORKSPACE_SCHEMA_VERSION)
    throw new Error("Schema incompatível: migre antes do lote.");
  if (db.prepare("PRAGMA foreign_key_check").all().length)
    throw new Error("Workspace com violação de integridade. Importação recusada.");
  const destination = `${path}.before-contextual-${batch.batchId}-${Date.now()}`;
  console.info("Criando backup consistente antes da importação:", destination);
  await backup(db, destination, { rate: 4096 });
  const adapter: WorkspaceDatabase = {
    persistence: "installation",
    async query(sql, bind = []) {
      return db.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql, bind = []) {
      db.prepare(sql).run(...bind);
    },
    async transaction(statements) {
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const statement of statements)
          db.prepare(statement.sql).run(...(statement.bind ?? []));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async reset() {
      throw new Error("Este comando não apaga workspaces.");
    },
  };
  const result = await ContextualReadingService.importJson(raw, adapter);
  console.log(JSON.stringify({ ...result, backup: destination }, null, 2));
} finally {
  db.close();
}
