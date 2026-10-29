import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { PRIVATE_STUDY_READINGS } from "../../src/lib/content/private-study-readings";

const [workspace] = process.argv.slice(2);
if (!workspace)
  throw new Error("Uso: tsx scripts/content/verify-study-readings.ts <workspace.sqlite3>");
const db = new DatabaseSync(resolve(workspace), { readOnly: true });
try {
  let available = 0;
  for (const reading of PRIVATE_STUDY_READINGS) {
    const document = db
      .prepare("SELECT id FROM private_documents WHERE checksum=?")
      .get(reading.checksum);
    if (!document) throw new Error(`Edição ausente: ${reading.id}`);
    const page = db
      .prepare("SELECT text FROM private_document_pages WHERE document_id=? AND page_index=?")
      .get(document["id"]!, reading.page - 1);
    if (
      !page ||
      typeof page["text"] !== "string" ||
      createHash("sha256").update(page["text"]).digest("hex") !== reading.pageTextChecksum
    )
      throw new Error(`Página divergente: ${reading.id}`);
    available++;
  }
  console.log(
    JSON.stringify({ mode: "read-only", available, catalog: PRIVATE_STUDY_READINGS.length }),
  );
} finally {
  db.close();
}
