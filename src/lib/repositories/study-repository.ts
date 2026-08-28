/**
 * StudyRepository — studies and notes are USER data (local-first).
 * Persisted in localStorage now; the same seam will back a sync engine
 * (optional account, backup, collaboration) in the future.
 */

import type { Note, Study, StudyItem } from "../domain/study";
import type { PassageRef } from "../domain/scripture";
import { passageRefKey, passageRefsOverlap } from "../domain/scripture";
import { DEMO_STUDY } from "../fixtures/study.fixture";

const NOTES_KEY = "scriptorium.notes.v1";
const STUDIES_KEY = "scriptorium.studies.v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function legacyPassageLinkMatches(value: string, ref: PassageRef): boolean {
  const match = /^([a-z0-9-]+)[ /]+(\d+)(?:[:/](\d+))?$/i.exec(value.trim());
  if (!match) return false;
  const [, bookId, chapter, verse] = match;
  if (bookId?.toLowerCase() !== ref.bookId.toLowerCase() || Number(chapter) !== ref.chapter) {
    return false;
  }
  if (!verse) return ref.verseStart === undefined;
  const verseNumber = Number(verse);
  const start = ref.verseStart ?? 1;
  const end = ref.verseEnd ?? ref.verseStart ?? Number.MAX_SAFE_INTEGER;
  return verseNumber >= start && verseNumber <= end;
}

export const StudyRepository = {
  /** Demo study + user-created studies. */
  listStudies(): Study[] {
    const user = readJson<Study[]>(STUDIES_KEY, []);
    const demoOverride = user.find((study) => study.id === DEMO_STUDY.id);
    return [demoOverride ?? DEMO_STUDY, ...user.filter((study) => study.id !== DEMO_STUDY.id)];
  },

  getStudyBySlug(slug: string): Study | null {
    return this.listStudies().find((s) => s.slug === slug) ?? null;
  },

  createStudy(title: string): Study {
    const now = new Date().toISOString();
    const study: Study = {
      id: uid("study"),
      slug: `${
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "untitled"
      }-${Date.now().toString(36)}`,
      title,
      items: [],
      createdAt: now,
      updatedAt: now,
    };
    const user = readJson<Study[]>(STUDIES_KEY, []);
    writeJson(STUDIES_KEY, [...user, study]);
    return study;
  },

  addStudyItem(studyId: string, item: Omit<StudyItem, "id" | "addedAt">): Study | null {
    const user = readJson<Study[]>(STUDIES_KEY, []);
    // Demo study is immutable; clone-on-write so "add to study" works everywhere.
    const all = this.listStudies();
    const target = all.find((s) => s.id === studyId);
    if (!target) return null;
    const next: Study = {
      ...target,
      items: [...target.items, { ...item, id: uid("si"), addedAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    };
    const others = user.filter((s) => s.id !== studyId);
    writeJson(STUDIES_KEY, [next, ...others]);
    return next;
  },

  listNotes(): Note[] {
    return readJson<Note[]>(NOTES_KEY, []);
  },

  notesForPassage(ref: PassageRef): Note[] {
    const key = passageRefKey(ref);
    return this.listNotes().filter((note) =>
      note.links.some((link) => {
        if (link.anchor?.type === "passage") return passageRefsOverlap(link.anchor.ref, ref);
        return (
          link.kind === "passage" &&
          (link.target === key ||
            legacyPassageLinkMatches(link.target, ref) ||
            legacyPassageLinkMatches(link.label, ref))
        );
      }),
    );
  },

  studyItemsForPassage(ref: PassageRef): StudyItem[] {
    return this.listStudies().flatMap((study) =>
      study.items.filter((item) => item.passageRef && passageRefsOverlap(item.passageRef, ref)),
    );
  },

  createNote(input: Pick<Note, "title" | "body" | "links">): Note {
    const now = new Date().toISOString();
    const note: Note = { id: uid("note"), ...input, createdAt: now, updatedAt: now };
    writeJson(NOTES_KEY, [note, ...this.listNotes()]);
    return note;
  },
};
