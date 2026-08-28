import { describe, expect, it } from "vitest";
import {
  corpusPackageManifestSchema,
  CorpusRightsGate,
  rightsDeclarationSchema,
  sourceArtifactSchema,
  type CorpusTransformation,
  type ImportedDatasetReference,
  type SourceArtifact,
} from "../domain/corpus";
import {
  CORPUS_CANDIDATES,
  CORPUS_EDITIONS,
  CORPUS_PACKAGE_CANDIDATES,
} from "../fixtures/corpus-registry.fixture";
import { DEFAULT_LOCALE } from "../i18n";
import { CorpusRegistry, corpusRegistry } from "./corpus-registry";

const sourceArtifact: SourceArtifact = {
  id: "artifact-source-test",
  packageId: "pkg-sblgnt-1.2-candidate",
  role: "source",
  repository: "https://example.org/repository",
  sourcePath: "source.xml",
  sourceUrl: "https://example.org/source.xml",
  fileName: "source.xml",
  mediaType: "application/xml",
  format: "osis",
  retrievedAt: "2026-08-26T10:00:00.000Z",
  sourceRevision: "test-revision",
  checksum: { algorithm: "SHA-256", value: "a".repeat(64) },
  byteSize: 1024,
};

const normalizedArtifact: SourceArtifact = {
  id: "artifact-normalized-test",
  packageId: "pkg-sblgnt-1.2-candidate",
  role: "normalized",
  repository: "https://example.org/repository",
  sourcePath: "source.normalized.xml",
  sourceUrl: "https://example.org/source.xml",
  fileName: "source.normalized.xml",
  mediaType: "application/xml",
  format: "osis",
  retrievedAt: "2026-08-26T10:01:00.000Z",
  checksum: { algorithm: "SHA-256", value: "b".repeat(64) },
  byteSize: 1000,
  derivedFromArtifactIds: [sourceArtifact.id],
};

const transformation: CorpusTransformation = {
  id: "transformation-test",
  type: "normalize-unicode",
  tool: { name: "scriptorium-normalizer", version: "0.1.0" },
  timestamp: "2026-08-26T10:01:00.000Z",
  inputArtifactIds: [sourceArtifact.id],
  output: { artifactIds: [normalizedArtifact.id], datasetIds: ["dataset-test"] },
};

const dataset: ImportedDatasetReference = {
  id: "dataset-test",
  packageId: "pkg-sblgnt-1.2-candidate",
  transformationIds: [transformation.id],
  internalRecordType: "TextUnit",
  internalRecordIds: ["text-unit-test"],
  createdAt: "2026-08-26T10:02:00.000Z",
};

function registryWithCustodyChain(): CorpusRegistry {
  const packages = CORPUS_PACKAGE_CANDIDATES.map((manifest) =>
    manifest.id === dataset.packageId
      ? {
          ...manifest,
          sourceArtifactIds: [sourceArtifact.id],
          integrity: {
            requiredAlgorithm: "SHA-256" as const,
            status: "verified" as const,
            verifiedArtifactIds: [sourceArtifact.id],
          },
        }
      : manifest,
  );
  return new CorpusRegistry({
    corpora: CORPUS_CANDIDATES,
    editions: CORPUS_EDITIONS,
    packages,
    artifacts: [sourceArtifact, normalizedArtifact],
    transformations: [transformation],
    datasets: [dataset],
  });
}

describe("Corpus Registry identity and manifests", () => {
  it("keeps corpus identity stable and independent from its title", () => {
    expect(corpusRegistry.getCorpus("sblgnt")).toMatchObject({
      id: "sblgnt",
      name: "SBL Greek New Testament",
    });
  });

  it("gives editions their own identity under a corpus", () => {
    const edition = corpusRegistry.getEdition("sblgnt-1.2");
    expect(edition?.id).not.toBe(edition?.corpusId);
    expect(edition).toMatchObject({ id: "sblgnt-1.2", corpusId: "sblgnt", version: "1.2" });
  });

  it("requires every package artifact reference to resolve", () => {
    expect(registryWithCustodyChain().getArtifact(sourceArtifact.id)).toEqual(sourceArtifact);
    expect(
      () =>
        new CorpusRegistry({
          corpora: CORPUS_CANDIDATES,
          editions: CORPUS_EDITIONS,
          packages: [{ ...CORPUS_PACKAGE_CANDIDATES[0]!, sourceArtifactIds: ["missing-artifact"] }],
          artifacts: [],
          transformations: [],
          datasets: [],
        }),
    ).toThrow("references missing artifact");
  });

  it("validates SHA-256 checksum metadata", () => {
    expect(sourceArtifactSchema.parse(sourceArtifact).checksum).toEqual({
      algorithm: "SHA-256",
      value: "a".repeat(64),
    });
    expect(() =>
      sourceArtifactSchema.parse({
        ...sourceArtifact,
        checksum: { algorithm: "SHA-256", value: "too-short" },
      }),
    ).toThrow();
  });
});

describe("Corpus rights gate", () => {
  const verified = CORPUS_PACKAGE_CANDIDATES[0]!.rights;

  it("blocks unknown rights", () => {
    expect(CorpusRightsGate.evaluate({ ...verified, status: "unknown" }).eligible).toBe(false);
  });

  it("blocks conflicting rights metadata", () => {
    expect(corpusRegistry.canBundle("pkg-biblia-livre-unresolved")).toEqual({
      eligible: false,
      reasons: expect.arrayContaining(["rights-status:conflicting-metadata"]),
    });
  });

  it("allows verified rights with explicit redistribution permission", () => {
    expect(CorpusRightsGate.evaluate(verified)).toEqual({ eligible: true, reasons: [] });
  });

  it("rejects a blocked package that claims to be bundled", () => {
    const blocked = CORPUS_PACKAGE_CANDIDATES.find(
      (manifest) => manifest.id === "pkg-biblia-livre-unresolved",
    )!;
    expect(
      () =>
        new CorpusRegistry({
          corpora: CORPUS_CANDIDATES,
          editions: CORPUS_EDITIONS,
          packages: [{ ...blocked, status: "bundled" }],
          artifacts: [],
          transformations: [],
          datasets: [],
        }),
    ).toThrow("cannot be bundled");
  });

  it("does not allow required attribution metadata to disappear", () => {
    const { attribution: _removed, ...withoutAttribution } = verified;
    expect(() => rightsDeclarationSchema.parse(withoutAttribution)).toThrow(
      "Required attribution must be preserved",
    );
  });
});

describe("Corpus metadata and custody chain", () => {
  it("keeps corpus language independent from the interface locale", () => {
    const sblgnt = corpusRegistry.getPackage("pkg-sblgnt-1.2-candidate")!;
    expect(DEFAULT_LOCALE).toBe("pt-BR");
    expect(sblgnt.language).toBe("grc");
  });

  it("preserves text direction independently", () => {
    expect(corpusRegistry.getPackage("pkg-oshb-morphology-candidate")).toMatchObject({
      language: "hbo",
      script: "Hebr",
      direction: "rtl",
    });
  });

  it("distinguishes immutable source artifacts from normalized derivatives", () => {
    expect(sourceArtifactSchema.parse(sourceArtifact).role).toBe("source");
    expect(sourceArtifactSchema.parse(normalizedArtifact)).toMatchObject({
      role: "normalized",
      derivedFromArtifactIds: [sourceArtifact.id],
    });
  });

  it("retains artifact, transformation, dataset and internal-record provenance", () => {
    const registry = registryWithCustodyChain();
    expect(registry.getArtifact(normalizedArtifact.id)?.derivedFromArtifactIds).toEqual([
      sourceArtifact.id,
    ]);
    expect(dataset.transformationIds).toEqual([transformation.id]);
    expect(dataset.internalRecordIds).toEqual(["text-unit-test"]);
  });

  it("allows capabilities to vary by package", () => {
    const sblgnt = corpusRegistry.getPackage("pkg-sblgnt-1.2-candidate")!;
    const morphology = corpusRegistry.getPackage("pkg-oshb-morphology-candidate")!;
    expect(sblgnt.contentCapabilities).toContain("verse-text");
    expect(sblgnt.contentCapabilities).not.toContain("morphology");
    expect(morphology.contentCapabilities).toContain("morphology");
  });

  it("keeps versification as explicit package metadata", () => {
    for (const manifest of corpusRegistry.listPackages()) {
      expect(corpusPackageManifestSchema.parse(manifest).versificationScheme).toBeTruthy();
    }
  });

  it("keeps Bíblia Livre blocked until edition and artifact rights are resolved", () => {
    const candidate = corpusRegistry.getPackage("pkg-biblia-livre-unresolved")!;
    expect(candidate.rights.status).toBe("conflicting-metadata");
    expect(candidate.rights.evidence.map((evidence) => evidence.licenseId)).toEqual([
      "CC-BY-3.0-BR",
      "CC-BY-4.0",
    ]);
    expect(corpusRegistry.canBundle(candidate.id).eligible).toBe(false);
  });
});
