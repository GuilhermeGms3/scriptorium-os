import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { ExtractedPrivateDocumentSchema } from "../../src/lib/domain/private-document";
import { PrivateDocumentRepository } from "../../src/lib/repositories/private-document-repository";
import { WorkspaceLock } from "../../src/lib/workspace-runtime/workspace-lock.server";
import type { WorkspaceDatabase, WorkspaceRow } from "../../src/lib/workspace-runtime/protocol";
import { reuseImportBackup } from "./reuse-import-backup";
const [path, stage] = process.argv.slice(2);
if (!path || !stage) throw Error("Informe workspace e staging Anchor.");
const lock = WorkspaceLock.acquire(dirname(resolve(path)));
let native: DatabaseSync | undefined;
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
try {
  if (!reuseImportBackup(path, process.argv))
    throw Error("Reutilize snapshot existente explicitamente.");
  const derivation = z
    .object({
      source: z.string(),
      sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
      derivative: z.string(),
      derivativeChecksum: z.string().regex(/^[a-f0-9]{64}$/),
      recipe: z.literal("epub-spine-text-v1"),
    })
    .parse(JSON.parse(readFileSync(join(stage, "derivation.json"), "utf8")) as unknown);
  const document = ExtractedPrivateDocumentSchema.parse(
    JSON.parse(readFileSync(join(stage, "document.json"), "utf8")) as unknown,
  );
  if (
    document.checksum !== derivation.derivativeChecksum ||
    hash(derivation.source) !== derivation.sourceChecksum ||
    hash(derivation.derivative) !== document.checksum
  )
    throw Error("Cadeia de custódia divergente.");
  const root = dirname(resolve(path));
  mkdirSync(join(root, "originals"), { recursive: true });
  mkdirSync(join(root, "documents"), { recursive: true });
  const copies: [string, string, string][] = [
    [
      derivation.source,
      join(root, "originals", derivation.sourceChecksum + ".epub"),
      derivation.sourceChecksum,
    ],
    [derivation.derivative, join(root, "documents", document.checksum + ".pdf"), document.checksum],
  ];
  for (const [source, dest, digest] of copies) {
    if (!existsSync(dest)) copyFileSync(source, dest);
    if (hash(dest) !== digest) throw Error("Cópia privada divergente.");
  }
  native = new DatabaseSync(path);
  native.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
  const db = native;
  const adapter: WorkspaceDatabase = {
    persistence: "installation",
    query: async (s, b = []) => {
      lock.assertOwned();
      return db.prepare(s).all(...b) as WorkspaceRow[];
    },
    execute: async (s, b = []) => {
      lock.assertOwned();
      db.prepare(s).run(...b);
    },
    transaction: async (statements) => {
      lock.assertOwned();
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const s of statements) db.prepare(s.sql).run(...(s.bind ?? []));
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    reset: async () => {
      throw Error("Sem reset");
    },
  };
  const imported = await PrivateDocumentRepository.importDocument(
    document,
    "installation:/documents/" + document.checksum + ".pdf",
    adapter,
  );
  await adapter.transaction([
    {
      sql: "INSERT OR IGNORE INTO source_assets(id,source_id,storage_reference,mime_type,size_bytes,checksum,original_name,imported_at) VALUES(?,?,?,?,?,?,?,?)",
      bind: [
        "asset:epub:" + derivation.sourceChecksum,
        imported.document.sourceId,
        "installation:/originals/" + derivation.sourceChecksum + ".epub",
        "application/epub+zip",
        readFileSync(derivation.source).length,
        derivation.sourceChecksum,
        "Anchor Bible Dictionary (6 Volumes).epub",
        new Date().toISOString(),
      ],
    },
    {
      sql: "UPDATE bibliographic_sources SET provenance_json=json_set(provenance_json,'$.originalEpubChecksum',?,'$.derivationRecipe',?,'$.pageMeaning',?) WHERE id=?",
      bind: [
        derivation.sourceChecksum,
        derivation.recipe,
        "Itens XHTML do EPUB; não paginação impressa.",
        imported.document.sourceId,
      ],
    },
  ]);
  console.log(
    JSON.stringify({
      documentId: imported.document.id,
      pages: document.pageCount,
      duplicate: imported.duplicate,
    }),
  );
} finally {
  native?.close();
  lock.release();
}
