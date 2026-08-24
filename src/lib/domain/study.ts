/**
 * Scriptorium — Study & notes domain model.
 *
 * Notes and studies are user-owned, local-first data. A note can be
 * linked to passages, words, resources, concepts and studies.
 */

import type { PassageRef } from "./scripture";

/** A citable source reference — reused by claims, notes, AI output, history. */
export interface SourceReference {
  id: string;
  author?: string;
  work: string;
  edition?: string;
  /** Page, section, verse range, URL fragment... */
  location?: string;
  year?: number;
  resourceId?: string;
  url?: string;
}

export type NoteLinkKind = "passage" | "word" | "resource" | "concept" | "study";

export interface NoteLink {
  kind: NoteLinkKind;
  /** PassageRef serialized, lemma, resource id, concept id or study id. */
  target: string;
  label: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  links: NoteLink[];
  createdAt: string;
  updatedAt: string;
}

export type StudyItemKind =
  | "passage"
  | "word"
  | "concept"
  | "resource"
  | "note"
  | "person"
  | "place";

export interface StudyItem {
  id: string;
  kind: StudyItemKind;
  refId: string;
  label: string;
  /** For passages, a structured ref can accompany the label. */
  passageRef?: PassageRef;
  addedAt: string;
}

export interface Study {
  id: string;
  slug: string;
  title: string;
  description?: string;
  items: StudyItem[];
  createdAt: string;
  updatedAt: string;
}
