import { describe, expect, it } from "vitest";
import { parseUsfm } from "./import-ebible-bpm";

describe("eBible BPM USFM importer", () => {
  it("keeps verse ranges and removes footnotes from scripture text", () => {
    const parsed = parseUsfm(String.raw`\id TST
\c 1
\p
\v 1 Texto principal\f + \fr 1:1 \ft Nota editorial. \f* continua.
\v 2-3 Unidade combinada.
`);
    expect(parsed.notes).toBe(1);
    expect(parsed.verses).toEqual([
      { chapter: 1, verseStart: 1, verseEnd: 1, text: "Texto principal continua." },
      { chapter: 1, verseStart: 2, verseEnd: 3, text: "Unidade combinada." },
    ]);
  });
});
