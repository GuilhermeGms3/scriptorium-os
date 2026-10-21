import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Zip, ZipDeflate } from "fflate";
import { z } from "zod";
import { KnowledgeProposalPayloadSchema } from "../../src/lib/domain/document-knowledge";
import { noteTargets } from "../../src/lib/domain/note-placement";
import { bookLabel } from "../../src/lib/i18n";
import { projectReadingExtras, writeReadingCatalog } from "./reading-catalog";

export const MobileManifestSchema = z.object({
  format: z.literal("scriptorium-mobile-v1"),
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-f0-9]{64}$/),
  baseId: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  createdAt: z.string().datetime(),
  privateUseOnly: z.literal(true),
  bookLabels: z.record(z.string().max(500)).default({}),
  files: z.array(
    z.object({
      path: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      size: z.number().int().positive(),
    }),
  ),
  editions: z.array(z.object({ id: z.string(), title: z.string(), path: z.string() })).min(1),
});
type Manifest = z.infer<typeof MobileManifestSchema>;
export function fileHash(path: string): string {
  const hash = createHash("sha256");
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(1024 * 1024);
    let n: number;
    while ((n = readSync(fd, buffer, 0, buffer.length, null))) hash.update(buffer.subarray(0, n));
  } finally {
    closeSync(fd);
  }
  return hash.digest("hex");
}

export const mobileSchema = `
PRAGMA foreign_keys=ON; PRAGMA user_version=1;
CREATE TABLE documents(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,title TEXT NOT NULL,language TEXT,checksum TEXT NOT NULL,pages INTEGER NOT NULL,rights_json TEXT NOT NULL,provenance_json TEXT NOT NULL);
CREATE TABLE pages(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES documents(id),page_index INTEGER NOT NULL,text TEXT NOT NULL,UNIQUE(document_id,page_index));
CREATE TABLE comments(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES documents(id),unit_id TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,rationale TEXT NOT NULL,mode TEXT NOT NULL,review_status TEXT NOT NULL,payload_json TEXT NOT NULL,method TEXT NOT NULL);
CREATE TABLE targets(comment_id TEXT NOT NULL REFERENCES comments(id),work_id TEXT NOT NULL,scheme_id TEXT NOT NULL,book_id TEXT NOT NULL,chapter INTEGER,verse_start INTEGER,verse_end INTEGER,PRIMARY KEY(comment_id,work_id,scheme_id,book_id,chapter,verse_start));
CREATE INDEX target_address ON targets(scheme_id,book_id,chapter,verse_start,verse_end);
CREATE TABLE spans(comment_id TEXT NOT NULL REFERENCES comments(id),page_id TEXT NOT NULL REFERENCES pages(id),start_offset INTEGER NOT NULL,end_offset INTEGER NOT NULL,ordinal INTEGER NOT NULL,PRIMARY KEY(comment_id,ordinal));
CREATE TABLE trace(id TEXT PRIMARY KEY,comment_id TEXT NOT NULL REFERENCES comments(id),event_kind TEXT NOT NULL,occurred_at TEXT NOT NULL,state_json TEXT NOT NULL);
CREATE INDEX trace_comment ON trace(comment_id,occurred_at);
CREATE VIRTUAL TABLE pages_fts USING fts5(page_id UNINDEXED,text,tokenize='unicode61 remove_diacritics 2');
`;

/** A read-only projection for consumption, never a restore of the pipeline or personal workspace. */
export function projectWorkspace(
  source: DatabaseSync,
  output: DatabaseSync,
): { documents: number; comments: number; pages: number } {
  output.exec(mobileSchema);
  const doc = output.prepare("INSERT INTO documents VALUES(?,?,?,?,?,?,?,?)");
  const page = output.prepare("INSERT INTO pages VALUES(?,?,?,?)");
  const fts = output.prepare("INSERT INTO pages_fts VALUES(?,?)");
  const comment = output.prepare("INSERT INTO comments VALUES(?,?,?,?,?,?,?,?,?,?)");
  const target = output.prepare("INSERT OR IGNORE INTO targets VALUES(?,?,?,?,?,?,?)");
  const span = output.prepare("INSERT INTO spans VALUES(?,?,?,?,?)");
  const trace = output.prepare("INSERT INTO trace VALUES(?,?,?,?,?)");
  const counts = { documents: 0, comments: 0, pages: 0 };
  source.exec("BEGIN");
  output.exec("BEGIN");
  try {
    for (const row of source
      .prepare(
        `SELECT d.*,b.rights_json,b.provenance_json FROM private_documents d
      JOIN bibliographic_sources b ON b.id=d.source_id ORDER BY d.id`,
      )
      .iterate()) {
      doc.run(
        row["id"]!,
        row["source_id"]!,
        row["title"]!,
        row["language"]!,
        row["checksum"]!,
        row["page_count"]!,
        row["rights_json"]!,
        row["provenance_json"]!,
      );
      counts.documents++;
    }
    for (const row of source
      .prepare(
        "SELECT id,document_id,page_index,text FROM private_document_pages ORDER BY document_id,page_index",
      )
      .iterate()) {
      page.run(row["id"]!, row["document_id"]!, row["page_index"]!, row["text"]!);
      fts.run(row["id"]!, row["text"]!);
      counts.pages++;
    }
    for (const row of source
      .prepare(
        `SELECT p.* FROM knowledge_proposals p LEFT JOIN pipeline_decisions d ON d.proposal_id=p.id
      WHERE p.proposal_kind='passage-relation' AND json_type(p.payload_json,'$.contextualAnalysis')='object'
      AND p.review_status!='rejected' AND (d.publication IS NULL OR d.publication NOT IN ('revoked','withheld','exception'))
      AND (p.review_status='accepted' OR d.publication='machine-visible') ORDER BY p.id`,
      )
      .iterate()) {
      const payload = KnowledgeProposalPayloadSchema.parse(
        JSON.parse(String(row["payload_json"])) as unknown,
      );
      if (payload.kind !== "passage-relation" || !payload.contextualAnalysis) continue;
      const analysis = payload.contextualAnalysis;
      comment.run(
        row["id"]!,
        row["document_id"]!,
        row["semantic_unit_id"]!,
        analysis.title,
        analysis.summary,
        analysis.rationale,
        analysis.mode ?? "assisted-synthesis",
        row["review_status"]!,
        row["payload_json"]!,
        row["method"]!,
      );
      // The same placement the site uses; Android only matches these rows.
      for (const place of noteTargets(payload)) {
        target.run(
          row["id"]!,
          place.workId,
          place.schemeId,
          place.bookId,
          place.chapter,
          place.verseStart,
          place.verseEnd,
        );
      }
      for (const evidence of source
        .prepare("SELECT * FROM semantic_unit_spans WHERE unit_id=? ORDER BY ordinal")
        .iterate(row["semantic_unit_id"]!)) {
        span.run(
          row["id"]!,
          evidence["page_id"]!,
          evidence["start_offset"]!,
          evidence["end_offset"]!,
          evidence["ordinal"]!,
        );
      }
      for (const event of source
        .prepare("SELECT * FROM knowledge_trace_events WHERE proposal_id=? ORDER BY occurred_at,id")
        .iterate(row["id"]!)) {
        trace.run(
          event["id"]!,
          row["id"]!,
          event["event_kind"]!,
          event["occurred_at"]!,
          event["state_json"]!,
        );
      }
      counts.comments++;
    }
    if (output.prepare("PRAGMA foreign_key_check").get())
      throw new Error("Projeção contém referências órfãs.");
    projectReadingExtras(source, output);
    output.exec("COMMIT");
    source.exec("COMMIT");
    return counts;
  } catch (error) {
    output.exec("ROLLBACK");
    source.exec("ROLLBACK");
    throw error;
  }
}

/** Streaming DEFLATE: Java ZipInputStream cannot consume STORED entries with data descriptors. */
export function writeMobileArchive(
  destination: string,
  manifest: Manifest,
  files: Map<string, string>,
  base?: Manifest,
): void {
  const fd = openSync(destination, "wx");
  const zip = new Zip((error, data) => {
    if (error) throw error;
    writeSync(fd, data);
  });
  try {
    const header = new ZipDeflate("manifest.json", { level: 1 });
    zip.add(header);
    header.push(Buffer.from(JSON.stringify(manifest)), true);
    for (const info of manifest.files) {
      if (
        base?.files.some(
          (old) => old.path === info.path && old.sha256 === info.sha256 && old.size === info.size,
        )
      )
        continue;
      const input = openSync(files.get(info.path)!, "r");
      try {
        const entry = new ZipDeflate(info.path, { level: 1 });
        zip.add(entry);
        const buffer = Buffer.alloc(1024 * 1024);
        let n: number;
        while ((n = readSync(input, buffer, 0, buffer.length, null)))
          entry.push(buffer.subarray(0, n));
        entry.push(new Uint8Array(), true);
      } finally {
        closeSync(input);
      }
    }
    zip.end();
  } finally {
    closeSync(fd);
  }
}

export function exportMobile(options: {
  root: string;
  output: string;
  workspace?: string;
  editions: string[];
  includePdfs?: boolean;
  semanticDirectory?: string;
  base?: string;
}): Manifest {
  const root = resolve(options.root);
  const output = resolve(options.output);
  // Require a fresh output directory; never overwrite an installed package or personal database.
  mkdirSync(output, { recursive: false });
  const files = new Map<string, string>();
  const registry = z
    .object({
      packages: z.array(z.object({ editionId: z.string(), title: z.string() }).passthrough()),
    })
    .parse(
      JSON.parse(
        readFileSync(join(root, "public/corpus-packages/registry.json"), "utf8"),
      ) as unknown,
    );
  const selected = options.editions.includes("all")
    ? registry.packages.map((edition) => edition.editionId)
    : options.editions;
  const editions = selected.map((id) => {
    const edition = registry.packages.find((item) => item.editionId === id);
    if (!edition || !/^[a-z0-9][a-z0-9.-]{0,160}$/.test(id))
      throw new Error(`Edição indisponível: ${id}`);
    const path = `corpus/${id}.sqlite3`;
    files.set(path, join(root, "public/corpus-packages", `${id}.sqlite3`));
    return { id, title: edition.title, path };
  });
  const contentPath = join(output, "content.sqlite3");
  const content = new DatabaseSync(contentPath);
  let counts = { documents: 0, comments: 0, pages: 0 };
  try {
    if (options.workspace) {
      const source = new DatabaseSync(resolve(options.workspace), { readOnly: true });
      try {
        counts = projectWorkspace(source, content);
        if (options.includePdfs)
          for (const row of source
            .prepare("SELECT checksum FROM private_documents ORDER BY checksum")
            .iterate()) {
            const hash = String(row["checksum"]);
            if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("Checksum de documento inválido.");
            const pdf = join(dirname(resolve(options.workspace)), "documents", `${hash}.pdf`);
            if (!existsSync(pdf) || fileHash(pdf) !== hash)
              throw new Error(`PDF ausente ou divergente: ${hash.slice(0, 12)}`);
            files.set(`documents/${hash}.pdf`, pdf);
          }
      } finally {
        source.close();
      }
    } else {
      content.exec(mobileSchema);
      writeReadingCatalog(content);
    }
  } finally {
    content.close();
  }
  files.set("content.sqlite3", contentPath);
  if (options.semanticDirectory) {
    const semantic = resolve(options.semanticDirectory);
    const config = z
      .object({
        recipe: z.literal("distiluse-onnx-dense-tanh-l2-96-v2"),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        vocabSha256: z.string().regex(/^[a-f0-9]{64}$/),
        tokenizerSha256: z.string().regex(/^[a-f0-9]{64}$/),
        denseSha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .passthrough()
      .parse(JSON.parse(readFileSync(join(semantic, "config.json"), "utf8")) as unknown);
    for (const [name, checksum] of [
      ["model.onnx", config.sha256],
      ["vocab.txt", config.vocabSha256],
      ["tokenizer.json", config.tokenizerSha256],
      ["dense.f32", config.denseSha256],
    ] as const) {
      if (fileHash(join(semantic, name)) !== checksum)
        throw new Error(`Artefato semântico divergente: ${name}`);
    }
    for (const name of [
      "model.onnx",
      "dense.f32",
      "vocab.txt",
      "config.json",
      "tokenizer.json",
      "index.sqlite3",
    ])
      files.set(`semantic/${name}`, join(semantic, name));
  }
  const knowledge = join(root, "public/knowledge/knowledge.sqlite3");
  if (existsSync(knowledge)) files.set("knowledge.sqlite3", knowledge);
  const entries = [...files]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, file]) => ({ path, sha256: fileHash(file), size: statSync(file).size }));
  const base = options.base
    ? MobileManifestSchema.parse(JSON.parse(readFileSync(options.base, "utf8")) as unknown)
    : undefined;
  const bookLabels: Record<string, string> = {};
  for (const edition of registry.packages.filter((item) => selected.includes(item.editionId))) {
    const works = z.array(z.string()).parse(edition["works"]);
    for (const work of works) {
      const id = work.replace(/^work:/, "");
      bookLabels[id] = bookLabel(id);
    }
  }
  const id = createHash("sha256")
    .update(JSON.stringify({ entries, editions, bookLabels, baseId: base?.id ?? null }))
    .digest("hex");
  const manifest = MobileManifestSchema.parse({
    format: "scriptorium-mobile-v1",
    schemaVersion: 1,
    id,
    ...(base ? { baseId: base.id } : {}),
    createdAt: new Date().toISOString(),
    privateUseOnly: true,
    bookLabels,
    files: entries,
    editions,
  });
  writeMobileArchive(join(output, "acervo.scriptorium"), manifest, files, base);
  writeFileSync(join(output, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(
    join(output, "report.json"),
    JSON.stringify(
      {
        ...counts,
        editions: editions.length,
        files: entries.length,
        bytes: statSync(join(output, "acervo.scriptorium")).size,
        privateUseOnly: true,
      },
      null,
      2,
    ),
  );
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const value = (key: string) => {
    const at = args.indexOf(key);
    return at >= 0 ? args[at + 1] : undefined;
  };
  const output = value("--output");
  if (!output)
    throw new Error(
      "Use --output <pasta-nova> [--workspace <workspace.sqlite3>] [--editions <id,id>] [--include-pdfs] [--base <manifest.json>].",
    );
  exportMobile({
    root: resolve(import.meta.dirname, "../.."),
    output,
    editions: (args.includes("--complete")
      ? "all"
      : (value("--editions") ?? "biblia-livre-n4-2025.1.0")
    ).split(","),
    ...(value("--workspace") ? { workspace: value("--workspace")! } : {}),
    ...(value("--base") ? { base: value("--base")! } : {}),
    includePdfs: args.includes("--complete") || args.includes("--include-pdfs"),
    ...(value("--semantic") ? { semanticDirectory: value("--semantic")! } : {}),
  });
  console.log(
    "Pacote privado gerado. Transfira acervo.scriptorium para o Android; não publique este arquivo.",
  );
}
