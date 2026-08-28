import { z } from "zod";
import type { ResourceLicense } from "./library";
import type { Corpus, Edition, LanguageCode, TextDirection } from "./scripture";
import type { Provenance } from "./source";

export type CorpusIdentity = Corpus;

export type CorpusEdition = Omit<Edition, "corpusId" | "kind"> & {
  corpusId: string;
  kind: Edition["kind"] | "linguistic-dataset";
  version?: string;
  revision?: string;
  releaseDate?: string;
};

export type RightsStatus =
  "verified" | "needs-review" | "conflicting-metadata" | "restricted" | "unknown";

export type RightsEvidenceKind =
  | "project-license"
  | "corpus-rights-file"
  | "project-website"
  | "official-repository"
  | "trusted-distributor"
  | "third-party-mirror";

export interface RightsEvidence {
  id: string;
  sourceUrl: string;
  sourceKind: RightsEvidenceKind;
  observedAt: string;
  licenseId?: string;
  licenseName?: string;
  note?: string;
}

export interface Attribution {
  work: string;
  authorsOrEditors: string[];
  copyright?: string;
  license: string;
  canonicalSource: string;
  requiredText?: string;
  recommendedCitation?: string;
}

export interface RightsDeclaration {
  id: string;
  status: RightsStatus;
  license: ResourceLicense;
  copyrightHolder?: string;
  declaredBy: string;
  declaredAtSource: string;
  attribution?: Attribution;
  evidence: RightsEvidence[];
  reviewNote?: string;
}

export type CorpusFormat =
  | "osis"
  | "usfm"
  | "tei"
  | "xml"
  | "json"
  | "tsv"
  | "zip"
  | "scriptorium-package"
  | "multiple"
  | "unknown";

export type ArtifactRole = "source" | "normalized";

export interface Checksum {
  algorithm: "SHA-256";
  value: string;
}

export interface SourceArtifact {
  id: string;
  packageId: string;
  role: ArtifactRole;
  repository: string;
  sourcePath: string;
  sourceUrl: string;
  fileName: string;
  mediaType: string;
  format: CorpusFormat;
  retrievedAt: string;
  sourceRevision?: string | undefined;
  checksum: Checksum;
  byteSize: number;
  derivedFromArtifactIds?: string[] | undefined;
}

export type TransformationType =
  | "normalize-unicode"
  | "convert-usfm"
  | "convert-osis"
  | "split-verses"
  | "tokenize"
  | "normalize-references"
  | "map-versification"
  | "attach-morphology"
  | "parse-xml"
  | "build-chapter-shards";

export interface CorpusTransformation {
  id: string;
  type: TransformationType;
  tool: { name: string; version: string };
  timestamp: string;
  inputArtifactIds: string[];
  output: { artifactIds: string[]; datasetIds: string[] };
  notes?: string;
}

export interface ImportedDatasetReference {
  id: string;
  packageId: string;
  transformationIds: string[];
  internalRecordType: string;
  internalRecordIds: string[];
  shardPaths?: string[];
  recordCount?: number;
  recordIdPattern?: string;
  createdAt: string;
}

export type ContentCapability =
  | "verse-text"
  | "paragraphs"
  | "tokens"
  | "lemmas"
  | "morphology"
  | "strong-numbers"
  | "footnotes"
  | "cross-references"
  | "variants"
  | "apparatus"
  | "headings";

export interface CorpusPackageManifest {
  id: string;
  corpusId: string;
  editionId: string;
  title: string;
  shortName: string;
  language: LanguageCode;
  script: string;
  direction: TextDirection;
  version?: string;
  revision?: string;
  releaseDate?: string;
  canonicalSource: string;
  sourceRepository?: string;
  acquisitionPlan?: {
    repository: string;
    commitSha: string;
    artifactRoot: string;
    artifactPattern: string;
    expectedBookIds: string[];
  };
  sourceArtifactIds: string[];
  format: CorpusFormat;
  versificationScheme: string;
  rights: RightsDeclaration;
  provenance: Provenance;
  contentCapabilities: ContentCapability[];
  integrity: {
    requiredAlgorithm: "SHA-256";
    status: "not-verified" | "verified" | "failed";
    verifiedArtifactIds: string[];
    packageDigest?: Checksum;
  };
  status: "candidate" | "ready-for-import" | "imported" | "bundled";
}

const permissionDecisionSchema = z.enum(["yes", "no", "unknown", "conditional"]);

const resourceLicenseSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  url: z.string().url().optional(),
  status: z
    .enum([
      "public-domain",
      "open-license",
      "restricted",
      "permission-required",
      "personal",
      "unknown",
    ])
    .optional(),
  copyrightHolder: z.string().min(1).optional(),
  mayStore: z.boolean().optional(),
  mayRedistribute: z.boolean().optional(),
  mayModify: z.boolean().optional(),
  mayUseCommercially: z.boolean().optional(),
  redistributionAllowed: z.boolean(),
  commercialUseAllowed: z.boolean().optional(),
  attributionRequired: z.boolean().optional(),
  attributionText: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
  permissions: z
    .object({
      redistribution: permissionDecisionSchema,
      modification: permissionDecisionSchema,
      commercialUse: permissionDecisionSchema,
      shareAlike: permissionDecisionSchema,
      attribution: permissionDecisionSchema,
    })
    .optional(),
});

export const checksumSchema = z.object({
  algorithm: z.literal("SHA-256"),
  value: z.string().regex(/^[a-fA-F0-9]{64}$/, "SHA-256 must contain 64 hexadecimal characters"),
});

export const sourceArtifactSchema = z
  .object({
    id: z.string().min(1),
    packageId: z.string().min(1),
    role: z.enum(["source", "normalized"]),
    repository: z.string().url(),
    sourcePath: z.string().min(1),
    sourceUrl: z.string().url(),
    fileName: z.string().min(1),
    mediaType: z.string().min(1),
    format: z.enum([
      "osis",
      "usfm",
      "tei",
      "xml",
      "json",
      "tsv",
      "zip",
      "scriptorium-package",
      "multiple",
      "unknown",
    ]),
    retrievedAt: z.string().datetime(),
    sourceRevision: z.string().min(1).optional(),
    checksum: checksumSchema,
    byteSize: z.number().int().nonnegative(),
    derivedFromArtifactIds: z.array(z.string().min(1)).optional(),
  })
  .superRefine((artifact, ctx) => {
    if (artifact.role === "source" && artifact.derivedFromArtifactIds?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["derivedFromArtifactIds"],
        message: "A source artifact cannot be derived from another artifact.",
      });
    }
    if (artifact.role === "normalized" && !artifact.derivedFromArtifactIds?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["derivedFromArtifactIds"],
        message: "A normalized artifact must identify its source artifact.",
      });
    }
  });

const attributionSchema = z.object({
  work: z.string().min(1),
  authorsOrEditors: z.array(z.string().min(1)),
  copyright: z.string().min(1).optional(),
  license: z.string().min(1),
  canonicalSource: z.string().url(),
  requiredText: z.string().min(1).optional(),
  recommendedCitation: z.string().min(1).optional(),
});

export const rightsDeclarationSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(["verified", "needs-review", "conflicting-metadata", "restricted", "unknown"]),
    license: resourceLicenseSchema,
    copyrightHolder: z.string().min(1).optional(),
    declaredBy: z.string().min(1),
    declaredAtSource: z.string().url(),
    attribution: attributionSchema.optional(),
    evidence: z.array(
      z.object({
        id: z.string().min(1),
        sourceUrl: z.string().url(),
        sourceKind: z.enum([
          "project-license",
          "corpus-rights-file",
          "project-website",
          "official-repository",
          "trusted-distributor",
          "third-party-mirror",
        ]),
        observedAt: z.string().datetime(),
        licenseId: z.string().min(1).optional(),
        licenseName: z.string().min(1).optional(),
        note: z.string().min(1).optional(),
      }),
    ),
    reviewNote: z.string().min(1).optional(),
  })
  .superRefine((rights, ctx) => {
    const attributionRequired =
      rights.license.attributionRequired === true ||
      rights.license.permissions?.attribution === "yes" ||
      rights.license.permissions?.attribution === "conditional";
    if (attributionRequired && !rights.attribution) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attribution"],
        message: "Required attribution must be preserved as structured metadata.",
      });
    }
    if (rights.status === "verified" && rights.evidence.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: "Verified rights require evidence from a registered source.",
      });
    }
  });

export const corpusPackageManifestSchema = z.object({
  id: z.string().min(1),
  corpusId: z.string().min(1),
  editionId: z.string().min(1),
  title: z.string().min(1),
  shortName: z.string().min(1),
  language: z.string().min(1),
  script: z.string().regex(/^[A-Z][a-z]{3}$/, "Script must be an ISO 15924 code"),
  direction: z.enum(["ltr", "rtl"]),
  version: z.string().min(1).optional(),
  revision: z.string().min(1).optional(),
  releaseDate: z.string().date().optional(),
  canonicalSource: z.string().url(),
  sourceRepository: z.string().url().optional(),
  acquisitionPlan: z
    .object({
      repository: z.string().url(),
      commitSha: z.string().regex(/^[a-f0-9]{40}$/, "Commit SHA must be immutable and complete"),
      artifactRoot: z.string().min(1),
      artifactPattern: z.string().min(1),
      expectedBookIds: z.array(z.string().min(1)).min(1),
    })
    .optional(),
  sourceArtifactIds: z.array(z.string().min(1)),
  format: z.enum([
    "osis",
    "usfm",
    "tei",
    "xml",
    "json",
    "tsv",
    "zip",
    "scriptorium-package",
    "multiple",
    "unknown",
  ]),
  versificationScheme: z.string().min(1),
  rights: rightsDeclarationSchema,
  provenance: z.object({
    acquisition: z.enum(["bundled", "imported", "user-provided", "editorial", "generated"]),
    creationMethod: z.enum(["human", "machine-assisted", "ai-generated"]),
    isDemo: z.boolean().optional(),
    note: z.string().min(1).optional(),
  }),
  contentCapabilities: z.array(
    z.enum([
      "verse-text",
      "paragraphs",
      "tokens",
      "lemmas",
      "morphology",
      "strong-numbers",
      "footnotes",
      "cross-references",
      "variants",
      "apparatus",
      "headings",
    ]),
  ),
  integrity: z.object({
    requiredAlgorithm: z.literal("SHA-256"),
    status: z.enum(["not-verified", "verified", "failed"]),
    verifiedArtifactIds: z.array(z.string().min(1)),
    packageDigest: checksumSchema.optional(),
  }),
  status: z.enum(["candidate", "ready-for-import", "imported", "bundled"]),
});

export interface RightsGateDecision {
  eligible: boolean;
  reasons: string[];
}

export const CorpusRightsGate = {
  evaluate(rights: RightsDeclaration): RightsGateDecision {
    const reasons: string[] = [];
    if (rights.status !== "verified") reasons.push(`rights-status:${rights.status}`);
    if (
      rights.license.permissions?.redistribution !== "yes" ||
      rights.license.redistributionAllowed !== true
    ) {
      reasons.push("redistribution-not-explicitly-allowed");
    }
    if (rights.license.attributionRequired && !rights.attribution) {
      reasons.push("required-attribution-missing");
    }
    return { eligible: reasons.length === 0, reasons };
  },
};
