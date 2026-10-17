import { DatabaseSync, backup } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  openSync,
  closeSync,
  fsyncSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve, relative, isAbsolute } from "node:path";
import { constants } from "node:fs";
import {
  WorkspaceLock,
  WorkspaceLockedError,
} from "../../src/lib/workspace-runtime/workspace-lock.server";
import { setTimeout as delay } from "node:timers/promises";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";
import { WORKSPACE_SCHEMA_VERSION } from "../database/workspace-migrate";
import {
  chooseDocumentTitle,
  detectDocumentLanguage,
} from "../../src/lib/application/private-document-import-service";
import { PrivateDocumentRepository } from "../../src/lib/repositories/private-document-repository";
import { DocumentProcessingRepository } from "../../src/lib/repositories/document-processing-repository";
import { DocumentKnowledgePipelineService } from "../../src/lib/application/document-knowledge-pipeline-service";
import { LocalKnowledgePipelineService } from "../../src/lib/application/local-knowledge-pipeline-service";
import type { ExtractedPrivateDocument } from "../../src/lib/domain/private-document";
import {
  fileChecksum,
  readQueue,
  resumableJobs,
  saveQueue,
  type LibraryImportQueue,
} from "./library-import-queue";

const [command, workspaceArgument, sourceArgument] = process.argv.slice(2);
if (!workspaceArgument || !["enqueue", "run", "status", "retry", "pause"].includes(command ?? ""))
  throw new Error(
    "Uso: tsx scripts/content/process-library-queue.ts enqueue|run|status|retry <workspace.sqlite3> [pasta de livros]",
  );
const workspace = realpathSync(resolve(workspaceArgument));
const root = dirname(workspace);
const queueDirectory = join(root, "library-import-queue");
mkdirSync(queueDirectory, { recursive: true, mode: 0o700 });
const queuePath = join(queueDirectory, "queue.json");
const pausePath = join(queueDirectory, "pause.request");

async function acquireLock(directory: string): Promise<WorkspaceLock> {
  const deadline = Date.now() + 4 * 60 * 60 * 1000;
  let reported = false;
  for (;;) {
    try {
      return WorkspaceLock.acquire(directory);
    } catch (error) {
      if (
        !process.argv.includes("--wait") ||
        !(error instanceof WorkspaceLockedError) ||
        Date.now() >= deadline
      )
        throw error;
      if (!reported) {
        console.log("Aguardando liberação normal do acervo/fila; nenhum lock será removido.");
        reported = true;
      }
      await delay(5000);
    }
  }
}

function openDatabase(readOnly: boolean) {
  const db = new DatabaseSync(workspace, { readOnly });
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  if (
    db.prepare("SELECT max(version) version FROM workspace_migrations").get()?.["version"] !==
    WORKSPACE_SCHEMA_VERSION
  ) {
    db.close();
    throw new Error("Atualize o runtime/schema antes de processar a fila.");
  }
  return db;
}

function within(directory: string, path: string): boolean {
  const rel = relative(directory, realpathSync(path));
  return (
    Boolean(rel) &&
    !isAbsolute(rel) &&
    rel !== ".." &&
    !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
  );
}

async function extractPdf(
  path: string,
  checksum: string,
  originalName: string,
  progress: (message: string) => void,
): Promise<ExtractedPrivateDocument> {
  if (statSync(path).size > 256 * 1024 * 1024) throw new Error("PDF excede 256 MiB.");
  const bytes = readFileSync(path);
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-")
    throw new Error("Assinatura PDF inválida.");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjsDirectory = dirname(fileURLToPath(import.meta.resolve("pdfjs-dist/package.json")));
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl: `${join(pdfjsDirectory, "standard_fonts")}/`,
    cMapUrl: `${join(pdfjsDirectory, "cmaps")}/`,
    cMapPacked: true,
    wasmUrl: `${join(pdfjsDirectory, "wasm")}/`,
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages < 1 || pdf.numPages > 5000)
      throw new Error("PDF fora do limite de 5.000 páginas.");
    const pages: ExtractedPrivateDocument["pages"] = [];
    let characters = 0;
    for (let index = 0; index < pdf.numPages; index++) {
      const page = await pdf.getPage(index + 1);
      const content = await page.getTextContent();
      const items = content.items.flatMap((item) => ("str" in item ? [item] : []));
      const text = items
        .map((item) => `${item.str.normalize("NFC")}${item.hasEOL ? "\n" : " "}`)
        .join("")
        .replace(/[ \t]+\n/gu, "\n")
        .replace(/\n{3,}/gu, "\n\n")
        .trim();
      characters += text.length;
      if (characters > 50_000_000) throw new Error("Texto excede 50 milhões de caracteres.");
      pages.push({
        pageIndex: index,
        pageLabel: String(index + 1),
        text,
        itemCount: items.length,
        layout: items.map((item) => ({
          text: item.str,
          transform: item.transform,
          width: item.width,
          height: item.height,
        })),
      });
      page.cleanup();
      if (index % 50 === 0 || index + 1 === pdf.numPages)
        progress(`Extraídas ${index + 1}/${pdf.numPages} páginas`);
    }
    const metadata = await pdf.getMetadata();
    return {
      title: chooseDocumentTitle(
        "Title" in metadata.info ? metadata.info.Title : undefined,
        originalName,
      ),
      language: detectDocumentLanguage(
        pages
          .filter((page) => page.text)
          .slice(0, 20)
          .map((page) => page.text)
          .join("\n"),
      ),
      originalName: basename(path),
      mimeType: "application/pdf",
      sizeBytes: bytes.length,
      checksum,
      pageCount: pdf.numPages,
      textPageCount: pages.filter((page) => page.text).length,
      extractionMethod: "pdf-text-layer",
      pages,
    };
  } finally {
    await task.destroy();
  }
}

if (command === "pause") {
  writeFileSync(pausePath, "Pause after the current document.\n", { mode: 0o600 });
  console.log("Pausa solicitada após o documento atual; use run para retomar.");
} else if (command === "status") {
  const queue = readQueue(queuePath);
  console.log(
    JSON.stringify(
      {
        updatedAt: queue.updatedAt,
        backup: queue.backup,
        jobs: queue.jobs.map(({ path, ...job }) => ({ ...job, name: basename(path) })),
      },
      null,
      2,
    ),
  );
} else {
  // This independent lock protects enqueue/retry/run from overwriting each other's receipts.
  const queueLock = await acquireLock(queueDirectory);
  try {
    if (command === "enqueue") {
      if (!sourceArgument) throw new Error("Informe a pasta de origem.");
      const sourceDirectory = realpathSync(resolve(sourceArgument));
      const queue: LibraryImportQueue = existsSync(queuePath)
        ? readQueue(queuePath)
        : { version: 1, workspace, sourceDirectory, updatedAt: new Date().toISOString(), jobs: [] };
      if (queue.workspace !== workspace || queue.sourceDirectory !== sourceDirectory)
        throw new Error("Fila pertence a outra origem/workspace.");
      const db = openDatabase(true);
      try {
        const installed = new Set(
          db
            .prepare("SELECT checksum FROM private_documents")
            .all()
            .map((row) => String(row["checksum"])),
        );
        const queued = new Set(queue.jobs.map((job) => job.checksum));
        const names = readdirSync(sourceDirectory)
          .filter((name) => /\.(pdf|epub)$/iu.test(name))
          .sort(
            (a, b) =>
              Number(!/wesley/iu.test(a)) - Number(!/wesley/iu.test(b)) || a.localeCompare(b),
          );
        for (const name of names) {
          const path = join(sourceDirectory, name);
          if (!within(sourceDirectory, path) || !statSync(path).isFile()) continue;
          const checksum = fileChecksum(path);
          if (installed.has(checksum) || queued.has(checksum)) continue;
          const epub = extname(path).toLowerCase() === ".epub";
          queue.jobs.push({
            checksum,
            path,
            status: epub ? "blocked" : "pending",
            stage: "queued",
            attempts: 0,
            message: epub
              ? "Importador EPUB ainda indisponível; arquivo preservado, não processado."
              : "Aguardando incorporação determinística.",
            updatedAt: new Date().toISOString(),
          });
          queued.add(checksum);
          delete queue.backup;
        }
        saveQueue(queuePath, queue);
        console.log(
          JSON.stringify({
            total: queue.jobs.length,
            pending: resumableJobs(queue).length,
            blocked: queue.jobs.filter((job) => job.status === "blocked").length,
          }),
        );
      } finally {
        db.close();
      }
    } else if (command === "retry") {
      const queue = readQueue(queuePath);
      for (const job of queue.jobs) if (job.status === "failed") job.status = "pending";
      saveQueue(queuePath, queue);
    } else {
      const queue = readQueue(queuePath);
      if (queue.workspace !== workspace) throw new Error("Workspace da fila divergente.");
      if (process.argv.includes("--retry-failed")) {
        for (const job of queue.jobs)
          if (job.status === "failed" && job.attempts < 3) job.status = "pending";
        saveQueue(queuePath, queue);
      }
      const jobs = resumableJobs(queue);
      if (jobs.length) {
        const lock = await acquireLock(root);
        let db: DatabaseSync | undefined;
        try {
          db = openDatabase(false);
          db.exec("PRAGMA journal_mode=WAL; PRAGMA cache_size=-65536;");
          const database = db;
          if (existsSync(pausePath)) unlinkSync(pausePath);
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
              throw new Error("Worker não apaga workspaces.");
            },
          };
          if (!queue.backup) {
            const destination = `${workspace}.before-library-queue-${Date.now()}`;
            console.log("Criando backup consistente:", destination);
            await backup(db, destination, { rate: 4096 });
            queue.backup = destination;
            saveQueue(queuePath, queue);
          }
          for (const job of jobs) {
            if (existsSync(pausePath)) {
              console.log("Fila pausada entre documentos.");
              break;
            }
            const progress = (message: string) => {
              queueLock.assertOwned();
              lock.assertOwned();
              job.message = message;
              job.updatedAt = new Date().toISOString();
              saveQueue(queuePath, queue);
              console.log(`${job.updatedAt} ${basename(job.path)}: ${message}`);
            };
            try {
              if (
                !within(queue.sourceDirectory, job.path) ||
                fileChecksum(job.path) !== job.checksum
              )
                throw new Error("Arquivo alterado ou fora da pasta autorizada.");
              job.status = "running";
              job.attempts++;
              job.stage = "extraction";
              progress("Iniciando/retomando importação");
              const pdfPath = join(root, "documents", `${job.checksum}.pdf`);
              mkdirSync(dirname(pdfPath), { recursive: true, mode: 0o700 });
              if (existsSync(pdfPath)) {
                if (fileChecksum(pdfPath) !== job.checksum)
                  throw new Error("Original armazenado tem checksum divergente.");
              } else {
                const temporary = `${pdfPath}.${randomUUID()}.tmp`;
                copyFileSync(job.path, temporary, constants.COPYFILE_EXCL);
                const fd = openSync(temporary, "r+");
                try {
                  fsyncSync(fd);
                } finally {
                  closeSync(fd);
                }
                if (fileChecksum(temporary) !== job.checksum)
                  throw new Error("Checksum divergente na cópia do original.");
                renameSync(temporary, pdfPath);
              }
              let document = await PrivateDocumentRepository.findByChecksum(job.checksum, adapter);
              if (!document) {
                const extracted = await extractPdf(
                  pdfPath,
                  job.checksum,
                  basename(job.path),
                  progress,
                );
                extracted.originalName = basename(job.path);
                extracted.title = chooseDocumentTitle(extracted.title, basename(job.path));
                document = (
                  await PrivateDocumentRepository.importDocument(
                    extracted,
                    `installation:/documents/${job.checksum}.pdf`,
                    adapter,
                  )
                ).document;
              }
              job.documentId = document.id;
              job.pages = document.pageCount;
              job.textPages = document.textPageCount;
              await DocumentProcessingRepository.recordStep(
                document.id,
                "extraction",
                document.textPageCount === document.pageCount ? "complete" : "partial",
                { completedUnits: document.textPageCount, totalUnits: document.pageCount },
                adapter,
              );
              await DocumentProcessingRepository.recordStep(
                document.id,
                "ocr",
                document.textPageCount === document.pageCount ? "skipped" : "pending",
                { checkpoint: { missingPages: document.pageCount - document.textPageCount } },
                adapter,
              );
              if (!document.textPageCount)
                throw new Error("Original incorporado; exige OCR antes da desmontagem textual.");
              const profile = await DocumentProcessingRepository.ensureProfile(document, adapter);
              job.stage = "structure";
              progress("Desmontagem pelo analisador canônico");
              await DocumentProcessingRepository.recordStep(
                document.id,
                "structure",
                "running",
                {},
                adapter,
              );
              const analysis = await DocumentKnowledgePipelineService.analyzeDocument(
                document.id,
                (p) => progress(p.message),
                adapter,
                { profile: profile.profile },
              );
              job.units = analysis.unitCount;
              job.proposals = analysis.proposalCount;
              await DocumentProcessingRepository.recordStep(
                document.id,
                "structure",
                "complete",
                { completedUnits: analysis.unitCount, totalUnits: analysis.unitCount },
                adapter,
              );
              await DocumentProcessingRepository.annotateUnits(document, profile, adapter);
              job.stage = "linking";
              progress("Registrando referências explícitas para revisão; sem LLM");
              await LocalKnowledgePipelineService.run(
                document.id,
                "biblia-livre-n4-2025.1.0",
                false,
                progress,
                new AbortController().signal,
                false,
                adapter,
              );
              await DocumentProcessingRepository.recordStep(
                document.id,
                "linking",
                "complete",
                {
                  checkpoint: {
                    useLlm: false,
                    sourceSchemeConfirmed: false,
                    requiresContextualReview: true,
                  },
                },
                adapter,
              );
              job.status = "complete";
              job.stage = "complete";
              progress(
                "Incorporado e desmontado; vínculos candidatos aguardam revisão contextual/versificação. OCR pendente onde não havia texto.",
              );
            } catch (error) {
              job.status = "failed";
              progress(
                error instanceof Error ? error.message.slice(0, 1000) : "Falha não identificada",
              );
              if (lock.lost) throw error;
            }
          }
          if (db.prepare("PRAGMA foreign_key_check").all().length)
            throw new Error("Falha de integridade ao concluir fila.");
          if (queue.jobs.some((job) => job.status === "failed")) process.exitCode = 1;
          console.log(
            "Fila encerrada:",
            JSON.stringify(
              queue.jobs.reduce<Record<string, number>>((counts, job) => {
                counts[job.status] = (counts[job.status] ?? 0) + 1;
                return counts;
              }, {}),
            ),
          );
        } finally {
          try {
            db?.close();
          } finally {
            lock.release();
          }
        }
      }
    }
  } finally {
    queueLock.release();
  }
}
