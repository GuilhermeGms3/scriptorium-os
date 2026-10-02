import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyMigrations } from "../../../scripts/database/migrate";
import { seedKnowledgeDatabase } from "../../../scripts/database/seed-knowledge";
import type { TextAnchor } from "../domain/knowledge";
import { passageRefsOverlap, type PassageRef } from "../domain/scripture";
import {
  ArgumentRepository,
  PerspectiveRepository,
  TheologyRepository,
} from "./argument-repository";
import {
  getKnowledgeDatabase,
  knowledgeQuery,
  knowledgeText,
  openKnowledgeDatabase,
} from "./knowledge-database";
import {
  KnowledgeRepository,
  buildKnowledgeIndex,
  groupViewpoints,
  indexedClaimsForPassage,
  type KnowledgeIndex,
} from "./knowledge-repository";

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

const john = (verse: number) => ({
  type: "passage",
  ref: {
    bookId: "john",
    chapter: 1,
    verseStart: verse,
    versificationSchemeId: "scriptorium-bcv-1",
  },
});
const JOHN_1_1: PassageRef = {
  bookId: "john",
  chapter: 1,
  verseStart: 1,
  versificationSchemeId: "scriptorium-bcv-1",
};

/** Same synthetic seed + pack as the knowledge seed tests in scripts/database/migrations.test.ts. */
function syntheticKnowledge(): { seed: Record<string, unknown>; pack: Record<string, unknown> } {
  return {
    seed: {
      id: "synthetic-seed",
      version: "1.0.0",
      importedAt: "2026-10-01T00:00:00.000Z",
      sources: [
        {
          id: "source:scriptorium:editorial-taxonomy:v0.1",
          sourceType: "editorial-catalog",
          title: "Editorial taxonomy",
          metadata: {},
        },
        { id: "source:a", sourceType: "book", title: "Source A", metadata: {} },
        { id: "source:b", sourceType: "book", title: "Source B", metadata: {} },
      ],
      knowledgeEntities: [
        { id: "entity:concept:logos", type: "concept", name: "Logos", sourceIds: ["source:a"] },
      ],
      ontology: [
        { id: "tradition:reformed", kind: "tradition", name: "Reformed" },
        { id: "tradition:catholic", kind: "tradition", name: "Catholic" },
        { id: "school:antiochene", kind: "school", name: "Antiochene school" },
        {
          id: "method:historical-critical",
          kind: "method",
          name: "Historical-critical",
          aliases: ["HCM"],
          localizedLabels: { "pt-BR": "Histórico-crítico" },
        },
        { id: "doctrine:trinity", kind: "doctrine", name: "Trinity" },
      ],
      perspectives: [
        {
          id: "perspective:reformed",
          label: "Reformada",
          description: "Leitura confessional reformada.",
          traditionIds: ["tradition:reformed"],
        },
        {
          id: "perspective:catholic",
          label: "Católica",
          traditionIds: ["tradition:catholic"],
          schoolIds: ["school:antiochene"],
        },
        { id: "perspective:critical", label: "Crítica", methodIds: ["method:historical-critical"] },
      ],
      claims: [
        {
          id: "claim:two-profiles",
          proposition: "Two profiles read John 1:1 this way.",
          kind: "exegetical-interpretation",
          anchor: john(1),
          sourceIds: ["source:a"],
          supportLevel: "moderate",
          reviewStatus: "reviewed",
          origin: "editorial",
          assessmentNote: "Leitura atribuída por duas fontes distintas.",
          perspectives: [
            { profileId: "perspective:reformed", association: "author-perspective" },
            { profileId: "perspective:catholic", association: "claimed-tradition" },
          ],
          evidence: [{ evidenceId: "evidence:later", relation: "supports" }],
        },
        {
          id: "claim:argued",
          proposition: "An argued reading of John 1:1.",
          kind: "theological-interpretation",
          anchors: [john(1), john(14)],
          sourceIds: ["source:b"],
          supportLevel: "unknown",
          reviewStatus: "draft",
          perspectiveIds: ["perspective:reformed"],
          evidence: [{ evidenceId: "evidence:later", relation: "qualifies" }],
        },
        {
          id: "claim:premise",
          proposition: "A textual premise in John 1:2.",
          kind: "textual-observation",
          anchor: john(2),
          sourceIds: ["source:b"],
          supportLevel: "direct",
          reviewStatus: "verified",
        },
        {
          id: "claim:unassigned",
          proposition: "An observation without any perspective.",
          kind: "linguistic-analysis",
          anchor: john(1),
          sourceIds: ["source:a"],
          supportLevel: "direct",
          reviewStatus: "verified",
        },
        {
          id: "claim:objection",
          proposition: "An objection about the Logos.",
          kind: "historical-source-observation",
          anchor: { type: "entity", entityId: "entity:concept:logos" },
          sourceIds: ["source:a"],
          supportLevel: "disputed",
          reviewStatus: "source-checked",
        },
      ],
    },
    pack: {
      id: "synthetic-pack",
      version: "1.0.0",
      importedAt: "2026-10-01T00:00:00.000Z",
      evidence: [
        {
          id: "evidence:later",
          label: "Evidence defined after the claims that cite it",
          target: { kind: "historical-source", sourceId: "source:b" },
          sourceIds: ["source:b"],
          reviewStatus: "source-checked",
          authorship: "human-reviewed",
        },
      ],
      arguments: [
        {
          id: "argument:critical-support",
          title: "Critical support",
          conclusionClaimId: "claim:argued",
          premiseClaimIds: ["claim:premise"],
          sourceIds: ["source:b"],
          perspectiveIds: ["perspective:critical"],
        },
        {
          id: "argument:objection",
          title: "Objection",
          conclusionClaimId: "claim:objection",
          premiseClaimIds: ["claim:premise"],
          sourceIds: ["source:a"],
        },
      ],
      argumentRelations: [
        {
          id: "argrel:objection-rebuts",
          fromKind: "argument",
          fromId: "argument:objection",
          toKind: "claim",
          toId: "claim:argued",
          type: "rebuts",
          sourceIds: ["source:a"],
        },
      ],
    },
  };
}

describe("knowledge index and passage viewpoints", () => {
  let directory = "";
  let synthetic: KnowledgeIndex;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), "scriptorium-index-"));
    const { seed, pack } = syntheticKnowledge();
    mkdirSync(join(directory, "packs"));
    writeFileSync(join(directory, "seed.json"), JSON.stringify(seed), "utf8");
    writeFileSync(join(directory, "packs", "extra.json"), JSON.stringify(pack), "utf8");
    const path = join(directory, "knowledge.sqlite3");
    const database = new DatabaseSync(path);
    applyMigrations(database, resolve("src/lib/corpus-runtime/migrations"));
    seedKnowledgeDatabase(database, join(directory, "seed.json"));
    database.close();
    synthetic = buildKnowledgeIndex(
      await openKnowledgeDatabase(new Uint8Array(readFileSync(path))),
    );
  });
  afterAll(() => rmSync(directory, { recursive: true, force: true }));

  it("returns passage claims and their sources in the same order as the previous queries", async () => {
    const database = await getKnowledgeDatabase();
    for (const ref of [
      JOHN_1_1,
      { bookId: "john", chapter: 1, verseStart: 1, verseEnd: 18 },
      { bookId: "genesis", chapter: 1 },
    ]) {
      const legacy = knowledgeQuery(database, "SELECT id FROM claims ORDER BY proposition")
        .map((row) => knowledgeText(row, "id"))
        .filter((id) =>
          knowledgeQuery(
            database,
            "SELECT anchor_json FROM claim_anchors WHERE claim_id=? ORDER BY ordinal",
            [id],
          ).some((row) => {
            const anchor = JSON.parse(knowledgeText(row, "anchor_json")) as TextAnchor;
            const passage =
              anchor.type === "passage"
                ? anchor.ref
                : anchor.type === "canonical-text" &&
                    anchor.anchor.passage?.bookId !== undefined &&
                    anchor.anchor.passage.chapter !== undefined
                  ? {
                      workId: anchor.anchor.passage.workId,
                      bookId: anchor.anchor.passage.bookId,
                      chapter: anchor.anchor.passage.chapter,
                      ...(anchor.anchor.passage.verseStart !== undefined
                        ? { verseStart: anchor.anchor.passage.verseStart }
                        : {}),
                      ...(anchor.anchor.passage.verseEnd !== undefined
                        ? { verseEnd: anchor.anchor.passage.verseEnd }
                        : {}),
                      versificationSchemeId: anchor.anchor.passage.versificationSchemeId,
                    }
                  : null;
            return passage !== null && passageRefsOverlap(passage, ref);
          }),
        );
      const claims = await KnowledgeRepository.claimsForPassage(ref);
      expect(claims.map((claim) => claim.id)).toEqual(legacy);
      if (!legacy.length) continue;
      const placeholders = legacy.map(() => "?").join(",");
      const legacySources = knowledgeQuery(
        database,
        `SELECT cs.claim_id,s.id FROM claim_sources cs JOIN sources s ON s.id=cs.source_id WHERE cs.claim_id IN (${placeholders})`,
        legacy,
      ).map(
        (row) => `fragment:knowledge:${knowledgeText(row, "claim_id")}:${knowledgeText(row, "id")}`,
      );
      expect(
        (await KnowledgeRepository.sourcesForClaims(legacy)).fragments.map((f) => f.id),
      ).toEqual(legacySources);
    }
    expect((await KnowledgeRepository.claimsForPassage(JOHN_1_1)).length).toBeGreaterThan(0);
  });

  it("maps claim perspectives, evidence, origin and assessment notes", () => {
    expect(synthetic.claimsById.get("claim:two-profiles")).toMatchObject({
      origin: "editorial",
      assessmentNote: "Leitura atribuída por duas fontes distintas.",
      perspectiveProfileIds: ["perspective:catholic", "perspective:reformed"],
      evidence: [
        {
          kind: "historical",
          supportLevel: "moderate",
          sourceFragmentIds: ["fragment:evidence:evidence:later:source:b"],
        },
      ],
    });
    expect(synthetic.claimsById.get("claim:argued")).toMatchObject({
      anchors: [john(1), john(14)],
      perspectiveProfileIds: ["perspective:reformed"],
      evidence: [{ kind: "historical", supportLevel: "moderate" }],
    });
    expect(synthetic.claimsById.get("claim:unassigned")).toMatchObject({
      origin: "source-derived",
      perspectiveProfileIds: [],
      evidence: [],
    });
    expect(synthetic.profilesById.get("perspective:catholic")).toMatchObject({
      traditionIds: ["tradition:catholic"],
      schoolIds: ["school:antiochene"],
    });
  });

  it("groups passage claims by perspective without attributing one by guesswork", () => {
    const claims = indexedClaimsForPassage(synthetic, JOHN_1_1);
    expect(claims.map((claim) => claim.id)).toEqual([
      "claim:argued",
      "claim:unassigned",
      "claim:two-profiles",
    ]);
    const viewpoints = groupViewpoints(synthetic, claims).map((viewpoint) => ({
      profile: viewpoint.profile?.id ?? null,
      claims: viewpoint.claims.map((claim) => claim.id),
      supporting: viewpoint.supportingArguments.map((argument) => argument.id),
      opposing: viewpoint.opposingArguments.map((argument) => argument.id),
    }));
    expect(viewpoints).toEqual([
      {
        profile: "perspective:catholic",
        claims: ["claim:two-profiles"],
        supporting: [],
        opposing: [],
      },
      {
        profile: "perspective:critical",
        claims: ["claim:argued"],
        supporting: ["argument:critical-support"],
        opposing: ["argument:objection"],
      },
      {
        profile: "perspective:reformed",
        claims: ["claim:argued", "claim:two-profiles"],
        supporting: ["argument:critical-support"],
        opposing: ["argument:objection"],
      },
      { profile: null, claims: ["claim:unassigned"], supporting: [], opposing: [] },
    ]);
  });

  it("types relations from the known vocabulary in the real database", async () => {
    const relations = await KnowledgeRepository.allRelations();
    expect(
      relations.find((relation) => relation.id === "relation:john-1-1-logos")?.relation,
    ).toEqual({ kind: "known", value: "contains-occurrence-of" });
    expect(relations.some((relation) => relation.relation.kind === "custom")).toBe(true);
    expect(
      relations
        .filter((relation) => relation.relation.kind === "known")
        .every((relation) =>
          ["contains-occurrence-of", "related-to"].includes(relation.relation.value),
        ),
    ).toBe(true);
  });
});
