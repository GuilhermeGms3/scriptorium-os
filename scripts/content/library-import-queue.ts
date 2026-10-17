import { createHash, randomUUID } from "node:crypto";
import { closeSync, fsyncSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { z } from "zod";

export const LibraryImportQueueSchema = z.object({
  version: z.literal(1),
  workspace: z.string().min(1),
  sourceDirectory: z.string().min(1),
  updatedAt: z.string(),
  backup: z.string().optional(),
  jobs: z
    .array(
      z.object({
        checksum: z.string().regex(/^[a-f0-9]{64}$/),
        path: z.string().min(1),
        status: z.enum(["pending", "running", "complete", "failed", "blocked"]),
        stage: z.enum(["queued", "extraction", "structure", "linking", "complete"]),
        attempts: z.number().int().nonnegative(),
        message: z.string(),
        updatedAt: z.string(),
        documentId: z.string().optional(),
        pages: z.number().int().nonnegative().optional(),
        textPages: z.number().int().nonnegative().optional(),
        units: z.number().int().nonnegative().optional(),
        proposals: z.number().int().nonnegative().optional(),
      }),
    )
    .max(1000),
});
export type LibraryImportQueue = z.infer<typeof LibraryImportQueueSchema>;
export type LibraryImportJob = LibraryImportQueue["jobs"][number];

export function fileChecksum(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function readQueue(path: string): LibraryImportQueue {
  const queue = LibraryImportQueueSchema.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
  if (new Set(queue.jobs.map((job) => job.checksum)).size !== queue.jobs.length)
    throw new Error("Fila contém checksums repetidos.");
  return queue;
}

/** The JSON is operational job metadata, never a second store of document knowledge. */
export function replaceQueueFile(
  temporary: string,
  path: string,
  replace: typeof renameSync = renameSync,
  pause: (milliseconds: number) => void = (milliseconds) => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
  },
): void {
  for (let attempt = 0; ; attempt++) {
    try {
      replace(temporary, path);
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (attempt >= 7 || !["EPERM", "EBUSY", "EACCES"].includes(code)) throw error;
      // Antivirus/readers can temporarily deny Windows rename. Never unlink the live receipt.
      pause(Math.min(25 * 2 ** attempt, 400));
    }
  }
}

export function saveQueue(path: string, queue: LibraryImportQueue): void {
  queue.updatedAt = new Date().toISOString();
  const data = LibraryImportQueueSchema.parse(queue);
  const temporary = `${path}.${randomUUID()}.tmp`;
  const fd = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(fd, JSON.stringify(data, null, 2));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  replaceQueueFile(temporary, path);
}

export function resumableJobs(queue: LibraryImportQueue): LibraryImportJob[] {
  return queue.jobs.filter((job) => job.status === "pending" || job.status === "running");
}
