import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CorpusRightsGate } from "../../src/lib/domain/corpus";
import {
  BIBLIA_LIVRE_COMMIT,
  BIBLIA_LIVRE_EDITION_ID,
  BIBLIA_LIVRE_PACKAGE,
} from "../../src/lib/corpus-config/biblia-livre";
import manifestJson from "../../generated/corpora/biblia-livre/2025.1.0/manifest.json";
import { corpusRegistry } from "../../src/lib/repositories/corpus-registry";
import { ScriptureRepository } from "../../src/lib/repositories/scripture-repository";
import {
  ScriptureKnowledgeEngine,
  validatePassageKnowledgeBundle,
} from "../../src/lib/knowledge-engine/scripture-knowledge-engine";
import { BibliaLivreAdapter, parseBibliaLivreF4 } from "./adapters/biblia-livre-adapter";
import { verifyCorpus } from "./pipeline";

const manifest = manifestJson as typeof manifestJson;
describe("Bíblia Livre official N4", () => {
  it("keeps the historical candidate blocked and the source-specific package eligible", () => {
    expect(corpusRegistry.getPackage("pkg-biblia-livre-unresolved")?.rights.status).toBe(
      "conflicting-metadata",
    );
    expect(CorpusRightsGate.evaluate(BIBLIA_LIVRE_PACKAGE.rights).eligible).toBe(true);
    expect(corpusRegistry.getPackage(BIBLIA_LIVRE_PACKAGE.id)?.status).toBe("bundled");
  });
  it("verifies the immutable 68-artifact custody snapshot", async () => {
    const acquired = await verifyCorpus("biblia-livre");
    expect(acquired.commitSha).toBe(BIBLIA_LIVRE_COMMIT);
    expect(acquired.artifacts).toHaveLength(68);
    expect(acquired.artifacts.every((a) => /^[a-f0-9]{64}$/.test(a.checksum.value))).toBe(true);
  });
  it("parses UTF-8 F4, visible additions, notes and headings without word alignment", () => {
    const parsed = parseBibliaLivreF4(
      "\uFEFF\\v Gn.1.1\nCriação\n\\added\né boa\n\\*added\n.\n\\v Gn.1.2\nTexto\n\\fn\nnota ágil\n\\key\nx\n\\*key\nfim\n\\*fn\nvisível\n\\psalm-title\nTítulo\n\\*psalm-title",
    );
    expect(parsed.chapters.get(1)?.get(1)).toBe("Criação é boa.");
    expect(parsed.chapters.get(1)?.get(2)).toBe("Texto visível");
    expect(parsed.notes[0]?.text).toContain("nota ágil");
    expect(parsed.headings[0]?.text).toBe("Título");
  });
  it("discovers all canonical books automatically", async () => {
    const adapter = new BibliaLivreAdapter();
    const found = await adapter.discover(
      resolve("corpora/source/biblia-livre", BIBLIA_LIVRE_COMMIT),
    );
    expect(found.filter((a) => a.classification === "book")).toHaveLength(66);
    expect(new Set(found.flatMap((a) => (a.canonicalBookId ? [a.canonicalBookId] : []))).size).toBe(
      66,
    );
  });
  it("records the complete inventory and explicit versification anomaly", () => {
    expect(manifest.statistics).toMatchObject({
      books: 66,
      chapters: 1189,
      verses: 31101,
      tokenOccurrences: 0,
      missingCanonicalMappings: 0,
    });
    expect(manifest.versificationAnomalies).toEqual(["mark:omitted:5:19"]);
  });
  it("loads OT and NT lazily with Portuguese default and independent Greek/TAGNT", async () => {
    const genesis = await ScriptureRepository.loadChapter("genesis", 1);
    expect(genesis?.verses[0]?.translations[BIBLIA_LIVRE_EDITION_ID]).toContain("No princípio");
    const john = await ScriptureRepository.loadChapter("john", 1);
    expect(ScriptureRepository.defaultEditionId("john", 1)).toBe(BIBLIA_LIVRE_EDITION_ID);
    expect(john?.verses[0]?.translations[BIBLIA_LIVRE_EDITION_ID]).toContain("No princípio");
    expect(john?.verses[0]?.originalEditionId).toBe("sblgnt-1.2");
    expect(john?.verses[0]?.original?.some((t) => t.surface.normalize("NFC") === "λόγος")).toBe(
      true,
    );
    expect(john?.verses[0]?.original?.every((t) => t.editionId === "sblgnt-1.2")).toBe(true);
    expect(
      ScriptureRepository.getPassage({
        edition: BIBLIA_LIVRE_EDITION_ID,
        book: "john",
        chapter: 1,
      })[0]?.translations[BIBLIA_LIVRE_EDITION_ID],
    ).toContain("No princípio");
    expect(
      ScriptureRepository.getPassage({ edition: "sblgnt-1.2", book: "john", chapter: 1 })[0]
        ?.originalEditionId,
    ).toBe("sblgnt-1.2");
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle({
      bookId: "john",
      chapter: 1,
      verseStart: 1,
    });
    expect(bundle?.texts.map((t) => t.edition.id)).toEqual([
      BIBLIA_LIVRE_EDITION_ID,
      "biblia-portuguesa-mundial-2026-08-19",
      "sblgnt-1.2",
    ]);
    expect(new Set(bundle?.texts.map((t) => t.provenance.packageId)).size).toBe(3);
    await ScriptureKnowledgeEngine.loadLinguisticPassage({ bookId: "john", chapter: 1 });
    const loadedBundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle({
      bookId: "john",
      chapter: 1,
      verseStart: 1,
    });
    expect(loadedBundle?.linguistics.status).toBe("available");
    expect(validatePassageKnowledgeBundle(loadedBundle!)).toEqual([]);
  });
  it("preserves source attribution after a route-loader hydration", async () => {
    const serializedChapter = structuredClone(await ScriptureRepository.loadChapter("genesis", 1));
    expect(serializedChapter).not.toBeNull();

    vi.resetModules();
    const { ScriptureRepository: hydratedRepository } =
      await import("../../src/lib/repositories/scripture-repository");
    hydratedRepository.primeChapter(serializedChapter);
    const { ScriptureKnowledgeEngine: hydratedEngine } =
      await import("../../src/lib/knowledge-engine/scripture-knowledge-engine");
    const bundle = hydratedEngine.getPassageKnowledgeBundle({ bookId: "genesis", chapter: 1 });

    const portuguese = bundle?.texts.find(
      (layer) => layer.editionId === "biblia-livre-n4-2025.1.0",
    );
    expect(portuguese?.provenance.attribution).toContain("Bíblia Livre");
    expect(portuguese?.provenance.sourceArtifactIds?.[0]).toContain(":gen");
  });
  it("covers first and last books and stores only chapter modules", async () => {
    expect(
      (await ScriptureRepository.loadChapter("revelation", 22))?.verses.at(-1)?.translations[
        BIBLIA_LIVRE_EDITION_ID
      ],
    ).toContain("graça");
    const raw = await readFile(
      "generated/corpora/biblia-livre/2025.1.0/books/genesis/01.json",
      "utf8",
    );
    expect(raw).toContain(BIBLIA_LIVRE_EDITION_ID);
    expect(raw).not.toContain('"original"');
  });
});
