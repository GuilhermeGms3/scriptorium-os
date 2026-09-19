import { describe, expect, it } from "vitest";
import {
  ArgumentRepository,
  PerspectiveRepository,
  TheologyRepository,
} from "./argument-repository";
import { KnowledgeRepository } from "./knowledge-repository";

describe("canonical knowledge search", () => {
  it("finds ontology and source-backed claims through SQLite FTS", async () => {
    const ontologyHits = await KnowledgeRepository.search("Trinity");
    const claimHits = await KnowledgeRepository.search("artigo θεός");
    expect(ontologyHits).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "doctrine:trinity" })]),
    );
    expect(claimHits).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "claim:john-1-1-theos-anarthrous" })]),
    );
  });

  it("preserves primary-source epistemic role for ancient reception evidence", async () => {
    const relations = await KnowledgeRepository.relationsForPassage({
      bookId: "john",
      chapter: 1,
      verseStart: 1,
      versificationSchemeId: "scriptorium-bcv-1",
    });
    const relation = relations.find(
      (candidate) => candidate.id === "relation:john-1-1-origen-commentary-ii-2",
    );
    expect(relation).toBeDefined();
    const sources = await KnowledgeRepository.sourcesForRelations([relation!.id]);
    expect(sources.fragments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "source:internet-archive:cu31924029220535",
          sourceType: "primary-text",
          epistemicRole: "primary",
        }),
      ]),
    );
  });

  it("loads Phase 10.1 analyses through canonical passage anchors and lens ids", async () => {
    const john = await KnowledgeRepository.analysesForPassage({
      bookId: "john",
      chapter: 1,
      verseStart: 1,
      versificationSchemeId: "scriptorium-bcv-1",
    });
    const genesis = await KnowledgeRepository.analysesForPassage({
      bookId: "genesis",
      chapter: 1,
      verseStart: 1,
      versificationSchemeId: "scriptorium-bcv-1",
    });
    expect(john.map((analysis) => analysis.id)).toContain("analysis:john-1-origen-reception");
    expect(genesis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "analysis:genesis-1-linguistic-entry",
          lensId: "philological",
        }),
      ]),
    );
  });
});

describe("theology ontology", () => {
  it("keeps ontology categories semantically distinct", async () => {
    const entities = await TheologyRepository.listEntities();
    const kinds = new Set(entities.map((entity) => entity.kind));
    expect(kinds.has("tradition")).toBe(true);
    expect(kinds.has("method")).toBe(true);
    expect(kinds.has("school")).toBe(true);
    expect(kinds.has("epistemic-stance")).toBe(true);
    expect(kinds.has("position")).toBe(true);
    expect(kinds.has("doctrine")).toBe(true);
    expect(kinds.has("theory")).toBe(true);
  });
  it("loads only claims related to the selected theory", async () => {
    const claims = await ArgumentRepository.getClaimsForOntologyEntity("theory:two-source");
    expect(claims.map((claim) => claim.id)).toEqual(["claim:markan-priority", "claim:q-source"]);
    expect(claims.some((claim) => claim.id === "claim:matthean-priority")).toBe(false);
  });
});

describe("multidimensional perspectives", () => {
  it("combines tradition, method, stance and framework independently", async () => {
    const [profile] = await PerspectiveRepository.list({
      traditionIds: ["tradition:reformed"],
      methodIds: ["method:historical-grammatical"],
      epistemicStanceIds: ["stance:confessional"],
      interpretiveFrameworkIds: ["framework:covenant-theology"],
    });
    expect(profile?.id).toBe("perspective:reformed-hg-covenant");
  });
  it("does not require a tradition for a methodological profile", async () => {
    const [profile] = await PerspectiveRepository.list({
      methodIds: ["method:textual-criticism"],
      epistemicStanceIds: ["stance:non-confessional"],
    });
    expect(profile?.traditionIds).toEqual([]);
  });
});

describe("argument graph", () => {
  it("retrieves sourced supporting and opposing arguments", async () => {
    const argumentsForQ = await ArgumentRepository.getArgumentsForClaim("claim:q-source");
    expect(argumentsForQ[0]?.premiseClaimIds).toContain("claim:markan-priority");
    expect(
      (await ArgumentRepository.getSupportingArguments("claim:q-source")).map(
        (argument) => argument.id,
      ),
    ).toContain("argument:two-source");
    expect(
      (await ArgumentRepository.getOpposingArguments("claim:q-source")).map(
        (argument) => argument.id,
      ),
    ).toContain("argument:farrer-alternative");
  });
  it("retrieves alternatives and competing theories without ranking a winner", async () => {
    const theories = await ArgumentRepository.getCompetingTheories("theory:two-source");
    expect(theories.map((theory) => theory.id)).toEqual(
      expect.arrayContaining(["theory:farrer", "theory:griesbach"]),
    );
    expect(theories.every((theory) => !("truthScore" in theory))).toBe(true);
  });
});
