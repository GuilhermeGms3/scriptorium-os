import {
  CorpusPackageManifestSchema,
  type CorpusPackageManifest,
  type CorpusPackageState,
  type CorpusStorage,
} from "./contracts";
import {
  CorpusNotInstalledError,
  PackageIntegrityError,
  PackageUnavailableError,
  StorageUnavailableError,
} from "../domain/errors";
import { SQLiteCorpusStorage } from "./sqlite-corpus-storage";

interface RuntimeRegistryDocument {
  schemaVersion: 1;
  packages: CorpusPackageManifest[];
}
const CACHE_NAME = "scriptorium-corpus-packages-v1";
const ENABLED_KEY = "scriptorium.corpus.enabled.v1";

async function publicAsset(path: string): Promise<Response> {
  if (import.meta.env.SSR || import.meta.env.MODE === "test") {
    const [{ readFile }, { resolve }] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    return new Response(await readFile(resolve(process.cwd(), "public", path.replace(/^\//, ""))));
  }
  const cached = "caches" in globalThis ? await caches.match(path) : undefined;
  if (cached) return cached;
  const response = await fetch(path);
  if (!response.ok)
    throw new StorageUnavailableError(`Unable to load ${path}: HTTP ${response.status}.`);
  return response;
}
async function responseBytes(path: string): Promise<Uint8Array> {
  return new Uint8Array(await (await publicAsset(path)).arrayBuffer());
}
async function checksum(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}
function packagePaths(
  manifest: CorpusPackageManifest,
): { path: string; checksum: string; workId?: string }[] {
  return manifest.parts.length
    ? manifest.parts.map((part) => ({
        path: part.databasePath,
        checksum: part.checksum,
        ...(part.workId ? { workId: part.workId } : {}),
      }))
    : [{ path: manifest.databasePath, checksum: manifest.checksum }];
}

export class CorpusPackageRegistry {
  #manifests: CorpusPackageManifest[] | null = null;
  readonly #enabled = new Set<string>();
  readonly #loaded = new Map<string, Promise<CorpusStorage>>();
  readonly #states = new Map<string, CorpusPackageState>();

  async listAvailable(): Promise<CorpusPackageManifest[]> {
    if (this.#manifests) return this.#manifests;
    const document = JSON.parse(
      new TextDecoder().decode(await responseBytes("/corpus-packages/registry.json")),
    ) as RuntimeRegistryDocument;
    this.#manifests = document.packages.map((manifest) =>
      CorpusPackageManifestSchema.parse(manifest),
    );
    const saved =
      typeof window !== "undefined"
        ? (JSON.parse(window.localStorage.getItem(ENABLED_KEY) ?? "null") as string[] | null)
        : null;
    (saved ?? this.#manifests.map((manifest) => manifest.editionId)).forEach((id) =>
      this.#enabled.add(id),
    );
    return this.#manifests;
  }
  getAvailablePackages(): Promise<CorpusPackageManifest[]> {
    return this.listAvailable();
  }
  async listInstalled(): Promise<CorpusPackageManifest[]> {
    if (typeof caches === "undefined") return [];
    const cache = await caches.open(CACHE_NAME);
    const result: CorpusPackageManifest[] = [];
    for (const manifest of await this.listAvailable()) {
      const paths = packagePaths(manifest);
      if ((await Promise.all(paths.map((item) => cache.match(item.path)))).every(Boolean))
        result.push(manifest);
    }
    return result;
  }
  getInstalledPackages(): Promise<CorpusPackageManifest[]> {
    return this.listInstalled();
  }
  async listEnabled(): Promise<CorpusPackageManifest[]> {
    return (await this.listAvailable()).filter((manifest) => this.#enabled.has(manifest.editionId));
  }
  async getPackageState(editionId: string): Promise<CorpusPackageState> {
    const transient = this.#states.get(editionId);
    if (transient) return transient;
    const manifest = (await this.listAvailable()).find((item) => item.editionId === editionId);
    if (!manifest) return "unavailable";
    if (this.#loaded.has(editionId)) return "ready";
    const installed = (await this.listInstalled()).some((item) => item.editionId === editionId);
    if (!installed) return "available";
    return this.#enabled.has(editionId) ? "enabled" : "disabled";
  }
  state(editionId: string): Promise<CorpusPackageState> {
    return this.getPackageState(editionId);
  }
  async installPackage(editionId: string): Promise<void> {
    if (typeof caches === "undefined")
      throw new PackageUnavailableError("Persistent Cache API is unavailable.");
    const manifest = (await this.listAvailable()).find((item) => item.editionId === editionId);
    if (!manifest) throw new PackageUnavailableError(`Package ${editionId} is unavailable.`);
    this.#states.set(editionId, "installing");
    const cache = await caches.open(CACHE_NAME);
    try {
      for (const item of packagePaths(manifest)) {
        const response = await fetch(item.path);
        if (!response.ok)
          throw new PackageUnavailableError(`Download failed: HTTP ${response.status}.`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if ((await checksum(bytes)) !== item.checksum)
          throw new PackageIntegrityError(`Checksum mismatch for ${item.path}.`);
        await cache.put(
          item.path,
          new Response(bytes, { headers: { "content-type": "application/vnd.sqlite3" } }),
        );
      }
      this.#states.delete(editionId);
      this.enablePackage(editionId);
    } catch (error) {
      this.#states.set(
        editionId,
        error instanceof PackageIntegrityError ? "corrupted" : "unavailable",
      );
      throw error;
    }
  }
  async removePackage(editionId: string): Promise<void> {
    const manifest = (await this.listAvailable()).find((item) => item.editionId === editionId);
    if (!manifest) return;
    const cache = typeof caches !== "undefined" ? await caches.open(CACHE_NAME) : null;
    for (const item of packagePaths(manifest)) if (cache) await cache.delete(item.path);
    for (const key of [...this.#loaded.keys()])
      if (key.startsWith(`${editionId}:`)) {
        (await this.#loaded.get(key))?.close();
        this.#loaded.delete(key);
      }
    this.#states.delete(editionId);
  }
  enablePackage(editionId: string): void {
    this.#enabled.add(editionId);
    if (typeof window !== "undefined")
      window.localStorage.setItem(ENABLED_KEY, JSON.stringify([...this.#enabled]));
  }
  disablePackage(editionId: string): void {
    this.#enabled.delete(editionId);
    if (typeof window !== "undefined")
      window.localStorage.setItem(ENABLED_KEY, JSON.stringify([...this.#enabled]));
  }
  async verifyPackage(editionId: string): Promise<boolean> {
    const manifest = (await this.listAvailable()).find((item) => item.editionId === editionId);
    if (!manifest) throw new PackageUnavailableError(`Package ${editionId} is unavailable.`);
    for (const item of packagePaths(manifest)) {
      const cached = typeof caches !== "undefined" ? await caches.match(item.path) : undefined;
      if (
        !cached ||
        (await checksum(new Uint8Array(await cached.arrayBuffer()))) !== item.checksum
      ) {
        this.#states.set(editionId, "corrupted");
        return false;
      }
    }
    this.#states.delete(editionId);
    return true;
  }
  async updatePackage(editionId: string): Promise<void> {
    await this.removePackage(editionId);
    await this.installPackage(editionId);
  }
  async recoverPackage(editionId: string): Promise<void> {
    await this.updatePackage(editionId);
  }
  async open(editionId: string, workId?: string): Promise<CorpusStorage> {
    return this.#open(editionId, workId, "content");
  }
  async openPart(editionId: string, role: "search" | "linguistic"): Promise<CorpusStorage> {
    return this.#open(editionId, undefined, role);
  }
  async #open(
    editionId: string,
    workId: string | undefined,
    role: "content" | "search" | "linguistic",
  ): Promise<CorpusStorage> {
    const manifest = (await this.listAvailable()).find((item) => item.editionId === editionId);
    if (!manifest) throw new CorpusNotInstalledError(`Corpus edition ${editionId} is unavailable.`);
    if (!this.#enabled.has(editionId))
      throw new CorpusNotInstalledError(`Corpus edition ${editionId} is disabled.`);
    const part =
      role === "content"
        ? workId
          ? manifest.parts.find((item) => item.workId === workId && item.role === role)
          : undefined
        : manifest.parts.find((item) => !item.workId && item.role === role);
    if (role !== "content" && !part)
      throw new CorpusNotInstalledError(
        `Corpus edition ${editionId} has no ${role} index installed.`,
      );
    const location = part ?? {
      databasePath: manifest.databasePath,
      checksum: manifest.checksum,
      sizeBytes: manifest.sizeBytes,
    };
    const key = `${editionId}:${part?.id ?? "complete"}`;
    const existing = this.#loaded.get(key);
    if (existing) return existing;
    this.#states.set(editionId, "loading");
    const loading = (async () => {
      const bytes = await responseBytes(location.databasePath);
      if ((await checksum(bytes)) !== location.checksum)
        throw new PackageIntegrityError(`Checksum mismatch for ${location.databasePath}.`);
      const storage = await SQLiteCorpusStorage.open(
        {
          ...manifest,
          databasePath: location.databasePath,
          checksum: location.checksum,
          sizeBytes: location.sizeBytes,
        },
        bytes,
      );
      this.#states.set(editionId, "ready");
      return storage;
    })();
    this.#loaded.set(key, loading);
    try {
      return await loading;
    } catch (error) {
      this.#loaded.delete(key);
      this.#states.set(
        editionId,
        error instanceof PackageIntegrityError ? "corrupted" : "unavailable",
      );
      throw error;
    }
  }
  close(): void {
    for (const storage of this.#loaded.values()) void storage.then((value) => value.close());
    this.#loaded.clear();
    this.#states.clear();
  }
}
export const corpusPackageRegistry = new CorpusPackageRegistry();
