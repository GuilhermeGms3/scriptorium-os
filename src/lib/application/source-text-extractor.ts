import { ImportValidationError } from "../domain/errors";

export interface ExtractedSourceText {
  mimeType: "text/plain" | "text/markdown";
  text: string;
  normalizedSearchText: string;
}

export interface SourceTextExtractor {
  supports(mimeType: string, fileName?: string): boolean;
  extract(file: Blob, fileName?: string): Promise<ExtractedSourceText>;
}

const MAX_TEXT_ASSET_BYTES = 10 * 1024 * 1024;

/** Safe baseline extractor. PDF/EPUB/OCR adapters can implement the same boundary later. */
export const PlainTextSourceExtractor: SourceTextExtractor = {
  supports(mimeType, fileName) {
    return (
      mimeType === "text/plain" ||
      mimeType === "text/markdown" ||
      Boolean(fileName?.toLocaleLowerCase().match(/\.(txt|md|markdown)$/))
    );
  },
  async extract(file, fileName) {
    if (!this.supports(file.type, fileName)) {
      throw new ImportValidationError(`Unsupported text asset type: ${file.type || "unknown"}.`);
    }
    if (file.size > MAX_TEXT_ASSET_BYTES) {
      throw new ImportValidationError("Text asset exceeds the 10 MiB local extraction limit.");
    }
    const text = (await file.text()).normalize("NFC");
    const mimeType =
      file.type === "text/markdown" || fileName?.toLocaleLowerCase().match(/\.(md|markdown)$/)
        ? "text/markdown"
        : "text/plain";
    return {
      mimeType,
      text,
      normalizedSearchText: text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(),
    };
  },
};
