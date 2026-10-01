import { beforeAll, describe, expect, it } from "vitest";
import { anchorKey, type TextAnchor } from "../domain/knowledge";
import { passageRefKey } from "../domain/scripture";
import { StudyRepository } from "../repositories/study-repository";
import { hasAvailableData } from "../domain/availability";
import {
  ScriptureKnowledgeEngine,
  validatePassageKnowledgeBundle,
} from "./scripture-knowledge-engine";

const johnPrologue = {
  bookId: "john",
  chapter: 1,
  verseStart: 1,
  verseEnd: 5,
} as const;

describe("TextAnchor", () => {
  it("preserves distinct passage, token and lemma identities", () => {
    const anchors: TextAnchor[] = [
      { type: "passage", ref: johnPrologue },
      { type: "token", tokenId: "j1.1.5" },
      { type: "lemma", lemmaId: "grc:λόγος" },
    ];

    expect(new Set(anchors.map(anchorKey)).size).toBe(3);
    expect(passageRefKey(johnPrologue)).toBe("scriptorium-bcv-1:work:john:john.1.1-5");
  });
});

describe("ScriptureKnowledgeEngine", () => {
  beforeAll(async () => {
    await ScriptureKnowledgeEngine.loadPassageKnowledgeBundle(johnPrologue);
  });
  it("assembles the John 1:1–5 vertical slice", () => {
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue);

    expect(bundle).not.toBeNull();
    expect(bundle?.identity.label).toBe("John 1:1–5");
    expect(bundle?.passage.verses.map((verse) => verse.verse)).toEqual([1, 2, 3, 4, 5]);
    expect(bundle?.provenance.isDemo).not.toBe(true);
    expect(validatePassageKnowledgeBundle(bundle!)).toEqual([]);
  });

  it("keeps every token occurrence traceable to edition, text unit, passage and lemma", () => {
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue)!;

    expect(bundle.originals.status).toBe("available");
    if (bundle.originals.status !== "available") return;
    expect(bundle.originals.data.length).toBeGreaterThan(0);
    for (const token of bundle.originals.data) {
      expect(token.editionId).toBeTruthy();
      expect(bundle.passage.textUnits.some((unit) => unit.id === token.textUnitId)).toBe(true);
      expect(token.ref.bookId).toBe("john");
      expect(token.position).toBeGreaterThan(0);
      if (token.lemma || token.lemmaId) {
        expect(token.lemma).toBeTruthy();
        expect(token.lemmaId).toMatch(/^lexeme:tagnt:[a-f0-9]{24}$/);
      }
    }
  });

  it("resolves claim and relation evidence to canonical source fragments", () => {
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue)!;
    const fragmentIds = new Set(bundle.sources.fragments.map((fragment) => fragment.id));
    expect(bundle.claims.status).toBe("available");
    if (hasAvailableData(bundle.claims)) {
      for (const claim of bundle.claims.data) {
        expect(claim.anchors.length).toBeGreaterThan(0);
        claim.sourceFragmentIds.forEach((id) => expect(fragmentIds.has(id)).toBe(true));
      }
    }
  });

  it("preserves typed source-backed relations", () => {
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue)!;

    expect(bundle.relations.status).toBe("available");
    if (!hasAvailableData(bundle.relations)) return;
    const logos = bundle.relations.data.find(
      (relation) => relation.id === "relation:john-1-1-logos",
    );
    expect(logos?.relation.value).toBe("contains-occurrence-of");
    expect(logos?.sourceFragmentIds.length).toBeGreaterThan(0);
    expect(logos?.provenance.isDemo).toBe(false);
  });

  it("keeps unavailable knowledge and an unhydrated user workspace explicit", () => {
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue)!;

    expect(bundle.variants.status).toBe("not-imported");
    expect(bundle.analyses.status).toBe("available");
    expect(bundle.perspectives).toEqual([]);
    expect(bundle.user.studyLinks).toEqual([]);
    if (hasAvailableData(bundle.claims)) {
      expect(bundle.claims.data.every((claim) => claim.origin !== "user")).toBe(true);
    }
  });

  it("loads the real John 1:1 vertical slice through the engine", async () => {
    const bundle = await ScriptureKnowledgeEngine.loadPassageKnowledgeBundle({
      book: "John",
      chapter: 1,
      verseStart: 1,
      verseEnd: 1,
    });

    expect(bundle).not.toBeNull();
    expect(bundle?.texts.map((layer) => layer.editionId)).toEqual(
      expect.arrayContaining(["biblia-livre-n4-2025.1.0", "sblgnt-1.2"]),
    );
    expect(bundle?.texts.every((layer) => layer.availability.status === "available")).toBe(true);
    expect(bundle?.availability.texts).toBe("available");
    expect(bundle?.availability.relations).toBe("available");
    expect(bundle?.analyses.status).toBe("available");

    const logos = bundle?.passage.verses[0]?.original?.find((token) => token.surface === "λόγος");
    expect(logos).toBeDefined();
    const word = await ScriptureKnowledgeEngine.getWordKnowledgeBundle(logos!);
    expect(word.annotation.status).toBe("available");
    if (word.annotation.status === "available") {
      expect(word.annotation.data.normalized.lemmas).toContain("λόγος");
      expect(word.annotation.data.targetTokenId).toBe(logos?.id);
    }
    expect(word.morphology.status).toBe("available");
    expect(word.dictionary.status).toBe("available");
    if (word.dictionary.status === "available") {
      expect(word.dictionary.data.some((entry) => entry.gloss === "word")).toBe(true);
    }
    expect(word.concordance.status).toBe("available");
    expect(word.sources.references[0]?.license?.name).toContain("Creative Commons");
    expect(word.sources.fragments[0]).toMatchObject({
      sourceId: word.sources.references[0]?.id,
      artifactId: expect.any(String),
    });
  });

  it("loads Genesis 1 without Greek-only assumptions", async () => {
    const bundle = await ScriptureKnowledgeEngine.loadPassageKnowledgeBundle({
      book: "Genesis",
      chapter: 1,
    });

    expect(bundle?.texts.map((layer) => layer.editionId)).toContain("biblia-livre-n4-2025.1.0");
    expect(bundle?.originals.status).toBe("available");
    if (bundle?.originals.status === "available") {
      expect(bundle.originals.data[0]).toMatchObject({
        language: "hbo",
        lemma: "b/7225",
        strongs: "b/7225",
        morphology: { code: "HR/Ncfsa" },
      });
    }
    expect(bundle?.linguisticAnnotations.status).toBe("available");
    if (bundle?.linguisticAnnotations.status === "available") {
      expect(bundle.linguisticAnnotations.data[0]).toMatchObject({
        sourceDatasetId: "wlc-oshb-2.2",
        raw: { surface: expect.any(String), morphology: "HR/Ncfsa" },
        normalized: {
          lemmas: ["b/7225"],
          morphology: [{ rawMorphologyCode: "HR/Ncfsa", status: "parsed" }],
        },
      });
    }
    const firstToken = bundle?.passage.verses[0]?.original?.[0];
    expect(firstToken).toBeDefined();
    const word = await ScriptureKnowledgeEngine.getWordKnowledgeBundle(firstToken!);
    expect(word.annotation.status).toBe("available");
    expect(word.dictionary.status).toBe("available");
    if (word.dictionary.status === "available") {
      expect(
        word.dictionary.data.some((entry) => entry.gloss.toLowerCase().includes("beginning")),
      ).toBe(true);
      expect(word.dictionary.data.every((entry) => entry.definition === undefined)).toBe(true);
    }
    expect(word.concordance.status).toBe("available");
    if (word.concordance.status === "available") {
      expect(word.concordance.data.total).toBeGreaterThan(0);
      expect(word.concordance.data.items[0]?.ref.bookId).toBe("genesis");
    }
    expect(bundle?.sources.references.some((source) => source.license?.name)).toBe(true);
    expect(validatePassageKnowledgeBundle(bundle!)).toEqual([]);
  });

  it("keeps a real unresolved TAGNT alignment explicitly ambiguous", async () => {
    const bundle = await ScriptureKnowledgeEngine.loadPassageKnowledgeBundle({
      book: "Matthew",
      chapter: 18,
      verseStart: 8,
      verseEnd: 8,
    });
    const token = bundle?.passage.verses[0]?.original?.find(
      (item) => item.id === "sblgnt:1.2:matthew:18:8:026",
    );

    expect(token).toBeDefined();
    const word = await ScriptureKnowledgeEngine.getWordKnowledgeBundle(token!);
    expect(word.alignment.status).toBe("ambiguous");
    expect(word.annotation.status).toBe("ambiguous");
    expect(word.lexeme.status).toBe("unavailable");
  });
});

describe("legacy local note migration boundary", () => {
  it("does not use localStorage as the live repository after Phase 9", () => {
    const values = new Map<string, string>();
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
        },
      },
    });
    values.set(
      "scriptorium.notes.v1",
      JSON.stringify([
        {
          id: "legacy-note",
          title: "Legacy note",
          body: "",
          links: [{ kind: "passage", target: "John 1:1", label: "John 1:1" }],
          createdAt: "2026-08-25T00:00:00Z",
          updatedAt: "2026-08-25T00:00:00Z",
        },
      ]),
    );

    expect(StudyRepository.notesForPassage(johnPrologue)).toEqual([]);
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue)!;
    expect(bundle.user.notes).toEqual([]);
    expect(bundle.claims.status).toBe("available");
    if (hasAvailableData(bundle.claims)) {
      expect(bundle.claims.data.every((claim) => claim.origin !== "user")).toBe(true);
    }

    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
});
