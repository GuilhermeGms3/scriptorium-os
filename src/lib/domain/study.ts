/**
 * Scriptorium — Study & notes domain model.
 *
 * Notes and studies are user-owned, local-first data. A note can be
 * linked to passages, words, resources, concepts and studies.
 */

import type { TextAnchor } from "./knowledge";
import type { PassageRef } from "./scripture";

export type NoteLinkKind = "passage" | "word" | "resource" | "concept" | "study";

export interface NoteLink {
  kind: NoteLinkKind;
  /** PassageRef serialized, lemma, resource id, concept id or study id. */
  target: string;
  label: string;
  /** Structured target for new records; legacy local notes may only have target/label. */
  anchor?: TextAnchor;
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
  "passage" | "word" | "concept" | "resource" | "note" | "person" | "place";

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
