import { describe, expect, it } from "vitest";
import { anchorKey, type TextAnchor } from "../domain/knowledge";
import { passageRefKey } from "../domain/scripture";
import { StudyRepository } from "../repositories/study-repository";
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
    expect(passageRefKey(johnPrologue)).toBe("default:john.1.1-5");
  });
});

describe("ScriptureKnowledgeEngine", () => {
  it("assembles the John 1:1–5 vertical slice", () => {
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue);

    expect(bundle).not.toBeNull();
    expect(bundle?.identity.label).toBe("John 1:1–5");
    expect(bundle?.passage.verses.map((verse) => verse.verse)).toEqual([1, 2, 3, 4, 5]);
    expect(bundle?.provenance.isDemo).toBe(true);
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
      if (token.lemma && token.lemmaId) expect(token.lemmaId).toContain(token.lemma);
    }
  });

  it("resolves claim and relation evidence to source fragments and resources", () => {
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue)!;
    const fragmentIds = new Set(bundle.sources.fragments.map((fragment) => fragment.id));
    const resourceIds = new Set(bundle.sources.resources.map((resource) => resource.id));

    expect(bundle.claims.status).toBe("available");
    if (bundle.claims.status === "available") {
      for (const claim of bundle.claims.data) {
        expect(claim.anchors.length).toBeGreaterThan(0);
        claim.sourceFragmentIds.forEach((id) => expect(fragmentIds.has(id)).toBe(true));
      }
    }
    bundle.sources.fragments.forEach((fragment) =>
      expect(resourceIds.has(fragment.resourceId)).toBe(true),
    );
  });

  it("preserves typed relations and marks unsourced demo edges as draft", () => {
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue)!;

    expect(bundle.relations.status).toBe("available");
    if (bundle.relations.status !== "available") return;
    const genesisBridge = bundle.relations.data.find((relation) => relation.id === "rel-9");
    expect(genesisBridge?.relation).toEqual({ kind: "known", value: "echoes" });
    expect(genesisBridge?.sourceFragmentIds).toEqual([]);
    expect(genesisBridge?.reviewStatus).toBe("draft");
    expect(genesisBridge?.provenance.isDemo).toBe(true);
  });

  it("keeps unavailable knowledge and user knowledge explicit", () => {
    const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(johnPrologue)!;

    expect(bundle.variants.status).toBe("not-imported");
    expect(bundle.analyses.status).toBe("not-analyzed");
    expect(bundle.perspectives).toEqual([]);
    expect(bundle.user.studyLinks.length).toBeGreaterThan(0);
    if (bundle.claims.status === "available") {
      expect(bundle.claims.data.every((claim) => claim.origin !== "user")).toBe(true);
    }
  });
});

describe("legacy local note compatibility", () => {
  it("resolves a legacy John 1:1 string link against the structured passage range", () => {
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

    expect(StudyRepository.notesForPassage(johnPrologue).map((note) => note.id)).toEqual([
      "legacy-note",
    ]);

    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
});
