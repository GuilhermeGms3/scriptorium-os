import { afterEach, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import {
  MobileManifestSchema,
  fileHash,
  projectWorkspace,
  writeMobileArchive,
} from "./export-content";

const temporary: string[] = [];
afterEach(() =>
  temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "scriptorium-mobile-test-"));
  temporary.push(root);
  const source = new DatabaseSync(join(root, "source.sqlite3"));
  source.exec(`CREATE TABLE private_documents(id TEXT,source_id TEXT,title TEXT,language TEXT,checksum TEXT,page_count INTEGER);
    CREATE TABLE bibliographic_sources(id TEXT,rights_json TEXT,provenance_json TEXT);
    CREATE TABLE private_document_pages(id TEXT,document_id TEXT,page_index INTEGER,text TEXT);
    CREATE TABLE knowledge_proposals(id TEXT,document_id TEXT,semantic_unit_id TEXT,proposal_kind TEXT,payload_json TEXT,method TEXT,review_status TEXT);
    CREATE TABLE pipeline_decisions(proposal_id TEXT,publication TEXT);
    CREATE TABLE semantic_unit_spans(unit_id TEXT,page_id TEXT,start_offset INTEGER,end_offset INTEGER,ordinal INTEGER);
    CREATE TABLE knowledge_trace_events(id TEXT,proposal_id TEXT,event_kind TEXT,occurred_at TEXT,state_json TEXT);
    INSERT INTO private_documents VALUES('DEMO:doc','DEMO:source','DEMO fonte','pt','${"a".repeat(64)}',1);
    INSERT INTO bibliographic_sources VALUES('DEMO:source','{"redistributionAllowed":false}','{"origin":"DEMO"}');
    INSERT INTO private_document_pages VALUES('DEMO:page','DEMO:doc',0,'DEMO comentário verificável na página.');`);
  const payload = JSON.stringify({
    kind: "passage-relation",
    rawReference: "Gn 1:1",
    relationType: "discusses",
    relationScope: "verse",
    passage: {
      workId: "work:genesis",
      bookId: "genesis",
      chapter: 1,
      verseStart: 1,
      versificationSchemeId: "scriptorium-bcv-1",
    },
    contextualAnalysis: {
      title: "DEMO nota contextual",
      summary: "DEMO comentário verificável na página.",
      rationale: "DEMO associação explicitamente documentada para teste.",
      contentType: "source-commentary",
      limitations: [],
    },
  });
  for (const [id, status, publication] of [
    ["accepted", "accepted", null],
    ["visible", "machine-proposed", "machine-visible"],
    ["pending", "machine-proposed", null],
    ["rejected", "rejected", null],
    ["revoked", "accepted", "revoked"],
    ["withheld", "accepted", "withheld"],
  ]) {
    source
      .prepare(
        "INSERT INTO knowledge_proposals VALUES(?,'DEMO:doc','DEMO:unit','passage-relation',?,'DEMO:method',?)",
      )
      .run(id!, payload, status!);
    if (publication)
      source.prepare("INSERT INTO pipeline_decisions VALUES(?,?)").run(id!, publication);
    source
      .prepare(
        "INSERT INTO knowledge_trace_events VALUES(?,?,'registered','2026-10-18T00:00:00Z','{}')",
      )
      .run(`DEMO:event:${id}`, id!);
  }
  source.exec("INSERT INTO semantic_unit_spans VALUES('DEMO:unit','DEMO:page',0,35,0)");
  const output = new DatabaseSync(join(root, "content.sqlite3"));
  return { root, source, output };
}
it("exports only publishable contextual comments, preserving source IDs, scheme, offsets, rights and trace", () => {
  const { source, output } = fixture();
  try {
    expect(projectWorkspace(source, output)).toEqual({ documents: 1, comments: 2, pages: 1 });
    expect(
      output
        .prepare("SELECT id FROM comments ORDER BY id")
        .all()
        .map((row) => row["id"]),
    ).toEqual(["accepted", "visible"]);
    expect(output.prepare("SELECT scheme_id FROM targets LIMIT 1").get()?.["scheme_id"]).toBe(
      "scriptorium-bcv-1",
    );
    expect(output.prepare("SELECT page_id FROM spans LIMIT 1").get()?.["page_id"]).toBe(
      "DEMO:page",
    );
    expect(output.prepare("SELECT count(*) n FROM trace").get()?.["n"]).toBe(2);
    expect(
      output.prepare("SELECT page_id FROM pages_fts WHERE pages_fts MATCH ?").get('"comentario"')?.[
        "page_id"
      ],
    ).toBe("DEMO:page");
    expect(output.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(output.prepare("PRAGMA user_version").get()?.["user_version"]).toBe(2);
    expect(
      output.prepare("SELECT count(*) n FROM reading_catalog WHERE kind='guide'").get()?.["n"],
    ).toBe(16);
    expect(
      output.prepare("SELECT count(*) n FROM reading_catalog WHERE kind='lesson'").get()?.["n"],
    ).toBe(111);
    const lesson = output
      .prepare("SELECT title,payload_json FROM reading_catalog WHERE id=?")
      .get("lesson:doctrine:trinity");
    expect(lesson?.["title"]).toBe("Trindade");
    expect(JSON.parse(String(lesson?.["payload_json"])).chapters[0].title).toBe("Trindade");
    expect(
      output.prepare("SELECT count(*) n FROM reading_catalog WHERE kind='course'").get()?.["n"],
    ).toBe(1);
    expect(source.prepare("SELECT count(*) n FROM knowledge_proposals").get()?.["n"]).toBe(6);
  } finally {
    source.close();
    output.close();
  }
});
it("writes manifest-first archives and omits unchanged files from patches", () => {
  const { root, source, output } = fixture();
  try {
    projectWorkspace(source, output);
  } finally {
    source.close();
    output.close();
  }
  const path = join(root, "content.sqlite3");
  const manifest = MobileManifestSchema.parse({
    format: "scriptorium-mobile-v1",
    schemaVersion: 1,
    id: "a".repeat(64),
    createdAt: "2026-10-18T00:00:00Z",
    privateUseOnly: true,
    editions: [{ id: "DEMO", title: "DEMO", path: "corpus/demo.sqlite3" }],
    files: [{ path: "content.sqlite3", sha256: fileHash(path), size: readFileSync(path).length }],
  });
  const full = join(root, "full.scriptorium");
  writeMobileArchive(full, manifest, new Map([["content.sqlite3", path]]));
  const unzipped = unzipSync(readFileSync(full));
  // Streaming Android/Java ZIP readers require DEFLATE when lengths arrive in a data descriptor.
  expect(readFileSync(full).readUInt16LE(8)).toBe(8);
  expect(Object.keys(unzipped)).toEqual(["manifest.json", "content.sqlite3"]);
  expect(JSON.parse(strFromU8(unzipped["manifest.json"]!))).toEqual(manifest);
  const patch = join(root, "patch.scriptorium");
  writeMobileArchive(
    patch,
    { ...manifest, id: "b".repeat(64), baseId: manifest.id },
    new Map([["content.sqlite3", path]]),
    manifest,
  );
  expect(Object.keys(unzipSync(readFileSync(patch)))).toEqual(["manifest.json"]);
});
