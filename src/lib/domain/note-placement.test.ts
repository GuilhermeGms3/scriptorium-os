import { describe, expect, it } from "vitest";
import cases from "./note-placement.cases.json";
import { noteTargets } from "./note-placement";
import {
  knowledgeItemCoversVerse,
  knowledgeItemIsChapterContext,
  type WorkspacePassageKnowledgeItem,
} from "./workspace-passage-knowledge";

// The same cases run on Android (ReadingNavigationTest.kt): a note lands in the same place.
const { bookId, chapter, verses } = cases.chapter;
const item = (relation: (typeof cases.notes)[number]["relation"]) =>
  ({
    passageRelation: { payload: { additionalPassages: [], ...relation } },
  }) as unknown as WorkspacePassageKnowledgeItem;

describe("where a note goes in the reader, shared with Android", () => {
  it.each(cases.notes)("$name", (note) => {
    expect(noteTargets(note.relation)).toEqual(note.targets);
    const covered = Array.from({ length: verses }, (_, index) => index + 1).filter((verse) =>
      knowledgeItemCoversVerse(item(note.relation), bookId, chapter, verse),
    );
    expect(covered).toEqual(note.verses);
    expect(knowledgeItemIsChapterContext(item(note.relation), bookId, chapter)).toBe(note.context);
  });
});
