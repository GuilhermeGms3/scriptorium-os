import { describe, expect, it } from "vitest";
import { parseUsfm } from "./ebible-usfm";

describe("eBible USFM reader", () => {
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

  it("drops word attributes without leaving a space before punctuation (KJV)", () => {
    const parsed = parseUsfm(String.raw`\id JHN
\c 1
\v 16 \w And|strong="G2532"\w* \w of|strong="G1537"\w* \w his|strong="G0846"\w* \w fulness|strong="G4138"\w* \w have|strong="G2983"\w* \w all|strong="G3956"\w* \w we|strong="G2249"\w* \w received|strong="G2983"\w*, \w and|strong="G2532"\w* \w grace|strong="G5485"\w* \add for\add* \w grace|strong="G5485"\w*.
\v 17 \wj \+w I|strong="G1473"\+w* \+w am|strong="G1510"\+w*\wj*: \nd LORD\nd*'s word.
`);
    expect(parsed.verses.map((verse) => verse.text)).toEqual([
      "And of his fulness have all we received, and grace for grace.",
      "I am: LORD's word.",
    ]);
  });

  it("closes red-letter words and footnotes against their punctuation (BPM)", () => {
    const parsed = parseUsfm(String.raw`\id MAT
\c 5
\v 44 Mas eu vos digo: \wj amai os vossos inimigos\wj*.
\v 45 Vale de Beraca\f + \fr 20:26 \ft “Beraca” significa “bênção”.\f*, pois ali.
\v 46 \wj deu o seu Filho unigênito\wj*\f + \fr 3:16 \ft Nota.\f* \wj , para que\wj*.
\v 47 Resaías,\f + \fr 5:8 \ft Ou: \fqa Enenis.\f*Eneneu, liberdade de Israel.\f + \fr 14:26 \fqa dele. \f*”
`);
    expect(parsed.verses.map((verse) => verse.text)).toEqual([
      "Mas eu vos digo: amai os vossos inimigos.",
      "Vale de Beraca, pois ali.",
      "deu o seu Filho unigênito, para que.",
      "Resaías, Eneneu, liberdade de Israel.”",
    ]);
  });
});
