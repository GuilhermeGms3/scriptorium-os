import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { ExtractedPrivateDocument } from "../domain/private-document";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { PrivateDocumentStorage } from "../private-documents/private-document-storage";

const MAX_FILE_BYTES = 200 * 1024 * 1024;
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
  duplicate: boolean;
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
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function usableMetadataTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.normalize("NFC").replace(/\s+/g, " ").trim();
  return title.length >= 4 && title.toLocaleLowerCase() !== "untitled" ? title : null;
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
    const title = usableMetadataTitle(info?.Title) ?? humanizeFilename(file.name);
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
    return {
      title,
      language: "pt-BR",
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
      report(listener, { phase: "complete", message: `${existing.title} já estava indexado.` });
      return { ...existing, documentId: existing.id, duplicate: true };
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
        duplicate: result.duplicate,
      };
    } catch (error) {
      await PrivateDocumentStorage.remove(checksum);
      throw error;
    }
  },
};
