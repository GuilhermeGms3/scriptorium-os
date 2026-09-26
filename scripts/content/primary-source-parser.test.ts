import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseApostolicFathers,
  parseAquinasSummaPart,
  parseAugustineConfessions,
  parseCopticGospelOfThomas,
  parseConfessionalDocuments,
  parseDidache,
  parseOrigenCommentaryOnJohn,
} from "./primary-source-parser";

const root = resolve(import.meta.dirname, "../..");
const source = (folder: string, file: string) =>
  readFileSync(resolve(root, "corpora/source/primary-sources", folder, file), "utf8");

describe("primary-source parsing", () => {
  it("imports all sixteen Didache chapters without editorial introduction", () => {
    const work = parseDidache(source("gutenberg-42053", "pg42053.txt"));
    expect(work.units).toHaveLength(16);
    expect(work.units[0]?.text).toContain("Two ways there are");
    expect(work.units[15]?.section).toBe("16");
    expect(work.units.some((unit) => unit.text.includes("Greek text"))).toBe(false);
  });

  it("imports six complete Apostolic Fathers works with stable unique locators", () => {
    const works = parseApostolicFathers(source("gutenberg-77576", "pg77576.txt"));
    expect(works).toHaveLength(6);
    expect(works.map((work) => work.id)).toContain("work:first-clement");
    expect(works.find((work) => work.id === "work:first-clement")!.units.length).toBeGreaterThan(
      50,
    );
    const ids = works.flatMap((work) => work.units.map((unit) => unit.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      works.flatMap((work) => work.units).some((unit) => /Footnote \d+:/.test(unit.text)),
    ).toBe(false);
  });

  it("keeps five confessional documents distinct, including both Nicene forms", () => {
    const works = parseConfessionalDocuments(
      source("gutenberg-30323", "pg30323.txt"),
      source("gutenberg-24979", "pg24979.txt"),
    );
    expect(works).toHaveLength(5);
    expect(works.map((work) => work.id)).toEqual(
      expect.arrayContaining(["work:nicene-creed-325", "work:nicene-constantinopolitan-western"]),
    );
    expect(works.every((work) => work.units.length > 0)).toBe(true);
  });

  it("imports Origen's first two books with stable book-and-section locators", () => {
    const work = parseOrigenCommentaryOnJohn(
      source("archive-cu31924029220535", "cu31924029220535_djvu.txt"),
    );
    expect(work.id).toBe("work:origen-commentary-john-books-1-2");
    expect(work.units.length).toBeGreaterThan(60);
    expect(work.units[0]?.section).toBe("I.1");
    expect(work.units.some((unit) => unit.section === "II.2")).toBe(true);
    expect(work.units.find((unit) => unit.section === "II.2")?.text).toContain("article");
    expect(new Set(work.units.map((unit) => unit.id)).size).toBe(work.units.length);
    expect(work.units.some((unit) => unit.text.includes("ORIGEN'S COMMENTARY ON JOHN"))).toBe(
      false,
    );
  });

  it("imports the open Coptic Gospel of Thomas as prologue, 114 sayings and colophon", () => {
    const work = parseCopticGospelOfThomas(
      source("coptic-scriptorium-thomas", "thomas_gospel.xml"),
    );
    expect(work.language).toBe("cop");
    expect(work.units).toHaveLength(116);
    expect(work.units[0]?.section).toBe("Prólogo");
    expect(work.units.at(-2)?.section).toBe("114");
    expect(work.units.at(-1)?.section).toBe("Colofão");
    expect(work.units[1]?.text).toMatch(/[ⲁ-⳿]/u);
  });

  it("imports all thirteen books of Augustine's Confessions", () => {
    const work = parseAugustineConfessions(source("gutenberg-3296", "pg3296.txt"));
    expect(work.units).toHaveLength(13);
    expect(work.units[0]?.section).toBe("I");
    expect(work.units.at(-1)?.section).toBe("XIII");
    expect(new Set(work.units.map((unit) => unit.id)).size).toBe(work.units.length);
  });

  it("imports the four public-domain English Summa parts as addressable articles", () => {
    const definitions = [
      ["gutenberg-17611", "pg17611.txt", "prima-pars", "source:gutenberg:17611"],
      ["gutenberg-17897", "pg17897.txt", "prima-secundae", "source:gutenberg:17897"],
      ["gutenberg-18755", "pg18755.txt", "secunda-secundae", "source:gutenberg:18755"],
      ["gutenberg-19950", "pg19950.txt", "tertia-pars", "source:gutenberg:19950"],
    ] as const;
    const works = definitions.map(([folder, file, part, sourceId]) =>
      parseAquinasSummaPart(source(folder, file), part, sourceId),
    );
    expect(works).toHaveLength(4);
    expect(works.every((work) => work.units.length > 300)).toBe(true);
    expect(works[0]?.units[0]?.section).toBe("I, Q. 1, Art. 1");
    expect(
      works.every((work) => new Set(work.units.map((unit) => unit.id)).size === work.units.length),
    ).toBe(true);
    expect(
      works.flatMap((work) => work.units).some((unit) => unit.text.includes("Objection")),
    ).toBe(true);
  });
});
