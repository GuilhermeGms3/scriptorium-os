/**
 * LibraryRepository — catalog access seam. Currently backed by fixtures;
 * future phases add import pipelines (PDF/EPUB/SWORD/package) and indexing.
 */

import type {
  LibraryCollection,
  LibraryResource,
  ResourceType,
} from "../domain/library";
import {
  DEMO_COLLECTIONS,
  DEMO_DISCOVER_CATEGORIES,
  DEMO_RESOURCES,
} from "../fixtures/library.fixture";

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  bible: "Bible",
  commentary: "Commentary",
  dictionary: "Dictionary",
  lexicon: "Lexicon",
  theology: "Theology",
  history: "History",
  language: "Language",
  "ancient-literature": "Ancient Literature",
  article: "Article",
  "personal-document": "Personal Document",
};

export const LibraryRepository = {
  listResources(): LibraryResource[] {
    return DEMO_RESOURCES;
  },

  getResource(id: string): LibraryResource | null {
    return DEMO_RESOURCES.find((r) => r.id === id) ?? null;
  },

  listCollections(): LibraryCollection[] {
    return DEMO_COLLECTIONS;
  },

  resourcesInCollection(collectionId: string): LibraryResource[] {
    const col = DEMO_COLLECTIONS.find((c) => c.id === collectionId);
    if (!col) return DEMO_RESOURCES;
    return DEMO_RESOURCES.filter((r) => col.resourceIds.includes(r.id));
  },

  discoverCategories() {
    return DEMO_DISCOVER_CATEGORIES;
  },
};
