import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { WorkspaceLock } from "../../src/lib/workspace-runtime/workspace-lock.server";
import { applyWorkspaceMigrations } from "../database/workspace-migrate";
import { reuseImportBackup } from "./reuse-import-backup";
import { PrivateVerseSchema } from "../../src/lib/repositories/private-scripture-repository";

const [path, stage, mode] = process.argv.slice(2);
if (!path || !stage || !["--runtime-stopped", "--verify"].includes(mode ?? ""))
  throw Error(
    "Uso: import-private-scripture <workspace> <staging> --runtime-stopped|--verify --reuse-backup <snapshot>",
  );
if (!existsSync(path)) throw Error("Workspace ausente; nenhum banco criado.");
const verify = mode === "--verify";
const lock = verify ? undefined : WorkspaceLock.acquire(dirname(resolve(path)));
let db: DatabaseSync | undefined;
const editionSchema = z.object({
  id: z.string().startsWith("private:"),
  title: z.string().min(1),
  abbreviation: z.string().min(1),
  language: z.string(),
  editorialPosition: z.string().min(20),
});
try {
  if (!verify && !reuseImportBackup(path, process.argv))
    throw Error("Informe snapshot existente, sem novo backup pesado.");
  db = new DatabaseSync(path, { readOnly: verify });
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
  if (!verify) applyWorkspaceMigrations(db);
  let imported = 0,
    reused = 0;
  for (const file of readdirSync(stage)
    .filter((n) => /^[a-z0-9-]+-\d{4}\.json$/.test(n))
    .sort()) {
    lock?.assertOwned();
    const batch = z
      .object({ edition: editionSchema, units: z.array(PrivateVerseSchema).min(1).max(100) })
      .parse(JSON.parse(readFileSync(join(stage, file), "utf8")) as unknown);
    const excludedIndex = process.argv.indexOf("--exclude-editions");
    if (
      excludedIndex >= 0 &&
      (process.argv[excludedIndex + 1] ?? "").split(",").includes(batch.edition.id)
    )
      continue;
    const planned = [];
    for (const unit of batch.units) {
      if (unit.editionId !== batch.edition.id) throw Error("Edição divergente.");
      const textHash = createHash("sha256").update(unit.text).digest("hex");
      const old = db
        .prepare(
          "SELECT text_checksum,fragments_json,edition_id,document_id,book_id,chapter,verse,source_scheme,mapping_json FROM private_scripture_units WHERE id=?",
        )
        .get(unit.id);
      if (old) {
        if (
          old["text_checksum"] !== textHash ||
          old["fragments_json"] !== JSON.stringify(unit.fragments) ||
          old["edition_id"] !== unit.editionId ||
          old["document_id"] !== "private-document:" + unit.documentChecksum ||
          old["book_id"] !== unit.bookId ||
          old["chapter"] !== unit.chapter ||
          old["verse"] !== unit.verse ||
          old["source_scheme"] !== unit.sourceScheme ||
          old["mapping_json"] !== JSON.stringify(unit.mapping)
        )
          throw Error("Unidade alterada; revisão preservada.");
        reused++;
        continue;
      }
      if (verify) throw Error("Lote exige escrita.");
      for (const f of unit.fragments) {
        const page = db
          .prepare("SELECT text FROM private_document_pages WHERE document_id=? AND page_index=?")
          .get("private-document:" + unit.documentChecksum, f.physicalPage - 1);
        if (
          !page ||
          f.endOffset <= f.startOffset ||
          String(page["text"]).slice(f.startOffset, f.endOffset) !== f.quote
        )
          throw Error("Evidência literal/offset divergente.");
      }
      if (unit.text !== unit.fragments.map((f) => f.quote).join(" "))
        throw Error("Texto não corresponde às evidências.");
      planned.push({ unit, textHash });
    }
    if (!planned.length) continue;
    db.exec("BEGIN IMMEDIATE");
    try {
      const e = batch.edition;
      db.prepare(
        "INSERT INTO private_scripture_editions VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
      ).run(
        e.id,
        e.title,
        e.abbreviation,
        e.language,
        e.editorialPosition,
        new Date().toISOString(),
      );
      const insert = db.prepare(
        "INSERT INTO private_scripture_units VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      );
      for (const { unit: u, textHash } of planned)
        insert.run(
          u.id,
          u.editionId,
          "private-document:" + u.documentChecksum,
          u.sequence,
          u.bookId,
          u.chapter,
          u.verse,
          u.sourceScheme,
          JSON.stringify(u.mapping),
          u.text,
          textHash,
          JSON.stringify(u.fragments),
        );
      db.exec("COMMIT");
      imported += planned.length;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  console.log(JSON.stringify({ imported, reused, verify }));
  if (db.prepare("PRAGMA foreign_key_check").all().length) throw Error("FK inválida.");
} finally {
  db?.close();
  lock?.release();
}
