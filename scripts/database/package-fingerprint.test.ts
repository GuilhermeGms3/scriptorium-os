import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BUILDER_VERSION,
  corpusPackageFingerprint,
  type CorpusPackageFingerprintInput,
} from "./corpus-package-fingerprint";
import {
  BUILDER_VERSION as PRIMARY_SOURCE_BUILDER_VERSION,
  primarySourceFingerprint,
  type PrimarySourceFingerprintInput,
} from "./build-primary-source-index";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const corpusPackage = (wlc: boolean): CorpusPackageFingerprintInput => ({
  schemaVersion: 11,
  wlc,
  definition: { generatedDirectory: wlc ? "generated/corpora/wlc" : "generated/corpora/sblgnt" },
  sourceManifest: "a".repeat(64),
  generatedContent: "b".repeat(64),
  relevantAuxiliary: "c".repeat(64),
});

const primarySource: PrimarySourceFingerprintInput = {
  schemaVersion: 11,
  editionId: "didache-pd-en-1",
  sourceChecksums: ["d".repeat(64)],
  workShape: [["work:didache", 16, "e".repeat(64)]],
};

describe("BUILDER_VERSION in the corpus build cache", () => {
  it("changes the fingerprint of the same package when the builder version changes", () => {
    for (const wlc of [false, true])
      expect(corpusPackageFingerprint(corpusPackage(wlc), BUILDER_VERSION + 1)).not.toBe(
        corpusPackageFingerprint(corpusPackage(wlc), BUILDER_VERSION),
      );
  });

  it("keeps the fingerprint of the packages already built, so they are reused", () => {
    for (const [wlc, label] of [
      [false, "corpus-runtime-10.1.1"],
      [true, "corpus-runtime-10.1.2"],
    ] as const) {
      const input = corpusPackage(wlc);
      expect(corpusPackageFingerprint(input)).toBe(
        sha256(
          JSON.stringify({
            schemaVersion: input.schemaVersion,
            builderVersion: label,
            definition: input.definition,
            sourceManifest: input.sourceManifest,
            generatedContent: input.generatedContent,
            relevantAuxiliary: input.relevantAuxiliary,
          }),
        ),
      );
    }
  });
});

describe("BUILDER_VERSION in the primary-source build cache", () => {
  it("changes the fingerprint of the same package when the builder version changes", () => {
    expect(primarySourceFingerprint(primarySource, PRIMARY_SOURCE_BUILDER_VERSION + 1)).not.toBe(
      primarySourceFingerprint(primarySource, PRIMARY_SOURCE_BUILDER_VERSION),
    );
  });

  it("keeps the fingerprint of the packages already built", () => {
    expect(primarySourceFingerprint(primarySource)).toBe(
      sha256(
        JSON.stringify({
          schemaVersion: primarySource.schemaVersion,
          parserVersion: "primary-sources-1.2.0",
          builderVersion: "primary-sources-1.2.0",
          editionId: primarySource.editionId,
          sourceChecksums: primarySource.sourceChecksums,
          workShape: primarySource.workShape,
        }),
      ),
    );
  });
});
