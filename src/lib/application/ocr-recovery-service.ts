import { z } from "zod";
import { OcrPageSchema } from "../semantic-engine/local-pipeline-client";
import { sha256Hex } from "../workspace-runtime/secure-context";
import type { WorkspaceDatabase } from "../workspace-runtime/protocol";

export const OcrRecoveryPageSchema = z.object({
  format: z.literal("scriptorium-ocr-page-v1"),
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  physicalPage: z.number().int().positive().max(5000),
  textChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  result: OcrPageSchema,
});

/** A successful empty attempt is not unprocessed, nor does it count as recovered text. */
export async function ocrRecoveryCoverage(documentId: string, db: WorkspaceDatabase) {
  const row = (
    await db.query(
      `SELECT count(*) total,
    sum(CASE WHEN p.text<>'' THEN 1 ELSE 0 END) with_text,
    sum(CASE WHEN p.text<>'' OR (l.method='tesseract-tsv' AND l.revision LIKE '%;tsv-literal-v1') THEN 1 ELSE 0 END) covered
    FROM private_document_pages p LEFT JOIN document_page_layouts l ON l.page_id=p.id
    WHERE p.document_id=?`,
      [documentId],
    )
  )[0];
  const total = Number(row?.["total"] ?? 0),
    withText = Number(row?.["with_text"] ?? 0);
  const covered = Number(row?.["covered"] ?? 0);
  return {
    total,
    withText,
    covered,
    emptyAttempts: covered - withText,
    complete: total > 0 && covered === total,
  };
}

/** Backfill empty pages only. Existing anchors, text and human revisions are never rewritten. */
export async function importOcrRecoveryPage(
  raw: string,
  db: WorkspaceDatabase,
  modelRevision: string,
): Promise<"imported" | "reused"> {
  if (new TextEncoder().encode(raw).byteLength > 4 * 1024 * 1024)
    throw Error("Página OCR excede 4 MiB.");
  const page = OcrRecoveryPageSchema.parse(JSON.parse(raw) as unknown);
  if (page.result.method !== "tesseract-tsv" || !page.result.revision.endsWith(";tsv-literal-v1"))
    throw Error("Receita OCR não suportada; reexecute com o parser TSV corrigido.");
  if ((await sha256Hex(page.result.text)) !== page.textChecksum)
    throw Error("Checksum do texto OCR divergente.");
  let previous = 0;
  for (const block of page.result.blocks) {
    if (
      block.startOffset < previous ||
      block.endOffset <= block.startOffset ||
      block.endOffset > page.result.text.length ||
      block.bbox[2] < block.bbox[0] ||
      block.bbox[3] < block.bbox[1]
    )
      throw Error("Layout OCR inválido.");
    previous = block.endOffset;
  }
  if (page.result.text.trim() && !page.result.blocks.length)
    throw Error("Texto OCR sem layout citável.");
  const stored = (
    await db.query(
      `SELECT p.id,p.document_id,p.text,p.extraction_method,l.source_checksum,l.method,l.revision,l.layout_json
     FROM private_document_pages p JOIN private_documents d ON d.id=p.document_id
     LEFT JOIN document_page_layouts l ON l.page_id=p.id WHERE d.checksum=? AND p.page_index=?`,
      [page.sourceChecksum, page.physicalPage - 1],
    )
  )[0];
  if (!stored) throw Error("Edição ou página OCR não instalada.");
  const layout = JSON.stringify({
    coordinateSpace: "normalized-top-left",
    blocks: page.result.blocks,
    modelRevision,
  });
  if (
    stored["text"] === page.result.text &&
    stored["extraction_method"] === "ocr" &&
    stored["source_checksum"] === page.sourceChecksum &&
    stored["method"] === page.result.method &&
    stored["revision"] === page.result.revision &&
    stored["layout_json"] === layout
  )
    return "reused";
  if (stored["text"] !== "") throw Error("Página já contém texto; OCR não pode substituí-lo.");
  if (
    (await db.query("SELECT 1 FROM semantic_unit_spans WHERE page_id=? LIMIT 1", [stored["id"]!]))
      .length
  )
    throw Error("Página possui âncoras; evidência anterior preservada.");
  const marker = await sha256Hex(raw);
  const quality = JSON.stringify({
    hasText: Boolean(page.result.text.trim()),
    itemCount: page.result.blocks.length,
    machineExtracted: true,
    ocrReceipt: marker,
    emptyCandidate: !page.result.text.trim(),
  });
  await db.transaction([
    {
      sql: `UPDATE private_document_pages SET text=?,character_count=?,extraction_method='ocr',quality_json=?
      WHERE id=? AND text='' AND NOT EXISTS(SELECT 1 FROM semantic_unit_spans WHERE page_id=?)`,
      bind: [page.result.text, page.result.text.length, quality, stored["id"]!, stored["id"]!],
    },
    {
      sql: `INSERT INTO document_page_layouts(page_id,source_checksum,method,revision,layout_json,updated_at)
      SELECT id,?,?,?,?,? FROM private_document_pages WHERE id=? AND quality_json=?
      ON CONFLICT(page_id) DO UPDATE SET source_checksum=excluded.source_checksum,method=excluded.method,
      revision=excluded.revision,layout_json=excluded.layout_json,updated_at=excluded.updated_at`,
      bind: [
        page.sourceChecksum,
        page.result.method,
        page.result.revision,
        layout,
        new Date().toISOString(),
        stored["id"]!,
        quality,
      ],
    },
    {
      sql: `UPDATE private_documents SET text_page_count=(SELECT count(*) FROM private_document_pages WHERE document_id=? AND text<>''),extraction_method='mixed' WHERE id=?`,
      bind: [stored["document_id"]!, stored["document_id"]!],
    },
    {
      sql: "UPDATE document_knowledge_indexes SET status='failed',error='OCR acrescentou texto; reconstrua a análise preservando revisões.' WHERE document_id=?",
      bind: [stored["document_id"]!],
    },
    { sql: "DELETE FROM pipeline_jobs WHERE document_id=?", bind: [stored["document_id"]!] },
  ]);
  const written = (
    await db.query("SELECT text,quality_json FROM private_document_pages WHERE id=?", [
      stored["id"]!,
    ])
  )[0];
  if (written?.["text"] !== page.result.text || written["quality_json"] !== quality)
    throw Error("Página mudou durante a publicação; OCR não substituiu a versão concorrente.");
  return "imported";
}
