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

export const PrivateDocumentStorage = {
  async persist(file: File, checksum: string): Promise<string> {
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
    const folder = await directory();
    await folder.removeEntry(`${checksum}.pdf`).catch(() => undefined);
  },
};
