import { corpusPackageRegistry } from "../corpus-runtime/corpus-package-registry";
import type { CorpusSearchHit, StoredTextUnit } from "../corpus-runtime/contracts";

export const PRIMARY_SOURCE_EDITIONS = [
  "apostolic-fathers-pd-en-1",
  "historic-creeds-pd-en-1",
  "ancient-john-reception-pd-en-1",
] as const;

const PORTUGUESE_WORK_TITLES: Readonly<Record<string, string>> = {
  "work:didache": "Didaquê",
  "work:first-clement": "Primeira Epístola de Clemente aos Coríntios",
  "work:second-clement": "Segunda Epístola de Clemente",
  "work:polycarp-philippians": "Epístola de Policarpo aos Filipenses",
  "work:martyrdom-polycarp": "Martírio de Policarpo",
  "work:epistle-barnabas": "Epístola de Barnabé",
  "work:epistle-diognetus": "Epístola a Diogneto",
  "work:apostles-creed": "Credo dos Apóstolos",
  "work:athanasian-creed": "Credo Atanasiano",
  "work:nicene-creed-325": "Credo de Niceia (325)",
  "work:nicene-constantinopolitan-western": "Credo Niceno-Constantinopolitano — recensão ocidental",
  "work:chalcedonian-definition": "Definição de Calcedônia (451)",
  "work:origen-commentary-john-books-1-2":
    "Comentário de Orígenes sobre o Evangelho de João — Livros I e II",
};

const PORTUGUESE_EDITION_TITLES: Readonly<Record<string, string>> = {
  "apostolic-fathers-pd-en-1": "Pais Apostólicos · edição histórica em inglês",
  "historic-creeds-pd-en-1": "Credos históricos · edição histórica em inglês",
  "ancient-john-reception-pd-en-1": "Recepção antiga de João · edição histórica em inglês",
};

function localizedWorkTitle(workId: string, canonicalTitle: string): string {
  return PORTUGUESE_WORK_TITLES[workId] ?? canonicalTitle;
}

export interface PrimarySourceWorkSummary {
  id: string;
  title: string;
  canonicalTitle: string;
  editionTitle: string;
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
          title: localizedWorkTitle(work.id, work.title),
          canonicalTitle: work.title,
          editionTitle: PORTUGUESE_EDITION_TITLES[manifest.editionId] ?? manifest.title,
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
      title: localizedWorkTitle(work.id, work.title),
      canonicalTitle: work.title,
      editionTitle: PORTUGUESE_EDITION_TITLES[manifest.editionId] ?? manifest.title,
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
    return groups
      .flat()
      .sort((left, right) => right.rank - left.rank)
      .slice(0, limit);
  },
};
