import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import acquired from "../../corpora/source/sblgnt/736fdc76158950c3d04b949b7e013ca14305145a/artifact-manifest.json";
import generated from "../../generated/corpora/sblgnt/1.2/manifest.json";
import type { GeneratedCorpusManifest } from "../../src/lib/domain/generated-corpus";
import { ScriptureKnowledgeEngine } from "../../src/lib/knowledge-engine/scripture-knowledge-engine";
import { corpusRegistry } from "../../src/lib/repositories/corpus-registry";
import { ScriptureRepository } from "../../src/lib/repositories/scripture-repository";
import { calculatePackageDigest } from "./pipeline";
import { SblgntXmlAdapter } from "./adapters/sblgnt-xml-adapter";

const manifest = generated as GeneratedCorpusManifest;
const sourceRoot = resolve(
  import.meta.dirname,
  "../../corpora/source/sblgnt/736fdc76158950c3d04b949b7e013ca14305145a",
);

describe("full SBLGNT 1.2 import", () => {
  it("pins the editorial v1.2 source to the documented immutable commit", () => {
    expect(manifest.sourceRevision).toBe("736fdc76158950c3d04b949b7e013ca14305145a");
    expect(acquired.commitSha).toBe(manifest.sourceRevision);
    expect(corpusRegistry.getPackage(manifest.packageId)).toMatchObject({
      revision: manifest.sourceRevision,
      status: "bundled",
      integrity: { status: "verified" },
    });
  });

  it("discovers the 27 books plus metadata without manual per-book calls", async () => {
    const packageManifest = corpusRegistry.getPackage(manifest.packageId)!;
    const discovered = await new SblgntXmlAdapter().discover(sourceRoot, packageManifest);
    expect(discovered).toHaveLength(28);
    expect(discovered.filter((artifact) => artifact.classification === "book")).toHaveLength(27);
    expect(discovered.filter((artifact) => artifact.classification === "metadata")).toHaveLength(1);
  });

  it("matches the full source-level counts and chapter sharding", () => {
    expect(manifest.statistics).toMatchObject({
      artifacts: 28,
      books: 27,
      chapters: 260,
      verses: 7939,
      textUnits: 7939,
      tokenOccurrences: 137741,
      paragraphBoundaries: 1282,
      bytesProcessed: 6850332,
      errors: 0,
      warnings: 0,
    });
    expect(
      manifest.books.reduce((total, book) => total + Object.keys(book.chapterFiles).length, 0),
    ).toBe(260);
  });

  it("recalculates the deterministic package digest from sorted artifact identities", () => {
    const artifacts = acquired.artifacts.map((artifact) =>
      corpusRegistry.getArtifact(artifact.id)!,
    );
    expect(calculatePackageDigest(artifacts)).toBe(
      "9512e634024ff7a9d1b0cc85f88a2081dcbcfe3a9f0971fea437039127f9885d",
    );
  });

  it("loads John 1:1-5 through Repository and KnowledgeEngine as the golden passage", async () => {
    await ScriptureRepository.loadChapter("john", 1);
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle({
      bookId: "john",
      chapter: 1,
      verseStart: 1,
      verseEnd: 5,
      versification: "sblgnt-1.2",
    })!;

    expect(bundle.passage.verses).toHaveLength(5);
    expect(bundle.passage.verses[0]!.translations["sblgnt-1.2"]).toBe(
      "Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος.",
    );
    expect(bundle.originals.status).toBe("available");
    if (bundle.originals.status !== "available") return;
    expect(bundle.originals.data).toHaveLength(61);
    expect(bundle.originals.data[0]).toMatchObject({
      id: "sblgnt:1.2:john:1:1:001",
      surface: "Ἐν",
      editionId: "sblgnt-1.2",
      position: 1,
    });
    expect(bundle.provenance).toMatchObject({
      packageId: manifest.packageId,
      datasetId: manifest.datasetId,
      sourceArtifactIds: ["artifact:sblgnt:1.2:john"],
    });
    expect(bundle.provenance.isDemo).not.toBe(true);
  });

  it("keeps lexical and morphological claims absent when the XML does not supply them", async () => {
    const chapter = await ScriptureRepository.loadChapter("matthew", 1);
    const token = chapter!.verses[0]!.original![0]!;
    expect(token.surface).toBe("Βίβλος");
    expect(token).not.toHaveProperty("lemma");
    expect(token).not.toHaveProperty("gloss");
    expect(token).not.toHaveProperty("morphology");
  });

  it("rejects dangerous XML declarations before parsing", async () => {
    const temporary = await mkdtemp(resolve(tmpdir(), "scriptorium-xml-security-"));
    try {
      const xmlPath = resolve(temporary, "John.xml");
      await writeFile(
        xmlPath,
        '<!DOCTYPE book [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><book id="Jn"><p><verse-number id="John 1:1">1:1</verse-number><w>&xxe;</w></p></book>',
        "utf8",
      );
      const packageManifest = corpusRegistry.getPackage(manifest.packageId)!;
      const sourceArtifact = corpusRegistry.getArtifact("artifact:sblgnt:1.2:john")!;
      await expect(
        new SblgntXmlAdapter().parseAndNormalize(
          {
            absolutePath: xmlPath,
            sourcePath: "data/sblgnt/xml/John.xml",
            fileName: "John.xml",
            classification: "book",
            canonicalBookId: "john",
          },
          sourceArtifact,
          packageManifest,
          "security-test",
        ),
      ).rejects.toThrow("forbidden DOCTYPE or ENTITY");
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("rejects unknown discovered book artifacts", async () => {
    const temporary = await mkdtemp(resolve(tmpdir(), "scriptorium-xml-discovery-"));
    try {
      const artifactRoot = resolve(temporary, "data/sblgnt/xml");
      await mkdir(artifactRoot, { recursive: true });
      await writeFile(resolve(artifactRoot, "Unknown.xml"), '<book id="Unknown"></book>', "utf8");
      await expect(
        new SblgntXmlAdapter().discover(temporary, corpusRegistry.getPackage(manifest.packageId)!),
      ).rejects.toThrow("Unknown SBLGNT book artifacts");
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
});
