import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { toSafeFtsQuery } from "../../src/lib/corpus-runtime/search-normalization";
import {
  applyMigrations,
  DATABASE_SCHEMA_VERSION,
  removeDatabaseFiles,
  sweepInterruptedBuildFiles,
} from "./migrate";
import { seedKnowledgeDatabase, validateKnowledgeContent } from "./seed-knowledge";

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("SQLite migrations", () => {
  it("applies deterministic versioned migrations with FTS5 and foreign keys", () => {
    const directory = mkdtempSync(join(tmpdir(), "scriptorium-db-"));
    temporaryDirectories.push(directory);
    const database = new DatabaseSync(join(directory, "test.sqlite3"));
    applyMigrations(database, resolve("src/lib/corpus-runtime/migrations"));
    expect(
      database.prepare("SELECT MAX(version) version FROM schema_migrations").get(),
    ).toMatchObject({ version: DATABASE_SCHEMA_VERSION });
    expect(
      database.prepare("SELECT sqlite_compileoption_used('ENABLE_FTS5') enabled").get(),
    ).toMatchObject({ enabled: 1 });
    expect(database.prepare("PRAGMA foreign_keys").get()).toMatchObject({ foreign_keys: 1 });
    expect(() =>
      database
        .prepare(
          "INSERT INTO corpus_editions(id,corpus_id,title,abbreviation,language,edition_kind,package_id,package_checksum) VALUES('bad','missing','Bad','B','en','translation','p','x')",
        )
        .run(),
    ).toThrow();
    database.close();
  });

  it("removes a database together with sidecar files left by an interrupted build", () => {
    const directory = mkdtempSync(join(tmpdir(), "scriptorium-db-"));
    temporaryDirectories.push(directory);
    const nested = join(directory, "edition");
    mkdirSync(nested);
    for (const file of ["x.sqlite3", "x.sqlite3-journal", "x.sqlite3-mj123", "keep.json"])
      writeFileSync(join(directory, file), "");
    for (const file of ["y.sqlite3", "y.sqlite3-journal", "y.sqlite3-mj123", "y.sqlite3-wal"])
      writeFileSync(join(nested, file), "");

    removeDatabaseFiles(join(directory, "x.sqlite3"));
    expect(readdirSync(directory).sort()).toEqual(["edition", "keep.json"]);

    expect(sweepInterruptedBuildFiles(directory)).toBe(3);
    expect(readdirSync(nested)).toEqual(["y.sqlite3"]);
    expect(existsSync(join(directory, "keep.json"))).toBe(true);
    expect(sweepInterruptedBuildFiles(join(directory, "missing"))).toBe(0);
  });
});

type JsonObject = Record<string, unknown>;

const john = (verse: number) => ({
  type: "passage",
  ref: {
    bookId: "john",
    chapter: 1,
    verseStart: verse,
    versificationSchemeId: "scriptorium-bcv-1",
  },
});

/**
 * Synthetic seed + pack. The pack defines evidence and arguments the seed already references, so
 * writing it requires deferred foreign keys.
 */
function syntheticKnowledge(): { seed: JsonObject; pack: JsonObject } {
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

function writeKnowledge(seed: JsonObject, packs: Record<string, JsonObject>): string {
  const directory = mkdtempSync(join(tmpdir(), "scriptorium-knowledge-"));
  temporaryDirectories.push(directory);
  mkdirSync(join(directory, "packs"));
  writeFileSync(join(directory, "seed.json"), JSON.stringify(seed), "utf8");
  for (const [name, pack] of Object.entries(packs))
    writeFileSync(join(directory, "packs", name), JSON.stringify(pack), "utf8");
  return join(directory, "seed.json");
}

function claimsOf(content: JsonObject): JsonObject[] {
  return content["claims"] as JsonObject[];
}

describe("knowledge content validation and seed", () => {
  it("validates the real content with zero problems and the current counts", () => {
    const report = validateKnowledgeContent(resolve("content/scriptorium-content-seed-v0.1.json"));
    expect(report.problems).toEqual([]);
    expect(report.counts).toMatchObject({
      claims: 32,
      ontology: 64,
      knowledgeEntities: 31,
      analyses: 11,
    });
  });

  it("reports a duplicate id together with the file where it was first defined", () => {
    const { seed, pack } = syntheticKnowledge();
    pack["claims"] = [{ ...claimsOf(seed)[3], proposition: "Redefined." }];
    expect(validateKnowledgeContent(writeKnowledge(seed, { "extra.json": pack })).problems).toEqual(
      ["packs/extra.json › claim:unassigned › duplicate claims id (first defined in seed.json)"],
    );
  });

  it("reports broken references and a perspective dimension of the wrong kind", () => {
    const { seed, pack } = syntheticKnowledge();
    claimsOf(seed)[0]!["sourceIds"] = ["source:missing"];
    (seed["perspectives"] as JsonObject[])[0]!["traditionIds"] = ["method:historical-critical"];
    (pack["arguments"] as JsonObject[])[0]!["premiseClaimIds"] = ["claim:nowhere"];
    expect(validateKnowledgeContent(writeKnowledge(seed, { "extra.json": pack })).problems).toEqual(
      [
        "seed.json › perspective:reformed › traditionIds method:historical-critical is a method, expected tradition",
        "seed.json › claim:two-profiles › source source:missing does not exist",
        "packs/extra.json › argument:critical-support › premise claim claim:nowhere does not exist",
      ],
    );
  });

  it("reports an invalid enum value with the id of the record", () => {
    const { seed, pack } = syntheticKnowledge();
    claimsOf(seed)[3]!["kind"] = "prophecy";
    const { problems } = validateKnowledgeContent(writeKnowledge(seed, { "extra.json": pack }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^seed\.json › claim:unassigned › kind: /);
  });

  it("writes perspectives, evidence, anchors, origin and assessment notes", () => {
    const { seed, pack } = syntheticKnowledge();
    const directory = mkdtempSync(join(tmpdir(), "scriptorium-db-"));
    temporaryDirectories.push(directory);
    const database = new DatabaseSync(join(directory, "knowledge.sqlite3"));
    applyMigrations(database, resolve("src/lib/corpus-runtime/migrations"));
    const report = seedKnowledgeDatabase(database, writeKnowledge(seed, { "extra.json": pack }));
    expect(report.counts).toMatchObject({ claims: 5, claimPerspectives: 3, claimEvidence: 2 });

    expect(
      database
        .prepare("SELECT claim_id,profile_id,association_kind FROM claim_perspectives ORDER BY 1,2")
        .all(),
    ).toEqual([
      {
        claim_id: "claim:argued",
        profile_id: "perspective:reformed",
        association_kind: "interpretive-context",
      },
      {
        claim_id: "claim:two-profiles",
        profile_id: "perspective:catholic",
        association_kind: "claimed-tradition",
      },
      {
        claim_id: "claim:two-profiles",
        profile_id: "perspective:reformed",
        association_kind: "author-perspective",
      },
    ]);
    expect(
      database
        .prepare("SELECT claim_id,evidence_id,relation_type FROM claim_evidence ORDER BY 1")
        .all(),
    ).toEqual([
      { claim_id: "claim:argued", evidence_id: "evidence:later", relation_type: "qualifies" },
      { claim_id: "claim:two-profiles", evidence_id: "evidence:later", relation_type: "supports" },
    ]);
    expect(
      database
        .prepare("SELECT origin,assessment_note FROM claims WHERE id='claim:two-profiles'")
        .get(),
    ).toEqual({
      origin: "editorial",
      assessment_note: "Leitura atribuída por duas fontes distintas.",
    });
    expect(database.prepare("SELECT origin FROM claims WHERE id='claim:unassigned'").get()).toEqual(
      { origin: "source-derived" },
    );
    expect(
      database
        .prepare("SELECT COUNT(*) count FROM claim_anchors WHERE claim_id='claim:argued'")
        .get(),
    ).toEqual({ count: 2 });
    expect(
      database
        .prepare(
          "SELECT dimension_kind,ontology_entity_id FROM perspective_dimensions WHERE profile_id='perspective:catholic' ORDER BY 1",
        )
        .all(),
    ).toEqual([
      { dimension_kind: "school", ontology_entity_id: "school:antiochene" },
      { dimension_kind: "tradition", ontology_entity_id: "tradition:catholic" },
    ]);
    expect(
      database
        .prepare("SELECT description FROM perspective_profiles WHERE id='perspective:reformed'")
        .get(),
    ).toEqual({ description: "Leitura confessional reformada." });
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    database.close();
  });

  it("finds doctrine:trinity when searching in Portuguese for Trindade", () => {
    const { seed, pack } = syntheticKnowledge();
    const directory = mkdtempSync(join(tmpdir(), "scriptorium-db-"));
    temporaryDirectories.push(directory);
    const database = new DatabaseSync(join(directory, "knowledge.sqlite3"));
    applyMigrations(database, resolve("src/lib/corpus-runtime/migrations"));
    seedKnowledgeDatabase(database, writeKnowledge(seed, { "extra.json": pack }));
    const search = (text: string) =>
      database
        .prepare("SELECT record_id FROM knowledge_fts WHERE knowledge_fts MATCH ?")
        .all(toSafeFtsQuery(text))
        .map((row) => row["record_id"]);
    expect(search("Trindade")).toEqual(["doctrine:trinity"]);
    expect(search("histórico-crítico")).toEqual(["method:historical-critical"]);
    expect(
      JSON.parse(
        String(
          database
            .prepare(
              "SELECT localized_labels_json FROM ontology_entities WHERE id='doctrine:trinity'",
            )
            .get()?.["localized_labels_json"],
        ),
      ),
    ).toEqual({ "pt-BR": "Trindade" });
    database.close();
  });
});
