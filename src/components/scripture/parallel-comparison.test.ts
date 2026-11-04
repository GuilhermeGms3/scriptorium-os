import { describe, expect, it } from "vitest";
import type { Edition } from "../../lib/domain/scripture";
import { initialComparison } from "./parallel-comparison";

const edition = (id: string, corpusId: string): Edition => ({
  id,
  corpusId,
  title: id,
  abbreviation: id,
  language: "pt-BR",
  kind: "translation",
});

const EDITIONS = [
  edition("blivre", "biblia-livre"),
  edition("bpm", "biblia-portuguesa-mundial"),
  edition("nbv", "nova-biblia-viva"),
  edition("kjv", "king-james-version"),
  edition("web", "world-english-bible"),
  edition("vulg", "vulgata-clementina"),
];

describe("versões comparadas no modo Paralelo", () => {
  it("starts with the edition being read, the Nova Bíblia Viva and the King James", () => {
    expect(initialComparison(EDITIONS, "blivre", null)).toEqual(["blivre", "nbv", "kjv"]);
    expect(initialComparison(EDITIONS, "web", null)).toEqual(["web", "nbv", "kjv"]);
  });

  it("keeps the reader's last choice, without editions this chapter does not have", () => {
    expect(initialComparison(EDITIONS, "blivre", ["vulg", "gone", "web"])).toEqual(["vulg", "web"]);
  });

  it("never compares more than four, and falls back when the defaults are missing", () => {
    const remembered = ["blivre", "bpm", "nbv", "kjv", "web"];
    expect(initialComparison(EDITIONS, "blivre", remembered)).toHaveLength(4);
    expect(initialComparison(EDITIONS.slice(0, 2), "bpm", null)).toEqual(["bpm", "blivre"]);
  });
});
