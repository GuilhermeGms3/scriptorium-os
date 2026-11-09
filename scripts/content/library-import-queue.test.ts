import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../database/workspace-migrate";
import { WorkspaceLock } from "../../src/lib/workspace-runtime/workspace-lock.server";
import {
  fileChecksum,
  readQueue,
  resumableJobs,
  saveQueue,
  replaceQueueFile,
  type LibraryImportQueue,
} from "./library-import-queue";

const temporary: string[] = [];
function folder() {
  const path = mkdtempSync(join(tmpdir(), "scriptorium-library-queue-"));
  temporary.push(path);
  return path;
}
afterEach(() => {
  for (const path of temporary.splice(0)) {
    if (!path.startsWith(join(tmpdir(), "scriptorium-library-queue-")))
      throw new Error("Unsafe cleanup");
    rmSync(path, { recursive: true, force: true });
  }
});

function syntheticPdf() {
  const text =
    "John 1:1. This synthetic commentary fixture explains a literary expression and preserves a page reference. It is not a quotation from a real book.";
  const stream = `BT /F1 12 Tf 40 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

describe("durable library import queue", () => {
  it("retries transient Windows replacement locks without deleting the live receipt", () => {
    let attempts = 0;
    const pauses: number[] = [];
    replaceQueueFile(
      "temporary",
      "live",
      () => {
        if (++attempts < 3) throw Object.assign(new Error("busy"), { code: "EPERM" });
      },
      (milliseconds) => pauses.push(milliseconds),
    );
    expect(attempts).toBe(3);
    expect(pauses).toEqual([25, 50]);
    expect(() =>
      replaceQueueFile(
        "temporary",
        "live",
        () => {
          throw Object.assign(new Error("denied"), { code: "EPERM" });
        },
        () => undefined,
      ),
    ).toThrow("denied");
    expect(() =>
      replaceQueueFile(
        "temporary",
        "live",
        () => {
          throw Object.assign(new Error("no space"), { code: "ENOSPC" });
        },
        () => {
          throw new Error("must not retry");
        },
      ),
    ).toThrow("no space");
  });
  it("atomically persists progress, resumes running jobs and preserves blocked/complete jobs", () => {
    const path = join(folder(), "queue.json");
    const queue: LibraryImportQueue = {
      version: 1,
      workspace: "workspace",
      sourceDirectory: "source",
      updatedAt: "now",
      jobs: ["pending", "running", "complete", "failed", "blocked"].map((status, index) => ({
        checksum: String(index).repeat(64),
        path: `book${index}.pdf`,
        status: status as LibraryImportQueue["jobs"][number]["status"],
        stage: "queued",
        attempts: 0,
        message: "test",
        updatedAt: "now",
      })),
    };
    saveQueue(path, queue);
    expect(resumableJobs(readQueue(path))).toHaveLength(2);
    const loaded = readQueue(path);
    loaded.jobs[0]!.stage = "structure";
    saveQueue(path, loaded);
    expect(readQueue(path).jobs[0]!.stage).toBe("structure");
    loaded.jobs.push({ ...loaded.jobs[0]! });
    saveQueue(path, loaded);
    expect(() => readQueue(path)).toThrow("checksums repetidos");
  });
  it("imports and disassembles a real synthetic PDF through canonical services and is idempotent", () => {
    const root = folder(),
      source = join(root, "sources"),
      workspace = join(root, "workspace.sqlite3");
    mkdirSync(source);
    const db = new DatabaseSync(workspace);
    applyWorkspaceMigrations(db);
    db.close();
    const pdfPath = join(source, "Synthetic commentary.pdf");
    writeFileSync(pdfPath, syntheticPdf());
    writeFileSync(join(source, "unsupported.epub"), "fixture");
    const run = (command: string) => {
      const result = spawnSync(
        process.execPath,
        ["--import", "tsx", "scripts/content/process-library-queue.ts", command, workspace, source],
        { cwd: process.cwd(), encoding: "utf8", timeout: 60000 },
      );
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    };
    run("enqueue");
    const path = join(root, "library-import-queue", "queue.json");
    expect(readQueue(path).jobs).toHaveLength(2);
    const owner = WorkspaceLock.acquire(root, {
      releaseOnExit: false,
      schedule: () => () => undefined,
    });
    try {
      const blocked = spawnSync(
        process.execPath,
        ["--import", "tsx", "scripts/content/process-library-queue.ts", "run", workspace],
        { cwd: process.cwd(), encoding: "utf8", timeout: 15000 },
      );
      expect(blocked.status).not.toBe(0);
      owner.assertOwned();
    } finally {
      owner.release();
    }
    run("run");
    const queue = readQueue(path);
    const job = queue.jobs.find((item) => item.checksum === fileChecksum(pdfPath))!;
    expect(job.status).toBe("complete");
    expect(job.units).toBeGreaterThan(0);
    expect(job.textPages).toBe(1);
    expect(queue.jobs.find((item) => item.path.endsWith(".epub"))?.status).toBe("blocked");
    const check = new DatabaseSync(workspace, { readOnly: true });
    expect(check.prepare("SELECT count(*) n FROM private_documents").get()?.["n"]).toBe(1);
    expect(check.prepare("PRAGMA foreign_key_check").all()).toHaveLength(0);
    check.close();
    expect(readFileSync(join(root, "documents", `${job.checksum}.pdf`))).toEqual(
      readFileSync(pdfPath),
    );
    run("enqueue");
    run("run");
    expect(readQueue(path).jobs).toHaveLength(2);
    expect(readQueue(path).jobs.find((item) => item.checksum === job.checksum)?.attempts).toBe(1);
  }, 120000);
});
