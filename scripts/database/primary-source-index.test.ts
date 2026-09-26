import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CorpusPackageManifestSchema } from "../../src/lib/corpus-runtime/contracts";

const root = resolve(import.meta.dirname, "../..");
const registry = JSON.parse(
  readFileSync(resolve(root, "public/corpus-packages/registry.json"), "utf8"),
) as { packages: unknown[] };
const packages = registry.packages.map((value) => CorpusPackageManifestSchema.parse(value));
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function database(editionId: string): DatabaseSync {
  return new DatabaseSync(resolve(root, "public/corpus-packages", `${editionId}.sqlite3`), {
    readOnly: true,
  });
}

describe("primary-source runtime packages", () => {
  it("ships seven navigable Apostolic Fathers works with intact checksums", () => {
    const manifest = packages.find(
      (candidate) => candidate.editionId === "apostolic-fathers-pd-en-1",
    )!;
    expect(manifest.works).toHaveLength(7);
    expect(manifest.buildFingerprint).toMatch(/^[a-f0-9]{64}$/);
    const bytes = readFileSync(resolve(root, "public", manifest.databasePath.replace(/^\//, "")));
    expect(sha256(bytes)).toBe(manifest.checksum);
    const db = database(manifest.editionId);
    expect(
      (
        db.prepare("SELECT count(*) total FROM text_units WHERE work_id='work:didache'").get() as {
          total: number;
        }
      ).total,
    ).toBe(16);
    expect(
      (
        db
          .prepare("SELECT count(*) total FROM text_units WHERE work_id='work:first-clement'")
          .get() as { total: number }
      ).total,
    ).toBeGreaterThan(50);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.close();
  });

  it("indexes actual patristic text in FTS5 and preserves section locators", () => {
    const db = database("apostolic-fathers-pd-en-1");
    const hit = db
      .prepare(
        `
      SELECT f.work_id,a.section_label,u.surface_text
      FROM text_units_fts f
      JOIN text_units u ON u.id=f.text_unit_id
      JOIN text_addresses a ON a.text_unit_id=u.id
      WHERE text_units_fts MATCH 'baptism' AND f.work_id='work:didache'
      ORDER BY bm25(text_units_fts) LIMIT 1
    `,
      )
      .get() as Record<string, unknown> | undefined;
    expect(hit?.["section_label"]).toBe("7");
    expect(String(hit?.["surface_text"])).toContain("bapt");
    db.close();
  });

  it("keeps five complete confessional documents distinct", () => {
    const db = database("historic-creeds-pd-en-1");
    const works = db.prepare("SELECT id,title FROM works ORDER BY sequence").all() as Array<
      Record<string, unknown>
    >;
    expect(works).toHaveLength(5);
    expect(works.map((work) => work["id"])).toContain("work:nicene-creed-325");
    expect(works.map((work) => work["id"])).toContain("work:nicene-constantinopolitan-western");
    expect(
      (db.prepare("SELECT count(*) total FROM text_units").get() as { total: number }).total,
    ).toBeGreaterThan(10);
    db.close();
  });

  it("ships Origen on John as a separately lazy-loadable, searchable work", () => {
    const manifest = packages.find(
      (candidate) => candidate.editionId === "ancient-john-reception-pd-en-1",
    )!;
    expect(manifest.works).toEqual(["work:origen-commentary-john-books-1-2"]);
    expect(manifest.deliveryMode).toBe("work-shards");
    const contentPart = manifest.parts.find((part) => part.role === "content");
    expect(contentPart?.sizeBytes).toBeLessThan(manifest.sizeBytes);
    const db = database(manifest.editionId);
    expect(
      (db.prepare("SELECT count(*) total FROM text_units").get() as { total: number }).total,
    ).toBe(65);
    const hit = db
      .prepare(
        `
        SELECT a.section_label,u.surface_text
        FROM text_units_fts f
        JOIN text_units u ON u.id=f.text_unit_id
        JOIN text_addresses a ON a.text_unit_id=u.id
        WHERE text_units_fts MATCH 'article' AND f.work_id='work:origen-commentary-john-books-1-2'
        ORDER BY bm25(text_units_fts) LIMIT 1
      `,
      )
      .get() as Record<string, unknown> | undefined;
    expect(hit?.["section_label"]).toBe("II.2");
    expect(String(hit?.["surface_text"])).toContain("John's use of the article");
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.close();
  });

  it("ships the Coptic Gospel of Thomas with all sayings and Coptic FTS", () => {
    const manifest = packages.find(
      (candidate) => candidate.editionId === "coptic-scriptorium-thomas-cop-1",
    )!;
    expect(manifest.languages).toEqual(["cop"]);
    expect(manifest.works).toEqual(["work:gospel-thomas-coptic"]);
    expect(manifest.rights.license).toBe("CC BY 4.0");
    const db = database(manifest.editionId);
    expect(
      (db.prepare("SELECT count(*) total FROM text_units").get() as { total: number }).total,
    ).toBe(116);
    expect(
      (
        db
          .prepare("SELECT count(*) total FROM text_units_fts WHERE text_units_fts MATCH ?")
          .get("ⲡⲉϫⲉ") as { total: number }
      ).total,
    ).toBeGreaterThan(0);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.close();
  });

  it("ships Augustine and all four Summa parts as lazy searchable primary works", () => {
    const augustine = packages.find(
      (candidate) => candidate.editionId === "augustine-confessions-pd-en-1",
    )!;
    const summa = packages.find((candidate) => candidate.editionId === "aquinas-summa-pd-en-1")!;
    expect(augustine.works).toEqual(["work:augustine-confessions"]);
    expect(summa.works).toHaveLength(4);
    expect(summa.parts.filter((part) => part.role === "content")).toHaveLength(4);
    const augustineDb = database(augustine.editionId);
    expect(
      (augustineDb.prepare("SELECT count(*) total FROM text_units").get() as { total: number })
        .total,
    ).toBe(13);
    augustineDb.close();
    const summaDb = database(summa.editionId);
    expect(
      (summaDb.prepare("SELECT count(*) total FROM text_units").get() as { total: number }).total,
    ).toBe(2_661);
    expect(
      (
        summaDb
          .prepare("SELECT count(*) total FROM text_units_fts WHERE text_units_fts MATCH ?")
          .get("predestination") as { total: number }
      ).total,
    ).toBeGreaterThan(0);
    expect(summaDb.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    summaDb.close();
  });
});
