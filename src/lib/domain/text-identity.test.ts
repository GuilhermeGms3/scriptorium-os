import { describe, expect, it } from "vitest";
import {
  CrosswalkRelationSchema,
  PassageAddressSchema,
  addressesOverlapDirectly,
  anchorsOverlapDirectly,
  anchorsOverlapViaCrosswalk,
  deterministicTextUnitId,
  textAnchorKey,
  type CrosswalkRelation,
  type TextAnchor,
} from "./text-identity";

const passage = (scheme: string, verseStart: number, verseEnd = verseStart): TextAnchor => ({
  kind: "passage",
  workId: "work:john",
  versificationSchemeId: scheme,
  passage: {
    workId: "work:john",
    versificationSchemeId: scheme,
    bookId: "john",
    chapter: 1,
    verseStart,
    verseEnd,
  },
});

describe("text identity", () => {
  it("distinguishes internal identity from a human address", () => {
    expect(
      deterministicTextUnitId({
        corpusId: "sblgnt",
        editionId: "1.2",
        workId: "work:john",
        sequence: 1001,
      }),
    ).toBe("textunit:sblgnt:1.2:work%3Ajohn:00001001");
  });
  it("distinguishes corpus, edition, work and scheme in anchor keys", () => {
    const first = { ...passage("mt", 1), corpusId: "mt", editionId: "bhs" };
    const second = { ...passage("lxx", 1), corpusId: "lxx", editionId: "rahlfs" };
    expect(textAnchorKey(first)).not.toBe(textAnchorKey(second));
  });
  it("overlaps ranges only inside one scheme", () => {
    expect(anchorsOverlapDirectly(passage("mt", 1, 3), passage("mt", 2))).toBe(true);
    expect(anchorsOverlapDirectly(passage("mt", 1), passage("lxx", 1))).toBe(false);
  });
  it("handles subverses without equating distinct parts", () => {
    const a = {
      workId: "work:psalms",
      versificationSchemeId: "mt",
      bookId: "psalms",
      chapter: 1,
      verseStart: 1,
      subverseStart: "a",
    };
    const b = { ...a, subverseStart: "b" };
    expect(addressesOverlapDirectly(a, b)).toBe(false);
  });
  it("supports non-biblical addresses", () => {
    expect(
      PassageAddressSchema.parse({
        workId: "work:gospel-thomas",
        versificationSchemeId: "nhc-sayings-1",
        saying: "1",
      }),
    ).toMatchObject({ saying: "1" });
  });
  it("rejects invalid reversed ranges", () => {
    expect(() =>
      PassageAddressSchema.parse({
        workId: "work:john",
        versificationSchemeId: "x",
        bookId: "john",
        chapter: 1,
        verseStart: 3,
        verseEnd: 1,
      }),
    ).toThrow();
  });
});

describe("explicit N:M crosswalk", () => {
  const relation = (
    sources: TextAnchor[],
    targets: TextAnchor[],
    relationType: CrosswalkRelation["relationType"] = "equivalent",
  ) =>
    CrosswalkRelationSchema.parse({
      id: `map:${relationType}`,
      sourceSchemeId: "a",
      targetSchemeId: "b",
      sourceAnchors: sources,
      targetAnchors: targets,
      relationType,
    });
  it.each([
    ["1:1", [passage("a", 1)], [passage("b", 1)]],
    ["1:N", [passage("a", 1)], [passage("b", 1), passage("b", 2)]],
    ["N:1", [passage("a", 1), passage("a", 2)], [passage("b", 1)]],
    ["N:M", [passage("a", 1), passage("a", 2)], [passage("b", 1), passage("b", 2)]],
  ])("resolves %s mappings in both directions", (_name, sources, targets) => {
    const map = relation(
      sources,
      targets,
      sources.length === 1 && targets.length > 1
        ? "split"
        : sources.length > 1 && targets.length === 1
          ? "merged"
          : "equivalent",
    );
    expect(anchorsOverlapViaCrosswalk(sources[0]!, targets.at(-1)!, [map])).toBe(true);
    expect(anchorsOverlapViaCrosswalk(targets[0]!, sources.at(-1)!, [map])).toBe(true);
  });
  it("never invents a missing equivalent", () => {
    const map = relation([passage("a", 1)], [], "no-equivalent");
    expect(anchorsOverlapViaCrosswalk(passage("a", 1), passage("b", 1), [map])).toBe(false);
  });
  it("rejects invalid no-equivalent relations", () => {
    expect(() => relation([passage("a", 1)], [passage("b", 1)], "no-equivalent")).toThrow();
  });
});
