import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { parseBiblicalReferences } from "../../src/lib/semantic-engine/biblical-reference-parser";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Uso: export-source-references <snapshot> <índice privado>");
const raw = readFileSync(input);
const source = z
  .object({
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    pages: z.array(z.object({ physicalPage: z.number().int().positive(), text: z.string() })),
  })
  .parse(JSON.parse(raw.toString("utf8")) as unknown);
writeFileSync(
  output,
  JSON.stringify({
    sourceChecksum: source.checksum,
    snapshotChecksum: createHash("sha256").update(raw).digest("hex"),
    pages: source.pages.map((page) => ({
      physicalPage: page.physicalPage,
      references: parseBiblicalReferences(page.text),
      // A calibrated reader may resolve the numbered note attached to its opening
      // lemma. Parse AFTER the footnote label so "1 João" is not misread as 1 John.
      footnotes: [...page.text.matchAll(/^(\d{1,4})[ \t]+([^\n]+)/gmu)].flatMap((line) =>
        parseBiblicalReferences(line[2]!).map((reference) => ({
          ...reference,
          footnoteLabel: line[1],
          startOffset: line.index + line[0].indexOf(line[2]!) + reference.startOffset,
          endOffset: line.index + line[0].indexOf(line[2]!) + reference.endOffset,
        })),
      ),
    })),
  }),
  { flag: "wx", mode: 0o600 },
);
console.log(JSON.stringify({ pages: source.pages.length, output }));
