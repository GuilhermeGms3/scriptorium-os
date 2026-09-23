/** SQLite-backed scripture repository. Components never read generated corpus shards. */
import type {
  Book,
  ChapterContent,
  Edition,
  Lemma,
  PassageRef,
  TextUnit,
  TokenOccurrence,
  VerseContent,
} from "../domain/scripture";
import { passageRefScheme } from "../domain/scripture";
import type { GeneratedCorpusManifest } from "../domain/generated-corpus";
import type { Provenance } from "../domain/source";
import type {
  CorpusSearchHit,
  CorpusSearchQuery,
  StoredTextUnit,
} from "../corpus-runtime/contracts";
import { corpusPackageRegistry } from "../corpus-runtime/corpus-package-registry";
import {
  DEFAULT_BIBLICAL_VERSIFICATION,
  addressKey,
  deterministicTextUnitId,
} from "../domain/text-identity";
import sblgntManifestJson from "../../../generated/corpora/sblgnt/1.2/manifest.json";
import bibliaLivreManifestJson from "../../../generated/corpora/biblia-livre/2025.1.0/manifest.json";
import oshbManifestJson from "../../../generated/corpora/wlc/2.2/manifest.json";
import bibliaPortuguesaMundialManifestJson from "../../../generated/corpora/biblia-portuguesa-mundial/2026-08-19/manifest.json";
import { BIBLIA_LIVRE_EDITION, BIBLIA_LIVRE_EDITION_ID } from "../corpus-config/biblia-livre";

export type EditionPassageQuery = {
  edition: string;
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
};

const SBLGNT_MANIFEST = sblgntManifestJson as GeneratedCorpusManifest;
const BIBLIA_LIVRE_MANIFEST = bibliaLivreManifestJson as GeneratedCorpusManifest;
const OSHB_MANIFEST = oshbManifestJson as GeneratedCorpusManifest;
const BIBLIA_PORTUGUESA_MUNDIAL_MANIFEST =
  bibliaPortuguesaMundialManifestJson as GeneratedCorpusManifest;
const BIBLIA_LIVRE_READER_EDITION: Edition = {
  id: BIBLIA_LIVRE_EDITION.id,
  corpusId: BIBLIA_LIVRE_EDITION.corpusId,
  title: BIBLIA_LIVRE_EDITION.title,
  abbreviation: BIBLIA_LIVRE_EDITION.abbreviation,
  language: BIBLIA_LIVRE_EDITION.language,
  script: "Latn",
  direction: "ltr",
  kind: "translation",
  year: 2025,
  licenseId: "CC-BY-3.0-BR",
};
const BIBLIA_PORTUGUESA_MUNDIAL_EDITION: Edition = {
  id: BIBLIA_PORTUGUESA_MUNDIAL_MANIFEST.editionId,
  corpusId: BIBLIA_PORTUGUESA_MUNDIAL_MANIFEST.corpusId,
  title: "Bíblia Portuguesa Mundial — rascunho em revisão (2026-08-19)",
  abbreviation: "BPM rasc.",
  language: "pt-BR",
  script: "Latn",
  direction: "ltr",
  kind: "translation",
  year: 2026,
  licenseId: "Public-Domain",
};
const SBLGNT_EDITION: Edition = {
  id: SBLGNT_MANIFEST.editionId,
  corpusId: SBLGNT_MANIFEST.corpusId,
  title: "SBL Greek New Testament, version 1.2",
  abbreviation: "SBLGNT",
  language: "grc",
  script: "Grek",
  direction: "ltr",
  kind: "original-language",
  year: 2023,
  licenseId: "CC-BY-4.0",
};
const OSHB_EDITION: Edition = {
  id: OSHB_MANIFEST.editionId,
  corpusId: OSHB_MANIFEST.corpusId,
  title: "Westminster Leningrad Codex with OSHB morphology 2.2",
  abbreviation: "WLC/OSHB",
  language: "hbo",
  script: "Hebr",
  direction: "rtl",
  kind: "original-language",
  licenseId: "WLC-PD;OSHB-CC-BY-4.0",
};
const MANIFEST_BY_EDITION = new Map<string, GeneratedCorpusManifest>([
  [BIBLIA_LIVRE_MANIFEST.editionId, BIBLIA_LIVRE_MANIFEST],
  [SBLGNT_MANIFEST.editionId, SBLGNT_MANIFEST],
  [OSHB_MANIFEST.editionId, OSHB_MANIFEST],
  [BIBLIA_PORTUGUESA_MUNDIAL_MANIFEST.editionId, BIBLIA_PORTUGUESA_MUNDIAL_MANIFEST],
]);
const CANONICAL_BOOKS: Book[] = BIBLIA_LIVRE_MANIFEST.books.map((book) => ({
  id: book.id,
  name: book.name,
  abbreviation: book.abbreviation,
  order: book.order,
  chapters: book.chapters,
  testament: book.order <= 39 ? "ot" : "nt",
}));
const CANONICAL_BOOK_IDS = new Set(CANONICAL_BOOKS.map((book) => book.id));
const ADDITIONAL_BOOKS: Book[] = BIBLIA_PORTUGUESA_MUNDIAL_MANIFEST.books
  .filter((book) => !CANONICAL_BOOK_IDS.has(book.id))
  .map((book, index) => ({
    id: book.id,
    name: book.name,
    abbreviation: book.abbreviation,
    order: 100 + index,
    chapters: book.chapters,
    testament: "other",
  }));
const GENERATED_BOOKS: Book[] = [...CANONICAL_BOOKS, ...ADDITIONAL_BOOKS];
const loadedChapterCache = new Map<string, ChapterContent>();
const loadedTextUnitCache = new Map<string, TextUnit[]>();

function chapterKey(bookId: string, chapter: number): string {
  return `${bookId}/${chapter}`;
}

function provenanceFor(manifest: GeneratedCorpusManifest, bookId: string): Provenance {
  return {
    acquisition: "bundled",
    creationMethod: "machine-assisted",
    packageId: manifest.packageId,
    sourceArtifactIds: manifest.sourceArtifactIds.filter((id) => id.endsWith(`:${bookId}`)),
    transformationIds: manifest.transformations.map((item) => item.id),
    datasetId: manifest.datasetId,
    attribution: manifest.attribution,
    note: `${manifest.editionId}; SQLite runtime package generated from verified source artifacts.`,
  };
}

function legacyTextUnit(unit: StoredTextUnit): TextUnit {
  const address = unit.address;
  return {
    id: unit.id,
    ref: {
      workId: unit.workId,
      bookId: address?.bookId ?? unit.workId.replace(/^work:/, ""),
      chapter: address?.chapter ?? 1,
      ...(address?.verseStart !== undefined ? { verseStart: address.verseStart } : {}),
      ...(address?.verseEnd !== undefined ? { verseEnd: address.verseEnd } : {}),
      versificationSchemeId: address?.versificationSchemeId ?? DEFAULT_BIBLICAL_VERSIFICATION,
    },
    editionId: unit.editionId,
    text: unit.text,
  };
}

async function loadChapterFromPackages(
  bookId: string,
  chapter: number,
): Promise<ChapterContent | null> {
  const manifests = await corpusPackageRegistry.listEnabled();
  const address = {
    workId: `work:${bookId}`,
    versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
    bookId,
    chapter,
  };
  const packageRows = await Promise.all(
    manifests
      .filter((manifest) => manifest.works.includes(address.workId))
      .map(async (manifest) => {
        const storage = await corpusPackageRegistry.open(manifest.editionId, address.workId);
        return {
          manifest,
          storage,
          units: await storage.getTextUnits(address, manifest.editionId),
        };
      }),
  );
  const rows = new Map<string, VerseContent>();
  const textUnits: TextUnit[] = [];
  const provenanceByEdition: Record<string, Provenance> = {};
  for (const { manifest, storage, units } of packageRows) {
    for (const unit of units) {
      if (!unit.address || unit.address.verseStart === undefined) continue;
      const key = addressKey(unit.address);
      const ref: PassageRef = {
        workId: unit.workId,
        bookId,
        chapter,
        verseStart: unit.address.verseStart,
        ...(unit.address.verseEnd !== undefined ? { verseEnd: unit.address.verseEnd } : {}),
        versificationSchemeId: unit.address.versificationSchemeId,
      };
      const current = rows.get(key) ?? {
        ref,
        verse: unit.address.verseStart,
        translations: {},
        alignmentStatusByEdition: {},
      };
      current.translations[unit.editionId] = unit.text;
      current.alignmentStatusByEdition![unit.editionId] = "equivalent";
      if (manifest.languages.some((language) => language === "grc" || language === "hbo")) {
        const storedTokens = await storage.getTokens(unit.id);
        const tokens: TokenOccurrence[] = storedTokens.map((token) => {
          const morphology = token.morphology
            ? (JSON.parse(token.morphology) as NonNullable<TokenOccurrence["morphology"]>)
            : null;
          return {
            id: token.id,
            editionId: unit.editionId,
            textUnitId: unit.id,
            ref,
            position: token.position,
            language: token.language,
            surface: token.surface,
            ...(token.lemmaId ? { lemmaId: token.lemmaId } : {}),
            ...(token.lemma ? { lemma: token.lemma } : {}),
            ...(token.transliteration ? { transliteration: token.transliteration } : {}),
            ...(token.strongs ? { strongs: token.strongs } : {}),
            ...(morphology && token.language === "hbo" ? { morphology } : {}),
            ...(token.prefix ? { prefix: token.prefix } : {}),
            ...(token.suffix ? { suffix: token.suffix } : {}),
            ...(token.paragraphId ? { paragraphId: token.paragraphId } : {}),
            ...(token.startsParagraph !== undefined
              ? { startsParagraph: token.startsParagraph }
              : {}),
          };
        });
        current.originalEditionId = unit.editionId;
        current.original = tokens;
        if (tokens[0]?.paragraphId) current.paragraphId = tokens[0].paragraphId;
        if (tokens[0]?.startsParagraph !== undefined)
          current.startsParagraph = tokens[0].startsParagraph;
      }
      rows.set(key, current);
      textUnits.push(legacyTextUnit(unit));
      const sourceArtifactId =
        "sourceArtifactId" in unit.provenance &&
        typeof unit.provenance.sourceArtifactId === "string"
          ? unit.provenance.sourceArtifactId
          : undefined;
      const generatedManifest = MANIFEST_BY_EDITION.get(unit.editionId);
      provenanceByEdition[unit.editionId] = {
        ...(generatedManifest
          ? provenanceFor(generatedManifest, bookId)
          : {
              acquisition: "bundled" as const,
              creationMethod: "machine-assisted" as const,
              packageId: manifest.id,
              datasetId: manifest.provenance.datasetId,
              transformationIds: manifest.provenance.transformationIds,
              attribution: manifest.rights.attribution,
            }),
        sourceArtifactIds: sourceArtifactId ? [sourceArtifactId] : [],
      };
    }
  }
  if (!rows.size) return null;
  loadedTextUnitCache.set(chapterKey(bookId, chapter), textUnits);
  return {
    bookId,
    chapter,
    verses: [...rows.values()].sort((left, right) => left.verse - right.verse),
    provenanceByEdition,
  };
}

export const ScriptureRepository = {
  listEditions(): Edition[] {
    return [
      BIBLIA_LIVRE_READER_EDITION,
      BIBLIA_PORTUGUESA_MUNDIAL_EDITION,
      SBLGNT_EDITION,
      OSHB_EDITION,
    ];
  },
  listBooks(): Book[] {
    return GENERATED_BOOKS;
  },
  getBook(bookId: string): Book | null {
    return this.listBooks().find((book) => book.id === bookId) ?? null;
  },
  availableChapters(bookId: string): number[] {
    const generated =
      BIBLIA_LIVRE_MANIFEST.books.find((book) => book.id === bookId) ??
      BIBLIA_PORTUGUESA_MUNDIAL_MANIFEST.books.find((book) => book.id === bookId) ??
      SBLGNT_MANIFEST.books.find((book) => book.id === bookId);
    const resolved = generated ?? OSHB_MANIFEST.books.find((book) => book.id === bookId);
    return resolved
      ? Object.keys(resolved.chapterFiles)
          .map(Number)
          .sort((left, right) => left - right)
      : [];
  },
  hasContent(bookId: string, chapter: number): boolean {
    return this.availableChapters(bookId).includes(chapter);
  },
  getChapter(bookId: string, chapter: number): ChapterContent | null {
    return loadedChapterCache.get(chapterKey(bookId, chapter)) ?? null;
  },
  async loadChapter(bookId: string, chapter: number): Promise<ChapterContent | null> {
    const key = chapterKey(bookId, chapter);
    const existing = loadedChapterCache.get(key);
    if (existing) return existing;
    const loaded = await loadChapterFromPackages(bookId, chapter);
    if (loaded) loadedChapterCache.set(key, loaded);
    return loaded;
  },
  primeChapter(chapter: ChapterContent | null): void {
    if (!chapter) return;
    const key = chapterKey(chapter.bookId, chapter.chapter);
    loadedChapterCache.set(key, chapter);
    const workId = `work:${chapter.bookId}`;
    loadedTextUnitCache.set(
      key,
      chapter.verses.flatMap((verse) =>
        Object.entries(verse.translations).map(([editionId, text]) => {
          const corpusId =
            MANIFEST_BY_EDITION.get(editionId)?.corpusId ?? BIBLIA_LIVRE_MANIFEST.corpusId;
          return {
            id: deterministicTextUnitId({
              corpusId,
              editionId,
              workId,
              sequence: chapter.chapter * 1000 + verse.verse,
            }),
            ref: verse.ref,
            editionId,
            text,
          };
        }),
      ),
    );
  },
  defaultEditionId(bookId: string, chapter: number): string {
    const firstVerse = this.getChapter(bookId, chapter)?.verses[0];
    if (firstVerse?.translations[BIBLIA_LIVRE_EDITION_ID]) return BIBLIA_LIVRE_EDITION_ID;
    return firstVerse
      ? (Object.keys(firstVerse.translations)[0] ?? BIBLIA_LIVRE_EDITION_ID)
      : BIBLIA_LIVRE_EDITION_ID;
  },
  getPassageProvenance(ref: PassageRef): Provenance | null {
    return this.getChapter(ref.bookId, ref.chapter)
      ? provenanceFor(BIBLIA_LIVRE_MANIFEST, ref.bookId)
      : null;
  },
  getPassageProvenances(ref: PassageRef): Record<string, Provenance> {
    const chapter = this.getChapter(ref.bookId, ref.chapter);
    if (!chapter) return {};
    if (chapter.provenanceByEdition) return chapter.provenanceByEdition;
    const result: Record<string, Provenance> = {};
    if (chapter.verses.some((verse) => Object.hasOwn(verse.translations, BIBLIA_LIVRE_EDITION_ID)))
      result[BIBLIA_LIVRE_EDITION_ID] = provenanceFor(BIBLIA_LIVRE_MANIFEST, ref.bookId);
    if (chapter.verses.some((verse) => Object.hasOwn(verse.translations, SBLGNT_EDITION.id)))
      result[SBLGNT_EDITION.id] = provenanceFor(SBLGNT_MANIFEST, ref.bookId);
    if (chapter.verses.some((verse) => Object.hasOwn(verse.translations, OSHB_EDITION.id)))
      result[OSHB_EDITION.id] = provenanceFor(OSHB_MANIFEST, ref.bookId);
    if (
      chapter.verses.some((verse) =>
        Object.hasOwn(verse.translations, BIBLIA_PORTUGUESA_MUNDIAL_EDITION.id),
      )
    )
      result[BIBLIA_PORTUGUESA_MUNDIAL_EDITION.id] = provenanceFor(
        BIBLIA_PORTUGUESA_MUNDIAL_MANIFEST,
        ref.bookId,
      );
    return result;
  },
  getPassage(query: PassageRef | EditionPassageQuery): VerseContent[] {
    const ref: PassageRef =
      "edition" in query
        ? {
            bookId: query.book,
            chapter: query.chapter,
            ...(query.verseStart !== undefined ? { verseStart: query.verseStart } : {}),
            ...(query.verseEnd !== undefined ? { verseEnd: query.verseEnd } : {}),
            versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
          }
        : query;
    const chapter = this.getChapter(ref.bookId, ref.chapter);
    if (!chapter || passageRefScheme(ref) !== DEFAULT_BIBLICAL_VERSIFICATION) return [];
    const start = ref.verseStart ?? 1;
    const end = ref.verseEnd ?? ref.verseStart ?? Number.MAX_SAFE_INTEGER;
    const verses = chapter.verses.filter((verse) => verse.verse >= start && verse.verse <= end);
    if (!("edition" in query)) return verses;
    return verses.flatMap((verse) => {
      const text = verse.translations[query.edition];
      return text === undefined ? [] : [{ ...verse, translations: { [query.edition]: text } }];
    });
  },
  getTextUnits(ref: PassageRef): TextUnit[] {
    const units = loadedTextUnitCache.get(chapterKey(ref.bookId, ref.chapter)) ?? [];
    const start = ref.verseStart ?? 1;
    const end = ref.verseEnd ?? ref.verseStart ?? Number.MAX_SAFE_INTEGER;
    return units.filter((unit) => {
      const verse = unit.ref.verseStart ?? 0;
      return passageRefScheme(unit.ref) === passageRefScheme(ref) && verse >= start && verse <= end;
    });
  },
  async getAvailableEditions(): Promise<Edition[]> {
    const available = await corpusPackageRegistry.listAvailable();
    return this.listEditions().filter((edition) =>
      available.some((item) => item.editionId === edition.id),
    );
  },
  async getInstalledEditions(): Promise<Edition[]> {
    const installed = await corpusPackageRegistry.listInstalled();
    return this.listEditions().filter((edition) =>
      installed.some((item) => item.editionId === edition.id),
    );
  },
  async search(query: CorpusSearchQuery): Promise<CorpusSearchHit[]> {
    const packages = await corpusPackageRegistry.listEnabled();
    const results = await Promise.all(
      packages
        .filter(
          (manifest) => !query.editionIds?.length || query.editionIds.includes(manifest.editionId),
        )
        .map(async (manifest) =>
          (await corpusPackageRegistry.openPart(manifest.editionId, "search")).search(query),
        ),
    );
    return results
      .flat()
      .sort((left, right) => right.rank - left.rank)
      .slice(0, query.limit ?? 30);
  },
  /** @deprecated Lexical definitions now belong to the linguistic/knowledge stores. */
  getLexiconEntry(lemma: string): Lemma | null {
    void lemma;
    return null;
  },
  getLemmaEntries(lemmas: string[]): Lemma[] {
    return [...new Set(lemmas)]
      .map((lemma) => this.getLexiconEntry(lemma))
      .filter((entry): entry is Lemma => entry !== null);
  },
  /** @deprecated Concordance is served by LinguisticRepository. */
  getOccurrences(lemma: string): string[] {
    void lemma;
    return [];
  },
};
