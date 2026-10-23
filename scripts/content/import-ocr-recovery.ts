import { DatabaseSync, backup, type StatementSync } from "node:sqlite";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { WorkspaceLock } from "../../src/lib/workspace-runtime/workspace-lock.server";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";
import { importOcrRecoveryPage } from "../../src/lib/application/ocr-recovery-service";
import { PrivateDocumentRepository } from "../../src/lib/repositories/private-document-repository";
import { DocumentProcessingRepository } from "../../src/lib/repositories/document-processing-repository";
import { DocumentKnowledgePipelineService } from "../../src/lib/application/document-knowledge-pipeline-service";

const [workspace, staging, mode] = process.argv.slice(2);
if (!workspace || !staging || !["--runtime-stopped", "--verify"].includes(mode ?? ""))
  throw Error(
    "Uso: import-ocr-recovery <workspace.sqlite3> <staging> --runtime-stopped|--verify [--structure]",
  );
const path = resolve(workspace),
  directory = resolve(staging);
if (!existsSync(path)) throw Error("Workspace inexistente; nenhum banco foi criado.");
const manifest = z
  .object({
    format: z.literal("scriptorium-ocr-library-v1"),
    modelRevision: z.string().min(1).max(200),
    targets: z
      .array(
        z.object({
          checksum: z.string().regex(/^[a-f0-9]{64}$/),
          pages: z.number().int().positive(),
        }),
      )
      .max(100),
  })
  .parse(JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8")) as unknown);
const allowed = new Set(manifest.targets.map((t) => t.checksum));
const files = readdirSync(directory)
  .filter((f) => /^[a-f0-9]{64}-\d{5}\.json$/.test(f) && allowed.has(f.slice(0, 64)))
  .sort();
if (!files.length) throw Error("Nenhuma página OCR pronta; nada alterado.");
const verify = mode === "--verify";
const lock = verify ? undefined : WorkspaceLock.acquire(dirname(path));
let native: DatabaseSync | undefined;
try {
  native = new DatabaseSync(path, { readOnly: verify });
  const db = native;
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA cache_size=-65536;");
  const version = Number(
    db.prepare("SELECT max(version) n FROM workspace_migrations").get()?.["n"],
  );
  if (version < 25 || version > 28)
    throw Error("Schema não suportado; nenhuma migration aplicada.");
  for (const target of manifest.targets) {
    const pdf = join(dirname(path), "documents", `${target.checksum}.pdf`);
    if (createHash("sha256").update(readFileSync(pdf)).digest("hex") !== target.checksum)
      throw Error("Original divergente; lote recusado.");
  }
  if (db.prepare("PRAGMA foreign_key_check").all().length)
    throw Error("FKs inválidas antes da publicação.");
  const receiptPath = join(directory, "import-receipt.json");
  const existing = existsSync(receiptPath)
    ? z
        .object({ workspace: z.string(), backupPath: z.string() })
        .parse(JSON.parse(readFileSync(receiptPath, "utf8")) as unknown)
    : undefined;
  if (existing && (existing.workspace !== path || !existsSync(existing.backupPath)))
    throw Error("Recibo de outro workspace ou backup ausente.");
  const backupPath = existing?.backupPath ?? `${path}.before-ocr-${Date.now()}`;
  if (!existing && !verify) {
    console.info("Backup consistente:", backupPath);
    await backup(db, backupPath, { rate: 4096 });
    writeFileSync(
      receiptPath,
      JSON.stringify({ workspace: path, backupPath, imported: 0, reused: 0 }),
      { mode: 0o600, flag: "wx" },
    );
  }
  const cache = new Map<string, StatementSync>();
  function statement(sql: string) {
    let s = cache.get(sql);
    if (!s) {
      s = db.prepare(sql);
      cache.set(sql, s);
    }
    return s;
  }
  const adapter: WorkspaceDatabase = {
    persistence: "installation",
    async query(sql, bind = []) {
      lock?.assertOwned();
      return statement(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql, bind = []) {
      if (verify) throw Error("Verificação é somente leitura.");
      lock?.assertOwned();
      statement(sql).run(...bind);
    },
    async transaction(statements) {
      if (verify) throw Error("Resultado publicado diverge; verificação recusou escrita.");
      lock?.assertOwned();
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const s of statements) statement(s.sql).run(...(s.bind ?? []));
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async reset() {
      throw Error("OCR não apaga workspaces.");
    },
  };
  let imported = 0,
    reused = 0;
  let pending = 0;
  for (const file of files) {
    if (verify) {
      const stored = db
        .prepare(
          `SELECT p.extraction_method FROM private_document_pages p
        JOIN private_documents d ON d.id=p.document_id WHERE d.checksum=? AND p.page_index=?`,
        )
        .get(file.slice(0, 64), Number(file.slice(65, 70)) - 1);
      if (stored?.["extraction_method"] !== "ocr") {
        pending++;
        continue;
      }
    }
    const result = await importOcrRecoveryPage(
      readFileSync(join(directory, file), "utf8"),
      adapter,
      manifest.modelRevision,
    );
    if (result === "imported") imported++;
    else reused++;
    if (!verify)
      writeFileSync(
        receiptPath,
        JSON.stringify({
          workspace: path,
          backupPath,
          imported,
          reused,
          total: files.length,
          lastFile: file,
        }),
        { mode: 0o600 },
      );
  }
  for (const target of verify ? [] : manifest.targets) {
    const doc = await PrivateDocumentRepository.findByChecksum(target.checksum, adapter);
    if (!doc) continue;
    await DocumentProcessingRepository.recordStep(
      doc.id,
      "ocr",
      doc.textPageCount === doc.pageCount ? "complete" : "partial",
      {
        completedUnits: doc.textPageCount,
        totalUnits: doc.pageCount,
        checkpoint: {
          staging: directory,
          method: "tesseract-tsv",
          modelRevision: manifest.modelRevision,
          requiresReview: true,
        },
      },
      adapter,
    );
    if (process.argv.includes("--structure") && doc.textPageCount > 0) {
      console.info("Estruturando:", doc.title);
      const profile = await DocumentProcessingRepository.ensureProfile(doc, adapter);
      const result = await DocumentKnowledgePipelineService.analyzeDocument(
        doc.id,
        (p) =>
          console.info(
            p.message === "Livro desmontado e pronto para revisão." &&
              doc.textPageCount < doc.pageCount
              ? "Texto disponível estruturado; OCR do documento ainda parcial."
              : p.message,
          ),
        adapter,
        { profile: profile.profile },
      );
      await DocumentProcessingRepository.recordStep(
        doc.id,
        "structure",
        doc.textPageCount === doc.pageCount ? "complete" : "partial",
        {
          completedUnits: result.unitCount,
          totalUnits: result.unitCount,
          checkpoint: {
            scope: "available-extracted-text",
            textPageCount: doc.textPageCount,
            pagesStillWithoutText: doc.pageCount - doc.textPageCount,
          },
        },
        adapter,
      );
      await DocumentProcessingRepository.annotateUnits(doc, profile, adapter);
      if (doc.textPageCount < doc.pageCount)
        await DocumentProcessingRepository.recordStep(
          doc.id,
          "analysis",
          "partial",
          {
            completedUnits: result.unitCount,
            totalUnits: result.unitCount,
            checkpoint: {
              scope: "available-extracted-text",
              pagesStillWithoutText: doc.pageCount - doc.textPageCount,
            },
          },
          adapter,
        );
    }
  }
  if (db.prepare("PRAGMA foreign_key_check").all().length)
    throw Error("FKs inválidas após publicação.");
  console.info(
    JSON.stringify({
      mode,
      imported,
      reused,
      pending,
      backupPath: existing?.backupPath ?? (verify ? undefined : backupPath),
      documents: manifest.targets.length,
    }),
  );
} finally {
  native?.close();
  lock?.release();
}
