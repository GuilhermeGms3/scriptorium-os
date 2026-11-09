import { createHash } from "node:crypto";

/**
 * Versão do construtor dos pacotes do corpus (Bíblias, TAGNT, léxicos), parte do fingerprint de
 * cada pacote: subir sempre que a indexação mudar, para que a cache não reaproveite pacotes
 * construídos pelo código antigo. Um aumento reconstrói todos os pacotes na próxima execução.
 */
export const BUILDER_VERSION = 1;

/**
 * The label hashed into the fingerprint. Version 1 keeps the labels the packages were built with,
 * so the packages already in `public/corpus-packages` are reused instead of rebuilt.
 */
export function builderLabel(historicLabel: string, builderVersion: number): string {
  return builderVersion === 1 ? historicLabel : `${historicLabel}+builder.${builderVersion}`;
}

export interface CorpusPackageFingerprintInput {
  schemaVersion: number;
  /** WLC carries its own historic revision (the morphology decoder of 10.1.2). */
  wlc: boolean;
  definition: unknown;
  /** SHA-256 of the generated corpus manifest. */
  sourceManifest: string;
  /** SHA-256 over every generated chapter file. */
  generatedContent: string;
  /** SHA-256 of the auxiliary input (TAGNT manifest for SBLGNT, source lock for WLC). */
  relevantAuxiliary: string;
}

export function corpusPackageFingerprint(
  input: CorpusPackageFingerprintInput,
  builderVersion = BUILDER_VERSION,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        schemaVersion: input.schemaVersion,
        builderVersion: builderLabel(
          input.wlc ? "corpus-runtime-10.1.2" : "corpus-runtime-10.1.1",
          builderVersion,
        ),
        definition: input.definition,
        sourceManifest: input.sourceManifest,
        generatedContent: input.generatedContent,
        relevantAuxiliary: input.relevantAuxiliary,
      }),
    )
    .digest("hex");
}
