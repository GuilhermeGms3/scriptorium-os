import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { ExtractedPrivateDocument } from "../domain/private-document";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { PrivateDocumentStorage } from "../private-documents/private-document-storage";

const MAX_FILE_BYTES = 256 * 1024 * 1024;
const MAX_PAGES = 5_000;

export interface PrivateDocumentImportProgress {
  phase: "validating" | "extracting" | "storing" | "indexing" | "complete";
  page?: number;
  pageCount?: number;
  message: string;
}

export interface PrivateDocumentImportResult {
  documentId: string;
  sourceId: string;
  title: string;
  pageCount: number;
  textPageCount: number;
  language: string;
  textLayerStatus: "complete" | "partial";
  duplicate: boolean;
}

const LANGUAGE_MARKERS = {
  "pt-BR":
    /\b(?:a|ao|aos|como|com|da|das|de|do|dos|e|em|entre|não|o|os|para|por|que|se|uma|um)\b/giu,
  en: /\b(?:a|an|and|as|by|for|from|in|is|not|of|on|or|that|the|this|to|with)\b/giu,
  es: /\b(?:a|como|con|de|del|el|en|es|la|las|los|no|para|por|que|se|una|un|y)\b/giu,
} as const;

export function detectDocumentLanguage(text: string): string {
  const sample = text.normalize("NFC").slice(0, 80_000);
  const hebrew = (sample.match(/[\u0590-\u05ff]/gu) ?? []).length;
  const greek = (sample.match(/[\u0370-\u03ff\u1f00-\u1fff]/gu) ?? []).length;
  const letters = (sample.match(/\p{L}/gu) ?? []).length;
  if (letters > 0 && hebrew / letters >= 0.35) return "he";
  if (letters > 0 && greek / letters >= 0.35) return "el";
  const ranked = Object.entries(LANGUAGE_MARKERS)
    .map(([language, pattern]) => ({ language, score: (sample.match(pattern) ?? []).length }))
    .sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 6 ? ranked[0].language : "und";
}

function report(
  listener: ((progress: PrivateDocumentImportProgress) => void) | undefined,
  progress: PrivateDocumentImportProgress,
): void {
  listener?.(progress);
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function humanizeFilename(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/^pdfcoffee\.com[-_\s]*/i, "")
    .replace(/[-_\s]+pdf[-_\s]+free$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function usableMetadataTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.normalize("NFC").replace(/\s+/g, " ").trim();
  return title.length >= 4 && title.toLocaleLowerCase() !== "untitled" ? title : null;
}

function titleTokens(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/\p{M}+/gu, "")
      .toLocaleLowerCase()
      .match(/[a-z0-9]{3,}/gu)
      ?.filter((token) => !["arquivo", "documento", "microsoft", "word", "pdf"].includes(token)) ??
      [],
  );
}

export function chooseDocumentTitle(metadataTitle: unknown, filename: string): string {
  const filenameTitle = humanizeFilename(filename);
  const metadata = usableMetadataTitle(metadataTitle);
  if (!metadata) return filenameTitle;
  if (/^\d+$/u.test(filenameTitle)) return metadata;
  if (/^(?:microsoft word|documento\d*|untitled|pdfcoffee\.com)\b/iu.test(metadata))
    return filenameTitle;
  const filenameTokens = titleTokens(filenameTitle);
  const metadataTokens = titleTokens(metadata);
  if (filenameTokens.size >= 2 && metadataTokens.size >= 2) {
    const shared = [...filenameTokens].filter((token) => metadataTokens.has(token));
    if (!shared.length) return filenameTitle;
  }
  return metadata;
}

function textFromItems(items: unknown[]): { text: string; itemCount: number } {
  const parts: string[] = [];
  let textualItems = 0;
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item)) continue;
    const value = (item as { str?: unknown; hasEOL?: unknown }).str;
    if (typeof value !== "string") continue;
    textualItems += 1;
    const normalized = value
      .normalize("NFC")
      .replace(/\p{Cc}+/gu, (characters) =>
        [...characters]
          .map((character) => (character === "\n" || character === "\r" ? character : " "))
          .join(""),
      );
    if (normalized) parts.push(normalized);
    if ((item as { hasEOL?: unknown }).hasEOL === true) parts.push("\n");
    else parts.push(" ");
  }
  return {
    text: parts
      .join("")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    itemCount: textualItems,
  };
}

async function validatePdf(file: File, buffer: ArrayBuffer): Promise<void> {
  if (file.size <= 0) throw new Error("O PDF está vazio.");
  if (file.size > MAX_FILE_BYTES)
    throw new Error(`O PDF ultrapassa o limite local de ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  const signature = new TextDecoder("ascii").decode(buffer.slice(0, 5));
  if (signature !== "%PDF-")
    throw new Error("O arquivo selecionado não possui assinatura PDF válida.");
}

async function extract(
  file: File,
  buffer: ArrayBuffer,
  checksum: string,
  listener?: (progress: PrivateDocumentImportProgress) => void,
): Promise<ExtractedPrivateDocument> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false });
  const pdf = await task.promise;
  try {
    if (pdf.numPages <= 0 || pdf.numPages > MAX_PAGES)
      throw new Error(`O PDF possui uma quantidade de páginas não suportada: ${pdf.numPages}.`);
    const metadata = await pdf.getMetadata().catch(() => null);
    const info = metadata?.info as { Title?: unknown } | undefined;
    const title = chooseDocumentTitle(info?.Title, file.name);
    const pages: ExtractedPrivateDocument["pages"] = [];
    let textPageCount = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      report(listener, {
        phase: "extracting",
        page: pageNumber,
        pageCount: pdf.numPages,
        message: `Extraindo página ${pageNumber} de ${pdf.numPages}…`,
      });
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ disableNormalization: false });
      const extracted = textFromItems(content.items as unknown[]);
      if (extracted.text) textPageCount += 1;
      pages.push({
        pageIndex: pageNumber - 1,
        pageLabel: String(pageNumber),
        text: extracted.text,
        itemCount: extracted.itemCount,
      });
      page.cleanup();
    }
    const language = detectDocumentLanguage(
      pages
        .filter((page) => page.text)
        .slice(0, 20)
        .map((page) => page.text)
        .join("\n"),
    );
    return {
      title,
      language,
      originalName: file.name,
      mimeType: "application/pdf",
      sizeBytes: file.size,
      checksum,
      pageCount: pdf.numPages,
      textPageCount,
      extractionMethod: "pdf-text-layer",
      pages,
    };
  } finally {
    await task.destroy();
  }
}

export const PrivateDocumentImportService = {
  async importPdf(
    file: File,
    listener?: (progress: PrivateDocumentImportProgress) => void,
  ): Promise<PrivateDocumentImportResult> {
    report(listener, { phase: "validating", message: `Validando ${file.name}…` });
    const buffer = await file.arrayBuffer();
    await validatePdf(file, buffer);
    const checksum = await sha256(buffer);
    const existing = await PrivateDocumentRepository.findByChecksum(checksum);
    if (existing) {
      const preferredTitle = chooseDocumentTitle(existing.title, file.name);
      const current =
        preferredTitle === existing.title
          ? existing
          : await PrivateDocumentRepository.updateTitle(existing.id, preferredTitle);
      report(listener, { phase: "complete", message: `${current.title} já estava indexado.` });
      return {
        ...current,
        documentId: current.id,
        language: current.language ?? "und",
        textLayerStatus: current.textPageCount === current.pageCount ? "complete" : "partial",
        duplicate: true,
      };
    }
    const extracted = await extract(file, buffer, checksum, listener);
    if (!extracted.textPageCount)
      throw new Error("Nenhuma camada textual foi encontrada; este PDF exige OCR local.");
    report(listener, { phase: "storing", message: "Armazenando o PDF no OPFS privado…" });
    const storageReference = await PrivateDocumentStorage.persist(file, checksum);
    try {
      report(listener, {
        phase: "indexing",
        message: `Indexando ${extracted.textPageCount} páginas pesquisáveis…`,
      });
      const result = await PrivateDocumentRepository.importDocument(extracted, storageReference);
      report(listener, {
        phase: "complete",
        message: `${extracted.title} foi indexado localmente.`,
      });
      return {
        documentId: result.document.id,
        sourceId: result.document.sourceId,
        title: result.document.title,
        pageCount: result.document.pageCount,
        textPageCount: result.document.textPageCount,
        language: result.document.language ?? "und",
        textLayerStatus:
          result.document.textPageCount === result.document.pageCount ? "complete" : "partial",
        duplicate: result.duplicate,
      };
    } catch (error) {
      await PrivateDocumentStorage.remove(checksum);
      throw error;
    }
  },
};
