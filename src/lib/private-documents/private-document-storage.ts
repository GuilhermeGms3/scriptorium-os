import { installationAvailable, installationFetch } from "../workspace-runtime/installation-client";
const ROOT_DIRECTORY = "scriptorium";
const DOCUMENT_DIRECTORY = "private-documents";

function requireBrowserStorage(): StorageManager & {
  getDirectory(): Promise<FileSystemDirectoryHandle>;
} {
  if (typeof navigator === "undefined" || !("storage" in navigator))
    throw new Error("O armazenamento privado só está disponível no navegador.");
  const storage = navigator.storage as StorageManager & {
    getDirectory?: () => Promise<FileSystemDirectoryHandle>;
  };
  if (!storage.getDirectory)
    throw new Error("Este navegador não oferece armazenamento OPFS para documentos privados.");
  return storage as StorageManager & { getDirectory(): Promise<FileSystemDirectoryHandle> };
}

async function directory(): Promise<FileSystemDirectoryHandle> {
  const root = await requireBrowserStorage().getDirectory();
  const application = await root.getDirectoryHandle(ROOT_DIRECTORY, { create: true });
  return application.getDirectoryHandle(DOCUMENT_DIRECTORY, { create: true });
}
export async function readBrowserOriginal(checksum: string): Promise<File> {
  if (!/^[a-f0-9]{64}$/iu.test(checksum)) throw new Error("Checksum inválido.");
  return (await (await directory()).getFileHandle(`${checksum}.pdf`)).getFile();
}

export const PrivateDocumentStorage = {
  async read(checksum: string): Promise<File> {
    if (!/^[a-f0-9]{64}$/iu.test(checksum)) throw new Error("Checksum do documento inválido.");
    if (await installationAvailable())
      return new File(
        [await (await installationFetch(`documents/${checksum}`)).blob()],
        `${checksum}.pdf`,
        { type: "application/pdf" },
      );
    return (await (await directory()).getFileHandle(`${checksum}.pdf`)).getFile();
  },
  async persist(file: File, checksum: string): Promise<string> {
    if (!/^[a-f0-9]{64}$/iu.test(checksum)) throw new Error("Checksum do documento inválido.");
    if (await installationAvailable()) {
      await installationFetch(`documents/${checksum}`, { method: "PUT", body: file });
      return `installation:/documents/${checksum}.pdf`;
    }
    const target = await (await directory()).getFileHandle(`${checksum}.pdf`, { create: true });
    const writer = await target.createWritable();
    try {
      await writer.write(file);
      await writer.close();
    } catch (error) {
      await writer.abort().catch(() => undefined);
      throw error;
    }
    return `opfs:/${ROOT_DIRECTORY}/${DOCUMENT_DIRECTORY}/${checksum}.pdf`;
  },

  async remove(checksum: string): Promise<void> {
    if (await installationAvailable())
      throw new Error("PDF preservado na instalação; exclusão física exige manutenção com backup.");
    const folder = await directory();
    await folder.removeEntry(`${checksum}.pdf`).catch(() => undefined);
  },
};
