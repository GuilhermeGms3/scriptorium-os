import { corpusPackageRegistry } from "../corpus-runtime/corpus-package-registry";
import type { CorpusSearchHit, StoredTextUnit } from "../corpus-runtime/contracts";

export const PRIMARY_SOURCE_EDITIONS = [
  "apostolic-fathers-pd-en-1",
  "historic-creeds-pd-en-1",
] as const;

export interface PrimarySourceWorkSummary {
  id: string;
  title: string;
  editionId: string;
  corpusId: string;
  language: string;
  rights: string;
  attribution: string;
}

export interface PrimarySourceDocument extends PrimarySourceWorkSummary {
  units: StoredTextUnit[];
}

export const PrimarySourceRepository = {
  async listWorks(): Promise<PrimarySourceWorkSummary[]> {
    const manifests = (await corpusPackageRegistry.listAvailable()).filter((manifest) =>
      (PRIMARY_SOURCE_EDITIONS as readonly string[]).includes(manifest.editionId),
    );
    const result: PrimarySourceWorkSummary[] = [];
    for (const manifest of manifests) {
      for (const workId of manifest.works) {
        const storage = await corpusPackageRegistry.open(manifest.editionId, workId);
        const work = await storage.getWork(workId);
        if (!work) continue;
        result.push({
          id: work.id,
          title: work.title,
          editionId: manifest.editionId,
          corpusId: manifest.corpusId,
          language: manifest.languages[0] ?? "en",
          rights: manifest.rights.license,
          attribution: manifest.rights.attribution,
        });
      }
    }
    return result;
  },

  async getDocument(workId: string): Promise<PrimarySourceDocument | null> {
    const manifest = (await corpusPackageRegistry.listAvailable()).find((candidate) =>
      candidate.works.includes(workId),
    );
    if (!manifest || !(PRIMARY_SOURCE_EDITIONS as readonly string[]).includes(manifest.editionId))
      return null;
    const storage = await corpusPackageRegistry.open(manifest.editionId, workId);
    const work = await storage.getWork(workId);
    if (!work) return null;
    const units = await storage.getTextUnits(
      { workId, versificationSchemeId: manifest.versificationSchemeId },
      manifest.editionId,
    );
    return {
      id: work.id,
      title: work.title,
      editionId: manifest.editionId,
      corpusId: manifest.corpusId,
      language: manifest.languages[0] ?? "en",
      rights: manifest.rights.license,
      attribution: manifest.rights.attribution,
      units,
    };
  },

  async search(text: string, limit = 30): Promise<CorpusSearchHit[]> {
    const manifests = (await corpusPackageRegistry.listEnabled()).filter((manifest) =>
      (PRIMARY_SOURCE_EDITIONS as readonly string[]).includes(manifest.editionId),
    );
    const groups = await Promise.all(
      manifests.map(async (manifest) => {
        const storage = await corpusPackageRegistry.openPart(manifest.editionId, "search");
        return storage.search({ text, editionIds: [manifest.editionId], limit });
      }),
    );
    return groups.flat().sort((left, right) => right.rank - left.rank).slice(0, limit);
  },
};

