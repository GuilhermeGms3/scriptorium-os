import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { addCorpusEditions } from "./add-corpus-editions";

describe("adição de corpus ao pacote móvel", () => {
  it("retém todos os arquivos antigos e envia somente a nova edição", () => {
    const root = mkdtempSync(join(tmpdir(), "scriptorium-add-corpus-"));
    try {
      mkdirSync(join(root, "public/corpus-packages"), { recursive: true });
      const base = {
        format: "scriptorium-mobile-v1",
        schemaVersion: 1,
        id: "a".repeat(64),
        createdAt: "2026-10-22T00:00:00Z",
        privateUseOnly: true,
        bookLabels: { genesis: "Gênesis" },
        files: [
          { path: "content.sqlite3", sha256: "b".repeat(64), size: 100 },
          { path: "documents/old.pdf", sha256: "c".repeat(64), size: 1000 },
          { path: "corpus/old.sqlite3", sha256: "d".repeat(64), size: 500 },
        ],
        editions: [{ id: "old", title: "Antiga", path: "corpus/old.sqlite3" }],
      };
      const source = join(root, "base.json");
      writeFileSync(source, JSON.stringify(base));
      writeFileSync(
        join(root, "public/corpus-packages/registry.json"),
        JSON.stringify({ packages: [{ editionId: "new", title: "Nova", works: ["work:judith"] }] }),
      );
      writeFileSync(
        join(root, "public/corpus-packages/new.sqlite3"),
        "fixture de transporte, não um corpus real",
      );
      const output = join(root, "patch");
      const result = addCorpusEditions({ root, base: source, output, editions: ["new", "new"] });
      const manifest = JSON.parse(
        readFileSync(join(output, "manifest.json"), "utf8"),
      ) as typeof base;
      expect(manifest.files).toEqual(expect.arrayContaining(base.files));
      expect(manifest.editions).toHaveLength(2);
      expect(manifest.bookLabels).toMatchObject({ genesis: "Gênesis", judith: "Judite" });
      expect(result.baseId).toBe(base.id);
      const archive = unzipSync(readFileSync(join(output, "acervo.scriptorium")));
      expect(Object.keys(archive)).toEqual(["manifest.json", "corpus/new.sqlite3"]);
      expect(JSON.parse(readFileSync(source, "utf8"))).toEqual(base);
      expect(() =>
        addCorpusEditions({ root, base: source, output: join(root, "bad"), editions: ["missing"] }),
      ).toThrow("Edição indisponível");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
