import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/protocol";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { sha256Hex } from "../workspace-runtime/secure-context";
import { importOcrRecoveryPage, ocrRecoveryCoverage } from "./ocr-recovery-service";

const opened: DatabaseSync[] = [];
afterEach(() => {
  for (const db of opened.splice(0)) db.close();
});
async function fixture() {
  const native = new DatabaseSync(":memory:");
  opened.push(native);
  applyWorkspaceMigrations(native);
  const db: WorkspaceDatabase = {
    persistence: "memory",
    query: async (sql, bind = []) => native.prepare(sql).all(...bind) as WorkspaceRow[],
    execute: async (sql, bind = []) => {
      native.prepare(sql).run(...bind);
    },
    transaction: async (statements) => {
      native.exec("BEGIN");
      try {
        for (const s of statements) native.prepare(s.sql).run(...(s.bind ?? []));
        native.exec("COMMIT");
      } catch (e) {
        native.exec("ROLLBACK");
        throw e;
      }
    },
    reset: async () => {
      throw Error("No reset");
    },
  };
  const checksum = "a".repeat(64);
  const { document } = await PrivateDocumentRepository.importDocument(
    {
      title: "Documento sintético OCR",
      originalName: "fixture.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      checksum,
      language: "pt-BR",
      pageCount: 1,
      textPageCount: 0,
      extractionMethod: "pdf-text-layer",
      pages: [{ pageIndex: 0, pageLabel: "1", text: "", itemCount: 0 }],
    },
    "opfs:/fixture",
    db,
  );
  const text = "😀 Texto sintético de OCR para conferir a integridade da página.";
  const payload = {
    format: "scriptorium-ocr-page-v1",
    sourceChecksum: checksum,
    physicalPage: 1,
    textChecksum: await sha256Hex(text),
    result: {
      text,
      method: "tesseract-tsv",
      revision: "fixture;psm=1;tsv-literal-v1",
      blocks: [
        { startOffset: 0, endOffset: text.length, bbox: [0.1, 0.1, 0.9, 0.3], kind: "line" },
      ],
    },
  };
  return { native, db, document, payload };
}
it("backfills text and layout atomically, updates FTS and preserves stable page identity", async () => {
  const { native, db, document, payload } = await fixture();
  const before = native.prepare("SELECT id FROM private_document_pages").get();
  expect(await importOcrRecoveryPage(JSON.stringify(payload), db, "models-v1")).toBe("imported");
  expect(
    native.prepare("SELECT id,text,extraction_method FROM private_document_pages").get(),
  ).toEqual({ ...before, text: payload.result.text, extraction_method: "ocr" });
  expect(
    native.prepare("SELECT text_page_count FROM private_documents WHERE id=?").get(document.id)?.[
      "text_page_count"
    ],
  ).toBe(1);
  expect(
    native
      .prepare(
        "SELECT count(*) n FROM private_document_pages_fts WHERE private_document_pages_fts MATCH ?",
      )
      .get("sintético")?.["n"],
  ).toBe(1);
  expect(native.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(await importOcrRecoveryPage(JSON.stringify(payload), db, "models-v1")).toBe("reused");
});
it("never replaces preexisting text even when an OCR result is plausible", async () => {
  const { native, db, payload } = await fixture();
  native.exec("UPDATE private_document_pages SET text='Evidência preservada'");
  await expect(importOcrRecoveryPage(JSON.stringify(payload), db, "v1")).rejects.toThrow(
    "substituí",
  );
  expect(native.prepare("SELECT count(*) n FROM document_page_layouts").get()?.["n"]).toBe(0);
});
it("refuses pages already used by semantic anchors", async () => {
  const { native, db, document, payload } = await fixture();
  native
    .prepare(
      "INSERT INTO semantic_units(id,document_id,unit_kind,ordinal,text_checksum,language,method) VALUES('anchored',?,'paragraph',0,?,'pt','fixture')",
    )
    .run(document.id, "b".repeat(64));
  native.exec(
    "INSERT INTO semantic_unit_spans(unit_id,page_id,page_index,start_offset,end_offset,ordinal) SELECT 'anchored',id,0,0,1,0 FROM private_document_pages",
  );
  await expect(importOcrRecoveryPage(JSON.stringify(payload), db, "v1")).rejects.toThrow("âncoras");
  expect(native.prepare("SELECT text FROM private_document_pages").get()?.["text"]).toBe("");
});
it("rejects a wrong edition, hash, out-of-bounds UTF16 span or reversed rectangle", async () => {
  const { native, db, payload } = await fixture();
  for (const patch of [
    { result: { ...payload.result, revision: "old-parser" } },
    { sourceChecksum: "b".repeat(64) },
    { textChecksum: "b".repeat(64) },
    { physicalPage: 2 },
  ])
    await expect(
      importOcrRecoveryPage(JSON.stringify({ ...payload, ...patch }), db, "v1"),
    ).rejects.toThrow();
  for (const block of [
    { ...payload.result.blocks[0], endOffset: 999 },
    { ...payload.result.blocks[0], bbox: [0.9, 0.2, 0.1, 0.5] },
  ])
    await expect(
      importOcrRecoveryPage(
        JSON.stringify({ ...payload, result: { ...payload.result, blocks: [block] } }),
        db,
        "v1",
      ),
    ).rejects.toThrow();
  expect(native.prepare("SELECT count(*) n FROM document_page_layouts").get()?.["n"]).toBe(0);
});
it("records an empty OCR attempt without pretending the page has extracted text", async () => {
  const { native, db, payload } = await fixture();
  const blank = {
    ...payload,
    textChecksum: await sha256Hex(""),
    result: { ...payload.result, text: "", blocks: [] },
  };
  expect(await importOcrRecoveryPage(JSON.stringify(blank), db, "v1")).toBe("imported");
  expect(
    native.prepare("SELECT text_page_count FROM private_documents").get()?.["text_page_count"],
  ).toBe(0);
  expect(await importOcrRecoveryPage(JSON.stringify(blank), db, "v1")).toBe("reused");
  const document = native.prepare("SELECT id FROM private_documents LIMIT 1").get();
  expect(await ocrRecoveryCoverage(String(document?.["id"]), db)).toEqual({
    total: 1,
    withText: 0,
    covered: 1,
    emptyAttempts: 1,
    complete: true,
  });
});
