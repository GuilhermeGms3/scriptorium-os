import { describe, expect, it } from "vitest";
import { decodeOshbMorphology } from "./adapters/oshb-morphology";

describe("OSHB morphology decoder", () => {
  it("decodes a prefixed common feminine singular absolute noun", () => {
    expect(decodeOshbMorphology("HR/Ncfsa")).toMatchObject({
      partOfSpeech: "noun",
      subtype: "common",
      gender: "feminine",
      number: "singular",
      state: "absolute",
      prefixes: "preposition",
      status: "parsed",
    });
  });

  it("decodes Hebrew verbs and pronominal suffixes", () => {
    expect(decodeOshbMorphology("HVqp3ms/Sp3ms")).toMatchObject({
      partOfSpeech: "verb",
      stem: "qal",
      aspect: "perfect",
      person: "third",
      gender: "masculine",
      number: "singular",
      suffixDescription: "pronominal third masculine singular",
    });
  });

  it("decodes pronouns, particles and Aramaic forms without guessing unknown categories", () => {
    expect(decodeOshbMorphology("HPp3ms")).toMatchObject({
      partOfSpeech: "pronoun",
      subtype: "personal",
    });
    expect(decodeOshbMorphology("HTd")).toMatchObject({
      partOfSpeech: "particle",
      subtype: "definite-article",
    });
    expect(decodeOshbMorphology("AVqp3ms")).toMatchObject({ language: "Aramaic", stem: "peal" });
    expect(decodeOshbMorphology("HXzzz")).toMatchObject({
      partOfSpeech: "unmapped",
      status: "unmapped",
    });
  });
});
