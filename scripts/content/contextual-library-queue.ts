import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { replaceQueueFile } from "./library-import-queue";
import { WorkspaceLock } from "../../src/lib/workspace-runtime/workspace-lock.server";

const THEMATIC = new Set([
  "26e7477dd8e304a91005ec45b4033e0938dcb23b3f554b4f5a47345f7fc6e6c9",
  "885a12227acbb6e755084b6d09945d4b59b172e3ca8c1e39b8191b28e6c8c5f7",
  "d52a56ca811f8e9667d8f6e7f95ad61c2b1e808c6f4e5bba06883bb912777368",
  "518ff717f956b9e3c7e02caa8afb230cd2db1c787d71a9c4c21567597dca57a6",
]);
const JOHN = "d439b9b2c3cc7dc0ff128765b1fe65395611c943d51241ddaa5149380a0d4642";
const JobSchema = z.object({
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string(),
  pages: z.number().int().nonnegative(),
  textPages: z.number().int().nonnegative(),
  existingProposals: z.number().int().nonnegative(),
  handler: z.enum(["thematic", "john-tractates", "unclassified"]),
  status: z.enum([
    "pending",
    "running",
    "staged",
    "published",
    "existing-context",
    "blocked",
    "failed",
  ]),
  message: z.string(),
  attempts: z.number().int().nonnegative(),
});
export const ContextQueueSchema = z.object({
  version: z.literal(1),
  workspace: z.string(),
  updatedAt: z.string(),
  jobs: z.array(JobSchema).max(1000),
});
type Job = z.infer<typeof JobSchema>;
type Queue = z.infer<typeof ContextQueueSchema>;

export function classifyContextJob(
  checksum: string,
  title: string,
  textPages: number,
  existing: number,
): Pick<Job, "handler" | "status" | "message"> {
  const handler = THEMATIC.has(checksum)
    ? "thematic"
    : checksum === JOHN
      ? "john-tractates"
      : "unclassified";
  if (!textPages)
    return { handler, status: "blocked", message: "OCR necessário antes da contextualização." };
  if (existing)
    return {
      handler,
      status: "existing-context",
      message: "Já possui contextos; quantidade não comprova cobertura ou revisão integral.",
    };
  if (handler !== "unclassified")
    return {
      handler,
      status: "pending",
      message: "Perfil da edição calibrado; aguarda extração contextual.",
    };
  const message = /jerusal[eé]m/i.test(title)
    ? "Texto extraído; aparato de comentários não identificado. Não converter Escritura em comentário."
    : /salmos/i.test(title)
      ? "Exige crosswalk documental do Saltério; não alinhar números automaticamente."
      : /dicion|lexico|léxico/i.test(title)
        ? "Exige perfil por verbete/lema, não extração genérica de comentários."
        : "Exige calibração de estrutura e tipo de ligação desta edição.";
  return { handler, status: "blocked", message };
}

function save(path: string, queue: Queue): void {
  queue.updatedAt = new Date().toISOString();
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(ContextQueueSchema.parse(queue), null, 2), {
    flag: "wx",
    mode: 0o600,
  });
  replaceQueueFile(temporary, path, renameSync);
}
function child(executable: string, args: string[], cwd: string): Promise<void> {
  return new Promise((done, fail) => {
    const worker = spawn(executable, args, { cwd, stdio: "inherit", windowsHide: true });
    worker.once("error", fail);
    worker.once("exit", (code) =>
      code === 0 ? done() : fail(new Error(`Etapa terminou com código ${code}.`)),
    );
  });
}

async function main(): Promise<void> {
  const [command, workspaceArgument] = process.argv.slice(2);
  if (!workspaceArgument || !["plan", "run", "status"].includes(command ?? ""))
    throw Error(
      "Uso: contextual-library-queue plan|run|status <workspace> [--publish --reuse-backup <snapshot>] [--retry-failed]",
    );
  const workspace = resolve(workspaceArgument);
  if (!existsSync(workspace)) throw Error("Workspace ausente; nenhum banco criado.");
  const root = resolve(import.meta.dirname, "../..");
  const directory = join(dirname(workspace), "contextual-library-queue");
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "queue.json");
  if (command === "status") {
    console.log(readFileSync(path, "utf8"));
    return;
  }
  const lock = WorkspaceLock.acquire(directory);
  try {
    if (command === "plan") {
      const prior = existsSync(path)
        ? ContextQueueSchema.parse(JSON.parse(readFileSync(path, "utf8")) as unknown)
        : undefined;
      if (prior && prior.workspace !== workspace) throw Error("Fila pertence a outro workspace.");
      const db = new DatabaseSync(workspace, { readOnly: true });
      let queue: Queue;
      try {
        const counts = new Map(
          db
            .prepare(
              "SELECT document_id,count(*) n FROM knowledge_proposals WHERE method NOT LIKE 'deterministic-document-knowledge:%' GROUP BY document_id",
            )
            .all()
            .map((row) => [String(row["document_id"]), Number(row["n"])]),
        );
        const jobs = db
          .prepare(
            "SELECT id,title,checksum,page_count,text_page_count FROM private_documents ORDER BY title",
          )
          .all()
          .map((row) => {
            const checksum = String(row["checksum"]),
              title = String(row["title"]),
              textPages = Number(row["text_page_count"]);
            const previous = prior?.jobs.find((job) => job.checksum === checksum);
            return previous &&
              ["running", "staged", "published", "failed"].includes(previous.status)
              ? previous
              : {
                  checksum,
                  title,
                  pages: Number(row["page_count"]),
                  textPages,
                  existingProposals: counts.get(String(row["id"])) ?? 0,
                  attempts: 0,
                  ...classifyContextJob(
                    checksum,
                    title,
                    textPages,
                    counts.get(String(row["id"])) ?? 0,
                  ),
                };
          });
        queue = { version: 1, workspace, updatedAt: new Date().toISOString(), jobs };
      } finally {
        db.close();
      }
      save(path, queue);
      console.log(
        JSON.stringify({
          documents: queue.jobs.length,
          pending: queue.jobs.filter((job) => job.status === "pending").length,
          queue: path,
        }),
      );
      return;
    }
    const queue = ContextQueueSchema.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
    if (queue.workspace !== workspace) throw Error("Fila divergente.");
    const publish = process.argv.includes("--publish");
    const backup = process.argv[process.argv.indexOf("--reuse-backup") + 1];
    if (publish && (!process.argv.includes("--reuse-backup") || !backup || !existsSync(backup)))
      throw Error(
        "Publicação exige --reuse-backup explícito; não criamos cópias completas automaticamente.",
      );
    const python = join(root, "services/semantic-engine/.venv/Scripts/python.exe");
    const pythonRoot = join(root, "services/semantic-engine");
    const node = (script: string, args: string[]) =>
      child(process.execPath, ["--import", "tsx", `scripts/content/${script}.ts`, ...args], root);
    for (const job of queue.jobs) {
      if (
        !["pending", "running", "staged"].includes(job.status) &&
        !(job.status === "failed" && process.argv.includes("--retry-failed"))
      )
        continue;
      if (job.handler === "unclassified") continue;
      lock.assertOwned();
      job.status = "running";
      job.attempts++;
      save(path, queue);
      console.log(`Contextualizando: ${job.title}`);
      const stage = join(
        directory,
        job.handler === "thematic" ? `${job.checksum}-v2` : job.checksum,
      );
      const report = join(stage, "report.json");
      try {
        if (!existsSync(report)) {
          if (job.handler === "thematic")
            await child(
              python,
              [
                "-m",
                "app.thematic_sources",
                workspace,
                stage,
                "--additional-only",
                "--checksums",
                job.checksum,
              ],
              pythonRoot,
            );
          else {
            const snapshot = join(directory, `${job.checksum}-source.json`),
              geometry = join(directory, `${job.checksum}-layout.json`);
            const pdf = join(dirname(workspace), "documents", `${job.checksum}.pdf`);
            if (!existsSync(snapshot))
              await node("export-commentary-source", [
                workspace,
                job.checksum,
                snapshot,
                "--protect-all-contextual",
              ]);
            if (!existsSync(geometry))
              await node("export-commentary-layout", [snapshot, pdf, geometry]);
            await child(
              python,
              [
                "-m",
                "app.outlined_sources",
                snapshot,
                geometry,
                pdf,
                join(pythonRoot, "profiles/augustine-john-ccel.json"),
                stage,
              ],
              pythonRoot,
            );
          }
        }
        const staged = z
          .object({ files: z.array(z.unknown()) })
          .parse(JSON.parse(readFileSync(report, "utf8")) as unknown);
        if (!staged.files.length) {
          job.status = "blocked";
          job.message =
            "Nenhum fragmento seguro extraído; conferir relatório, não publicar lote vazio.";
          save(path, queue);
          continue;
        }
        job.status = "staged";
        job.message = "Extraído em staging; ainda não disponível no leitor.";
        save(path, queue);
        if (publish) {
          await node(
            job.handler === "thematic" ? "import-thematic-readings" : "import-contextual-reading",
            [workspace, stage, "--runtime-stopped", "--reuse-backup", backup!],
          );
          job.status = "published";
          job.message =
            "Importado pelo motor canônico; auditoria acadêmica integral ainda pendente.";
          save(path, queue);
        }
      } catch (error) {
        job.status = "failed";
        job.message = error instanceof Error ? error.message : "Falha de etapa";
        save(path, queue);
      }
    }
    console.log(
      JSON.stringify(
        queue.jobs.reduce<Record<string, number>>((counts, job) => {
          counts[job.status] = (counts[job.status] ?? 0) + 1;
          return counts;
        }, {}),
      ),
    );
    if (queue.jobs.some((job) => job.status === "failed")) process.exitCode = 1;
  } finally {
    lock.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
