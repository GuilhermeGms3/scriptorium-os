import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const [snapshotPath, pdfPath, output] = process.argv.slice(2);
if (!snapshotPath || !pdfPath || !output)
  throw new Error("Uso: export-commentary-layout <snapshot> <PDF original> <layout privado.json>");
const snapshot = z
  .object({
    checksum: z.string(),
    pages: z.array(z.object({ physicalPage: z.number(), text: z.string() })),
  })
  .parse(JSON.parse(readFileSync(snapshotPath, "utf8")) as unknown);
const bytes = readFileSync(pdfPath);
if (createHash("sha256").update(bytes).digest("hex") !== snapshot.checksum)
  throw new Error("PDF diverge do checksum do snapshot.");
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const directory = dirname(fileURLToPath(import.meta.resolve("pdfjs-dist/package.json")));
const task = pdfjs.getDocument({
  data: new Uint8Array(bytes),
  isEvalSupported: false,
  disableFontFace: true,
  standardFontDataUrl: `${join(directory, "standard_fonts")}/`,
  cMapUrl: `${join(directory, "cmaps")}/`,
  cMapPacked: true,
  wasmUrl: `${join(directory, "wasm")}/`,
});
const pages = [];
try {
  const pdf = await task.promise;
  if (pdf.numPages !== snapshot.pages.length) throw new Error("Contagem de páginas divergente.");
  for (const source of snapshot.pages) {
    const page = await pdf.getPage(source.physicalPage);
    const content = await page.getTextContent();
    const spans = [];
    let cursor = 0;
    let unmatched = 0;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const text = item.str.normalize("NFC").trim();
      if (!text) continue;
      const start = source.text.indexOf(text, cursor);
      if (start < 0) {
        unmatched++;
        continue;
      }
      const end = start + text.length;
      cursor = end;
      spans.push({
        startOffset: start,
        endOffset: end,
        family: content.styles[item.fontName]?.fontFamily ?? "unknown",
        x: item.transform[4],
        y: item.transform[5],
        height: item.height,
      });
    }
    pages.push({
      physicalPage: source.physicalPage,
      textChecksum: createHash("sha256").update(source.text).digest("hex"),
      unmatched,
      spans,
    });
    page.cleanup();
    if (source.physicalPage % 250 === 0)
      console.log(`Geometria: ${source.physicalPage}/${pdf.numPages}`);
  }
  writeFileSync(
    output,
    JSON.stringify({
      format: "scriptorium-commentary-layout-v1",
      sourceChecksum: snapshot.checksum,
      pages,
    }),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      pages: pages.length,
      pagesWithUnmatchedItems: pages.filter((page) => page.unmatched > 0).length,
      output,
    }),
  );
} finally {
  await task.destroy();
}
