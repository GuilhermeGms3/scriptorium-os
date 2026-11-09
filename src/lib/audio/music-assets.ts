import { MusicTrackSchema, type MusicAssetStore, type MusicTrack } from "./ambience-contracts";

export const MAX_MUSIC_BYTES = 50 * 1024 * 1024;
export const MAX_MUSIC_LIBRARY_BYTES = 500 * 1024 * 1024;
export const MAX_MUSIC_TRACKS = 100;
const validId = (id: string) => {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("Trilha inválida.");
};

/** Versioned local media cache, not a second knowledge/workspace database. No SSR access. */
export class BrowserMusicAssetStore implements MusicAssetStore {
  #database: Promise<IDBDatabase> | undefined;
  #open() {
    this.#database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("scriptorium-local-audio", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("tracks", { keyPath: "id" });
        request.result.createObjectStore("files");
      };
      request.onerror = () => reject(new Error("Armazenamento local de música indisponível."));
      request.onblocked = () =>
        reject(new Error("Feche outras abas antigas para atualizar o armazenamento de música."));
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
    return this.#database;
  }
  async list() {
    const database = await this.#open();
    return new Promise<MusicTrack[]>((resolve, reject) => {
      const request = database.transaction("tracks").objectStore("tracks").getAll();
      request.onsuccess = () => {
        const result = MusicTrackSchema.array().max(MAX_MUSIC_TRACKS).safeParse(request.result);
        if (result.success) resolve(result.data);
        else reject(new Error("Catálogo musical inválido; seus outros dados não foram alterados."));
      };
      request.onerror = () => reject(new Error("Não foi possível consultar as músicas locais."));
    });
  }
  async read(id: string) {
    validId(id);
    const database = await this.#open();
    return new Promise<Blob>((resolve, reject) => {
      const request = database.transaction("files").objectStore("files").get(id);
      request.onsuccess = () =>
        request.result instanceof Blob
          ? resolve(request.result)
          : reject(new Error("Arquivo musical ausente. Importe-o novamente."));
      request.onerror = () => reject(new Error("Não foi possível abrir o arquivo musical."));
    });
  }
  async put(input: MusicTrack, blob: Blob, signal?: AbortSignal) {
    const track = MusicTrackSchema.parse(input);
    if (blob.size !== track.sizeBytes) throw new Error("Tamanho da música divergente.");
    const database = await this.#open();
    if (signal?.aborted) throw new Error("Importação cancelada.");
    return new Promise<MusicTrack>((resolve, reject) => {
      const transaction = database.transaction(["tracks", "files"], "readwrite");
      const abort = () => transaction.abort();
      signal?.addEventListener("abort", abort, { once: true });
      let result = track;
      let issue = "Não foi possível guardar a música. Verifique o espaço disponível.";
      const request = transaction.objectStore("tracks").getAll();
      request.onsuccess = () => {
        const parsed = MusicTrackSchema.array().safeParse(request.result);
        if (!parsed.success) {
          transaction.abort();
          return;
        }
        const existing = parsed.data.find((entry) => entry.id === track.id);
        if (existing) {
          result = existing;
          // Reimport repairs an absent file without overwriting title/category.
          transaction.objectStore("files").put(blob, track.id);
          return;
        }
        if (
          parsed.data.length >= MAX_MUSIC_TRACKS ||
          parsed.data.reduce((sum, entry) => sum + entry.sizeBytes, blob.size) >
            MAX_MUSIC_LIBRARY_BYTES
        ) {
          issue = "Limite local: 100 músicas ou 500 MB. Remova uma trilha antes de importar outra.";
          transaction.abort();
          return;
        }
        transaction.objectStore("tracks").put(track);
        transaction.objectStore("files").put(blob, track.id);
      };
      transaction.oncomplete = () => {
        signal?.removeEventListener("abort", abort);
        resolve(result);
      };
      transaction.onerror = transaction.onabort = () => {
        signal?.removeEventListener("abort", abort);
        reject(new Error(signal?.aborted ? "Importação cancelada." : issue));
      };
    });
  }
  async update(input: MusicTrack) {
    const track = MusicTrackSchema.parse(input);
    const database = await this.#open();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("tracks", "readwrite");
      const store = transaction.objectStore("tracks");
      const request = store.get(track.id);
      request.onsuccess = () => {
        if (!request.result) transaction.abort();
        else store.put(track);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(new Error("Não foi possível alterar a trilha."));
    });
  }
  async remove(id: string) {
    validId(id);
    const database = await this.#open();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["tracks", "files"], "readwrite");
      transaction.objectStore("tracks").delete(id);
      transaction.objectStore("files").delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(new Error("Não foi possível remover a cópia musical local."));
    });
  }
}
