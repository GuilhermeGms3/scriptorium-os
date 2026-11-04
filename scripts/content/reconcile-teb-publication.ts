import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { ContextualReadingPackageSchema } from "../../src/lib/domain/contextual-reading";
import { WorkspaceLock } from "../../src/lib/workspace-runtime/workspace-lock.server";
import { reuseImportBackup } from "./reuse-import-backup";

const [workspace, staging, confirmation] = process.argv.slice(2);
if (!workspace || !staging || confirmation !== "--runtime-stopped")
  throw Error("Informe workspace, staging integral e --runtime-stopped.");
const coverage = JSON.parse(readFileSync(join(staging, "coverage.json"), "utf8")) as {
  sourceChecksum: string;
  pagesScanned: number;
};
const checksum = "304675c0a56353c8c566f8d356b235de23882455f5680a4ea1c00202c7b35235";
if (coverage.sourceChecksum !== checksum || coverage.pagesScanned !== 2492)
  throw Error("Reconciliação exige varredura integral desta edição da TEB.");
const report = JSON.parse(readFileSync(join(staging, "contextual/report.json"), "utf8")) as {
  files: { file: string; sha256: string }[];
};
const labels = new Set<string>();
for (const file of report.files) {
  if (basename(file.file) !== file.file) throw Error("Caminho inválido.");
  const raw = readFileSync(join(staging, "contextual", file.file), "utf8");
  if (createHash("sha256").update(raw).digest("hex") !== file.sha256)
    throw Error("Checksum divergente.");
  const batch = ContextualReadingPackageSchema.parse(JSON.parse(raw));
  for (const note of batch.notes) {
    if (note.sourceChecksum !== checksum) throw Error("Edição divergente.");
    labels.add(note.rawReference);
  }
}
if (labels.size < 1000) throw Error("Staging insuficiente; nenhum vínculo foi retirado.");
const lock = WorkspaceLock.acquire(dirname(resolve(workspace)));
let db: DatabaseSync | undefined;
try {
  if (!reuseImportBackup(workspace, process.argv)) throw Error("Reutilize snapshot existente.");
  db = new DatabaseSync(workspace);
  db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE");
  const rows = db
    .prepare(
      `SELECT p.id,p.payload_json,d.evidence_json FROM knowledge_proposals p JOIN pipeline_decisions d ON d.proposal_id=p.id WHERE p.document_id=? AND p.review_status='machine-proposed' AND d.audit_status='pending' AND d.publication='machine-visible'`,
    )
    .all("private-document:" + checksum);
  const retired = [];
  for (const row of rows) {
    const payload = JSON.parse(String(row["payload_json"])) as { rawReference: string };
    if (
      !/^TEB · [a-z0-9-]+ · p\. \d+ · nota /.test(payload.rawReference) ||
      labels.has(payload.rawReference)
    )
      continue;
    const evidence = JSON.parse(String(row["evidence_json"])) as Record<string, unknown>;
    const changed = db
      .prepare(
        `UPDATE pipeline_decisions SET publication='withheld',evidence_json=?,updated_at=? WHERE proposal_id=? AND audit_status='pending' AND publication='machine-visible' AND EXISTS(SELECT 1 FROM knowledge_proposals p WHERE p.id=proposal_id AND p.review_status='machine-proposed' AND p.payload_json=?)`,
      )
      .run(
        JSON.stringify({
          ...evidence,
          tebRecalibration: {
            reason:
              "A calibração integral não confirmou o alcance anterior; trecho preservado como leitura documental.",
            pagesScanned: 2492,
          },
        }),
        new Date().toISOString(),
        row["id"]!,
        row["payload_json"]!,
      );
    if (changed.changes) retired.push(String(row["id"]));
  }
  db.exec("COMMIT");
  console.log(JSON.stringify({ retired: retired.length, proposals: retired }));
} catch (error) {
  if (db?.isTransaction) db.exec("ROLLBACK");
  throw error;
} finally {
  db?.close();
  lock.release();
}
